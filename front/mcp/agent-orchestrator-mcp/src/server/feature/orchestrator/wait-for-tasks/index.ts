import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { optionalNumber, optionalStringArray, requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'
import { waitForTasks } from './waiter.js'

export async function handleAgentWaitForTasks(args: ToolArguments): Promise<CallToolResult> {
  const taskIds = optionalStringArray(args, 'taskIds')
  if (!taskIds || taskIds.length === 0) {
    throw new Error('taskIds 必须是非空字符串数组')
  }

  return textResponse(await waitForTasks(
    requireString(args, 'workspaceRoot'),
    taskIds,
    optionalNumber(args, 'timeoutMs') ?? 300000,
    optionalNumber(args, 'pollIntervalMs') ?? 2000,
  ))
}
