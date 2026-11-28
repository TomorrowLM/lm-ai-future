import { randomUUID } from 'node:crypto'
import { open, mkdir, rename, rm } from 'node:fs/promises'
import path from 'node:path'

export type NodeStatus = 'running' | 'succeeded' | 'failed' | 'waiting-approval' | 'pending' | 'rejected'
export type RunPhase = 'running' | 'waiting-approval' | 'completed' | 'failed' | 'rejected'

export interface RunNode {
  id: string
  name: string
  type: 'main-session' | 'subagent' | 'human-confirmation'
  status: NodeStatus
  sessionId?: string
  childSessionId?: string
  resultText?: string
  diagnostic?: string
  updatedAt: string
}

export interface RunRecord {
  schemaVersion: 1
  runId: string
  phase: RunPhase
  sessionId: string
  task: string
  statePath: string
  createdAt: string
  updatedAt: string
  nodes: RunNode[]
}

export interface SubagentResult {
  stopReason: string
  output: readonly { type?: string; text?: string }[]
  diagnostic?: string
  structured?: unknown
}

export interface SubagentActivation {
  childId: string
  result: Promise<SubagentResult>
}

export interface OrchestratorContext {
  agents: { get: (sessionId: string) => unknown }
  subagents: {
    getProvider: (name: string) => unknown
    startActivation: (spec: {
      provider: string
      parent: unknown
      prompt: { type: 'text'; text: string }[]
      label: string
      name: string
      delivery: 'caller'
      signal: AbortSignal
      outputSchema?: Record<string, unknown>
    }) => Promise<SubagentActivation>
  }
}

export interface StartRunInput {
  sessionId: string
  task: string
  statePath: string
}

export interface ApprovalInput {
  runId: string
  decision: 'approved' | 'rejected'
  note?: string
}

const MAX_TASK_LENGTH = 12_000
const MAX_NOTE_LENGTH = 2_000

