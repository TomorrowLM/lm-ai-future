import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { readTaskResult } from '../../base/task-store/index.js'
import { optionalStringArray, requireString, type ToolArguments } from '../../../utils/args.js'
import { textResponse } from '../../../utils/text.js'

export async function handleAgentSummarizeResults(args: ToolArguments): Promise<CallToolResult> {
  const workspaceRoot = requireString(args, 'workspaceRoot')
  const taskIds = optionalStringArray(args, 'taskIds')

  if (!taskIds || taskIds.length === 0) {
    throw new Error('taskIds 必须是非空字符串数组')
  }

  const sections = await Promise.all(
    taskIds.map(async (taskId) => {
      const { task, text } = await readTaskResult(workspaceRoot, taskId)
      return [`## ${task.title}`, '', `- ID: ${task.id}`, `- 状态: ${task.status}`, `- 结果文件: ${task.resultFile}`, '', text].join('\n')
    }),
  )

  return textResponse(sections.join('\n\n---\n\n'))
}
