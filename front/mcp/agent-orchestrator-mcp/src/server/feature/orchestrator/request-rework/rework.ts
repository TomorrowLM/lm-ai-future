import {
  getTask,
  updateTask,
} from '../../../base/task-store/index.js'
import type { TaskRecord, TaskReworkRecord } from '../../../base/task-store/index.js'

/**
 * 返工文档模板由 page-development-workflow 技能定义：
 * lm-skill/page-development-workflow/references/phase4-execution-modes.md → 返工文档模板
 *
 * Agent 负责按模板写入返工文档，再调用本函数传入 reworkFile 路径。
 * MCP 只更新 tasks.json 状态账本，不生成任何文档内容。
 */
const reworkInstruction = '请读取已挂载的原始任务输入文件和本次返工输入文件，严格按返工要求补齐实现。完成后覆盖原 resultFile，并调用 agent_complete_task。'

export async function requestRework(workspaceRoot: string, taskId: string, reason: string, reworkFile: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const reworkCount = (task.reworkCount ?? 0) + 1
  const now = new Date().toISOString()
  const reworkId = `rework-${reworkCount}`
  const rework: TaskReworkRecord = {
    id: reworkId,
    reason,
    prompt: reworkInstruction,
    inputFiles: [reworkFile],
    status: 'requested',
    createdAt: now,
  }

  return updateTask(workspaceRoot, taskId, {
    status: 'rework_requested',
    reworkCount,
    rework,
    reworks: [...(task.reworks ?? []), rework],
    reviewNote: reason,
  })
}
