import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { createTask, type CreateTaskInput } from '../../../base/task-store/index.js'
import { requireString, optionalString, optionalStringArray, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'

export async function handleAgentCreateTask(args: ToolArguments): Promise<CallToolResult> {
  const input: CreateTaskInput = {
    title: requireString(args, 'title'),
    prompt: optionalString(args, 'prompt'),
    workspaceRoot: requireString(args, 'workspaceRoot'),
    inputFiles: optionalStringArray(args, 'inputFiles'),
    resultFile: optionalString(args, 'resultFile'),
    visualDir: optionalString(args, 'visualDir'),
  }

  return textResponse(await createTask(input))
}
