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
  id: string
  reason: string
  prompt: string
  promptFile: string
  status: TaskReworkStatus
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface TaskRecord {
  id: string
  title: string
  prompt: string
  workspaceRoot: string
  inputFiles: string[]
  resultFile: string
  visualDir: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  reworkCount?: number
  rework?: TaskReworkRecord
  reworks?: TaskReworkRecord[]
  error?: string
  reviewNote?: string
}

export interface CreateTaskInput {
  title: string
  prompt: string
  workspaceRoot: string
  inputFiles?: string[]
  resultFile?: string
  visualDir?: string
}

export interface TaskStoreData {
  tasks: TaskRecord[]
}
