import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getTask } from '../../base/task-store/index.js'
import { requireString, type ToolArguments } from '../../../utils/args.js'
import { textResponse } from '../../../utils/text.js'

export async function handleAgentGetTask(args: ToolArguments): Promise<CallToolResult> {
  const workspaceRoot = requireString(args, 'workspaceRoot')
  const taskId = requireString(args, 'taskId')
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  return textResponse(task)
}
