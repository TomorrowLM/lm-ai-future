import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentReadTaskResultTool: Tool = {
  name: 'agent_read_task_result',
  description: '读取已完成任务的结果文件。返回任务元信息和结果文本。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
    },
    required: ['workspaceRoot', 'taskId'],
  },
}
