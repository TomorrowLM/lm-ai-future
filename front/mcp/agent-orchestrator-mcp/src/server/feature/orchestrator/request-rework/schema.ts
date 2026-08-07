import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentRequestReworkTool: Tool = {
  name: 'agent_request_rework',
  description: '主 Agent 发现结果不合格时标记为 rework_requested，并写入返工原因。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      reason: { type: 'string', description: '返工原因' },
    },
    required: ['workspaceRoot', 'taskId', 'reason'],
  },
}
