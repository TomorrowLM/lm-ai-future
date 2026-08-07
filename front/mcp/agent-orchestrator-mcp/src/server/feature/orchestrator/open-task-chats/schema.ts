import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentOpenTaskChatsTool: Tool = {
  name: 'agent_open_task_chats',
  description: '为多个任务生成 prompt 文件并打开 Copilot Chat 子窗口。仅负责打开窗口，不读取聊天输出。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要打开子聊天窗的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
