import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentOpenTaskChatsTool: Tool = {
  name: 'agent_open_task_chats',
  description: '加载任务文件、参考资源和备注（含返工要求），通过 VS Code CLI 使用 --reuse-window 打开子聊天窗口。子 Agent 完成后必须调用 agent_complete_task 写回 tasks.json；本工具仅负责打开窗口，不读取聊天输出。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要打开子聊天窗的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
