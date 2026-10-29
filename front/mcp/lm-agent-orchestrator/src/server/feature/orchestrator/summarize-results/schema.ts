import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentSummarizeResultsTool: Tool = {
  name: 'agent_summarize_results',
  description: '读取多个任务结果并合并为主 Agent 可审查的 Markdown 汇总。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要汇总的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}
