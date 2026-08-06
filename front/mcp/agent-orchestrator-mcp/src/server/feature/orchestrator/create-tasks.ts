import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { createTasks, type CreateTaskInput } from '../../base/task-store/index.js'
import { optionalObjectArray, optionalString, optionalStringArray, requireString, type ToolArguments } from '../../../utils/args.js'
import { textResponse } from '../../../utils/text.js'

function toCreateTaskInput(args: ToolArguments): CreateTaskInput {
  return {
    title: requireString(args, 'title'),
    prompt: requireString(args, 'prompt'),
    workspaceRoot: requireString(args, 'workspaceRoot'),
    inputFiles: optionalStringArray(args, 'inputFiles'),
    resultFile: optionalString(args, 'resultFile'),
  }
}

export async function handleAgentCreateTasks(args: ToolArguments): Promise<CallToolResult> {
  const tasks = optionalObjectArray(args, 'tasks')
  if (!tasks || tasks.length === 0) {
    throw new Error('tasks 必须是非空对象数组')
  }

  return textResponse(await createTasks(tasks.map(toCreateTaskInput)))
}
