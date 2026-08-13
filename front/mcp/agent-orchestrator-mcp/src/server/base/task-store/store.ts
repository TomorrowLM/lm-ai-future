import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertSafeWorkspaceRoot, resolveInsideWorkspace } from './path-guard.js'
import type {
  CreateTaskInput,
  TaskRecord,
  TaskReworkRecord,
  TaskStatus,
  TaskStoreData,
} from './types.js'

const storeDirName = 'docs'
const tasksFileName = 'tasks.json'
const resultsDirName = 'results'
const requirementSections = ['design', 'prod']
const ignoredDiscoveryDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  '.next',
  '.turbo',
])

function normalizeRoot(workspaceRoot: string) {
  const normalized = path.normalize(workspaceRoot)
  assertSafeWorkspaceRoot(normalized)
  return normalized
}

export function taskStorePath(workspaceRoot: string) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, tasksFileName)
}

export function defaultResultFile(workspaceRoot: string, taskId: string) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, resultsDirName, `${taskId}.md`)
}

function defaultResultFileFromCandidates(workspaceRoot: string, taskId: string, candidates: string[]) {
  for (const candidate of candidates) {
    const requirementDir = requirementDirFromPath(candidate)

    if (requirementDir) return path.join(requirementDir, resultsDirName, `${taskId}.md`)
  }

  return defaultResultFile(workspaceRoot, taskId)
}

export function defaultVisualDir(workspaceRoot: string) {
  return path.join(normalizeRoot(workspaceRoot), '.superpowers', 'brainstorm')
}

function pathSegments(targetPath: string) {
  return path.normalize(targetPath).split(path.sep).filter(Boolean)
}

function requirementDirFromPath(targetPath: string) {
  const normalized = path.normalize(targetPath)
  const parts = pathSegments(normalized)

  for (const section of requirementSections) {
    const sectionIndex = parts.findIndex((part, index) => parts[index - 1] === 'docs' && part === section)

    if (sectionIndex >= 0 && parts[sectionIndex + 1]) {
      return path.join(path.parse(normalized).root, ...parts.slice(0, sectionIndex + 2))
    }
  }

  return undefined
}

function inferVisualDir(workspaceRoot: string, candidates: string[]) {
  for (const candidate of candidates) {
    const requirementDir = requirementDirFromPath(candidate)

    if (requirementDir) return path.join(requirementDir, 'brainstorm')
  }

  return defaultVisualDir(workspaceRoot)
}

function taskStorePathForResultFile(workspaceRoot: string, resultFile: string) {
  const normalizedRoot = normalizeRoot(workspaceRoot)
  const resolvedResultFile = resolveInsideWorkspace(normalizedRoot, resultFile)

  const requirementDir = requirementDirFromPath(resolvedResultFile)

  if (requirementDir) return path.join(requirementDir, tasksFileName)

  return taskStorePath(normalizedRoot)
}

function isRequirementTaskStore(directory: string) {
  return Boolean(requirementDirFromPath(path.join(directory, resultsDirName, 'placeholder.md')))
}

async function discoverTaskStorePaths(workspaceRoot: string) {
  const normalizedRoot = normalizeRoot(workspaceRoot)
  const storePaths = new Set<string>([taskStorePath(normalizedRoot)])

  async function walk(directory: string) {
    let entries

    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }

    for (const entry of entries) {
      if (entry.isFile() && entry.name === tasksFileName && isRequirementTaskStore(directory)) {
        storePaths.add(path.join(directory, entry.name))
        continue
      }

      if (!entry.isDirectory() || ignoredDiscoveryDirs.has(entry.name)) continue

      await walk(path.join(directory, entry.name))
    }
  }

  await walk(normalizedRoot)
  return [...storePaths]
}

async function readStoreFile(filePath: string): Promise<TaskStoreData> {
  try {
    const text = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(text) as TaskStoreData
    return { tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { tasks: [] }
    }
    throw error
  }
}

/** 文件级写锁：防止并发 writeStoreFile 竞态损坏 JSON */
const writeLocks = new Map<string, Promise<void>>()

function withWriteLock(filePath: string, fn: () => Promise<void>): Promise<void> {
  const prev = writeLocks.get(filePath) ?? Promise.resolve()
  const next = prev.then(fn, fn).finally(() => {
    if (writeLocks.get(filePath) === next) writeLocks.delete(filePath)
  })
  writeLocks.set(filePath, next)
  return next
}

