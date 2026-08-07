export const taskStatuses = [
  'pending',
  'running',
  'completed',
  'failed',
  'reviewed',
  'rework_requested',
] as const

export type TaskStatus = typeof taskStatuses[number]

export interface TaskRecord {
  id: string
  title: string
  prompt: string
  workspaceRoot: string
  inputFiles: string[]
  promptFile: string
  resultFile: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  reworkCount?: number
  error?: string
  reviewNote?: string
}

export interface CreateTaskInput {
  title: string
  prompt: string
  workspaceRoot: string
  inputFiles?: string[]
  resultFile?: string
}

export interface TaskStoreData {
  tasks: TaskRecord[]
}
