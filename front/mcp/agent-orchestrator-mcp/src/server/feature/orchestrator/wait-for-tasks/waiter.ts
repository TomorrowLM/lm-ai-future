import {
  getTask,
  syncCompletedTaskFromResult,
  type TaskRecord,
} from '../../../base/task-store/index.js'

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isDone(task: TaskRecord) {
  return task.status === 'completed' || task.status === 'failed' || task.status === 'reviewed'
}

export async function waitForTasks(
  workspaceRoot: string,
  taskIds: string[],
  timeoutMs: number,
  pollIntervalMs: number,
) {
  const startedAt = Date.now()
  let tasks: TaskRecord[] = []

  while (Date.now() - startedAt <= timeoutMs) {
    tasks = []

    for (const taskId of taskIds) {
      const task = await getTask(workspaceRoot, taskId)
      if (!task) {
        throw new Error(`任务不存在: ${taskId}`)
      }
      tasks.push(await syncCompletedTaskFromResult(workspaceRoot, task))
    }

    if (tasks.every(isDone)) {
      break
    }

    await delay(pollIntervalMs)
  }

  return {
    completed: tasks.filter((task) => task.status === 'completed' || task.status === 'reviewed').map((task) => task.id),
    failed: tasks.filter((task) => task.status === 'failed').map((task) => task.id),
    pending: tasks.filter((task) => !isDone(task)).map((task) => task.id),
    tasks,
  }
}
