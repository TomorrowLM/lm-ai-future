import { spawn } from 'node:child_process'
import type { TaskRecord } from '../../base/task-store/index.js'
import { writeTaskPrompt } from './prompt.js'

export async function openTaskChat(task: TaskRecord) {
  const promptFile = await writeTaskPrompt(task)
  const args = [
    'chat',
    '--mode',
    'agent',
    '--new-window',
    '--add-file',
    promptFile,
    `请严格执行任务文件 ${promptFile}。完成后写入结果文件并调用 agent_complete_task。`,
  ]

  const child = spawn('code', args, {
    cwd: task.workspaceRoot,
    detached: true,
    stdio: 'ignore',
  })
  child.unref()

  return { taskId: task.id, promptFile, resultFile: task.resultFile }
}
