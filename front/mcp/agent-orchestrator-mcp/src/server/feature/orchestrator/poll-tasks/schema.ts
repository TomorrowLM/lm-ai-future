import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentPollTasksTool: Tool = {
  name: 'agent_poll_tasks',
  description: '非阻塞获取多个任务当前状态。适合主 Agent 在等待过程中定时输出子任务进度。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要轮询的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
