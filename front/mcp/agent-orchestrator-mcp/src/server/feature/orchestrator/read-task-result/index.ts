import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { readTaskResult } from '../../../base/task-store/index.js'
import { requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'

export async function handleAgentReadTaskResult(args: ToolArguments): Promise<CallToolResult> {
  return textResponse(await readTaskResult(requireString(args, 'workspaceRoot'), requireString(args, 'taskId')))
}
