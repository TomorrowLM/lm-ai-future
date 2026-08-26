export const taskStatuses = [
  'pending',
  'running',
  'completed',
  'failed',
  'reviewed',
  'rework_requested',
] as const

export type TaskStatus = typeof taskStatuses[number]

export type TaskReworkStatus = 'requested' | 'running' | 'completed'

export interface TaskReworkRecord {
  /** 返工记录唯一 ID */
  id: string
  /** 返工原因 */
  reason: string
  /** 返工子任务的独立执行说明 */
  prompt: string
  /** 当前返工任务需要挂载的输入文件 */
  inputFiles: string[]
  /** 兼容旧版返工记录 */
  promptFile?: string
  /** 返工状态：requested（已请求）/ running（执行中）/ completed（已完成） */
  status: TaskReworkStatus
  /** 创建时间 ISO 字符串 */
  createdAt: string
  /** 开始执行时间 ISO 字符串 */
  startedAt?: string
  /** 完成时间 ISO 字符串 */
  completedAt?: string
}

export interface TaskRecord {
  /** 任务唯一 ID，格式为 task-<uuid> */
  id: string
  /** 任务标题，用于主窗口识别任务边界 */
  title: string
  /** 任务说明或执行要求。由主 Agent 创建任务时传入；未传时子 Agent 仅根据 inputFiles 中的规格文件和项目 AGENTS.md 执行 */
  prompt: string
  /** 任务所属工作区绝对路径 */
  workspaceRoot: string
  /** 子任务输入文件列表，页面工作流内至少应包含对应 spec/*.md */
  inputFiles: string[]
  /** 结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md */
  resultFile: string
  /** 视觉/头脑风暴文件目录 */
  visualDir: string
  /** 任务状态：pending / running / completed / failed / reviewed / rework_requested */
  status: TaskStatus
  /** 创建时间 ISO 字符串 */
  createdAt: string
  /** 最近更新时间 ISO 字符串 */
  updatedAt: string
  /** 开始执行时间 ISO 字符串 */
  startedAt?: string
  /** 完成时间 ISO 字符串 */
  completedAt?: string
  /** 累计返工次数 */
  reworkCount?: number
  /** 当前活跃的返工记录 */
  rework?: TaskReworkRecord
  /** 全部返工历史记录（按时间正序） */
  reworks?: TaskReworkRecord[]
  /** 错误信息，任务失败时记录 */
  error?: string
  /** 审查意见，主 Agent 审查通过或请求返工时填写 */
  reviewNote?: string
}

export interface CreateTaskInput {
  /** 任务标题 */
  title: string
  /** 可选。任务说明或执行要求。未传时子 Agent 仅根据 inputFiles 中的规格文件和项目 AGENTS.md 执行 */
  prompt?: string
  /** 任务所属工作区绝对路径 */
  workspaceRoot: string
  /** 任务需要读取的文件路径，必须在 workspaceRoot 内 */
  inputFiles?: string[]
  /** 结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md；无法推断时写入 docs/results/task-id.md */
  resultFile?: string
  /** 视觉/头脑风暴文件目录，未传时根据需求文件或结果文件自动推断 */
  visualDir?: string
}

export interface TaskStoreData {
  /** 任务列表 */
  tasks: TaskRecord[]
}
