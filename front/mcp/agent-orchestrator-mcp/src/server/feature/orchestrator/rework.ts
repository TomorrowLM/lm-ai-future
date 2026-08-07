import {
  getTask,
  updateTask,
} from '../../base/task-store/index.js'

export async function requestRework(workspaceRoot: string, taskId: string, reason: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const reworkCount = (task.reworkCount ?? 0) + 1

  return updateTask(workspaceRoot, taskId, {
    status: 'rework_requested',
    reworkCount,
    reviewNote: reason,
    error: reason,
  })
}
