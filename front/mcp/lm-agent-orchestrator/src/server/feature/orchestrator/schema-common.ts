import type { Tool } from '@modelcontextprotocol/sdk/types.js'

/** 任务状态枚举值 */
export const taskStatusEnum = ['pending', 'running', 'completed', 'failed', 'reviewed', 'rework_requested']

/** create-task / create-tasks 共用的请求 schema */
export const taskRequestSchema: Tool['inputSchema'] = {
  type: 'object',
  properties: {
    title: { type: 'string', description: '任务标题' },
    task: { type: 'string', description: '子任务描述或任务文件地址，新任务必填' },
    resources: {
      type: 'array',
      items: { type: 'string' },
      description: '子任务参考资源文件列表，路径必须在 workspaceRoot 内',
    },
    notes: { type: 'string', description: '子任务补充说明、边界和暂不处理项' },
    prompt: { type: 'string', description: '兼容旧版备注字段' },
    workspaceRoot: { type: 'string', description: '任务所属工作区绝对路径' },
    inputFiles: {
      type: 'array',
      items: { type: 'string' },
      description: '兼容旧版参考资源字段，路径必须在 workspaceRoot 内',
    },
    resultFile: { type: 'string', description: '结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md；无法推断时写入 docs/results/task-id.md' },
    visualDir: { type: 'string', description: '可选视觉产物目录，建议位于当前设计目录的 assets 下；未传时按任务文件或结果文件推断' },
  },
  required: ['title', 'task', 'workspaceRoot'],
}
