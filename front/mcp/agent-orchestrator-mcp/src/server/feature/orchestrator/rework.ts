import {
  defaultReworkPromptFile,
  getTask,
  updateTask,
} from '../../base/task-store/index.js'
import { writeReworkPrompt } from './prompt.js'

export async function requestRework(workspaceRoot: string, taskId: string, reason: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const reworkCount = (task.reworkCount ?? 0) + 1
  const promptFile = defaultReworkPromptFile(workspaceRoot, taskId, reworkCount)
  const reworkTask = {
    ...task,
    promptFile,
    reworkCount,
    reviewNote: reason,
    error: reason,
    status: 'rework_requested' as const,
  }

  await writeReworkPrompt(reworkTask, reason)

  return updateTask(workspaceRoot, taskId, {
    status: 'rework_requested',
    promptFile,
    reworkCount,
    reviewNote: reason,
    error: reason,
  })
}
