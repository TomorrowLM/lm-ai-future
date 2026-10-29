import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js'
import { dispatchOrchestratorTool, tools as orchestratorTools } from './feature/orchestrator/index.js'

export const tools = [...orchestratorTools]

export async function dispatchTool(request: CallToolRequest) {
  return dispatchOrchestratorTool(request)
}
