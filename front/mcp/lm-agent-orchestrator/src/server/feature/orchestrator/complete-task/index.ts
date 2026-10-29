import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { writeTaskResult } from '../../../base/task-store/index.js'
import { requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'

export async function handleAgentCompleteTask(args: ToolArguments): Promise<CallToolResult> {
  return textResponse(await writeTaskResult(
    requireString(args, 'workspaceRoot'),
    requireString(args, 'taskId'),
    requireString(args, 'result'),
  ))
}
