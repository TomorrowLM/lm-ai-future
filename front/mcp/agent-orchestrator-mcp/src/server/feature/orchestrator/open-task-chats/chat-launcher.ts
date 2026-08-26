import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants } from 'node:fs'
import type { TaskRecord } from '../../../base/task-store/index.js'

const macOSCodeCli = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'

async function resolveCodeCli() {
  if (process.env.CODE_CLI) return process.env.CODE_CLI

  try {
    await access(macOSCodeCli, constants.X_OK)
    return macOSCodeCli
  } catch {
    return 'code'
  }
}

/**
 * 构造子聊天窗口的独立执行说明。
 */
export function buildInstruction(task: TaskRecord): string {
  if (task.status === 'rework_requested' && task.rework?.prompt) {
    return task.rework.prompt
  }

  const lines = ['请严格执行已挂载的任务输入文件。']

  if (task.prompt?.trim()) {
    lines.push('', '任务要求：', task.prompt)
  }

  if (task.status === 'rework_requested') {
    const reworkReason = task.reviewNote ?? task.error
    if (reworkReason?.trim()) {
      lines.push('', `本次为返工任务，返工原因：${reworkReason}`)
    }
  }

  lines.push(
    '',
    `如需生成视觉/头脑风暴文件，请放入 ${task.visualDir}。完成后写入结果文件并调用 agent_complete_task。`,
  )

  return lines.join('\n')
}

export function resolveTaskInputFiles(task: TaskRecord): string[] {
  const legacyReworkFile = task.rework?.promptFile ? [task.rework.promptFile] : []
  const reworkInputFiles = task.status === 'rework_requested'
    ? (task.rework?.inputFiles ?? legacyReworkFile)
    : []

  return [...new Set([...task.inputFiles, ...reworkInputFiles])]
}

export async function openTaskChat(task: TaskRecord) {
  const inputFiles = resolveTaskInputFiles(task)

  if (inputFiles.length === 0) {
    throw new Error(`任务 ${task.id} 没有关联的输入文件`)
  }

  const args = [
    'chat',
    '--mode',
    'agent',
    '--reuse-window',
  ]

  for (const inputFile of inputFiles) {
    args.push('--add-file', inputFile)
  }

  args.push(buildInstruction(task))

  const codeCli = await resolveCodeCli()
  const child = spawn(codeCli, args, {
    cwd: task.workspaceRoot,
    detached: true,
    stdio: 'ignore',
  })

  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', (error) => {
      reject(new Error(`无法启动 VS Code CLI：${error.message}`))
    })
  })

  child.unref()

  // 等待 VS Code CLI 将命令送达主进程并完成 newChat，
  // 避免连续打开多个任务时因并发竞态被合并进同一会话
  await new Promise<void>((resolve) => setTimeout(resolve, 800))

  return { taskId: task.id, resultFile: task.resultFile }
}
