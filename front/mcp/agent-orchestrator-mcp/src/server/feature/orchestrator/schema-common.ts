import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/** 任务状态枚举值 */
export const taskStatusEnum = ['pending', 'running', 'completed', 'failed', 'reviewed', 'rework_requested']

/** create-task / create-tasks 共用的请求 schema */
export const taskRequestSchema: Tool['inputSchema'] = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '任务标题' },
    prompt: { type: 'string', description: '任务说明或执行要求' },
    workspaceRoot: { type: 'string', description: '任务所属工作区绝对路径' },
    inputFiles: {
      type: 'array',
      items: { type: 'string' },
      description: '任务需要读取的文件路径，必须在 workspaceRoot 内',
    },
    resultFile: { type: 'string', description: '结果文件路径，默认写入 docs/.agent-orchestrator/results/task-id.md' },
  },
  required: ['title', 'prompt', 'workspaceRoot'],
}
