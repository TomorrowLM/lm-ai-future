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
 * 构造子聊天窗口指令：加载 spec 文件 + 任务 prompt + 返工原因。
 * 任务 prompt 含依赖文件、允许修改范围、特殊约束等关键规则，必须传给子 Agent；
 * 返工任务额外附带审查意见，避免子 Agent 照原 spec 重做。
 */
function buildInstruction(task: TaskRecord, specFile: string): string {
  const lines = [`请严格执行 spec 文件 ${specFile}。`]

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
    buildInstruction(task, specFile),
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

  return { taskId: task.id, resultFile: task.resultFile }
}
