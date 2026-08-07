import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentGetTaskTool: Tool = {
  name: 'agent_get_task',
  description: '获取单个任务详情，包括 prompt 文件和结果文件路径。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
    },
    required: ['workspaceRoot', 'taskId'],
  },
}