/** 原子化 read→modify→write：完整保护读改写周期 */
async function withStoreLock<T>(
  filePath: string,
  fn: (store: TaskStoreData) => T | Promise<T>
): Promise<T> {
  let result: T
  await withWriteLock(filePath, async () => {
    const store = await readStoreFile(filePath)
    result = await fn(store)
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
  })
  return result!
}

async function writeStoreFile(filePath: string, data: TaskStoreData) {
  await withWriteLock(filePath, async () => {
    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  })
}

async function findTaskStore(workspaceRoot: string, taskId: string) {
  const storePaths = await discoverTaskStorePaths(workspaceRoot)

  for (const storePath of storePaths) {
    const store = await readStoreFile(storePath)
    const task = store.tasks.find((item) => item.id === taskId)

    if (task) {
      return { storePath, store, task }
    }
  }

  return undefined
}

export async function createTask(input: CreateTaskInput) {
  const workspaceRoot = normalizeRoot(input.workspaceRoot)
  const id = `task-${randomUUID()}`
  const now = new Date().toISOString()
  const inputFiles = (input.inputFiles ?? []).map((item) => resolveInsideWorkspace(workspaceRoot, item))
  const resultFile = input.resultFile
    ? resolveInsideWorkspace(workspaceRoot, input.resultFile)
    : defaultResultFileFromCandidates(workspaceRoot, id, inputFiles)
  const visualDir = input.visualDir
    ? resolveInsideWorkspace(workspaceRoot, input.visualDir)
    : inferVisualDir(workspaceRoot, input.resultFile ? [resultFile, ...inputFiles] : inputFiles)
  const storePath = taskStorePathForResultFile(workspaceRoot, resultFile)

  const task: TaskRecord = {
    id,
    title: input.title,
    prompt: input.prompt,
    workspaceRoot,
    inputFiles,
    resultFile,
    visualDir,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  await withStoreLock(storePath, (store) => {
    store.tasks.push(task)
  })
  return task
}

export async function createTasks(inputs: CreateTaskInput[]) {
  const tasks: TaskRecord[] = []

  for (const input of inputs) {
    tasks.push(await createTask(input))
  }

  return tasks
}

export async function listTasks(workspaceRoot: string, status?: TaskStatus) {
  const tasks = []

  for (const storePath of await discoverTaskStorePaths(normalizeRoot(workspaceRoot))) {
    const store = await readStoreFile(storePath)
    tasks.push(...store.tasks)
  }

  return status ? tasks.filter((task) => task.status === status) : tasks
}

export async function getTask(workspaceRoot: string, taskId: string) {
  return (await findTaskStore(normalizeRoot(workspaceRoot), taskId))?.task
}

export async function updateTask(workspaceRoot: string, taskId: string, patch: Partial<Omit<TaskRecord, 'id'>>) {
  const searchResult = await findTaskStore(normalizeRoot(workspaceRoot), taskId)

  if (!searchResult) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const { storePath } = searchResult

  return withStoreLock(storePath, (store) => {
    const task = store.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error(`任务不存在: ${taskId}`)
    Object.assign(task, patch, { updatedAt: new Date().toISOString() })
    return task
  })
}

export async function writeTaskResult(workspaceRoot: string, taskId: string, result: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const now = new Date().toISOString()
  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, result, 'utf8')

  const patch: Partial<TaskRecord> = { status: 'completed', completedAt: now }

  if (task.rework) {
    const completedRework: TaskReworkRecord = {
      ...task.rework,
      status: 'completed',
      completedAt: now,
    }
    patch.rework = completedRework
    patch.reworks = (task.reworks ?? []).map((item) => (
      item.id === completedRework.id ? completedRework : item
    ))
  }

  return updateTask(workspaceRoot, taskId, patch)
}

export async function readTaskResult(workspaceRoot: string, taskId: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const text = await readFile(task.resultFile, 'utf8')
  return { task, text }
}

export async function hasTaskResult(task: TaskRecord) {
  try {
    const resultStat = await stat(task.resultFile)
    return resultStat.isFile() && resultStat.size > 0
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false
    }
    throw error
  }
}

export async function syncCompletedTaskFromResult(workspaceRoot: string, task: TaskRecord) {
  if (task.status !== 'running' && task.status !== 'pending') return task
  if (!(await hasTaskResult(task))) return task
  return updateTask(workspaceRoot, task.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  })
}
