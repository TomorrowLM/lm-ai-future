import { TaskOrchestrator } from './orchestrator.js'
                                                                                          
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { rm } from 'node:fs/promises'
import { readTopology, validateStatePath, writeTopology } from './topology-store.js'
                                                          
import { listFixedTemplates, readCustomTemplates, saveCustomTemplate } from './template-store.js'

export const name = 'dsh-task-orchestrator'
export const inject = ['connection', 'agents', 'subagents', 'sessionController', 'goals', 'workspaceRegistry']

                                          
                                                                                                             
                                                                          
                                                                     
                      
                                                                                                     
                                                                                                                                                                  
   
                                              
               
            
                         
                    
                         
                               
                                                      
                      
     
   
 

const API = '/api/dsh-orchestrator'

function jsonError(error         , status = 400)           {
  const message = error instanceof Error ? error.message : String(error)
  return Response.json({ error: message }, { status, headers: { 'cache-control': 'no-store' } })
}

async function readBody   (request         )             {
  const text = await request.text()
  if (text.length > 128_000) throw new Error('请求内容不能超过 128 KB')
  try { return JSON.parse(text)      } catch { throw new Error('请求正文必须是有效 JSON') }
}

export function apply(ctx             )       {
  const orchestrator = new TaskOrchestrator(ctx)
  const active = new Map                                                                                             ()
  const outputSchema = { type: 'object', properties: { status: { type: 'string', enum: ['succeeded', 'blocked', 'failed'] }, summary: { type: 'string' }, reason: { type: 'string' } }, required: ['status', 'summary', 'reason'], additionalProperties: false }
  const writes = new Map                       ()
  const save = (topology                 ) => {
    const snapshot = structuredClone(topology)
    const previous = writes.get(topology.statePath) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(() => writeTopology(snapshot))
    writes.set(topology.statePath, next)
    return next
  }
  function validate(topology                 )       {
    if (!topology.nodes.length || topology.nodes[0].type !== 'main' || topology.nodes.filter(n => n.type === 'main').length !== 1) throw new Error('流程需要唯一的主会话首节点')
    if (topology.nodes[0].dependencies.length) throw new Error('主会话首节点不能设置前置依赖')
    if (topology.nodes.some(node => Array.isArray(node.hooks) && node.hooks.length)) throw new Error('Hook 已配置，但事件触发与动作执行尚未接入；请先移除 Hook 再启动')
    if (topology.nodes.some(n => n.type !== 'main' && n.type !== 'subagent')) throw new Error('当前调度器仅支持主会话和子代理节点；人工确认与自定义节点尚未接入')
    const ids = new Set(topology.nodes.map(n => n.id))
    if (ids.size !== topology.nodes.length) throw new Error('节点 ID 重复')
    const visit = (id        , stack             , seen             )       => {
      if (stack.has(id)) throw new Error('前置依赖存在循环')
      if (seen.has(id)) return
      const node = topology.nodes.find(n => n.id === id)
      if (!node) throw new Error(`前置依赖节点不存在：${id}`)
      stack.add(id)
      for (const dep of node.dependencies) visit(dep, stack, seen)
      stack.delete(id); seen.add(id)
    }
    for (const node of topology.nodes) visit(node.id, new Set(), new Set())
  }
  async function notifyParent(run                               , node     , state             , reason        )                {
    if (node.type === 'main' || !run.topology.sessionId) return
    try {
      const instruction = state === '受阻' ? '处理完成后由用户在拓扑画布点击重试节点。' : '请保留失败状态，向用户说明原因并等待用户决定如何处理。'
      await ctx.sessionController.prompt({ requestId: randomUUID(), sessionId: run.topology.sessionId, mode: 'queue', content: [{ type: 'text', text: `拓扑节点“${node.name}”${state}：${reason}\n后续依赖节点已停止推进。${instruction}` }] }, new AbortController().signal)
      delete run.topology.notificationError
    } catch (error) {
      run.topology.notificationError = error instanceof Error ? error.message : String(error)
    }
    await save(run.topology)
  }
  async function fail(run                               , node     , error         )                {
    node.status = 'failed'; node.diagnostic = error instanceof Error ? error.message : String(error)
    node.updatedAt = new Date().toISOString(); run.topology.phase = 'failed'; run.topology.lastError = node.diagnostic
    await save(run.topology)
    active.delete(run.topology.statePath)
    await notifyParent(run, node, '失败', node.diagnostic)
  }
  async function blocked(run                               , node     , reason        )                {
    node.status = 'blocked'; node.diagnostic = reason; node.updatedAt = new Date().toISOString()
    run.topology.phase = 'blocked'; run.topology.lastError = reason
    await save(run.topology)
    await notifyParent(run, node, '受阻', reason)
  }
  async function dispatch(run                                                                                     )                {
    if (run.working) { run.dirty = true; return }
    run.working = true
    try {
      do {
        run.dirty = false
        const topology = run.topology
        if (topology.phase !== 'running') break
        const ready = topology.nodes.filter(node => node.type === 'subagent' && node.status === 'pending' && node.dependencies.every(id => topology.nodes.find(n => n.id === id)?.status === 'succeeded'))
        for (const node of ready) {
          if (topology.phase !== 'running') break
          const ownerId = !node.executionSession || node.executionSession === 'root' ? topology.sessionId : (() => {
            const ref = node.executionSession === 'parent' ? node.dependencies[0] : node.executionSession.replace(/^node:/, '')
            const owner = topology.nodes.find(n => n.id === ref)
            return owner?.type === 'main' ? topology.sessionId : owner?.sessionId
          })()
          const parent = ownerId && ctx.agents.get(ownerId)
          if (!parent) { await fail(run, node, '执行会话不可用或已结束，无法启动子代理'); break }
          node.status = 'running'; node.updatedAt = new Date().toISOString()
          await save(topology)
          try {
            const input = node.dependencies.map(id => topology.nodes.find(n => n.id === id)).filter(Boolean).map(n => `${n .name}：${n .result || n .description}`).join('\n')
            const child = await ctx.subagents.startActivation({ provider: 'spawn', parent, prompt: [{ type: 'text', text: `节点目标：${node.description || node.name}\n\n前置节点结果：\n${input}\n\n必须如实报告节点结果：目标未完成、等待权限或信息时 status 为 blocked；执行失败为 failed；只有目标完成才能为 succeeded。summary 说明实际结果，reason 说明受阻或失败原因（成功时为空字符串）。` }], label: node.name, name: `topology-${randomUUID().slice(0, 8)}`, delivery: 'caller', signal: new AbortController().signal, outputSchema })
            node.sessionId = child.childId; node.parentSessionId = ownerId; await save(topology)
            void child.result.then(async result => {
              if (!['running', 'blocked'].includes(topology.phase) || node.status !== 'running') return
              if (result.stopReason !== 'completed') { await fail(run, node, result.diagnostic || `子代理结束原因：${result.stopReason}`); return }
              const structured = result.structured       
              if (!structured || !['succeeded', 'blocked', 'failed'].includes(structured.status) || typeof structured.summary !== 'string' || typeof structured.reason !== 'string') { await blocked(run, node, '子代理未返回有效的结构化结果，无法确认节点是否完成'); return }
              node.result = structured.summary
              if (structured.status === 'blocked') { await blocked(run, node, structured.reason.trim() || '子代理报告受阻，未提供原因'); return }
              if (structured.status === 'failed') { await fail(run, node, structured.reason.trim() || '子代理报告节点失败'); return }
              if (!node.result.trim()) { await blocked(run, node, '子代理报告成功但未提供结果摘要，无法确认节点是否完成'); return }
              node.status = 'succeeded'; node.updatedAt = new Date().toISOString(); await save(topology); await dispatch(run)
            }).catch(async error => { if (node.status === 'running') await fail(run, node, error) })
          } catch (error) { await fail(run, node, error); break }
        }
        if (topology.phase === 'running' && topology.nodes.every(node => node.status === 'succeeded')) { topology.phase = 'completed'; await save(topology); active.delete(topology.statePath) }
      } while (run.dirty)
    } finally { run.working = false }
  }
  ctx.effect(() => ctx.on('goal/changed', ({ agent, change }     ) => {
    for (const run of active.values()) {
      const root = run.topology.nodes[0]
      if (agent.id !== run.topology.sessionId || change.ref?.id !== run.rootGoalId || !['running', 'blocked'].includes(root.status)) continue
      if (change.operation === 'complete' && change.goal?.phase === 'complete') {
        root.status = 'succeeded'; root.updatedAt = new Date().toISOString()
        if (run.topology.phase === 'blocked' && !run.topology.nodes.some(node => node.status === 'blocked')) { run.topology.phase = 'running'; delete run.topology.lastError }
        void save(run.topology).then(() => dispatch(run)).catch(error => fail(run, root, error))
      } else if (change.operation === 'block') {
        void blocked(run, root, change.goal?.blockedReason?.message || '主会话目标受阻')
      } else if (change.operation === 'clear') {
        void fail(run, root, '主会话目标已清除')
      }
    }
  }))
  const register = ctx.connection.fetch.register.bind(ctx.connection.fetch)
  ctx.effect(() => register({
    path: `${API}/position`, methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const input = await readBody                                                             (request)
        const statePath = validateStatePath(input.statePath)
        if (typeof input.nodeId !== 'string' || !Number.isFinite(input.x) || !Number.isFinite(input.y) || input.x < 0 || input.y < 0 || input.x > 100000 || input.y > 100000) throw new Error('节点坐标无效')
        const topology = active.get(statePath)?.topology ?? await readTopology(statePath)
        const node = topology.nodes.find(item => item.id === input.nodeId)
        if (!node) throw new Error('找不到节点')
        node.position = { x: input.x, y: input.y }
        await save(topology)
        return Response.json({ position: node.position }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
  ctx.effect(() => register({
    path: `${API}/topology`, methods: ['GET', 'POST', 'DELETE'], requestBody: 'buffered',
    fetch: async request => {
      try {
        if (request.method === 'DELETE') {
          const statePath = validateStatePath(new URL(request.url).searchParams.get('path'))
          if (active.has(statePath)) throw new Error('运行中的拓扑会话不能删除')
          const topology = await readTopology(statePath)
          if (topology.phase !== 'draft') throw new Error('只有草稿拓扑会话可以删除')
          await rm(statePath)
          return Response.json({ deleted: true, topologyId: topology.topologyId }, { headers: { 'cache-control': 'no-store' } })
        }
        if (request.method === 'GET') {
          const statePath = validateStatePath(new URL(request.url).searchParams.get('path'))
          return Response.json(await readTopology(statePath), { headers: { 'cache-control': 'no-store' } })
        }
        const topology = await readBody                 (request)
        topology.statePath = validateStatePath(topology.statePath)
        let allowCreate = false
        try {
          const existing = await readTopology(topology.statePath)
          if (existing.topologyId !== topology.topologyId) throw new Error('该 JSON 地址已被其他拓扑会话使用')
        } catch (error) {
          if ((error                         ).code !== 'ENOENT') throw error
          allowCreate = true
        }
        await writeTopology(topology, allowCreate)
        return Response.json(topology, { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
  ctx.effect(() => register({
    path: `${API}/retry-node`, methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const input = await readBody                                       (request)
        const statePath = validateStatePath(input.statePath)
        const run = active.get(statePath)
        if (!run) throw new Error('当前服务没有该流程的活动调度记录；服务重启后的恢复暂不支持')
        const node = run.topology.nodes.find(item => item.id === input.nodeId)
        if (!node || node.type !== 'subagent' || node.status !== 'blocked') throw new Error('只能重试受阻的子代理节点')
        if (run.working) throw new Error('调度器正在处理节点，请稍后重试')
        node.status = 'pending'; delete node.diagnostic
        run.topology.phase = run.topology.nodes.some(item => item.status === 'blocked') ? 'blocked' : 'running'
        if (run.topology.phase === 'running') { delete run.topology.lastError; delete run.topology.notificationError }
        await save(run.topology)
        if (run.topology.phase === 'running') void dispatch(run).catch(error => fail(run, node, error))
        return Response.json(run.topology, { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
  ctx.effect(() => register({
    path: `${API}/start`, methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const input = await readBody                                     (request)
        const statePath = validateStatePath(input.statePath)
        const topology = await readTopology(statePath)
        validate(topology)
        if (topology.phase === 'running' || topology.phase === 'blocked') throw new Error('该拓扑会话正在运行或等待处理，请使用节点重试')
        const goal = input.goal.trim()
        if (!goal) throw new Error('请填写主会话目标')
        if (!topology.workspaceId) throw new Error('请先为拓扑选择工作区并保存')
        const workspace = ctx.workspaceRegistry.get(topology.workspaceId)
        if (!workspace) throw new Error('所选工作区不存在，请重新选择并保存')
        const session = topology.sessionId ? { sessionId: topology.sessionId } : await ctx.sessionController.create({ workspaceId: topology.workspaceId })
        topology.sessionId = session.sessionId
        const agent = ctx.agents.get(session.sessionId)
        if (!agent) throw new Error('主会话的 Agent 不可用，请先打开该会话')
        const actualCwd = (agent       ).session?.header?.cwd
        const comparePath = (value        ) => { const resolved = path.resolve(value); return process.platform === 'win32' ? resolved.toLowerCase() : resolved }
        if (typeof actualCwd !== 'string' || comparePath(actualCwd) !== comparePath(workspace.path)) throw new Error('现有主会话的工作目录与所选工作区不一致，请使用该工作区创建新的拓扑会话')
        topology.workspacePath = workspace.path
        if (!ctx.subagents.getProvider('spawn')) throw new Error('DSH 未注册 spawn 子代理提供方')
        const existingGoal = ctx.goals.get(agent)
        if (existingGoal && existingGoal.phase !== 'complete') throw new Error('主会话已有未完成的 Goal，请先处理该目标')
        for (const node of topology.nodes) { node.status = 'pending'; delete node.result; delete node.diagnostic; delete node.goalId; if (node.type !== 'main') { delete node.sessionId; delete node.parentSessionId } }
        const root = topology.nodes[0]
        const objective = root.description.trim() || goal
        const goalView = ctx.goals.create(agent, { objective })
        root.goalId = goalView.id
        topology.goal = goal
        topology.phase = 'running'
        delete topology.lastError
        if (root) { root.status = 'running'; root.updatedAt = new Date().toISOString() }
        // Save the new DSH session id before sending the prompt, so a rejected prompt does not lose the binding.
        await writeTopology(topology)
        const run = { topology, rootGoalId: goalView.id, working: false, dirty: false }
        active.set(statePath, run)
        try {
          await ctx.sessionController.prompt({
            requestId: randomUUID(), sessionId: session.sessionId, mode: 'queue',
            content: [{ type: 'text', text: `流程总目标：${goal}\n\n当前节点：${root.name}\n当前节点目标：${objective}\n请只完成当前节点目标，完成后将当前 Goal 标记为 complete。后续节点由编排器调度。` }],
          }, request.signal)
          void dispatch(run).catch(error => fail(run, root, error))
        } catch (error) {
          active.delete(statePath)
          topology.phase = 'failed'; topology.lastError = error instanceof Error ? error.message : String(error)
          if (root) { root.status = 'failed'; root.updatedAt = new Date().toISOString() }
          await writeTopology(topology)
          throw error
        }
        return Response.json(topology, { status: 202, headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
  ctx.effect(() => register({
    path: `${API}/templates`, methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        if (request.method === 'GET') return Response.json({ fixed: listFixedTemplates(), custom: await readCustomTemplates() }, { headers: { 'cache-control': 'no-store' } })
        const template = await saveCustomTemplate(await readBody(request))
        return Response.json(template, { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
  ctx.effect(() => register({
    path: `${API}/status`, methods: ['GET'], requestBody: 'buffered',
    fetch: async () => Response.json(
      { service: name, status: 'ready', stage: 'topology-workbench', provider: 'sessionController' },
      { headers: { 'cache-control': 'no-store' } },
    ),
  }))
  ctx.effect(() => register({
    path: `${API}/runs`, methods: ['GET', 'POST'], requestBody: 'buffered',
    fetch: async request => {
      if (request.method === 'POST') {
        try {
          const run = await orchestrator.start(await readBody               (request))
          return Response.json(run, { status: 202, headers: { 'cache-control': 'no-store' } })
        } catch (error) { return jsonError(error) }
      }
      const runId = new URL(request.url).searchParams.get('runId')
      if (!runId) return jsonError(new Error('缺少 runId'), 400)
      const run = orchestrator.get(runId)
      return run
        ? Response.json(run, { headers: { 'cache-control': 'no-store' } })
        : jsonError(new Error('找不到本进程中的运行记录'), 404)
    },
  }))
  ctx.effect(() => register({
    path: `${API}/approval`, methods: ['POST'], requestBody: 'buffered',
    fetch: async request => {
      try {
        const decision = await orchestrator.decide(await readBody               (request))
        return Response.json(decision, { headers: { 'cache-control': 'no-store' } })
      } catch (error) { return jsonError(error) }
    },
  }))
}
