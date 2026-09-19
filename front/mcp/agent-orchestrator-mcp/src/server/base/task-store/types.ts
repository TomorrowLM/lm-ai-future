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
  /** 返工子任务描述或任务文件地址 */
  task?: string
  /** 返工参考资源文件列表 */
  resources?: string[]
  /** 返工补充说明 */
  notes?: string
  /** 兼容旧版返工执行说明 */
  prompt?: string
  /** 兼容旧版返工输入文件 */
  inputFiles?: string[]
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
  /** 任务标题，用于子聊天会话识别任务边界 */
  title: string
  /** 子任务描述或任务文件地址 */
  task?: string
  /** 子任务参考资源文件列表 */
  resources?: string[]
  /** 子任务补充说明 */
  notes?: string
  /** 兼容旧版任务说明字段 */
  prompt?: string
  /** 任务所属工作区绝对路径 */
  workspaceRoot: string
  /** 兼容旧版参考资源字段 */
  inputFiles?: string[]
  /** 结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md */
  resultFile: string
  /** 视觉产物目录，通常位于当前设计目录的 assets 下 */
  visualDir?: string
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
  /** 子任务描述或任务文件地址，新任务必填 */
  task?: string
  /** 子任务补充说明 */
  notes?: string
  /** 兼容旧版任务说明字段 */
  prompt?: string
  /** 任务所属工作区绝对路径 */
  workspaceRoot: string
  /** 子任务参考资源文件列表，必须位于 workspaceRoot 内 */
  resources?: string[]
  /** 兼容旧版参考资源字段 */
  inputFiles?: string[]
  /** 结果文件路径，默认写入 docs/design|prod/<需求目录>/results/task-id.md；无法推断时写入 docs/results/task-id.md */
  resultFile?: string
  /** 可选视觉产物目录，通常位于当前设计目录的 assets 下 */
  visualDir?: string
}

export interface TaskStoreData {
  /** 任务列表 */
  tasks: TaskRecord[]
}
