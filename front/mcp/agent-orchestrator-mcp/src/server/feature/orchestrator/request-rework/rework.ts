import {
  getTask,
  updateTask,
} from '../../../base/task-store/index.js'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TaskRecord, TaskReworkRecord } from '../../../base/task-store/index.js'

const requirementSections = ['design', 'prod']

function pathSegments(targetPath: string) {
  return path.normalize(targetPath).split(path.sep).filter(Boolean)
}

function requirementDirFromPath(targetPath: string) {
  const normalized = path.normalize(targetPath)
  const parts = pathSegments(normalized)

  for (const section of requirementSections) {
    const sectionIndex = parts.findIndex((part, index) => (
      parts[index - 1] === 'docs' && part === section
    ))

    if (sectionIndex >= 0 && parts[sectionIndex + 1]) {
      return path.join(path.parse(normalized).root, ...parts.slice(0, sectionIndex + 2))
    }
  }

  return path.join(taskWorkspaceRoot(targetPath), 'docs')
}

function taskWorkspaceRoot(targetPath: string) {
  const parts = pathSegments(targetPath)
  const docsIndex = parts.findIndex((part) => part === 'docs')

  if (docsIndex > 0) return path.join(path.parse(targetPath).root, ...parts.slice(0, docsIndex))

  return path.dirname(targetPath)
}

function buildReworkPrompt(task: TaskRecord, reason: string) {
  const lines = [
    `请对任务 ${task.id} 进行返工。`,
    '',
    `任务标题：${task.title}`,
    '',
    '原始任务要求：',
    task.prompt,
    '',
    '返工原因：',
    reason,
    '',
    '输入文件：',
    ...task.inputFiles.map((item) => `- ${item}`),
    '',
    `结果文件：${task.resultFile}`,
    '',
    '请基于当前结果补齐返工要求，完成后覆盖原 resultFile，并调用 agent_complete_task。',
  ]

  return lines.join('\n')
}

export async function requestRework(workspaceRoot: string, taskId: string, reason: string) {
  const task = await getTask(workspaceRoot, taskId)

  if (!task) {
    throw new Error(`任务不存在: ${taskId}`)
  }

  const reworkCount = (task.reworkCount ?? 0) + 1
  const now = new Date().toISOString()
  const reworkId = `rework-${reworkCount}`
  const reworkDir = path.join(requirementDirFromPath(task.resultFile), 'reworks')
  const promptFile = path.join(reworkDir, `${task.id}-${reworkId}.md`)
  const prompt = buildReworkPrompt(task, reason)
  const rework: TaskReworkRecord = {
    id: reworkId,
    reason,
    prompt,
    promptFile,
    status: 'requested',
    createdAt: now,
  }

  await mkdir(reworkDir, { recursive: true })
  await writeFile(promptFile, prompt, 'utf8')

  return updateTask(workspaceRoot, taskId, {
    status: 'rework_requested',
    reworkCount,
    rework,
    reworks: [...(task.reworks ?? []), rework],
    reviewNote: reason,
  })
}
