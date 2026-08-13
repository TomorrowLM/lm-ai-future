import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { getTask, updateTask } from '../../../base/task-store/index.js'
import { optionalStringArray, requireString, type ToolArguments } from '../../../../utils/args.js'
import { textResponse } from '../../../../utils/text.js'
import { openTaskChat } from './chat-launcher.js'

export async function handleAgentOpenTaskChats(args: ToolArguments): Promise<CallToolResult> {
  const workspaceRoot = requireString(args, 'workspaceRoot')
  const taskIds = optionalStringArray(args, 'taskIds')

  if (!taskIds || taskIds.length === 0) {
    throw new Error('taskIds 必须是非空字符串数组')
  }

  const opened = []

  for (const taskId of taskIds) {
    const task = await getTask(workspaceRoot, taskId)
    if (!task) {
      throw new Error(`任务不存在: ${taskId}`)
    }

    opened.push(await openTaskChat(task))
    const now = new Date().toISOString()
    const patch = {
      status: 'running' as const,
      startedAt: now,
    }

    if (task.rework) {
      const runningRework = {
        ...task.rework,
        status: 'running' as const,
        startedAt: now,
      }
      Object.assign(patch, {
        rework: runningRework,
        reworks: (task.reworks ?? []).map((item) => (
          item.id === runningRework.id ? runningRework : item
        )),
      })
    }

    await updateTask(workspaceRoot, taskId, {
      ...patch,
    })
  }

  return textResponse({ opened })
}
