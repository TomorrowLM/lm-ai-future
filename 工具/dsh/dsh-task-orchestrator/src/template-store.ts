import { randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { TopologyNode } from './topology-store.js'
import { pageDevelopmentNodes } from './topology-store.js'

export type TemplateNode = Pick<TopologyNode, 'id' | 'name' | 'type' | 'description' | 'template' | 'dependencies' | 'executionSession' | 'hooks' | 'position' | 'outputs'>
export type CustomTopologyTemplate = {
  id: string; name: string; description: string; createdAt: string; updatedAt: string; nodes: TemplateNode[]
}

const fixedTemplates = [
  {
    id: 'page-development-workflow', name: '页面开发工作流', description: '按需求、方案、计划、实现、验收和交付推进页面开发。',
    nodes: pageDevelopmentNodes.map(([name, description], index) => ({
      id: `step-${index + 1}`, name, type: index === 0 ? 'main' as const : 'subagent' as const, description,
      dependencies: index ? [`step-${index}`] : [], executionSession: 'root', hooks: [],
      outputs: [
        [{ path: 'docs/design/{date}-{topic}-design/index.md', format: 'Markdown' }, { path: 'docs/pages/pages.yaml', format: 'YAML' }],
        [{ path: 'docs/design/{date}-{topic}-design/index.md', format: 'Markdown' }],
        [{ path: 'spec/implementation-plan.md 或 spec/NNx-*-spec.md', format: 'Markdown' }, { path: 'tasks.json', format: 'JSON' }],
        [{ path: 'results/*-result.md', format: 'Markdown' }, { path: 'reworks/*（返工时）', format: 'Markdown' }],
        [{ path: 'evidence/phase5-verification.md', format: 'Markdown' }],
        [{ path: '交付摘要', format: 'Markdown' }, { path: 'pages.yaml 同步结果（如适用）', format: 'YAML' }],
      ][index],
    })),
  },
  {
    id: 'blank-topology', name: '空白拓扑模板', description: '从一个主会话节点开始，自行添加后续节点。',
    nodes: [{ id: 'step-1', name: '主会话', type: 'main' as const, description: '', dependencies: [] as string[], executionSession: 'root', hooks: [], outputs: [] }],
  },
]

export function templateStorePath(): string {
  return path.join(os.homedir(), '.dsh', 'task-ort', 'templates.json')
}

export function listFixedTemplates() { return structuredClone(fixedTemplates) }

function validateTemplate(input: any): Omit<CustomTopologyTemplate, 'createdAt' | 'updatedAt'> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('模板内容无效')
  if (typeof input.id !== 'string' || !input.id.trim() || input.id.length > 100) throw new Error('模板 ID 无效')
  if (['page-development-workflow', 'blank-topology'].includes(input.id)) throw new Error('固定模板不能编辑')
  if (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120) throw new Error('模板名称不能为空且不能超过 120 个字符')
  if (typeof input.description !== 'string' || input.description.length > 4000) throw new Error('模板说明无效')
  if (!Array.isArray(input.nodes) || input.nodes.length < 1 || input.nodes.length > 100) throw new Error('模板节点数量必须在 1 到 100 之间')
  const nodes = input.nodes.map((node: any) => {
    if (!node || typeof node.id !== 'string' || !node.id || typeof node.name !== 'string' || !node.name.trim()) throw new Error('模板节点缺少 ID 或名称')
    if (!['main', 'subagent', 'human', 'custom'].includes(node.type)) throw new Error(`节点类型无效：${node.id}`)
    if (typeof node.description !== 'string' || !Array.isArray(node.dependencies) || node.dependencies.some((id: any) => typeof id !== 'string')) throw new Error(`节点配置无效：${node.id}`)
    return {
      id: node.id, name: node.name.trim(), type: node.type, description: node.description,
      ...(typeof node.template === 'string' ? { template: node.template } : {}),
      dependencies: [...new Set(node.dependencies)], executionSession: typeof node.executionSession === 'string' ? node.executionSession : 'root',
      hooks: Array.isArray(node.hooks) ? node.hooks : [], outputs: Array.isArray(node.outputs) ? node.outputs : [],
      ...(node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y) ? { position: { x: node.position.x, y: node.position.y } } : {}),
    }
  })
  if (nodes[0].type !== 'main' || nodes.filter((node: any) => node.type === 'main').length !== 1 || nodes[0].dependencies.length) throw new Error('模板必须以无前置依赖的主会话节点开始，且只能有一个主会话节点')
  const ids = new Set(nodes.map((node: any) => node.id))
  if (ids.size !== nodes.length) throw new Error('模板中存在重复的节点 ID')
  for (const node of nodes) for (const dependency of node.dependencies) if (!ids.has(dependency) || dependency === node.id) throw new Error(`节点“${node.name}”包含无效的前置依赖`)
  const visiting = new Set<string>(), visited = new Set<string>()
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error('模板前置依赖存在循环')
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of nodes.find((node: any) => node.id === id).dependencies) visit(dependency)
    visiting.delete(id); visited.add(id)
  }
  for (const node of nodes) visit(node.id)
  return { id: input.id.trim(), name: input.name.trim(), description: input.description, nodes }
}

export async function readCustomTemplates(): Promise<CustomTopologyTemplate[]> {
  try {
    const parsed = JSON.parse(await readFile(templateStorePath(), 'utf8'))
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.templates)) throw new Error('模板库 JSON 格式不受支持')
    return parsed.templates.map((template: any) => ({ ...validateTemplate(template), createdAt: template.createdAt, updatedAt: template.updatedAt }))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
}

export async function saveCustomTemplate(input: unknown): Promise<CustomTopologyTemplate> {
  const validated = validateTemplate(input)
  const filePath = templateStorePath()
  const templates = await readCustomTemplates()
  const previous = templates.find(template => template.id === validated.id)
  const now = new Date().toISOString()
  const saved = { ...validated, createdAt: previous?.createdAt || now, updatedAt: now }
  const next = [...templates.filter(template => template.id !== saved.id), saved]
  await mkdir(path.dirname(filePath), { recursive: true })
  const temporary = `${filePath}.${randomUUID()}.tmp`
  let handle: Awaited<ReturnType<typeof open>> | undefined
  try {
    handle = await open(temporary, 'wx')
    await handle.writeFile(`${JSON.stringify({ schemaVersion: 1, templates: next }, null, 2)}\n`, 'utf8')
    await handle.sync(); await handle.close(); handle = undefined
    await rename(temporary, filePath)
  } catch (error) {
    if (handle) await handle.close().catch(() => undefined)
    await rm(temporary, { force: true })
    throw error
  }
  return saved
}
