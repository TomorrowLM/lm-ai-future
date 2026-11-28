import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import path from 'node:path'

export type TopologyNode = {
  id: string; name: string; type: 'main' | 'subagent' | 'human' | 'custom'; description: string; template?: string
  dependencies: string[]; executionSession: string; status: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked'
  result?: string; updatedAt?: string; sessionId?: string; parentSessionId?: string; goalId?: string; diagnostic?: string
  position?: { x: number; y: number }
  hooks?: { event: string; action: string; nextCondition?: string; output?: { enabled: boolean; format: string; path: string; template: string } }[]
  outputs?: { path: string; format: string; description?: string }[]
}
export type TopologySession = {
  schemaVersion: 1; topologyId: string; name: string; statePath: string; sessionId?: string
  goal?: string; workspaceId?: string; workspacePath?: string
  createdAt: string; updatedAt: string; phase: 'draft' | 'running' | 'completed' | 'failed' | 'blocked'
  nodes: TopologyNode[]; lastError?: string; notificationError?: string
}

export const pageDevelopmentNodes = [
  ['需求分析', '澄清目标、范围、验收条件，输出需求规格。'],
  ['技术方案', '确定页面结构、数据/API 与技术决策，输出方案。'],
  ['实现计划', '拆分任务、依赖和验证方式，输出执行计划。'],
  ['编码实现', '按批准计划实现功能并记录变更。'],
  ['测试验收', '运行项目验证、手动检查交互并记录结果。'],
  ['收尾交付', '汇总产物、验证结果和遗留项。'],
] as const

export function createTopology(name: string, statePath: string, template: 'page-development-workflow' | 'custom'): TopologySession {
  const now = new Date().toISOString()
  const nodes: TopologyNode[] = template === 'page-development-workflow'
    ? pageDevelopmentNodes.map(([nodeName, description], index) => ({ id: `step-${index + 1}`, name: nodeName, type: index === 0 ? 'main' : 'subagent', description, dependencies: index ? [`step-${index}`] : [], executionSession: 'root', status: 'pending' }))
    : [{ id: 'step-1', name: '主会话', type: 'main', description: '', dependencies: [], executionSession: 'root', status: 'pending' }]
  return { schemaVersion: 1, topologyId: randomUUID(), name: name.trim(), statePath: validateStatePath(statePath), createdAt: now, updatedAt: now, phase: 'draft', nodes }
}

export function validateStatePath(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || !path.isAbsolute(value) || path.extname(value).toLowerCase() !== '.json') throw new Error('拓扑 JSON 地址必须是绝对路径并以 .json 结尾')
  return path.resolve(value)
}

export async function readTopology(statePath: string): Promise<TopologySession> {
  const value = JSON.parse(await readFile(validateStatePath(statePath), 'utf8')) as TopologySession
  if (value.schemaVersion !== 1 || typeof value.topologyId !== 'string' || !Array.isArray(value.nodes)) throw new Error('拓扑 JSON 格式不受支持')
  return value
}

export async function writeTopology(topology: TopologySession, allowCreate = false): Promise<void> {
  const filePath = validateStatePath(topology.statePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${topology.topologyId}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporary, 'wx')
    await handle.writeFile(`${JSON.stringify({ ...topology, updatedAt: new Date().toISOString() }, null, 2)}\n`, 'utf8')
    await handle.sync(); await handle.close(); handle = undefined
    if (allowCreate) {
      // link fails if another topology already owns the requested path.
      const { link } = await import('node:fs/promises')
      await link(temporary, filePath)
      await rm(temporary, { force: true })
    } else await rename(temporary, filePath)
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined)
    await rm(temporary, { force: true })
    throw error
  }
}
