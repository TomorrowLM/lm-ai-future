import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'
import { requestRework } from './rework.js'

export async function handleAgentRequestRework(args: ToolArguments): Promise<CallToolResult> {
  return textResponse(await requestRework(
    requireString(args, 'workspaceRoot'),
    requireString(args, 'taskId'),
    requireString(args, 'reason'),
    requireString(args, 'reworkFile'),
  ))
}
