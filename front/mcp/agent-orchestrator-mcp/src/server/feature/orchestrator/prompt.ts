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
