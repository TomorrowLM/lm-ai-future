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

export async function openTaskChat(task: TaskRecord) {
  const specFile = task.inputFiles[0]

  if (!specFile) {
    throw new Error(`任务 ${task.id} 没有关联的 spec 文件`)
  }

  const args = [
    'chat',
    '--mode',
    'agent',
    '--reuse-window',
    '--add-file',
    specFile,
    `请严格执行 spec 文件 ${specFile}。完成后写入结果文件并调用 agent_complete_task。`,
  ]

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

  return { taskId: task.id, resultFile: task.resultFile, codeCli, args }
}
