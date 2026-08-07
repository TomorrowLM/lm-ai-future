import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TaskRecord } from '../../base/task-store/index.js'

export async function writeTaskPrompt(task: TaskRecord) {
  const files = task.inputFiles.length > 0
    ? task.inputFiles.map((file) => `- ${file}`).join('\n')
    : '- 无'
  const content = [
    `# ${task.title}`,
    '',
    '## 身份',
    '你是一个子任务执行 Agent，只处理当前任务，不要修改其他任务状态。',
    '',
    '## 任务 ID',
    task.id,
    '',
    '## 任务说明',
    task.prompt,
    '',
    '## 输入文件',
    files,
    '',
    '## 完成协议',
    `1. 将最终结果写入：${task.resultFile}`,
    '2. 如果可用，请调用 agent_complete_task 标记完成。',
    '3. 不要提交、推送、删除文件或执行破坏性操作。',
  ].join('\n')

  await mkdir(path.dirname(task.promptFile), { recursive: true })
  await writeFile(task.promptFile, `${content}\n`, 'utf8')
  return task.promptFile
}

export async function writeReworkPrompt(task: TaskRecord, reason: string) {
  const files = task.inputFiles.length > 0
    ? task.inputFiles.map((file) => `- ${file}`).join('\n')
    : '- 无'
  const content = [
    `# 返工任务：${task.title}`,
    '',
    '## 身份',
    '你是一个子任务返工 Agent，只处理当前任务的返工要求。',
    '',
    '## 任务 ID',
    task.id,
    '',
    '## 原任务说明',
    task.prompt,
    '',
    '## 输入文件',
    files,
    '',
    '## 上次结果文件',
    task.resultFile,
    '',
    '## 主窗口评审意见',
    reason,
    '',
    '## 本轮返工要求',
    '请读取上次结果文件，按评审意见修订并覆盖写回结果文件。',
    '',
    '## 完成协议',
    `1. 将修订后的最终结果写入：${task.resultFile}`,
    '2. 如果可用，请调用 agent_complete_task 标记完成。',
    '3. 不要提交、推送、删除文件或执行破坏性操作。',
  ].join('\n')

  await mkdir(path.dirname(task.promptFile), { recursive: true })
  await writeFile(task.promptFile, `${content}\n`, 'utf8')
  return task.promptFile
}
