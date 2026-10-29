import { spawn } from 'node:child_process'
import { access, stat } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolveInsideWorkspace, type TaskRecord } from '../../../base/task-store/index.js'

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
  const activeRework = task.status === 'rework_requested' ? task.rework : undefined
  const taskDescription = activeRework?.task ?? task.task ?? task.prompt ?? '请根据参考资源完成子任务。'
  const notes = activeRework?.notes
    ?? activeRework?.prompt
    ?? task.notes
    ?? (task.task ? task.prompt : undefined)
  const taskResources = task.resources && task.resources.length > 0 ? task.resources : task.inputFiles ?? []
  const reworkResources = activeRework?.resources && activeRework.resources.length > 0
    ? activeRework.resources
    : activeRework?.inputFiles ?? []
  const resources = [
    ...taskResources,
    ...reworkResources,
  ]
  const lines = [`【${task.title}】`, '', '## 子任务', taskDescription]

  lines.push('', '## 参考资源')
  lines.push(...(resources.length > 0 ? resources.map((resource) => `- ${resource}`) : ['- 无']))

  if (notes?.trim()) {
    lines.push('', '## 补充说明', notes)
  }

  if (activeRework?.reason?.trim()) {
    lines.push('', `本次为返工任务，返工原因：${activeRework.reason}`)
  }

  lines.push(
    '',
    '## 完成协议',
    `结果文件：${task.resultFile}`,
    `视觉产物目录：${task.visualDir ?? '未指定'}`,
    '完成后必须调用 agent_complete_task，并使用以下固定参数：',
    `workspaceRoot: ${task.workspaceRoot}`,
    `taskId: ${task.id}`,
    'result: 你的 Markdown 完成报告',
  )

  return lines.join('\n')
}

async function resolveExistingTaskFile(task: TaskRecord, value: string | undefined) {
  if (!value) return undefined

  try {
    const filePath = resolveInsideWorkspace(task.workspaceRoot, value)
    const fileStat = await stat(filePath)
    return fileStat.isFile() ? filePath : undefined
  } catch {
    return undefined
  }
}

export async function resolveTaskInputFiles(task: TaskRecord): Promise<string[]> {
  const legacyReworkFile = task.rework?.promptFile ? [task.rework.promptFile] : []
  const activeRework = task.status === 'rework_requested' ? task.rework : undefined
  const taskFile = await resolveExistingTaskFile(task, task.task)
  const reworkTaskFile = await resolveExistingTaskFile(task, activeRework?.task)
  const resources = task.resources && task.resources.length > 0 ? task.resources : task.inputFiles ?? []
  const reworkResources = activeRework?.resources && activeRework.resources.length > 0
    ? activeRework.resources
    : activeRework?.inputFiles ?? legacyReworkFile

  return [...new Set([
    ...(taskFile ? [taskFile] : []),
    ...resources,
    ...(reworkTaskFile ? [reworkTaskFile] : []),
    ...reworkResources,
  ])]
}

export async function openTaskChat(task: TaskRecord) {
  const inputFiles = await resolveTaskInputFiles(task)

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
