import type { Tool } from '@modelcontextprotocol/sdk/types.js'

const taskStatusEnum = ['pending', 'running', 'completed', 'failed', 'reviewed', 'rework_requested']

const taskRequestSchema: Tool['inputSchema'] = {
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

export const agentCreateTaskTool: Tool = {
  name: 'agent_create_task',
  description: '创建单个编排任务并生成任务记录。返回任务 ID、prompt 文件路径和结果文件路径。',
  inputSchema: taskRequestSchema,
}

export const agentCreateTasksTool: Tool = {
  name: 'agent_create_tasks',
  description: '批量创建编排任务。适合主 Agent 拆分多个可并行子任务。',
  inputSchema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: taskRequestSchema,
        minItems: 1,
        description: '要创建的任务列表',
      },
    },
    required: ['tasks'],
  },
}

export const agentListTasksTool: Tool = {
  name: 'agent_list_tasks',
  description: '列出指定工作区的编排任务。可按状态过滤。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      status: { type: 'string', enum: taskStatusEnum, description: '可选任务状态过滤' },
    },
    required: ['workspaceRoot'],
  },
}

export const agentGetTaskTool: Tool = {
  name: 'agent_get_task',
  description: '获取单个任务详情，包括 prompt 文件和结果文件路径。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
    },
    required: ['workspaceRoot', 'taskId'],
  },
}

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

export const agentWaitForTasksTool: Tool = {
  name: 'agent_wait_for_tasks',
  description: '等待多个任务完成。通过任务状态和结果文件轮询；完成后主 Agent 可读取结果并校验。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要等待的任务 ID 列表' },
      timeoutMs: { type: 'number', minimum: 1000, maximum: 600000, default: 300000, description: '等待超时时间' },
      pollIntervalMs: { type: 'number', minimum: 500, maximum: 10000, default: 2000, description: '轮询间隔' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}

export const agentPollTasksTool: Tool = {
  name: 'agent_poll_tasks',
  description: '非阻塞获取多个任务当前状态。适合主 Agent 在等待过程中定时输出子任务进度。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskIds: { type: 'array', items: { type: 'string' }, minItems: 1, description: '要轮询的任务 ID 列表' },
    },
    required: ['workspaceRoot', 'taskIds'],
  },
}

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

export const agentMarkTaskReviewedTool: Tool = {
  name: 'agent_mark_task_reviewed',
  description: '主 Agent 校验任务结果后标记为 reviewed，并可写入校验说明。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      reviewNote: { type: 'string', description: '校验说明' },
    },
    required: ['workspaceRoot', 'taskId'],
  },
}

export const agentRequestReworkTool: Tool = {
  name: 'agent_request_rework',
  description: '主 Agent 发现结果不合格时标记为 rework_requested，并写入返工原因。',
  inputSchema: {
    type: 'object',
    properties: {
      workspaceRoot: { type: 'string', description: '工作区绝对路径' },
      taskId: { type: 'string', description: '任务 ID' },
      reason: { type: 'string', description: '返工原因' },
    },
    required: ['workspaceRoot', 'taskId', 'reason'],
  },
}

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

export const orchestratorTools = [
  agentCreateTaskTool,
  agentCreateTasksTool,
  agentListTasksTool,
  agentGetTaskTool,
  agentOpenTaskChatsTool,
  agentWaitForTasksTool,
  agentPollTasksTool,
  agentCompleteTaskTool,
  agentReadTaskResultTool,
  agentMarkTaskReviewedTool,
  agentRequestReworkTool,
  agentSummarizeResultsTool,
]
