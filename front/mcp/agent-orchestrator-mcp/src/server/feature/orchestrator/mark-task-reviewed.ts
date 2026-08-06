import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { updateTask } from '../../base/task-store/index.js'
import { optionalString, requireString, type ToolArguments } from '../../../utils/args.js'
import { textResponse } from '../../../utils/text.js'

export async function handleAgentMarkTaskReviewed(args: ToolArguments): Promise<CallToolResult> {
  return textResponse(await updateTask(requireString(args, 'workspaceRoot'), requireString(args, 'taskId'), {
    status: 'reviewed',
    reviewNote: optionalString(args, 'reviewNote'),
  }))
}
