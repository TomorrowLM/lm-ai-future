import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentWaitForTasksTool: Tool = {
  name: 'agent_wait_for_tasks',
  description: '等待多个任务完成。通过任务状态和结果文件轮询；完成后主 Agent 可读取结果并校验。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要等待的任务 ID 列表' },
      timeoutMs: { type: 'number', minimum: 1000, maximum: 600000, default: 300000, description: '等待超时时间' },
      pollIntervalMs: { type: 'number', minimum: 500, maximum: 10000, default: 2000, description: '轮询间隔' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
