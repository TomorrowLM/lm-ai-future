import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { apply } from '../lib/index.js'

test('registers the orchestration HTTP routes and disposes them with the plugin', async () => {
  const routes = []
  const disposers = []
  const ctx = {
    agents: { get() { return undefined } },
    subagents: { getProvider() { return undefined }, async startActivation() { throw new Error('not used') } },
    sessionController: { async create() { return { sessionId: 'new-main' } }, async prompt() { return { accepted: true } } },
    on() { return () => {} },
    effect(register) { disposers.push(register()) },
    connection: { fetch: { register(value) { routes.push(value); return () => { value.disposed = true } } } },
  }
  apply(ctx)
  assert.deepEqual(routes.map(route => route.path), [
    '/api/dsh-orchestrator/topology', '/api/dsh-orchestrator/start',
    '/api/dsh-orchestrator/status', '/api/dsh-orchestrator/runs', '/api/dsh-orchestrator/approval',
  ])
  const route = routes.find(value => value.path.endsWith('/status'))
  assert.deepEqual(route.methods, ['GET'])
  const response = await route.fetch(new Request('http://localhost/api/dsh-orchestrator/status'))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { service: 'dsh-task-orchestrator', status: 'ready', stage: 'topology-workbench', provider: 'sessionController' })
  for (const dispose of disposers) dispose()
  assert.ok(routes.every(route => route.disposed), 'all routes must be removed when the plugin unloads')
})

test('deletes draft topology JSON and rejects non-draft topology deletion', async t => {
  const folder = await mkdtemp(path.join(tmpdir(), 'dsh-topology-delete-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const routes = []
  const ctx = {
    agents: { get() { return undefined } },
    subagents: { getProvider() { return undefined }, async startActivation() { throw new Error('not used') } },
    sessionController: { async create() { return { sessionId: 'new-main' } }, async prompt() { return { accepted: true } } },
    on() { return () => {} },
    effect(register) { register() },
    connection: { fetch: { register(route) { routes.push(route); return () => {} } } },
  }
  apply(ctx)
  const route = routes.find(value => value.path.endsWith('/topology'))
  const statePath = path.join(folder, 'draft.json')
  const topology = { schemaVersion: 1, topologyId: 'draft-1', name: 'Draft', statePath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phase: 'draft', nodes: [{ id: 'step-1', name: 'Main', type: 'main', description: '', dependencies: [], executionSession: 'root', status: 'pending' }] }
  await route.fetch(new Request('http://localhost/api/dsh-orchestrator/topology', { method: 'POST', body: JSON.stringify(topology) }))
  const deleted = await route.fetch(new Request(`http://localhost/api/dsh-orchestrator/topology?path=${encodeURIComponent(statePath)}`, { method: 'DELETE' }))
  assert.equal(deleted.status, 200)
  await assert.rejects(readFile(statePath), { code: 'ENOENT' })
  topology.phase = 'completed'
  await route.fetch(new Request('http://localhost/api/dsh-orchestrator/topology', { method: 'POST', body: JSON.stringify(topology) }))
  const rejected = await route.fetch(new Request(`http://localhost/api/dsh-orchestrator/topology?path=${encodeURIComponent(statePath)}`, { method: 'DELETE' }))
  assert.equal(rejected.status, 400)
})

test('creates and binds a DSH main session before submitting the topology goal', async t => {
  const folder = await mkdtemp(path.join(tmpdir(), 'dsh-topology-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const routes = []
  let created = 0
  let prompt
  const ctx = {
    agents: { get() { return undefined } },
    subagents: { getProvider() { return undefined }, async startActivation() { throw new Error('not used') } },
    sessionController: { async create() { created++; return { sessionId: 'new-main' } }, async prompt(value, signal) { signal.throwIfAborted(); prompt = value; return { accepted: true } } },
    on() { return () => {} },
    effect(register) { register() },
    connection: { fetch: { register(route) { routes.push(route); return () => {} } } },
  }
  apply(ctx)
  const topologyRoute = routes.find(value => value.path.endsWith('/topology'))
  const startRoute = routes.find(value => value.path.endsWith('/start'))
  const statePath = path.join(folder, 'topology.json')
  const topology = { schemaVersion: 1, topologyId: 'top-1', name: '页面开发', statePath, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), phase: 'draft', nodes: [{ id: 'step-1', name: '需求分析', type: 'main', description: '分析需求', dependencies: [], executionSession: 'root', status: 'pending' }] }
  const saved = await topologyRoute.fetch(new Request('http://localhost/api/dsh-orchestrator/topology', { method: 'POST', body: JSON.stringify(topology) }))
  assert.equal(saved.status, 200)
  const response = await startRoute.fetch(new Request('http://localhost/api/dsh-orchestrator/start', { method: 'POST', body: JSON.stringify({ statePath, goal: '完成页面需求' }) }))
  assert.equal(response.status, 202)
  assert.equal(created, 1)
  assert.equal(prompt.sessionId, 'new-main')
  assert.match(prompt.content[0].text, /完成页面需求/)
  assert.equal(JSON.parse(await readFile(statePath, 'utf8')).sessionId, 'new-main')
})
