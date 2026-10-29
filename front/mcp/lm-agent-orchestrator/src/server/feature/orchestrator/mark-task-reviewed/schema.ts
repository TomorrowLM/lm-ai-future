import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentMarkTaskReviewedTool: Tool = {
  name: 'agent_mark_task_reviewed',
  description: '主 Agent 校验任务结果后标记为 reviewed，并可写入校验说明。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      reviewNote: { type: 'string', description: '校验说明' },
    },
    required: ['workspaceRoot', 'taskId'],
  },
}
