import { randomUUID } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { assertSafeWorkspaceRoot, resolveInsideWorkspace } from './path-guard.js'
import type { CreateTaskInput, TaskRecord, TaskStatus, TaskStoreData } from './types.js'

const storeDirName = path.join('docs', '.agent-orchestrator')
const promptsDirName = 'prompts'
const resultsDirName = 'results'

function normalizeRoot(workspaceRoot: string) {
  const normalized = path.normalize(workspaceRoot)
  assertSafeWorkspaceRoot(normalized)
  return normalized
}

export function taskStorePath(workspaceRoot: string) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, 'tasks.json')
}

export function defaultPromptFile(workspaceRoot: string, taskId: string) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, promptsDirName, `${taskId}.md`)
}

export function defaultReworkPromptFile(workspaceRoot: string, taskId: string, reworkCount: number) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, promptsDirName, `${taskId}.rework-${reworkCount}.md`)
}

export function defaultResultFile(workspaceRoot: string, taskId: string) {
  return path.join(normalizeRoot(workspaceRoot), storeDirName, resultsDirName, `${taskId}.md`)
}

async function readStore(workspaceRoot: string): Promise<TaskStoreData> {
  const filePath = taskStorePath(workspaceRoot)

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

async function writeStore(workspaceRoot: string, data: TaskStoreData) {
  const filePath = taskStorePath(workspaceRoot)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

export async function createTask(input: CreateTaskInput) {
  const workspaceRoot = normalizeRoot(input.workspaceRoot)
  const id = `task-${randomUUID()}`
  const now = new Date().toISOString()
  const inputFiles = (input.inputFiles ?? []).map((item) => resolveInsideWorkspace(workspaceRoot, item))
  const promptFile = defaultPromptFile(workspaceRoot, id)
  const resultFile = input.resultFile
    ? resolveInsideWorkspace(workspaceRoot, input.resultFile)
    : defaultResultFile(workspaceRoot, id)

  const task: TaskRecord = {
    id,
    title: input.title,
    prompt: input.prompt,
    workspaceRoot,
    inputFiles,
    promptFile,
    resultFile,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  }

  const store = await readStore(workspaceRoot)
  store.tasks.push(task)
  await writeStore(workspaceRoot, store)
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
  const store = await readStore(normalizeRoot(workspaceRoot))
  return status ? store.tasks.filter((task) => task.status === status) : store.tasks
}

export async function getTask(workspaceRoot: string, taskId: string) {
  const store = await readStore(normalizeRoot(workspaceRoot))
  return store.tasks.find((task) => task.id === taskId)
}

export async function updateTask(workspaceRoot: string, taskId: string, patch: Partial<Omit<TaskRecord, 'id'>>) {
  const normalizedRoot = normalizeRoot(workspaceRoot)
  const store = await readStore(normalizedRoot)
  const task = store.tasks.find((item) => item.id === taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  Object.assign(task, patch, { updatedAt: new Date().toISOString() })
  await writeStore(normalizedRoot, store)
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
