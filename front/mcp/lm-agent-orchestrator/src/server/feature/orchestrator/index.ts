import type { CallToolRequest, CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { errorResponse } from '../../../utils/text.js'
import { handleAgentCompleteTask } from './complete-task/index.js'
import { agentCompleteTaskTool } from './complete-task/schema.js'
import { handleAgentCreateTask } from './create-task/index.js'
import { agentCreateTaskTool } from './create-task/schema.js'
import { handleAgentCreateTasks } from './create-tasks/index.js'
import { agentCreateTasksTool } from './create-tasks/schema.js'
import { handleAgentGetTask } from './get-task/index.js'
import { agentGetTaskTool } from './get-task/schema.js'
import { handleAgentListTasks } from './list-tasks/index.js'
import { agentListTasksTool } from './list-tasks/schema.js'
import { handleAgentMarkTaskReviewed } from './mark-task-reviewed/index.js'
import { agentMarkTaskReviewedTool } from './mark-task-reviewed/schema.js'
import { handleAgentOpenTaskChats } from './open-task-chats/index.js'
import { agentOpenTaskChatsTool } from './open-task-chats/schema.js'
import { handleAgentPollTasks } from './poll-tasks/index.js'
import { agentPollTasksTool } from './poll-tasks/schema.js'
import { handleAgentReadTaskResult } from './read-task-result/index.js'
import { agentReadTaskResultTool } from './read-task-result/schema.js'
import { handleAgentRequestRework } from './request-rework/index.js'
import { agentRequestReworkTool } from './request-rework/schema.js'
import { handleAgentSummarizeResults } from './summarize-results/index.js'
import { agentSummarizeResultsTool } from './summarize-results/schema.js'
import { handleAgentWaitForTasks } from './wait-for-tasks/index.js'
import { agentWaitForTasksTool } from './wait-for-tasks/schema.js'

export const tools = [
  agentCreateTaskTool,
  agentCreateTasksTool,
  agentListTasksTool,
  agentGetTaskTool,
  agentOpenTaskChatsTool,
  agentWaitForTasksTool,
  agentPollTasksTool,
  agentCompleteTaskTool,
  agentReadTaskResultTool,
  agentMarkTaskReviewedTool,
  agentRequestReworkTool,
  agentSummarizeResultsTool,
]

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