function requiredText(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${name} 必须是 1-${maxLength} 个字符的文本`)
  }
  return value.trim()
}

function assertAbsoluteJsonPath(value: unknown): string {
  const filePath = requiredText(value, 'statePath', 2_000)
  if (!path.isAbsolute(filePath) || path.extname(filePath).toLowerCase() !== '.json') {
    throw new Error('运行状态地址必须是绝对路径，并以 .json 结尾')
  }
  return path.resolve(filePath)
}

function createInitialRecord(input: StartRunInput): RunRecord {
  const now = new Date().toISOString()
  const runId = randomUUID()
  return {
    schemaVersion: 1,
    runId,
    phase: 'running',
    sessionId: requiredText(input.sessionId, 'sessionId', 256),
    task: requiredText(input.task, 'task', MAX_TASK_LENGTH),
    statePath: assertAbsoluteJsonPath(input.statePath),
    createdAt: now,
    updatedAt: now,
    nodes: [
      { id: 'main', name: '主会话', type: 'main-session', status: 'succeeded', sessionId: input.sessionId.trim(), updatedAt: now },
      { id: 'subagent', name: '子代理', type: 'subagent', status: 'running', sessionId: input.sessionId.trim(), updatedAt: now },
      { id: 'approval', name: '人工确认', type: 'human-confirmation', status: 'pending', updatedAt: now },
    ],
  }
}

function outputText(result: SubagentResult): string {
  const text = result.output
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n')
    .trim()
  return text
}

export class TaskOrchestrator {
  private readonly runs = new Map<string, RunRecord>()
  private readonly ownedPaths = new Set<string>()
  private readonly persistedSnapshots = new Map<string, RunRecord>()
  private readonly ctx: OrchestratorContext

  constructor(ctx: OrchestratorContext) { this.ctx = ctx }

  async start(input: StartRunInput): Promise<RunRecord> {
    const record = createInitialRecord(input)
    const parent = this.ctx.agents.get(record.sessionId)
    if (!parent) throw new Error('找不到该主会话的活动 Agent；请填写当前已打开的 DSH 会话 ID')
    if (!this.ctx.subagents.getProvider('spawn')) throw new Error('DSH 未注册 spawn 子代理提供方')
    if (this.ownedPaths.has(record.statePath)) throw new Error('当前中台进程已占用该运行状态 JSON 地址')

    await mkdir(path.dirname(record.statePath), { recursive: true })
    const handle = await open(record.statePath, 'wx')
    this.ownedPaths.add(record.statePath)
    try {
      await handle.writeFile(`${JSON.stringify(record, null, 2)}\n`, 'utf8')
      await handle.sync()
    } catch (error) {
      await handle.close()
      this.ownedPaths.delete(record.statePath)
      await rm(record.statePath, { force: true })
      throw error
    }
    await handle.close()
    this.runs.set(record.runId, record)
    this.persistedSnapshots.set(record.runId, structuredClone(record))

    try {
      const activation = await this.ctx.subagents.startActivation({
        provider: 'spawn',
        parent,
        prompt: [{ type: 'text', text: record.task }],
        label: '拓扑编排子代理',
        name: `orchestrator-${record.runId.slice(0, 8)}`,
        delivery: 'caller',
        signal: new AbortController().signal,
      })
      const child = record.nodes.find(node => node.id === 'subagent')!
      child.childSessionId = activation.childId
      child.updatedAt = new Date().toISOString()
      await this.persist(record)
      void activation.result.then(
        result => this.settleSubagent(record.runId, result),
        error => this.failSubagent(record.runId, error),
      ).catch(() => undefined)
    } catch (error) {
      await this.failSubagent(record.runId, error)
    }
    return structuredClone(record)
  }

  get(runId: string): RunRecord | undefined {
    const run = this.runs.get(runId)
    return run ? structuredClone(run) : undefined
  }

  async decide(input: ApprovalInput): Promise<RunRecord> {
    const run = this.runs.get(requiredText(input.runId, 'runId', 128))
    if (!run) throw new Error('找不到本次运行；当前 PoC 只支持本进程内的活动运行')
    if (run.phase !== 'waiting-approval') throw new Error('当前流程尚未等待人工确认')
    const note = input.note === undefined || input.note === '' ? '' : requiredText(input.note, 'note', MAX_NOTE_LENGTH)
    const approved = input.decision === 'approved'
    if (!approved && input.decision !== 'rejected') throw new Error('decision 只能是 approved 或 rejected')
    const approval = run.nodes.find(node => node.id === 'approval')!
    approval.status = approved ? 'succeeded' : 'rejected'
    if (note) approval.diagnostic = note
    approval.updatedAt = new Date().toISOString()
    run.phase = approved ? 'completed' : 'rejected'
    run.updatedAt = approval.updatedAt
    await this.persist(run)
    return structuredClone(run)
  }

  private async settleSubagent(runId: string, result: SubagentResult): Promise<void> {
    const run = this.runs.get(runId)
    if (!run || run.phase !== 'running') return
    const node = run.nodes.find(item => item.id === 'subagent')!
    const text = outputText(result)
    if (result.stopReason !== 'completed' || !text) {
      await this.failSubagent(runId, result.diagnostic ?? (result.stopReason !== 'completed' ? `子代理结束原因：${result.stopReason}` : '子代理没有返回文本结果'))
      return
    }
    node.status = 'succeeded'
    node.resultText = text
    if (result.structured !== undefined) node.resultText += `\n\n结构化结果：\n${JSON.stringify(result.structured, null, 2)}`
    node.updatedAt = new Date().toISOString()
    const approval = run.nodes.find(item => item.id === 'approval')!
    approval.status = 'waiting-approval'
    approval.updatedAt = node.updatedAt
    run.phase = 'waiting-approval'
    run.updatedAt = node.updatedAt
    await this.persist(run)
  }

  private async failSubagent(runId: string, error: unknown): Promise<void> {
    const run = this.runs.get(runId)
    if (!run || run.phase !== 'running') return
    const node = run.nodes.find(item => item.id === 'subagent')!
    node.status = 'failed'
    node.diagnostic = error instanceof Error ? error.message : String(error)
    node.updatedAt = new Date().toISOString()
    run.phase = 'failed'
    run.updatedAt = node.updatedAt
    await this.persist(run)
  }

  private async persist(run: RunRecord): Promise<void> {
    run.updatedAt = new Date().toISOString()
    const temporary = `${run.statePath}.${run.runId}.tmp`
    const previous = this.persistedSnapshots.get(run.runId)
    let handle: Awaited<ReturnType<typeof open>> | undefined
    try {
      handle = await open(temporary, 'wx')
      await handle.writeFile(`${JSON.stringify(run, null, 2)}\n`, 'utf8')
      await handle.sync()
      await handle.close()
      handle = undefined
      await rename(temporary, run.statePath)
      this.persistedSnapshots.set(run.runId, structuredClone(run))
    } catch (error) {
      if (handle) await handle.close().catch(() => undefined)
      await rm(temporary, { force: true })
      if (previous) Object.assign(run, structuredClone(previous))
      throw error
    }
  }
}
