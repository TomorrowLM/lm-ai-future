import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { optionalStringArray, requireString, type ToolArguments } from '../../../utils/args.js'
import { textResponse } from '../../../utils/text.js'
import { pollTasks } from './poller.js'

export async function handleAgentPollTasks(args: ToolArguments): Promise<CallToolResult> {
  const taskIds = optionalStringArray(args, 'taskIds')
  if (!taskIds || taskIds.length === 0) {
    throw new Error('taskIds 必须是非空字符串数组')
  }

  return textResponse(await pollTasks(requireString(args, 'workspaceRoot'), taskIds))
}
