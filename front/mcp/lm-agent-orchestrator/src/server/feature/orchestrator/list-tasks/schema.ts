import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { taskStatusEnum } from '../schema-common.js'

export const agentListTasksTool: Tool = {
  name: 'agent_list_tasks',
  description: '列出指定工作区的编排任务。可按状态过滤。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      status: { type: 'string', enum: taskStatusEnum, description: '可选任务状态过滤' },
    },
    required: ['workspaceRoot'],
  },
}
