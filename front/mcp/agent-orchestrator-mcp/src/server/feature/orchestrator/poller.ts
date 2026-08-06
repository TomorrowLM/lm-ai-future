import {
  getTask,
  hasTaskResult,
  syncCompletedTaskFromResult,
  type TaskRecord,
} from '../../base/task-store/index.js'

export interface PolledTask {
  id: string
  title: string
  status: TaskRecord['status']
  hasResult: boolean
  promptFile: string
  resultFile: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  reviewNote?: string
}

function toPolledTask(task: TaskRecord, hasResult: boolean): PolledTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    hasResult,
    promptFile: task.promptFile,
    resultFile: task.resultFile,
    updatedAt: task.updatedAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    error: task.error,
    reviewNote: task.reviewNote,
  }
}

export async function pollTasks(workspaceRoot: string, taskIds: string[]) {
  const tasks: PolledTask[] = []

  for (const taskId of taskIds) {
    const task = await getTask(workspaceRoot, taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    const syncedTask = await syncCompletedTaskFromResult(workspaceRoot, task)
    tasks.push(toPolledTask(syncedTask, await hasTaskResult(syncedTask)))
  }

  return {
    summary: {
      total: tasks.length,
      completed: tasks.filter((task) => task.status === 'completed' || task.status === 'reviewed').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
      pending: tasks.filter((task) => task.status === 'pending' || task.status === 'running' || task.status === 'rework_requested').length,
    },
    tasks,
  }
}
