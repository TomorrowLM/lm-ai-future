import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { listTasks, taskStatuses, type TaskStatus } from '../../../base/task-store/index.js'
import { optionalString, requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'

function optionalTaskStatus(args: ToolArguments) {
  const status = optionalString(args, 'status')
  if (!status) return undefined
  if (!taskStatuses.includes(status as TaskStatus)) {
    throw new Error('status 必须是合法任务状态')
  }
  return status as TaskStatus
}

export async function handleAgentListTasks(args: ToolArguments): Promise<CallToolResult> {
  return textResponse(await listTasks(requireString(args, 'workspaceRoot'), optionalTaskStatus(args)))
}
