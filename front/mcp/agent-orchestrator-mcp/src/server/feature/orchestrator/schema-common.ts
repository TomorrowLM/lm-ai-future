import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/** 任务状态枚举值 */
export const taskStatusEnum = ['pending', 'running', 'completed', 'failed', 'reviewed', 'rework_requested']

/** create-task / create-tasks 共用的请求 schema */
export const taskRequestSchema: Tool['inputSchema'] = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '任务标题' },
    prompt: { type: 'string', description: '任务说明或执行要求。未传时仅根据 inputFiles 中的规格文件执行。' },
    workspaceRoot: { type: 'string', description: '任务所属工作区绝对路径' },
    inputFiles: {
      type: 'array',
      items: { type: 'string' },
      description: '任务需要读取的文件路径，必须在 workspaceRoot 内',
    },
    resultFile: { type: 'string', description: '结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md；无法推断时写入 docs/results/task-id.md' },
    visualDir: { type: 'string', description: '视觉/头脑风暴文件目录，未传时根据需求文件或结果文件自动推断' },
  },
  required: ['title', 'workspaceRoot'],
}
