import type { Tool } from '@modelcontextprotocol/sdk/types.js'
import { taskRequestSchema } from '../schema-common.js'

export const agentCreateTaskTool: Tool = {
  name: 'agent_create_task',
  description: '创建单个编排任务并生成任务记录。返回任务 ID、prompt 文件路径和结果文件路径。',
  inputSchema: taskRequestSchema,
}
