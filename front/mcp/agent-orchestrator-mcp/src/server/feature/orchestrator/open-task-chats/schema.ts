import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentOpenTaskChatsTool: Tool = {
  name: 'agent_open_task_chats',
  description: '加载任务的 spec 文件与 prompt（含返工原因），通过 VS Code CLI 打开子聊天窗口。仅负责打开窗口，不读取聊天输出。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要打开子聊天窗的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
