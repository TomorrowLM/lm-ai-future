import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentCompleteTaskTool: Tool = {
  name: 'agent_complete_task',
  description: '写入任务结果并标记为 completed。子聊天窗完成任务时应调用。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      result: { type: 'string', description: '任务执行结果 Markdown 或文本' },
    },
    required: ['workspaceRoot', 'taskId', 'result'],
  },
}
