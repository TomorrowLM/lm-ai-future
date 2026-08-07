import { randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertSafeWorkspaceRoot, resolveInsideWorkspace } from './path-guard.js'
import type { CreateTaskInput, TaskRecord, TaskStatus, TaskStoreData } from './types.js'

const storeDirName = path.join('docs', '.agent-orchestrator')
const orchestratorDirName = '.agent-orchestrator'
const tasksFileName = 'tasks.json'
const resultsDirName = 'results'
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

export function defaultVisualDir(workspaceRoot: string) {
  return path.join(normalizeRoot(workspaceRoot), '.superpowers', 'brainstorm')
}

function pathSegments(targetPath: string) {
  return path.normalize(targetPath).split(path.sep).filter(Boolean)
}

function requirementDirFromPath(targetPath: string) {
  const normalized = path.normalize(targetPath)
  const parts = pathSegments(normalized)
  const orchestratorIndex = parts.lastIndexOf(orchestratorDirName)

  if (orchestratorIndex > 0) {
    return path.join(path.parse(normalized).root, ...parts.slice(0, orchestratorIndex))
  }

  for (const section of ['design', 'prod']) {
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
  const parts = resolvedResultFile.split(path.sep)
  const orchestratorIndex = parts.lastIndexOf(orchestratorDirName)

  if (orchestratorIndex >= 0 && parts[orchestratorIndex + 1] === resultsDirName) {
    return path.join(parts.slice(0, orchestratorIndex + 1).join(path.sep), tasksFileName)
  }

  return taskStorePath(normalizedRoot)
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
      if (!entry.isDirectory() || ignoredDiscoveryDirs.has(entry.name)) continue

      const nextDir = path.join(directory, entry.name)

      if (entry.name === orchestratorDirName) {
        storePaths.add(path.join(nextDir, tasksFileName))
        continue
      }

      await walk(nextDir)
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

async function writeStoreFile(filePath: string, data: TaskStoreData) {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
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
    : defaultResultFile(workspaceRoot, id)
  const visualDir = input.visualDir
    ? resolveInsideWorkspace(workspaceRoot, input.visualDir)
    : inferVisualDir(workspaceRoot, input.resultFile ? [resultFile, ...inputFiles] : inputFiles)
  const storePath = input.resultFile
    ? taskStorePathForResultFile(workspaceRoot, input.resultFile)
    : taskStorePath(workspaceRoot)

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

  const store = await readStoreFile(storePath)
  store.tasks.push(task)
  await writeStoreFile(storePath, store)
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
  const normalizedRoot = normalizeRoot(workspaceRoot)
  const taskStore = await findTaskStore(normalizedRoot, taskId)

  if (!taskStore) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const { storePath, store, task } = taskStore
  Object.assign(task, patch, { updatedAt: new Date().toISOString() })
  await writeStoreFile(storePath, store)
  return task
}

export async function writeTaskResult(workspaceRoot: string, taskId: string, result: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const now = new Date().toISOString()
  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, result, 'utf8')
  return updateTask(workspaceRoot, taskId, { status: 'completed', completedAt: now })
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
