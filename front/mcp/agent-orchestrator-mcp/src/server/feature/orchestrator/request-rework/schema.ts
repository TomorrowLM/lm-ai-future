import type { Tool } from '@modelcontextprotocol/sdk/types.js'

export const agentRequestReworkTool: Tool = {
  name: 'agent_request_rework',
  description: '主 Agent 发现结果不合格时标记为 rework_requested。Agent 应先用技能模板写入返工文档，再调用本工具传入文档路径；MCP 只更新 tasks.json 不生成文档。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      reason: { type: 'string', description: '返工原因' },
      reworkFile: { type: 'string', description: 'Agent 已写入的返工文档绝对路径，MCP 将其作为 rework.inputFiles[0]' },
    },
    required: ['workspaceRoot', 'taskId', 'reason', 'reworkFile'],
  },
}
