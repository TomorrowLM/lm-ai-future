import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { errorResponse } from '../../../utils/text.js'
import { handleAgentCompleteTask } from './complete-task.js'
import { handleAgentCreateTask } from './create-task.js'
import { handleAgentCreateTasks } from './create-tasks.js'
import { handleAgentGetTask } from './get-task.js'
import { handleAgentListTasks } from './list-tasks.js'
import { handleAgentMarkTaskReviewed } from './mark-task-reviewed.js'
import { handleAgentOpenTaskChats } from './open-task-chats.js'
import { handleAgentPollTasks } from './poll-tasks.js'
import { handleAgentReadTaskResult } from './read-task-result.js'
import { handleAgentRequestRework } from './request-rework.js'
import { orchestratorTools } from './schema.js'
import { handleAgentSummarizeResults } from './summarize-results.js'
import { handleAgentWaitForTasks } from './wait-for-tasks.js'

export const tools = orchestratorTools

function getArgs(request: CallToolRequest) {
  const args = request.params.arguments
  return args && typeof args === 'object' && !Array.isArray(args) ? args as Record<string, unknown> : {}
}

export async function dispatchOrchestratorTool(request: CallToolRequest): Promise<CallToolResult | undefined> {
  const args = getArgs(request)

  try {
    switch (request.params.name) {
      case 'agent_create_task':
        return await handleAgentCreateTask(args)
      case 'agent_create_tasks':
        return await handleAgentCreateTasks(args)
      case 'agent_list_tasks':
        return await handleAgentListTasks(args)
      case 'agent_get_task':
        return await handleAgentGetTask(args)
      case 'agent_open_task_chats':
        return await handleAgentOpenTaskChats(args)
      case 'agent_wait_for_tasks':
        return await handleAgentWaitForTasks(args)
      case 'agent_poll_tasks':
        return await handleAgentPollTasks(args)
      case 'agent_complete_task':
        return await handleAgentCompleteTask(args)
      case 'agent_read_task_result':
        return await handleAgentReadTaskResult(args)
      case 'agent_mark_task_reviewed':
        return await handleAgentMarkTaskReviewed(args)
      case 'agent_request_rework':
        return await handleAgentRequestRework(args)
      case 'agent_summarize_results':
        return await handleAgentSummarizeResults(args)
      default:
        return undefined
    }
  } catch (error) {
    return errorResponse(error)
  }
}
