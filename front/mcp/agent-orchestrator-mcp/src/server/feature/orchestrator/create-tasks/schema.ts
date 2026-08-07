import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { taskRequestSchema } from '../schema-common.js'

export const agentCreateTasksTool: Tool = {
  name: 'agent_create_tasks',
  description: '批量创建编排任务。适合主 Agent 拆分多个可并行子任务。',
  inputSchema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: taskRequestSchema,
        minItems: 1,
        description: '要创建的任务列表',
      },
    },
    required: ['tasks'],
  },
}
