window.__ModuleLoader__.load({ id: 'dsh-task-orchestrator', factory: (require) => {
function groupTopologies(items       , workspaces       ) {
  const groups = new Map             ()
  for (const item of items) {
    const workspace = workspaces.find((candidate     ) => candidate.workspaceId === item.workspaceId && item.workspaceId)
    const path = item.workspacePath || workspace?.path || ''
    const key = item.workspaceId ? `id:${item.workspaceId}` : path ? `path:${path}` : 'unknown'
    if (!groups.has(key)) groups.set(key, { key, path, title: workspace?.title || path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || (item.workspaceId ? '未知工作区' : '未指定工作区'), items: [] })
    groups.get(key).items.push(item)
  }
  const result = Array.from(groups.values())
  for (const group of result) group.items.sort((a     , b     ) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  const newest = result.reduce((best, group) => !best || (Date.parse(group.items[0].createdAt) || 0) > (Date.parse(best.items[0].createdAt) || 0) ? group : best, null)
  for (const group of result) group.defaultOpen = group === newest
  return result.sort((a, b) => a.key === 'unknown' ? 1 : b.key === 'unknown' ? -1 : a.title.localeCompare(b.title, 'zh-CN'))
}

                                           
                                                                        

const React = require('react')
const h = React.createElement
const API = '/api/dsh-orchestrator'

const colors = {
  ink: '#263653', muted: '#8595ad', line: '#dce4f0', primary: '#7182e8',
  pale: '#edf0ff', green: '#60c6a3', red: '#dd7777', gray: '#b9c4d4',
}
const stages = [
  ['需求分析', '澄清目标、范围和验收条件，输出需求规格。'],
  ['技术方案', '确定页面结构、数据/API 与技术决策，输出方案。'],
  ['实现计划', '拆分任务、依赖和验证方式，输出执行计划。'],
  ['编码实现', '按批准计划实现功能并记录变更。'],
  ['测试验收', '运行项目验证、手动检查交互并记录结果。'],
  ['收尾交付', '汇总产物、验证结果和遗留项。'],
]
const nodeKinds                                                                     = {
  main: { label: '主会话', icon: '✦', className: 'main' },
  subagent: { label: '子代理', icon: '✧', className: 'agent' },
  human: { label: '人工确认', icon: '♙', className: 'approval' },
  custom: { label: '自定义节点', icon: '◇', className: 'custom' },
}
const hookEvents = [
  { group: '节点生命周期（中台定义）', items: [['orchestrator/node-before', '节点开始前'], ['orchestrator/node-end', '节点结束']] },
  { group: 'Agent 生命周期', items: [['agent/created', 'Agent 创建完成'], ['agent/disposed', 'Agent 已释放'], ['agent/error', 'Agent 发生错误'], ['agent/status', 'Agent 状态变化'], ['agent/pre-step', '步骤输入准入（waterfall）'], ['agent/request-error', '模型请求异常（waterfall）'], ['agent/turn-stopping', '当前轮次准备结束（serial）'], ['agent/assistant-stream', '助手流式输出通知']] },
  { group: '子代理', items: [['subagent/start', '子代理启动通知'], ['subagent/end', '子代理结束通知']] },
  { group: '工具执行', items: [['tools/pre-execute', '工具执行前（waterfall）'], ['tools/execute', '工具执行（waterfall）'], ['tools/post-execute', '工具执行后（waterfall）'], ['tools/result', '工具最终结果通知'], ['tools/change', '工具注册变化通知']] },
  { group: '文件操作', items: [['fs/write-intent', '文件写入意图（waterfall）'], ['fs/edit-intent', '文件编辑意图（waterfall）'], ['fs/delete-intent', '文件删除意图（waterfall）'], ['fs/observed', '文件状态观察通知']] },
]
function normalizeHook(hook     ) {
  if (typeof hook === 'string') hook = { event: hook }
  return { ...hook, event: hook?.event || '', action: hook?.action || '', nextCondition: hook?.nextCondition || '', output: { enabled: false, format: 'JSON', path: '', template: '', ...hook?.output } }
}

function api(path        , init              ) {
  return fetch(`${API}${path}`, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } }).then(async response => {
    const raw = await response.text()
    let body     
    try { body = JSON.parse(raw) } catch {
      if (response.status === 404) throw new Error('服务不支持此操作，请重启 DSH 服务以加载当前插件版本')
      throw new Error(`服务返回了无法识别的响应（HTTP ${response.status}）`)
    }
    if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`)
    return body
  })
}

function newTopology(name        , statePath        , mode        , workspace     , template      ) {
  const id = crypto.randomUUID(), now = new Date().toISOString()
  const source = mode === 'custom' ? [{ id: 'step-1', name: '主会话', type: 'main', description: '', dependencies: [], executionSession: 'root', hooks: [], outputs: [] }] : template?.nodes || stages.map(([name, description], index) => ({ id: `step-${index + 1}`, name, type: index === 0 ? 'main' : 'subagent', description, dependencies: index ? [`step-${index}`] : [], executionSession: 'root', hooks: [], outputs: [] }))
  const ids = new Map(source.map((node     , index        ) => [node.id, `step-${index + 1}`]))
  return {
    schemaVersion: 1, topologyId: id, name, statePath, workspaceId: workspace.workspaceId, workspacePath: workspace.path, goal: '', templateId: template?.id, templateName: template?.name, createdAt: now, updatedAt: now, phase: 'draft',
    nodes: source.map((node     , index        ) => ({
      ...node, id: ids.get(node.id), type: index === 0 ? 'main' : node.type, dependencies: (node.dependencies || []).map((dependency        ) => ids.get(dependency)).filter(Boolean),
      executionSession: node.executionSession === 'root' || index === 0 ? 'root' : node.executionSession === 'parent' ? 'parent' : ids.has(String(node.executionSession).replace(/^node:/, '')) ? `node:${ids.get(String(node.executionSession).replace(/^node:/, ''))}` : 'root',
      hooks: (node.hooks || []).map((hook     ) => ({ ...hook, output: hook.output ? { ...hook.output } : undefined })), outputs: (node.outputs || []).map((output     ) => ({ ...output })), status: 'pending',
    })),
  }
}

function workspaceStatePath(workspace     , topologyName        ) {
  if (!workspace?.path) return ''
  const base = String(workspace.path).replace(/[\\/]+$/, '')
  const separator = String(workspace.path).includes('\\') ? '\\' : '/'
  const fileName = topologyName.trim().replace(/[<>:"/\\|?*]+/g, '-').replace(/[. ]+$/g, '') || 'topology'
  return `${base}${separator}.dsh${separator}task-ort${separator}${fileName}.json`
}

function safeText(value         ) {
  return String(value ?? '')
}

function statusLabel(status        ) {
  if (status === 'running') return '运行中'
  if (status === 'succeeded' || status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'blocked') return '受阻'
  if (status === 'cancelled' || status === 'canceled') return '已取消'
  return '待运行'
}

function statusClass(status        ) {
  if (status === 'running') return 'running'
  if (status === 'succeeded' || status === 'completed') return 'completed'
  if (status === 'failed' || status === 'blocked' || status === 'cancelled' || status === 'canceled') return 'blocked'
  return 'pending'
}

function sessionLabel(node     , nodes       ) {
  if (node.type === 'main') return '根主会话'
  const root = nodes.find(entry => entry.type === 'main')
  const value = safeText(node.executionSession || 'root')
  if (value === 'root') return `${root?.name || '根节点'}（主会话）`
  const id = value.startsWith('node:') ? value.slice(5) : value
  const target = nodes.find(entry => entry.id === id)
  if (target) return `${target.name}${target.type === 'main' ? '（主会话）' : '（节点会话）'}`
  if (value === 'parent') {
    const parent = (node.dependencies || []).map((id        ) => nodes.find(entry => entry.id === id)).find(Boolean)
    return parent ? `${parent.name}（父节点会话）` : '父节点会话'
  }
  return value || '未指定'
}

function executionSessionId(node     , topology     )                     {
  if (node.type === 'main' || !node.executionSession || node.executionSession === 'root') return topology.sessionId
  const id = node.executionSession === 'parent' ? node.dependencies?.[0] : String(node.executionSession).replace(/^node:/, '')
  const owner = topology.nodes.find((entry     ) => entry.id === id)
  return owner?.type === 'main' ? topology.sessionId : owner?.sessionId
}

function dependsOn(nodes       , fromId        , targetId        , seen = new Set        ())          {
  if (fromId === targetId) return true
  if (seen.has(fromId)) return false
  seen.add(fromId)
  const node = nodes.find(entry => entry.id === fromId)
  return (node?.dependencies || []).some((id        ) => dependsOn(nodes, id, targetId, seen))
}

function dependencyCandidates(nodes       , node     , nodeIndex        , selected          ) {
  if (node.type === 'main') return []
  return nodes.slice(0, nodeIndex).filter(candidate =>
    selected.includes(candidate.id) || !selected.some(id => id !== candidate.id && dependsOn(nodes, id, candidate.id)),
  )
}

function graphLayout(nodes       , viewportWidth        , viewportHeight        ) {
  const cardWidth = 220, cardHeight = 170, columnGap = 64, rowGap = 34
  const depths = new Map                (), visiting = new Set        ()
  const depth = (node     )         => {
    if (depths.has(node.id)) return depths.get(node.id) 
    if (visiting.has(node.id)) return 0
    visiting.add(node.id)
    const parents = (node.dependencies || []).map((id        ) => nodes.find(entry => entry.id === id)).filter(Boolean)
    const value = parents.length ? 1 + Math.max(...parents.map(depth)) : 0
    visiting.delete(node.id)
    depths.set(node.id, value)
    return value
  }

  nodes.forEach(depth)
  const columns = new Map               ()
  for (const node of nodes) {
    const columnDepth = depths.get(node.id) || 0
    const column = columns.get(columnDepth) || []
    column.push(node)
    columns.set(columnDepth, column)
  }
  const longEdgeCount = nodes.reduce((count, node) => count + (node.dependencies || []).filter((id        ) => {
    const sourceDepth = depths.get(id)
    return sourceDepth !== undefined && (depths.get(node.id) || 0) - sourceDepth > 1
  }).length, 0)
  const laneSpace = longEdgeCount ? 34 + longEdgeCount * 14 : 0
  const maxRows = Math.max(1, ...Array.from(columns.values()).map(column => column.length))
  const maxDepth = Math.max(0, ...Array.from(columns.keys()))
  let width = Math.max(viewportWidth, 42 + maxDepth * (cardWidth + columnGap) + cardWidth + 42)
  let height = Math.max(viewportHeight, laneSpace + maxRows * (cardHeight + rowGap) + 48)
  const positions = new Map                                  ()

  for (const [columnDepth, column] of columns) {
    const occupiedHeight = column.length * cardHeight + (column.length - 1) * rowGap
    const availableHeight = height - laneSpace - 40
    const start = laneSpace + Math.max(20, (availableHeight - occupiedHeight) / 2)
    column.forEach((node, row) => {
      const position = node.position && Number.isFinite(node.position.x) && Number.isFinite(node.position.y)
        ? node.position : { x: 42 + columnDepth * (cardWidth + columnGap), y: start + row * (cardHeight + rowGap) }
      positions.set(node.id, position)
      width = Math.max(width, position.x + cardWidth + 42)
      height = Math.max(height, position.y + cardHeight + 42)
    })
  }

  let topLane = 0
  const edges                                                      = []
  for (const node of nodes) {
    const target = positions.get(node.id)
    if (!target) continue
    for (const dependencyId of node.dependencies || []) {
      const source = positions.get(dependencyId)
      if (!source) continue
      const sourceNode = nodes.find(entry => entry.id === dependencyId)
      const sourceDepth = depths.get(dependencyId) || 0
      const targetDepth = depths.get(node.id) || 0
      const startX = source.x + cardWidth, startY = source.y + cardHeight / 2
      const endX = target.x, endY = target.y + cardHeight / 2
      const state = ['succeeded', 'completed'].includes(sourceNode?.status) ? 'satisfied' : sourceNode?.status === 'failed' ? 'blocked' : ''
      let path        
      if (targetDepth - sourceDepth > 1) {
        const laneY = 16 + topLane++ * 14
        const corner = 10
        path = `M ${startX} ${startY} L ${startX + 16 - corner} ${startY} Q ${startX + 16} ${startY} ${startX + 16} ${startY - corner} L ${startX + 16} ${laneY + corner} Q ${startX + 16} ${laneY} ${startX + 16 + corner} ${laneY} L ${endX - 16 - corner} ${laneY} Q ${endX - 16} ${laneY} ${endX - 16} ${laneY + corner} L ${endX - 16} ${endY - corner} Q ${endX - 16} ${endY} ${endX - 6} ${endY}`
      } else {
        const middleX = (startX + endX) / 2
        path = `M ${startX} ${startY} C ${middleX} ${startY}, ${middleX} ${endY}, ${endX - 7} ${endY}`
      }
      edges.push({ key: `${dependencyId}->${node.id}`, path, state })
    }
  }
  return { width, height, positions, edges, cardWidth, cardHeight }
}

function WorkflowCanvas({ nodes, sessionId, mode = 'topology', title = '流程画布', selectedNodeId, inspectorOpen, onToggleInspector, onSelectNode, onEditNode, onAddNode, onDeleteNode, onPositionChange, openSession, onError, addButtonLabel }     ) {
  const [viewport, setViewport] = React.useState({ width: 1000, height: 520 })
  const [zoom, setZoom] = React.useState(null                 )
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [panning, setPanning] = React.useState(false)
  const [menu, setMenu] = React.useState(null       )
  const [drag, setDrag] = React.useState(null       )
  const canvasRef = React.useRef(null       )
  const panStart = React.useRef(null       )
  const suppressClick = React.useRef(false)
  const initialLayout = graphLayout(nodes, viewport.width, viewport.height)
  const fitZoom = Math.min(1, Math.max(0.01, Math.min(viewport.width / initialLayout.width, viewport.height / initialLayout.height)))
  const scale = zoom ?? fitZoom
  const previewPosition = drag?.moved ? { x: Math.max(0, Math.round(drag.x + (drag.clientX - drag.startX) / scale)), y: Math.max(0, Math.round(drag.y + (drag.clientY - drag.startY) / scale)) } : null
  const displayNodes = previewPosition ? nodes.map((node     ) => node.id === drag.id ? { ...node, position: previewPosition } : node) : nodes
  const layout = previewPosition ? graphLayout(displayNodes, viewport.width, viewport.height) : initialLayout

  React.useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const update = () => setViewport({ width: element.clientWidth || 1000, height: element.clientHeight || 520 })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    const element = canvasRef.current
    if (!element) return
    const wheel = (event            ) => {
      event.preventDefault()
      const dimensions = graphLayout(nodes, element.clientWidth || 1000, element.clientHeight || 520)
      const fitted = Math.min(1, Math.max(0.01, Math.min(element.clientWidth / dimensions.width, element.clientHeight / dimensions.height)))
      setZoom((old               ) => Math.max(0.01, Math.min(2, (old ?? fitted) * Math.exp(-event.deltaY * 0.0015))))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [nodes])

  React.useEffect(() => {
    if (!menu) return
    const dismiss = (event     ) => { if (!event.target.closest?.('.topology-context-menu,.topology-node')) setMenu(null) }
    const escape = (event               ) => { if (event.key === 'Escape') setMenu(null) }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [Boolean(menu)])

  function openMenu(nodeId        , event     ) {
    if (suppressClick.current) { suppressClick.current = false; return }
    const element = event.currentTarget
    const rect = element.getBoundingClientRect()
    event.preventDefault?.()
    setMenu({ nodeId, x: Math.min(event.type === 'contextmenu' ? event.clientX : rect.right - 6, window.innerWidth - 190), y: Math.min(event.type === 'contextmenu' ? event.clientY : rect.top + 22, window.innerHeight - 155) })
  }
  function beginPan(event     ) {
    if (event.button !== 0 || event.target.closest?.('.topology-node,button,input,textarea,select')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    panStart.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y }
    setPanning(true); setMenu(null)
  }
  function movePan(event     ) {
    const start = panStart.current
    if (start?.pointerId === event.pointerId) setPan({ x: start.x + event.clientX - start.clientX, y: start.y + event.clientY - start.clientY })
  }
  function endPan(event     ) {
    if (panStart.current?.pointerId !== event.pointerId) return
    panStart.current = null; setPanning(false)
  }
  function fitCanvas() {
    setZoom(null); setPan({ x: 0, y: 0 })
    if (canvasRef.current) { canvasRef.current.scrollLeft = 0; canvasRef.current.scrollTop = 0 }
  }
  function beginDrag(node     , position     , event     ) {
    if (event.button !== 0 || event.target.closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, clientX: event.clientX, clientY: event.clientY, x: position.x, y: position.y, originalPosition: node.position, moved: false })
  }
  function moveDrag(event     ) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = (event.clientX - drag.startX) / scale, dy = (event.clientY - drag.startY) / scale
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    if (!drag.moved) setZoom(scale)
    setDrag({ ...drag, moved: true, clientX: event.clientX, clientY: event.clientY })
  }
  async function endDrag(event     ) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = (event.clientX - drag.startX) / scale, dy = (event.clientY - drag.startY) / scale
    const moved = drag.moved || Math.hypot(dx, dy) >= 4
    setDrag(null)
    if (!moved) return
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 0)
    const position = { x: Math.max(0, Math.round(drag.x + dx)), y: Math.max(0, Math.round(drag.y + dy)) }
    try { await onPositionChange?.(drag.id, position, drag.originalPosition) }
    catch (error     ) { onError?.(`保存节点位置失败：${error.message}`) }
  }
  function choose(action        ) {
    const nodeId = menu?.nodeId
    setMenu(null)
    if (!nodeId) return
    onSelectNode?.(nodeId)
    if (action === 'edit') onEditNode?.(nodeId)
    if (action === 'add') onAddNode?.(nodeId)
    if (action === 'delete') onDeleteNode?.(nodeId)
  }

  return h('section', { className: 'topology-canvas-section' },
    h('div', { className: 'topology-canvas-heading' }, h('strong', null, title), h('span', { className: 'topology-tip' }, `拖动空白处平移 · 滚轮缩放 · ${Math.round(scale * 100)}%　`, addButtonLabel && h('button', { type: 'button', style: { border: `1px solid ${colors.line}`, borderRadius: 7, padding: '6px 10px', background: '#fff', color: colors.primary, cursor: 'pointer', marginRight: 8 }, onClick: () => onAddNode?.() }, `＋ ${addButtonLabel}`), h('button', { type: 'button', style: { border: `1px solid ${colors.line}`, borderRadius: 7, padding: '6px 10px', background: '#fff', color: colors.primary, cursor: 'pointer' }, onClick: fitCanvas }, '适应画布'), onToggleInspector && h('button', { type: 'button', style: { marginLeft: 8, border: `1px solid ${colors.line}`, borderRadius: 7, padding: '6px 10px', background: '#fff', color: colors.primary, cursor: 'pointer' }, onClick: onToggleInspector }, inspectorOpen ? '折叠配置' : '展开配置'))),
    h('div', { className: `topology-canvas${panning ? ' panning' : ''}`, ref: canvasRef, onPointerDown: beginPan, onPointerMove: movePan, onPointerUp: endPan, onPointerCancel: endPan, onLostPointerCapture: endPan },
      h('div', { style: { width: Math.max(viewport.width, layout.width * scale + Math.max(0, pan.x)), height: Math.max(viewport.height, layout.height * scale + Math.max(0, pan.y)) } },
        h('div', { className: 'topology-canvas-inner', style: { width: layout.width, height: layout.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` } },
          h('svg', { className: 'topology-links', width: layout.width, height: layout.height, 'aria-hidden': true },
            h('defs', null,
              h('marker', { id: 'topology-arrow-default', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'strokeWidth' }, h('path', { d: 'M0,0 L8,4 L0,8', fill: 'none', stroke: '#b9c4d4', strokeWidth: 1.5 })),
              h('marker', { id: 'topology-arrow-satisfied', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'strokeWidth' }, h('path', { d: 'M0,0 L8,4 L0,8', fill: 'none', stroke: colors.green, strokeWidth: 1.5 })),
              h('marker', { id: 'topology-arrow-blocked', markerWidth: 8, markerHeight: 8, refX: 7, refY: 4, orient: 'auto', markerUnits: 'strokeWidth' }, h('path', { d: 'M0,0 L8,4 L0,8', fill: 'none', stroke: colors.red, strokeWidth: 1.5 })),
            ),
            ...layout.edges.map((edge     ) => h('path', { key: edge.key, className: `topology-edge ${edge.state}`, d: edge.path, markerEnd: `url(#topology-arrow-${edge.state || 'default'})` })),
          ),
          ...displayNodes.map((node     ) => {
            const position = layout.positions.get(node.id) || { x: 42, y: 42 }
            const kind = nodeKinds[node.type] || nodeKinds.custom
            const hooks = Array.isArray(node.hooks) ? node.hooks.length : 0
            const session = node.executionSession || 'root'
            const executionName = session === 'root' ? '根主会话' : session === 'parent' ? '父节点会话' : nodes.find((item     ) => `node:${item.id}` === session)?.name || '指定节点会话'
            const targetSessionId = mode === 'topology' ? node.parentSessionId || executionSessionId(node, { sessionId, nodes }) : undefined
            const target = mode === 'topology' ? (node.type === 'subagent' ? node.sessionId && targetSessionId ? { parentSessionId: targetSessionId, childSessionId: node.sessionId, mode: 'unknown' } : undefined : targetSessionId) : undefined
            const executionLabel = mode === 'template' ? `执行会话：${node.type === 'main' ? '根主会话' : executionName}` : node.type === 'subagent' ? `执行会话：子代理 · ${node.name}` : `执行会话：${sessionLabel(node, nodes)}`
            return h('div', { key: node.id, role: 'button', tabIndex: 0, className: `topology-node ${selectedNodeId === node.id || menu?.nodeId === node.id ? 'selected' : ''}`, style: { left: position.x, top: position.y }, 'aria-label': `${node.name}，点击打开节点菜单`, onClick: (event     ) => openMenu(node.id, event), onContextMenu: (event     ) => openMenu(node.id, event), onPointerDown: (event     ) => beginDrag(node, position, event), onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: () => setDrag(null), onKeyDown: (event     ) => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) openMenu(node.id, event) } },
              h('div', { className: 'topology-node-body' }, h('div', { className: 'topology-node-head' }, h('div', { className: `topology-node-icon ${kind.className}` }, kind.icon), h('div', { style: { minWidth: 0 } }, h('div', { className: 'topology-node-name', title: node.name }, node.name), h('div', { className: 'topology-node-type' }, kind.label))), h('div', { className: 'topology-node-description' }, node.description || '尚未填写节点目标')),
              h('div', { className: 'topology-node-session', title: target ? `打开执行会话；所属会话：${sessionLabel(node, nodes)}` : undefined }, target && openSession ? h('button', { type: 'button', className: 'topology-session-link', onClick: (event     ) => { event.stopPropagation(); try { openSession(target) } catch (error     ) { onError?.(`打开会话失败：${error.message}`) } }, onContextMenu: (event     ) => event.stopPropagation() }, executionLabel) : executionLabel),
              h('div', { className: 'topology-node-footer' }, h('span', { className: 'topology-node-status' }, h('span', { className: `topology-node-dot ${mode === 'template' ? 'pending' : statusClass(node.status)}` }), mode === 'template' ? '模板节点' : statusLabel(node.status)), h('span', { className: 'topology-node-hook' }, hooks ? h(React.Fragment, null, h('b', null, 'ϟ'), `Hook ${hooks}`) : '—')),
            )
          }),
        ),
      ),
    ),
    h('div', { className: 'topology-tip' }, '箭头表示前置依赖；灰色为未满足，绿色为已满足，红色为阻塞。'),
    menu && h('div', { className: 'topology-context-menu', style: { left: menu.x, top: menu.y }, onPointerDown: (event     ) => event.stopPropagation() },
      h('button', { type: 'button', onClick: () => choose('edit') }, h('span', null, '✎'), '编辑节点'),
      h('button', { type: 'button', onClick: () => choose('add') }, h('span', null, '＋'), '新增子节点'),
      nodes.find((node     ) => node.id === menu.nodeId)?.type !== 'main' && h('button', { type: 'button', onClick: () => choose('delete'), style: { color: '#b44d55' } }, h('span', null, '×'), '删除节点'),
    ),
  )
}

function TopologyNodeInspector({ current, editor, setEditor, saveNode, updateHook, removeNode, inputStyle, buttonStyle }     ) {
  const target = current.nodes.find((node     ) => node.id === editor.nodeId)
  const canConfigureType = editor.action === 'add' || target?.type !== 'main'
  return h('aside', { className: 'topology-node-inspector' },
    h('form', { onSubmit: saveNode },
      h('header', { className: 'topology-node-inspector-head' }, h('div', null, h('strong', null, editor.action === 'edit' ? '编辑节点' : '新增子节点'), h('span', null, editor.name || '未命名节点')), h('button', { type: 'button', 'aria-label': '收起节点配置', onClick: () => setEditor(null) }, '×')),
      h('div', { className: 'topology-node-inspector-body' },
        h('label', { className: 'topology-field' }, '节点名称', h('input', { required: true, value: editor.name, onChange: (event     ) => setEditor({ ...editor, name: event.target.value }), style: inputStyle })),
        canConfigureType && h('div', { className: 'topology-modal-grid' },
          h('label', { className: 'topology-field' }, '节点类型', h('select', { value: editor.type, onChange: (event     ) => setEditor({ ...editor, type: event.target.value }), style: inputStyle }, h('option', { value: 'subagent' }, '子代理'), h('option', { value: 'human' }, '人工确认'), h('option', { value: 'custom' }, '自定义节点'))),
          h('label', { className: 'topology-field' }, '步骤模板 / 执行角色', h('input', { value: editor.template || '', onChange: (event     ) => setEditor({ ...editor, template: event.target.value }), placeholder: '例如：需求分析师', style: inputStyle })),
        ),
        !canConfigureType && h('label', { className: 'topology-field' }, '节点类型', h('input', { value: '主会话（首节点固定）', disabled: true, style: inputStyle })),
        (editor.action === 'add' || editor.type !== 'main') && h(React.Fragment, null,
          h('label', { className: 'topology-field' }, '执行会话', h('select', { value: editor.executionSession, onChange: (event     ) => setEditor({ ...editor, executionSession: event.target.value }), style: inputStyle },
            h('option', { value: 'root' }, `根主会话${current.nodes.find((node     ) => node.type === 'main') ? `：${current.nodes.find((node     ) => node.type === 'main').name}` : ''}`),
            ...current.nodes.filter((node     ) => node.type === 'subagent' && (editor.action === 'add' || node.id !== editor.nodeId)).map((node     ) => h('option', { key: node.id, value: `node:${node.id}` }, `节点会话：${node.name}`)),
          )),
          h('div', { className: 'topology-hint' }, '子代理步骤会在所选主会话/父节点会话中执行。实际可用性需运行时确认。'),
          h('div', { className: 'topology-field' }, '前置依赖（全部成功后触发）', h('div', { className: 'topology-dependencies' },
            ...dependencyCandidates(current.nodes, { type: editor.action === 'add' ? editor.type : target?.type }, editor.action === 'add' ? current.nodes.length : current.nodes.findIndex((node     ) => node.id === editor.nodeId), editor.dependencies).map((node     ) => h('label', { key: node.id }, h('input', { type: 'checkbox', checked: editor.dependencies.includes(node.id), onChange: (event     ) => setEditor({ ...editor, dependencies: event.target.checked ? [...editor.dependencies, node.id] : editor.dependencies.filter((id        ) => id !== node.id) }) }), node.name)),
          ), h('div', { className: 'topology-hint' }, '不显示自身、后续节点或已被其他依赖覆盖的节点；不勾选依赖时可并行执行。')),
        ),
        h('label', { className: 'topology-field' }, '节点说明（该节点要达成的最终目标）', h('textarea', { value: editor.description, onChange: (event     ) => setEditor({ ...editor, description: event.target.value }), placeholder: '描述本节点需要完成的目标与预期结果', style: inputStyle })),
        h('section', { className: 'topology-hooks' },
          h('div', { className: 'topology-hook-head' }, h('span', null, '当前节点的 Hook 事件'), h('button', { type: 'button', style: buttonStyle, onClick: () => setEditor({ ...editor, hooks: [...editor.hooks, normalizeHook({})] }) }, '＋ 添加事件')),
          !editor.hooks.length && h('div', { className: 'topology-hint' }, '尚未配置事件，可添加节点生命周期或 DSH 事件。'),
          ...editor.hooks.map((hook     , index        ) => h('div', { className: 'topology-hook-card', key: index },
            h('div', { className: 'topology-hook-row' }, h('select', { required: true, 'aria-label': `触发事件 ${index + 1}`, value: hook.event, style: inputStyle, onChange: (event     ) => updateHook(index, { event: event.target.value }) },
              h('option', { value: '' }, '请选择 DSH 事件'),
              hook.event && !hookEvents.some((group     ) => group.items.some(([value]          ) => value === hook.event)) && h('option', { value: hook.event }, `${hook.event} — 未知事件`),
              ...hookEvents.map((group     ) => h('optgroup', { key: group.group, label: group.group }, ...group.items.map(([value, label]          ) => h('option', { key: value, value }, `${value} — ${label}`)))),
            ), h('button', { type: 'button', style: buttonStyle, 'aria-label': `移除事件 ${index + 1}`, onClick: () => setEditor({ ...editor, hooks: editor.hooks.filter((_     , i        ) => i !== index) }) }, '×')),
            h('label', { className: 'topology-field' }, '动作描述', h('textarea', { value: hook.action, onChange: (event     ) => updateHook(index, { action: event.target.value }), placeholder: '描述事件触发后需要执行的动作', style: inputStyle })),
            hook.event === 'orchestrator/node-end' && h('label', { className: 'topology-field' }, '进入下一个节点的条件说明', h('textarea', { value: hook.nextCondition, onChange: (event     ) => updateHook(index, { nextCondition: event.target.value }), placeholder: '例如：需求已确认，且没有未解决的问题', style: inputStyle })),
            h('label', { className: 'topology-field topology-hook-output-toggle' }, h('input', { type: 'checkbox', checked: hook.output.enabled, onChange: (event     ) => updateHook(index, { output: { ...hook.output, enabled: event.target.checked } }) }), '节点结果输出（可选）'),
            hook.output.enabled && h(React.Fragment, null, h('div', { className: 'topology-modal-grid' }, h('label', { className: 'topology-field' }, '输出格式', h('input', { value: hook.output.format, onChange: (event     ) => updateHook(index, { output: { ...hook.output, format: event.target.value } }), style: inputStyle })), h('label', { className: 'topology-field' }, '输出路径', h('input', { required: true, value: hook.output.path, onChange: (event     ) => updateHook(index, { output: { ...hook.output, path: event.target.value } }), placeholder: '自定义文件地址', style: inputStyle }))), h('label', { className: 'topology-field' }, '输出内容 / 格式说明（可选）', h('textarea', { value: hook.output.template, onChange: (event     ) => updateHook(index, { output: { ...hook.output, template: event.target.value } }), style: inputStyle })))
          )),
          h('div', { className: 'topology-hint' }, '点击顶部“保存配置”将节点配置写入拓扑 JSON；事件触发和动作执行尚未接入。'),
        ),
      ),
      h('footer', { className: 'topology-node-inspector-foot' }, editor.action === 'edit' && target?.type !== 'main' && h('button', { type: 'button', className: 'topology-danger', onClick: () => removeNode(editor.nodeId) }, '删除节点'), h('button', { type: 'button', style: { ...buttonStyle, color: colors.ink }, onClick: () => setEditor(null) }, '取消'), h('button', { type: 'submit', style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary } }, '保存节点')),
    ),
  )
}

function TemplateSpace({ catalog, onCatalogChange, onUseTemplate }                                                                                                 ) {
  const [selectedId, setSelectedId] = React.useState('page-development-workflow')
  const [editing, setEditing] = React.useState(null       )
  const [selectedNodeId, setSelectedNodeId] = React.useState('')
  const [inspectorCollapsed, setInspectorCollapsed] = React.useState(false)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const buttonStyle = { border: `1px solid ${colors.line}`, borderRadius: 7, padding: '8px 12px', background: '#fff', color: colors.primary, fontWeight: 650, cursor: 'pointer' }
  const inputStyle = { boxSizing: 'border-box', width: '100%', border: `1px solid ${colors.line}`, borderRadius: 7, padding: '9px 11px', font: 'inherit', color: colors.ink, background: '#fbfcfe' }
  const all = [...(catalog?.fixed || []), ...(catalog?.custom || [])]
  const selected = all.find((template     ) => template.id === selectedId) || all[0]
  const editingNode = editing?.nodes.find((node     ) => node.id === selectedNodeId) || editing?.nodes[0]
  const fixed = (catalog?.fixed || []).filter((template     ) => template.name.toLowerCase().includes(search.toLowerCase()))
  const custom = (catalog?.custom || []).filter((template     ) => template.name.toLowerCase().includes(search.toLowerCase()))
  const setNode = (nodeId        , changes     ) => setEditing((value     ) => ({ ...value, nodes: value.nodes.map((node     ) => node.id === nodeId ? { ...node, ...changes } : node) }))
  const remap = (template     , name = `${template.name}（自定义）`) => {
  
  const idMap = new Map(template.nodes.map((node     ) => [node.id, `node-${crypto.randomUUID()}`]))
  
  return {
  
  
  id: `custom-${crypto.randomUUID()}`, name, description: template.description || '',
  
  
  nodes: template.nodes.map((node     ) => ({
  
  
  
  ...node, id: idMap.get(node.id), dependencies: node.dependencies.map((id        ) => idMap.get(id)),
  
  
  
  hooks: (node.hooks || []).map((hook     ) => ({ ...hook, output: hook.output ? { ...hook.output } : undefined })),
  
  
  
  outputs: (node.outputs || []).map((output     ) => ({ ...output })),
  
  
  
  ...(node.position ? { position: { ...node.position } } : {}),
  
  
  })),
  
  }
  }
  const editTemplate = (template     ) => {
  
  const draft = remap(template, template.name)
  
  draft.id = template.id.startsWith('custom-') || !(catalog.fixed || []).some((item     ) => item.id === template.id) ? template.id : draft.id
  
  draft.createdAt = template.createdAt
  
  setEditing(draft); setSelectedNodeId(draft.nodes[0]?.id || ''); setInspectorCollapsed(false); setError('')
  }
  const createTemplate = () => {
  
  const blankSource = (catalog.fixed || []).find((item     ) => item.id === 'blank-topology') || { name: '空白拓扑模板', description: '', nodes: [{ id: 'step-1', name: '主会话', type: 'main', description: '', dependencies: [], executionSession: 'root', hooks: [], outputs: [] }] }
  
  const blank = remap(blankSource, '新建自定义模板')
  
  setEditing(blank); setSelectedNodeId(blank.nodes[0].id); setInspectorCollapsed(false); setError('')
  }
  const copyTemplate = (template     ) => {
  
  const copy = remap(template, `${template.name}（副本）`)
  
  setEditing(copy); setSelectedNodeId(copy.nodes[0]?.id || ''); setInspectorCollapsed(false); setError('')
  }
  const saveTemplate = async (event     ) => {
  
  event.preventDefault()
  
  if (!editing || !editing.name.trim()) return
  
  setBusy(true); setError('')
  
  try {
  
  
  const saved = await api('/templates', { method: 'POST', body: JSON.stringify({ ...editing, name: editing.name.trim() }) })
  
  
  const next = [...(catalog.custom || []).filter((item     ) => item.id !== saved.id), saved].sort((a     , b     ) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  
  
  onCatalogChange({ ...catalog, custom: next }); setSelectedId(saved.id); setEditing(null)
  
  } catch (e     ) { setError(`保存模板失败：${e.message}`) }
  
  finally { setBusy(false) }
  }
  const addNode = (predecessorId         ) => {
  
  const id = `node-${crypto.randomUUID()}`
  
  const predecessor = editing.nodes.find((item     ) => item.id === predecessorId) || editing.nodes[editing.nodes.length - 1]
  const node = { id, name: '新步骤', type: 'subagent', description: '', dependencies: predecessor ? [predecessor.id] : [], executionSession: predecessor ? 'parent' : 'root', hooks: [], outputs: [] }
  
  setEditing({ ...editing, nodes: [...editing.nodes, node] }); setSelectedNodeId(id); setInspectorCollapsed(false)
  }
  const removeNode = (nodeId        ) => {
  
  if (editing.nodes[0]?.id === nodeId) return
  
  const nodes = editing.nodes.filter((node     ) => node.id !== nodeId).map((node     ) => ({ ...node, dependencies: node.dependencies.filter((id        ) => id !== nodeId) }))
  
  setEditing({ ...editing, nodes }); setSelectedNodeId(nodes[0]?.id || '')
  }
  const updateHook = (index        , changes     ) => setNode(editingNode.id, { hooks: editingNode.hooks.map((hook     , i        ) => i === index ? { ...hook, ...changes } : hook) })
  const updateOutput = (index        , changes     ) => setNode(editingNode.id, { outputs: editingNode.outputs.map((output     , i        ) => i === index ? { ...output, ...changes } : output) })
  const newOutput = () => setNode(editingNode.id, { outputs: [...(editingNode.outputs || []), { path: '', format: 'Markdown', description: '' }] })
  const addHook = () => setNode(editingNode.id, { hooks: [...(editingNode.hooks || []), normalizeHook({})] })
  const field = (label        , value     , onChange                      , placeholder = '', multiline = false) => h('label', { className: 'topology-field', key: label }, label, multiline
  
  ? h('textarea', { value: value || '', onChange, placeholder, style: inputStyle })
  
  : h('input', { value: value || '', onChange, placeholder, style: inputStyle }))
  if (editing) return h('section', { className: 'topology-template-space' },
  
  h('header', { className: 'topology-template-header' }, h('div', null, h('h2', null, editing.createdAt ? '编辑自定义模板' : '新建自定义模板'), h('p', null, '编辑模板只更新模板定义；已创建的拓扑会话保留自己的配置快照。')), h('button', { type: 'button', style: buttonStyle, onClick: () => setEditing(null) }, '返回模板空间')),
  
  error && h('p', { role: 'alert', className: 'topology-template-error' }, error),
  
  h('form', { onSubmit: saveTemplate },
  
  
  h('div', { className: 'topology-template-namebar' }, h('label', { className: 'topology-field' }, '模板名称', h('input', { required: true, maxLength: 120, value: editing.name, onChange: (event     ) => setEditing({ ...editing, name: event.target.value }), style: inputStyle })), h('label', { className: 'topology-field' }, '模板说明', h('input', { value: editing.description, onChange: (event     ) => setEditing({ ...editing, description: event.target.value }), style: inputStyle }))),
  
  
  h('div', { className: `topology-template-editor-grid${inspectorCollapsed ? ' collapsed' : ''}` },
  
  
  
  h(WorkflowCanvas, {
    key: editing.id, nodes: editing.nodes, mode: 'template', title: '模板流程画布', selectedNodeId: editingNode?.id,
    inspectorOpen: !inspectorCollapsed, onToggleInspector: () => setInspectorCollapsed(!inspectorCollapsed), addButtonLabel: '添加节点',
    onSelectNode: setSelectedNodeId, onEditNode: (nodeId        ) => { setSelectedNodeId(nodeId); setInspectorCollapsed(false) },
    onAddNode: (nodeId         ) => addNode(nodeId), onDeleteNode: removeNode,
    onPositionChange: (nodeId        , position     ) => setEditing((value     ) => ({ ...value, nodes: value.nodes.map((node     ) => node.id === nodeId ? { ...node, position } : node) })),
  }),
  !inspectorCollapsed && editingNode && h('aside', { className: 'topology-template-config' },
  
  
  
  
  h('h3', null, `节点配置 · ${editingNode.name}`),
  
  
  
  
  field('节点名称', editingNode.name, (event     ) => setNode(editingNode.id, { name: event.target.value })),
  
  
  
  
  editingNode.id === editing.nodes[0]?.id
  
  
  
  
  
  ? h('label', { className: 'topology-field' }, '节点类型', h('input', { value: '主会话（首节点固定）', disabled: true, style: inputStyle }))
  
  
  
  
  
  : h('div', { className: 'topology-template-config-row' },
  
  
  
  
  
  
  
  h('label', { className: 'topology-field' }, '节点类型', h('select', { value: editingNode.type, onChange: (event     ) => setNode(editingNode.id, { type: event.target.value }), style: inputStyle }, h('option', { value: 'subagent' }, '子代理'), h('option', { value: 'human' }, '人工确认'), h('option', { value: 'custom' }, '自定义节点'))),
  
  
  
  
  
  
  
  field('步骤模板 / 执行角色', editingNode.template, (event     ) => setNode(editingNode.id, { template: event.target.value }), '例如：需求分析师')),
  
  
  
  
  field('节点说明（该节点要达成的最终目标）', editingNode.description, (event     ) => setNode(editingNode.id, { description: event.target.value }), '描述本节点的目标与预期结果', true),
  
  
  
  
  editingNode.id !== editing.nodes[0]?.id && h(React.Fragment, null,
  
  
  
  
  
  h('label', { className: 'topology-field' }, '执行会话', h('select', { value: editingNode.executionSession || 'parent', onChange: (event     ) => setNode(editingNode.id, { executionSession: event.target.value }), style: inputStyle }, h('option', { value: 'root' }, '根主会话'), h('option', { value: 'parent' }, '父节点会话（默认）'), ...editing.nodes.filter((node     ) => node.type === 'main' || node.type === 'subagent').map((node     ) => h('option', { key: node.id, value: `node:${node.id}` }, `节点会话：${node.name}`)))),
  
  
  
  
  
  h('div', { className: 'topology-field' }, '前置依赖（全部成功后触发）', h('div', { className: 'topology-template-deps' }, ...dependencyCandidates(editing.nodes, editingNode, editing.nodes.findIndex((node     ) => node.id === editingNode.id), editingNode.dependencies).map((node     ) => h('label', { key: node.id }, h('input', { type: 'checkbox', checked: editingNode.dependencies.includes(node.id), onChange: (event     ) => setNode(editingNode.id, { dependencies: event.target.checked ? [...editingNode.dependencies, node.id] : editingNode.dependencies.filter((id        ) => id !== node.id) }) }), node.name)))),
  
  
  
  
  ),
  
  
  
  
  h('section', { className: 'topology-template-subsection' }, h('div', { className: 'topology-template-panel-head' }, h('strong', null, '输出文件'), h('button', { type: 'button', style: buttonStyle, onClick: newOutput }, '＋ 添加')), ...(editingNode.outputs || []).map((output     , index        ) => h('div', { className: 'topology-template-output', key: index }, h('input', { value: output.path, placeholder: '相对或绝对文件路径', onChange: (event     ) => updateOutput(index, { path: event.target.value }), style: inputStyle }), h('input', { value: output.format, placeholder: '格式', onChange: (event     ) => updateOutput(index, { format: event.target.value }), style: inputStyle }), h('button', { type: 'button', onClick: () => setNode(editingNode.id, { outputs: editingNode.outputs.filter((_     , i        ) => i !== index) }) }, '移除')))),
  
  
  
  
  h('section', { className: 'topology-template-subsection' }, h('div', { className: 'topology-template-panel-head' }, h('strong', null, 'Hook 事件'), h('button', { type: 'button', style: buttonStyle, onClick: addHook }, '＋ 添加事件')), !(editingNode.hooks || []).length && h('p', { className: 'topology-template-hint' }, '可为所有节点配置节点生命周期或 DSH 事件。'), ...(editingNode.hooks || []).map((hook     , index        ) => h('div', { className: 'topology-template-hook', key: index }, h('select', { value: hook.event, onChange: (event     ) => updateHook(index, { event: event.target.value }), style: inputStyle }, h('option', { value: '' }, '请选择 DSH 事件'), ...hookEvents.map((group     ) => h('optgroup', { key: group.group, label: group.group }, ...group.items.map(([value, label]          ) => h('option', { key: value, value }, `${value} — ${label}`))))), h('textarea', { value: hook.action, onChange: (event     ) => updateHook(index, { action: event.target.value }), placeholder: '动作描述', style: inputStyle }), hook.event === 'orchestrator/node-end' && h('textarea', { value: hook.nextCondition, onChange: (event     ) => updateHook(index, { nextCondition: event.target.value }), placeholder: '满足什么条件后通知调度器进入后续节点', style: inputStyle }), h('label', null, h('input', { type: 'checkbox', checked: hook.output.enabled, onChange: (event     ) => updateHook(index, { output: { ...hook.output, enabled: event.target.checked } }) }), '节点结果输出（可选）'), hook.output.enabled && h(React.Fragment, null, h('input', { value: hook.output.format, onChange: (event     ) => updateHook(index, { output: { ...hook.output, format: event.target.value } }), placeholder: '结果格式', style: inputStyle }), h('input', { value: hook.output.path, onChange: (event     ) => updateHook(index, { output: { ...hook.output, path: event.target.value } }), placeholder: '结果文件路径', style: inputStyle }), h('textarea', { value: hook.output.template, onChange: (event     ) => updateHook(index, { output: { ...hook.output, template: event.target.value } }), placeholder: '输出内容说明', style: inputStyle })), h('button', { type: 'button', onClick: () => setNode(editingNode.id, { hooks: editingNode.hooks.filter((_     , i        ) => i !== index) }) }, '移除事件')))),
  
  
  
  
  editingNode.id !== editing.nodes[0]?.id && h('button', { type: 'button', className: 'topology-template-delete', onClick: () => removeNode(editingNode.id) }, '删除节点'),
  
  
  
  ),
  
  
  ),
  
  
  h('footer', { className: 'topology-template-footer' }, h('span', null, '自定义模板保存在当前 DSH 用户配置中，供所有工作区复用。Hook 定义会保存；当前调度器尚未执行 Hook。'), h('button', { type: 'button', style: buttonStyle, onClick: () => setEditing(null) }, '取消'), h('button', { type: 'submit', disabled: busy, style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary } }, busy ? '保存中…' : '保存模板')),
  
  ),
  )
  return h('section', { className: 'topology-template-space' },
  
  h('header', { className: 'topology-template-header' }, h('div', null, h('h2', null, '模板空间'), h('p', null, '固定模板可查看或复制，自定义模板可编辑。模板对所有工作区共享。')), h('button', { type: 'button', style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary }, onClick: createTemplate }, '＋ 新建模板')),
  
  error && h('p', { role: 'alert', className: 'topology-template-error' }, error),
  
  h('input', { value: search, onChange: (event     ) => setSearch(event.target.value), placeholder: '搜索模板', style: { ...inputStyle, marginBottom: 12 } }),
  
  h('details', { className: 'topology-template-group', open: true }, h('summary', null, h('span', null, '›'), h('strong', null, '固定模板'), h('span', null, '只读，可复制为自定义模板'), h('small', null, `${fixed.length} 个模板`)), h('div', { className: 'topology-template-card-grid' }, ...fixed.map((template     ) => h('article', { key: template.id, className: `topology-template-card${template.id === selected?.id ? ' selected' : ''}`, onClick: () => setSelectedId(template.id) }, h('div', { className: 'topology-template-card-head' }, h('strong', null, template.name), h('span', null, '固定模板')), h('p', null, `${template.nodes.length} 个阶段 · ${template.description}`), h('button', { type: 'button', style: buttonStyle, onClick: (event     ) => { event.stopPropagation(); copyTemplate(template) } }, '复制为自定义模板'))))),
  
  h('details', { className: 'topology-template-group', open: false }, h('summary', null, h('span', null, '›'), h('strong', null, '自定义模板'), h('span', null, '你创建或复制的模板'), h('small', null, `${custom.length} 个模板`)), h('div', { className: 'topology-template-card-grid' }, ...custom.map((template     ) => h('article', { key: template.id, className: `topology-template-card${template.id === selected?.id ? ' selected' : ''}`, onClick: () => setSelectedId(template.id) }, h('div', { className: 'topology-template-card-head' }, h('strong', null, template.name), h('span', null, '自定义模板')), h('p', null, `${template.nodes.length} 个阶段 · 修改于 ${new Date(template.updatedAt).toLocaleString()}`), h('div', { className: 'topology-template-card-actions' }, h('button', { type: 'button', style: buttonStyle, onClick: (event     ) => { event.stopPropagation(); editTemplate(template) } }, '编辑模板')))))),
  
  selected && h('section', { className: 'topology-template-detail' }, h('header', null, h('div', null, h('h3', null, selected.name), h('p', null, `${selected.description || ''} · ${selected.nodes.length} 个节点`)), selected.id.startsWith('custom-') ? h('button', { type: 'button', style: buttonStyle, onClick: () => editTemplate(selected) }, '编辑模板') : h('button', { type: 'button', style: buttonStyle, onClick: () => onUseTemplate(selected) }, '用此模板新建拓扑')), h('div', { className: 'topology-template-detail-nodes' }, ...selected.nodes.map((node     , index        ) => h('article', { key: node.id }, h('span', null, String(index + 1).padStart(2, '0')), h('div', null, h('strong', null, node.name), h('p', null, node.description)), h('div', null, ...(node.outputs || []).map((output     ) => h('code', { key: output.path }, output.path))))))),
  
  !all.length && h('p', null, '模板正在加载…'),
  )}

function Panel({ workspaceSource, openSession, sessionId }                                                                                    ) {
  const [paths, setPaths] = React.useState([]            )
  const [items, setItems] = React.useState([]         )
  const [current, setCurrent] = React.useState(null       )
  const [creating, setCreating] = React.useState(false)
  const [name, setName] = React.useState('新拓扑会话')
  const [statePath, setStatePath] = React.useState('')
  const [statePathEdited, setStatePathEdited] = React.useState(false)
  const [workspaces, setWorkspaces] = React.useState([]         )
  const [workspaceId, setWorkspaceId] = React.useState('')
  const [mode, setMode] = React.useState('page-development-workflow')
  const [view, setView] = React.useState('topologies')
  const [templateCatalog, setTemplateCatalog] = React.useState({ fixed: [], custom: [] }       )
  const [goal, setGoal] = React.useState('')
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [connection, setConnection] = React.useState('正在连接 DSH…')
  const [listError, setListError] = React.useState('')
  const [listMenu, setListMenu] = React.useState(null       )
  const [editor, setEditor] = React.useState(null       )
  const [inspectorCollapsed, setInspectorCollapsed] = React.useState(false)
  const [menu, setMenu] = React.useState(null       )
  const [viewport, setViewport] = React.useState({ width: 1000, height: 520 })
  const [zoom, setZoom] = React.useState(null                 )
  const [drag, setDrag] = React.useState(null       )
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [panning, setPanning] = React.useState(false)
  const panStart = React.useRef(null       )
  const suppressClick = React.useRef(false)
  const canvasRef = React.useRef(null       )

  React.useEffect(() => {
    try { setPaths(JSON.parse(localStorage.getItem('dsh-topology-paths') || '[]')) } catch { setPaths([]) }
    api('/status').then(value => setConnection(value.status === 'ready' ? '已连接 DSH 中控' : '中控状态异常')).catch(e => setConnection(`连接失败：${e.message}`))
    api('/templates').then(setTemplateCatalog).catch((e     ) => setError(`加载模板失败：${e.message}`))
  }, [])

  React.useEffect(() => {
    if (!workspaceSource) return
    const sync = () => {
      const snapshot = workspaceSource.getSnapshot?.()
      const next = snapshot?.items || []
      setWorkspaces(next)
      setWorkspaceId((currentId        ) => next.some((item     ) => item.workspaceId === currentId)
        ? currentId
        : next[0]?.workspaceId || '')
    }
    sync()
    return workspaceSource.subscribe?.(sync)
  }, [workspaceSource])

  React.useEffect(() => {
    let live = true
    setListError('')
    Promise.all(paths.map(async path => ({
      path,
      result: await api(`/topology?path=${encodeURIComponent(path)}`).then(value => ({ value })).catch(error => ({ error })),
    }))).then(values => {
      if (!live) return
      setItems(values.flatMap(entry => entry.result.value ? [entry.result.value] : []).sort((a     , b     ) => {
        const time = (value     ) => { const parsed = Date.parse(value.createdAt || ''); return Number.isFinite(parsed) ? parsed : 0 }
        return time(b) - time(a)
      }))
      const failed = values.find(entry => entry.result.error)
      if (failed) setListError(`无法读取拓扑 JSON：${failed.path}`)
    })
    return () => { live = false }
  }, [paths])

  React.useEffect(() => {
    if (!sessionId || !items.length) return
    const match = items.find(item => item.sessionId === sessionId || item.nodes.some((node     ) => node.sessionId === sessionId))
    if (match) { setCurrent(match); setGoal(match.goal || ''); setZoom(null) }
  }, [sessionId, items])

  React.useEffect(() => {
    if (!canvasRef.current) return
    const element = canvasRef.current
    const update = () => setViewport({ width: element.clientWidth || 1000, height: element.clientHeight || 520 })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [current])

  React.useEffect(() => {
    if (!current || !['running', 'blocked'].includes(current.phase) || drag) return
    let live = true
    const refresh = async () => {
      try {
        const value = await api(`/topology?path=${encodeURIComponent(current.statePath)}`)
        if (live) setCurrent((previous     ) => previous?.statePath === value.statePath ? value : previous)
      } catch (e     ) { if (live) setError(`读取运行状态失败：${e.message}`) }
    }
    const timer = setInterval(refresh, 2000)
    return () => { live = false; clearInterval(timer) }
  }, [current?.statePath, current?.phase, Boolean(drag)])

  React.useEffect(() => { setZoom(null); setPan({ x: 0, y: 0 }); panStart.current = null; setPanning(false) }, [current?.topologyId])

  React.useEffect(() => {
    const element = canvasRef.current
    if (!element || !current) return
    const wheel = (event            ) => {
      event.preventDefault()
      const dimensions = graphLayout(current.nodes, element.clientWidth || 1000, element.clientHeight || 520)
      const fitted = Math.min(1, Math.max(0.01, Math.min(element.clientWidth / dimensions.width, element.clientHeight / dimensions.height)))
      setZoom((old               ) => Math.max(0.01, Math.min(2, (old ?? fitted) * Math.exp(-event.deltaY * 0.0015))))
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [current])

  React.useEffect(() => {
    if (!menu) return
    const dismiss = (event     ) => {
      if (!event.target.closest?.('.topology-context-menu,.topology-node')) setMenu(null)
    }
    const escape = (event               ) => { if (event.key === 'Escape') setMenu(null) }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [Boolean(menu)])

  React.useEffect(() => {
    if (!listMenu) return
    const dismiss = (event     ) => { if (!event.target.closest?.('.topology-list-menu')) setListMenu(null) }
    const escape = (event               ) => { if (event.key === 'Escape') setListMenu(null) }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape) }
  }, [Boolean(listMenu)])

  async function deleteDraft(item     ) {
    setListMenu(null)
    if (!window.confirm(`确定删除草稿“${item.name}”及其 JSON 文件吗？此操作无法撤销。`)) return
    setBusy(true); setListError('')
    try {
      await api(`/topology?path=${encodeURIComponent(item.statePath)}`, { method: 'DELETE' })
      const next = paths.filter(value => value !== item.statePath)
      localStorage.setItem('dsh-topology-paths', JSON.stringify(next))
      setPaths(next)
      setItems(items.filter((value     ) => value.topologyId !== item.topologyId))
    } catch (e     ) { setListError(`删除草稿失败：${e.message}`) }
    finally { setBusy(false) }
  }

  async function save(topology     ) {
    await api('/topology', { method: 'POST', body: JSON.stringify(topology) })
    const next = Array.from(new Set([...paths, topology.statePath]))
    localStorage.setItem('dsh-topology-paths', JSON.stringify(next))
    setPaths(next)
    setCurrent(topology)
  }

  async function create(event     ) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const selectedWorkspace = workspaces.find((workspace     ) => workspace.workspaceId === workspaceId)
      if (!selectedWorkspace) throw new Error('请选择工作区')
      const resolvedPath = statePathEdited ? statePath.trim() : workspaceStatePath(selectedWorkspace, name)
      if (!resolvedPath) throw new Error('请选择一个工作区，或填写拓扑 JSON 文件地址')
      const selectedTemplate = [...(templateCatalog.fixed || []), ...(templateCatalog.custom || [])].find((template     ) => template.id === mode)
      if (mode !== 'custom' && !selectedTemplate) throw new Error('所选模板不可用，请刷新模板空间后重试')
      await save(newTopology(name.trim(), resolvedPath, mode, selectedWorkspace, selectedTemplate)); setCreating(false)
    }
    catch (e     ) { setError(e.message) }
    finally { setBusy(false) }
  }

  function beginCreate() {
    setName('新拓扑会话')
    setStatePath('')
    setStatePathEdited(false)
    setWorkspaceId((currentId        ) => workspaces.some((item     ) => item.workspaceId === currentId)
      ? currentId
      : workspaces[0]?.workspaceId || '')
    setMode('page-development-workflow')
    setError('')
    setCreating(true)
  }

  async function start() {
    if (!current) return
    setBusy(true); setError('')
    try {
      const saved = { ...current, goal: goal || current.nodes[0]?.description || current.name }
      await api('/topology', { method: 'POST', body: JSON.stringify(saved) })
      const value = await api('/start', { method: 'POST', body: JSON.stringify({ statePath: current.statePath, goal: saved.goal }) })
      setCurrent(value); setPaths([...paths])
    } catch (e     ) { setError(e.message) }
    finally { setBusy(false) }
  }

  async function retryNode(nodeId        ) {
    if (!current) return
    setBusy(true); setError('')
    try {
      const value = await api('/retry-node', { method: 'POST', body: JSON.stringify({ statePath: current.statePath, nodeId }) })
      setCurrent(value)
    } catch (e     ) { setError(e.message) }
    finally { setBusy(false) }
  }

  async function saveCurrent() {
    if (!current) return
    setBusy(true); setError('')
    try { await save(current) }
    catch (e     ) { setError(e.message) }
    finally { setBusy(false) }
  }

  function openEditor(action                , nodeId        ) {
    if (!current) return
    if (['running', 'blocked'].includes(current.phase)) { setError('流程运行中或受阻时不能修改节点配置'); setMenu(null); return }
    const target = current.nodes.find((node     ) => node.id === nodeId)
    if (!target) return
    const root = current.nodes.find((node     ) => node.type === 'main')
    if (action === 'edit') {
      setEditor({ action, nodeId, name: target.name, type: target.type, template: target.template || '', description: target.description || '', executionSession: target.executionSession || 'root', dependencies: [...(target.dependencies || [])], hooks: (target.hooks || []).map(normalizeHook) })
    } else {
      setEditor({
        action, nodeId, name: '新步骤', type: 'subagent', description: '',
        executionSession: target.type === 'main' ? 'root' : `node:${target.id}`,
        dependencies: [target.id], hooks: [],
      })
    }
    setMenu(null)
    setInspectorCollapsed(false)
  }

  function saveNode(event     ) {
    event.preventDefault()
    if (!current || !editor || !editor.name.trim()) return
    let nodes = [...current.nodes]
    let nextEditor = editor
    if (editor.action === 'edit') {
      nodes = nodes.map(node => node.id === editor.nodeId ? {
        ...node, name: editor.name.trim(), type: node.type === 'main' ? 'main' : editor.type,
        description: editor.description.trim(), template: editor.template || '', executionSession: editor.executionSession,
        dependencies: node.type === 'main' ? [] : editor.dependencies, hooks: editor.hooks,
      } : node)
    } else {
      const id = `step-${crypto.randomUUID()}`
      nodes.push({ id, name: editor.name.trim(), type: editor.type, template: editor.template || '', description: editor.description.trim(), executionSession: editor.executionSession, dependencies: editor.dependencies, hooks: editor.hooks, status: 'pending' })
      nextEditor = { ...editor, action: 'edit', nodeId: id }
    }
    setCurrent({ ...current, nodes, updatedAt: new Date().toISOString() })
    setEditor(nextEditor)
  }

  function updateHook(index        , changes     ) {
    setEditor((old     ) => ({ ...old, hooks: old.hooks.map((hook     , i        ) => i === index ? { ...hook, ...changes } : hook) }))
  }

  function removeNode(nodeId        ) {
    if (!current) return
    const target = current.nodes.find((node     ) => node.id === nodeId)
    if (!target || target.type === 'main') return
    if (['running', 'blocked'].includes(current.phase)) { setError('流程运行中或受阻时不能删除节点'); setMenu(null); return }
    const nodes = current.nodes.filter((node     ) => node.id !== nodeId).map((node     ) => ({
      ...node,
      dependencies: (node.dependencies || []).filter((id        ) => id !== nodeId),
      executionSession: node.executionSession === `node:${nodeId}` ? 'root' : node.executionSession,
    }))
    setCurrent({ ...current, nodes, updatedAt: new Date().toISOString() })
    setEditor(null)
    setMenu(null)
  }

  function openMenu(nodeId        , event     ) {
    if (suppressClick.current) { suppressClick.current = false; return }
    const node = event.currentTarget
    const rect = node.getBoundingClientRect()
    const x = event.type === 'contextmenu' ? event.clientX : rect.right - 6
    const y = event.type === 'contextmenu' ? event.clientY : rect.top + 22
    event.preventDefault?.()
    setMenu({ nodeId, x: Math.min(x, window.innerWidth - 190), y: Math.min(y, window.innerHeight - 155) })
  }

  const layout = current ? graphLayout(current.nodes, viewport.width, viewport.height) : null
  const fitZoom = layout ? Math.min(1, Math.max(0.01, Math.min(viewport.width / layout.width, viewport.height / layout.height))) : 1
  const scale = zoom ?? fitZoom
  function beginPan(event     ) {
    if (event.button !== 0 || event.target.closest?.('.topology-node,button,input,textarea,select')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    panStart.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y }
    setPanning(true)
    setMenu(null)
  }
  function movePan(event     ) {
    const start = panStart.current
    if (!start || start.pointerId !== event.pointerId) return
    setPan({ x: start.x + event.clientX - start.clientX, y: start.y + event.clientY - start.clientY })
  }
  function endPan(event     ) {
    if (panStart.current?.pointerId !== event.pointerId) return
    panStart.current = null
    setPanning(false)
  }
  function fitCanvas() {
    setZoom(null)
    setPan({ x: 0, y: 0 })
    if (canvasRef.current) { canvasRef.current.scrollLeft = 0; canvasRef.current.scrollTop = 0 }
  }
  function beginDrag(node     , position     , event     ) {
    if (event.button !== 0 || event.target.closest('button')) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: position.x, y: position.y, originalPosition: node.position, moved: false })
  }
  function moveDrag(event     ) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = (event.clientX - drag.startX) / scale, dy = (event.clientY - drag.startY) / scale
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    if (!drag.moved) { setDrag({ ...drag, moved: true }); setZoom(scale) }
    const position = { x: Math.max(0, Math.round(drag.x + dx)), y: Math.max(0, Math.round(drag.y + dy)) }
    setCurrent((old     ) => ({ ...old, nodes: old.nodes.map((node     ) => node.id === drag.id ? { ...node, position } : node) }))
  }
  async function endDrag(event     ) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const dx = (event.clientX - drag.startX) / scale, dy = (event.clientY - drag.startY) / scale
    const moved = drag.moved || Math.hypot(dx, dy) >= 4
    setDrag(null)
    if (!moved) return
    suppressClick.current = true
    setTimeout(() => { suppressClick.current = false }, 0)
    const position = { x: Math.max(0, Math.round(drag.x + dx)), y: Math.max(0, Math.round(drag.y + dy)) }
    setCurrent((old     ) => ({ ...old, nodes: old.nodes.map((node     ) => node.id === drag.id ? { ...node, position } : node) }))
    try { await api('/position', { method: 'POST', body: JSON.stringify({ statePath: current.statePath, nodeId: drag.id, ...position }) }) }
    catch (e     ) {
      setCurrent((old     ) => old?.statePath === current.statePath ? { ...old, nodes: old.nodes.map((node     ) => node.id === drag.id ? { ...node, position: drag.originalPosition } : node) } : old)
      setError(`保存节点位置失败：${e.message}`)
    }
  }
  const inputStyle = { boxSizing: 'border-box', width: '100%', border: `1px solid ${colors.line}`, borderRadius: 7, padding: '9px 11px', font: 'inherit', color: colors.ink, background: '#fbfcfe' }
  const buttonStyle = { border: `1px solid ${colors.line}`, borderRadius: 7, padding: '8px 12px', background: '#fff', color: colors.primary, fontWeight: 650, cursor: 'pointer' }
  const styles = `
    .topology-workspace-group{background:#fff;border:1px solid #e1e8f2;border-radius:11px;overflow:hidden}.topology-workspace-summary{display:flex;align-items:center;gap:12px;padding:16px 20px;cursor:pointer;list-style:none}.topology-workspace-summary::-webkit-details-marker{display:none}.topology-workspace-summary:focus-visible,.topology-session-card:focus-visible{outline:2px solid #7182e8;outline-offset:-2px}.topology-workspace-arrow{color:#9cabc0;transition:transform .15s}.topology-workspace-group[open] .topology-workspace-arrow{transform:rotate(90deg)}.topology-workspace-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#eef1ff;color:#7182e1;font-size:18px}.topology-workspace-heading{display:grid;min-width:0;gap:2px}.topology-workspace-heading span{font-size:12px;color:#9aa9bc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.topology-workspace-count{margin-left:auto;white-space:nowrap;font-size:12px;color:#8d9cb2}.topology-session-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:0 20px 20px}.topology-session-card{min-width:0;padding:16px;border:1px solid #e6ecf4;border-radius:9px;background:#fff;text-align:left;cursor:pointer;color:#263653}.topology-session-card:hover{border-color:#a4b0ed;box-shadow:0 4px 18px #5263990d}.topology-session-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.topology-session-status{border-radius:6px;padding:4px 8px;font-size:11px;white-space:nowrap;color:#8291a7;background:#f0f3f7}.topology-session-status.completed{color:#4ca787;background:#e9f8f1}.topology-session-status.failed,.topology-session-status.blocked{color:#c86d67;background:#fff0ef}.topology-session-status.running{color:#a77b29;background:#fff6e4}.topology-session-meta{display:flex;flex-wrap:wrap;gap:8px 20px;margin-top:15px;color:#8393aa;font-size:12px}.topology-session-file{margin-top:12px;padding-top:10px;border-top:1px solid #eff2f6;color:#9ba9bb;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media(max-width:700px){.topology-session-grid{grid-template-columns:1fr}}
    .topology-root{width:100%;max-width:none;margin:0;padding:20px 24px 24px;box-sizing:border-box;color:${colors.ink};font-family:Inter,"Microsoft YaHei",system-ui,sans-serif}
    .topology-session-list{max-height:calc(100vh - 150px);min-height:0;overflow-y:auto;overflow-x:hidden;align-content:start;padding:0 8px 12px 0;overscroll-behavior:contain;scrollbar-gutter:stable}
    .topology-banner{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;padding:14px 16px;border:1px solid #e9edf5;border-radius:9px;background:#fff}
    .topology-banner-title{font-weight:700;font-size:14px}.topology-banner-meta{margin-top:5px;color:#8998af;font-size:11px;overflow-wrap:anywhere}
    .topology-goal{display:grid;gap:6px;margin-bottom:14px;color:#8998af;font-size:12px}.topology-goal textarea{min-height:62px;resize:vertical}
    .topology-canvas-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;font-size:14px}
    .topology-workbench{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px;align-items:start}.topology-workbench.inspector-collapsed{grid-template-columns:minmax(0,1fr)}.topology-node-inspector,.topology-template-config{min-width:0;max-height:calc(100vh - 230px);overflow:auto;border:1px solid #e3e9f2;border-radius:9px;background:#fff}.topology-node-inspector form{display:flex;flex-direction:column;max-height:inherit}.topology-node-inspector-head,.topology-node-inspector-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;border-bottom:1px solid #edf0f5}.topology-node-inspector-head>div{display:grid;gap:3px;min-width:0}.topology-node-inspector-head span{overflow:hidden;color:#8998af;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.topology-node-inspector-head button{border:0;background:transparent;color:#8493a8;font-size:18px;cursor:pointer}.topology-node-inspector-body{display:grid;gap:11px;overflow:auto;padding:12px}.topology-node-inspector-foot{justify-content:flex-end;border-top:1px solid #edf0f5;border-bottom:0}.topology-node-inspector .topology-danger{margin-right:auto}.topology-template-editor-grid.collapsed{grid-template-columns:minmax(0,1fr)}.topology-workbench .topology-canvas{height:calc(100vh - 350px);min-height:460px}
    .topology-canvas{position:relative;height:calc(100vh - 340px);min-height:460px;overflow:auto;border:1px solid #edf0f6;border-radius:8px;background-color:#fafbfe;background-image:radial-gradient(#d6dfee 1px,transparent 1px);background-size:20px 20px;cursor:grab;touch-action:none;user-select:none}
    .topology-canvas.panning{cursor:grabbing}
    .topology-canvas-inner{position:relative;transform-origin:top left}
    .topology-links{position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:0}
    .topology-edge{fill:none;stroke:#b9c4d4;stroke-width:1.7}.topology-edge.satisfied{stroke:#60c6a3}.topology-edge.blocked{stroke:#dd7777}
    .topology-node{position:absolute;z-index:1;width:220px;height:170px;padding:0;border:1px solid #dce4f0;border-radius:12px;background:#fff;box-shadow:0 4px 12px #687a9a0c;color:inherit;text-align:left;cursor:grab;touch-action:none;transition:border-color .15s,box-shadow .15s}
    .topology-node:active{cursor:grabbing}
    .topology-node:hover,.topology-node.selected{border-color:#97a7f2;box-shadow:0 0 0 3px #e9edff,0 6px 18px #6377a51a}
    .topology-node:focus-visible{outline:2px solid #8092f5;outline-offset:2px}
    .topology-node-body{height:103px;padding:13px 13px 7px;box-sizing:border-box}.topology-node-head{display:flex;align-items:center;gap:10px;min-width:0}
    .topology-node-icon{display:grid;place-items:center;flex:none;width:36px;height:36px;border-radius:10px;background:#edf0ff;color:#8190e8;font-size:16px}
    .topology-node-icon.approval{background:#fff2e4;color:#dcaa64}.topology-node-icon.custom{background:#f3edff;color:#ad86e0}
    .topology-node-name{max-width:132px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#263755;font-size:12px;font-weight:750}
    .topology-node-type{margin-top:4px;color:#a5b2c4;font-size:10px}.topology-node-description{display:-webkit-box;overflow:hidden;margin-top:10px;color:#9aa9bd;font-size:10px;line-height:1.5;word-break:break-word;-webkit-line-clamp:2;-webkit-box-orient:vertical}
    .topology-node-session{height:22px;margin:0 13px;overflow:hidden;color:#8898b0;font-size:10px;text-overflow:ellipsis;white-space:nowrap}
    .topology-session-link{max-width:100%;padding:0;border:0;background:none;color:#7182d9;font:inherit;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer}.topology-session-link:hover{text-decoration:underline}
    .topology-node-footer{display:flex;align-items:center;justify-content:space-between;height:32px;margin:0 13px;border-top:1px solid #eff2f7;color:#a5b2c3;font-size:10px}
    .topology-node-status{display:flex;align-items:center;gap:6px}.topology-node-dot{width:6px;height:6px;border-radius:50%;background:#b9c4d4}
    .topology-node-dot.running{background:#e7a94c}.topology-node-dot.completed{background:#60c6a3}.topology-node-dot.blocked{background:#dd7777}
    .topology-node-hook{color:#9eabc0}.topology-node-hook b{margin-right:3px;color:#f5a64c}
    .topology-tip{margin-top:8px;color:#a6b2c5;font-size:11px}
    .topology-context-menu{position:fixed;z-index:100;width:174px;padding:6px;border:1px solid #e6eaf2;border-radius:9px;background:#fff;box-shadow:0 12px 35px #26365324}
    .topology-context-menu button{display:flex;align-items:center;gap:9px;width:100%;padding:9px 10px;border:0;border-radius:6px;background:#fff;color:#52627d;text-align:left;font-size:12px;cursor:pointer}
    .topology-context-menu button:hover{background:#f1f4ff;color:#6174d8}
    .topology-modal-backdrop{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;padding:20px;background:#1e2c4880}
    .topology-modal{display:flex;flex-direction:column;width:min(620px,calc(100vw - 32px));max-height:calc(100vh - 40px);overflow:hidden;border-radius:13px;background:#fff;box-shadow:0 20px 60px #1e2c4830}
    .topology-modal-head,.topology-modal-foot{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #edf0f5}.topology-modal-head h2{margin:0;font-size:16px}
    .topology-modal-body{display:grid;gap:13px;overflow:auto;padding:18px 20px}.topology-field{display:grid;gap:6px;color:#7888a1;font-size:12px;font-weight:600}.topology-field textarea{min-height:74px;resize:vertical;line-height:1.5}
    .topology-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.topology-dependencies{display:grid;gap:5px;max-height:150px;overflow:auto;padding:8px;border:1px solid #e3e9f2;border-radius:7px}
    .topology-dependencies label{display:flex;align-items:center;gap:8px;padding:4px;color:#617089;font-size:12px;font-weight:400}.topology-hint{color:#a1aec1;font-size:11px;line-height:1.5}
    .topology-hooks{display:grid;gap:12px;padding:12px;border:1px solid #e3e9f2;border-radius:8px}.topology-hook-head{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#7888a1;font-size:12px;font-weight:600}.topology-hook-card{display:grid;gap:10px;padding:12px;border:1px solid #e7ebf3;border-radius:7px}.topology-hook-row{display:flex;gap:8px;align-items:center}
    .topology-template-space{display:grid;gap:12px}.topology-template-header{display:flex;align-items:center;justify-content:space-between;gap:12px}.topology-template-header h2{margin:0;font-size:17px}.topology-template-header p{margin:4px 0 0;color:#8595ad;font-size:12px}.topology-template-error{padding:10px;border-radius:7px;background:#fff1f1;color:#b44d55}
    .topology-template-group{background:#fff;border:1px solid #e1e8f2;border-radius:10px;overflow:hidden}.topology-template-group summary{display:flex;align-items:center;gap:10px;padding:11px 14px;list-style:none;cursor:pointer}.topology-template-group summary::-webkit-details-marker{display:none}.topology-template-group summary>span:first-child{color:#9cabc0;transition:transform .15s}.topology-template-group[open] summary>span:first-child{transform:rotate(90deg)}.topology-template-group summary>span:nth-of-type(2){font-size:12px;color:#98a6ba}.topology-template-group summary small{margin-left:auto;color:#8998af}.topology-template-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;padding:0 14px 14px}.topology-template-card{padding:11px;border:1px solid #e6ecf4;border-radius:8px;background:#fff;cursor:pointer}.topology-template-card:hover,.topology-template-card.selected{border-color:#9aa8ec;background:#fafbff}.topology-template-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.topology-template-card-head span{font-size:10px;color:#8493a8;background:#f0f3f7;border-radius:5px;padding:3px 6px}.topology-template-card p{margin:6px 0;color:#8796ac;font-size:11px}.topology-template-card-actions{display:flex;justify-content:flex-end}.topology-template-detail{padding:14px;border:1px solid #e3e9f2;border-radius:9px;background:#fff}.topology-template-detail>header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding-bottom:10px;border-bottom:1px solid #edf0f5}.topology-template-detail h3{margin:0;font-size:14px}.topology-template-detail p{margin:3px 0;color:#8998ad;font-size:11px}.topology-template-detail-nodes{display:grid;gap:6px;margin-top:10px}.topology-template-detail-nodes article{display:grid;grid-template-columns:28px minmax(120px,1fr) minmax(140px,1fr);gap:8px;align-items:center;padding:7px;border:1px solid #edf0f5;border-radius:6px}.topology-template-detail-nodes article>span{color:#7182e8;font-size:10px}.topology-template-detail-nodes strong{font-size:11px}.topology-template-detail-nodes code{display:inline-block;margin:2px;padding:3px 5px;border-radius:4px;background:#f3f6fa;color:#687891;font-size:10px}
    .topology-template-namebar{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.topology-template-editor-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px}.topology-template-canvas-panel,.topology-template-config{min-width:0;padding:13px;border:1px solid #e3e9f2;border-radius:9px;background:#fff}.topology-template-panel-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;font-size:12px}.topology-template-nodes{display:flex;align-items:center;gap:8px;min-height:170px;overflow-x:auto;padding:14px;border:1px solid #edf0f5;border-radius:7px;background-color:#fafbfe;background-image:radial-gradient(#d6dfee 1px,transparent 1px);background-size:20px 20px}.topology-template-node{display:grid;gap:5px;flex:none;width:160px;min-height:84px;padding:11px;border:1px solid #dce4f0;border-radius:9px;background:#fff;text-align:left;color:#263653;cursor:pointer}.topology-template-node.selected{border:2px solid #8797ed;padding:10px;background:#fafbff}.topology-template-node span,.topology-template-node small{color:#8c9bb1;font-size:10px}.topology-template-arrow{color:#aab6c7}.topology-template-hint{margin:8px 0 0;color:#9aa8bc;font-size:10px}.topology-template-config{display:grid;gap:8px;max-height:68vh;overflow:auto}.topology-template-config h3{margin:0 0 2px;font-size:13px}.topology-template-config .topology-field{margin:0}.topology-template-config-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.topology-template-deps{display:grid;gap:4px;max-height:110px;overflow:auto;padding:7px;border:1px solid #e3e9f2;border-radius:6px}.topology-template-deps label{display:flex;align-items:center;gap:7px;color:#617089;font-size:11px;font-weight:400}.topology-template-subsection{display:grid;gap:7px;padding-top:9px;border-top:1px solid #edf0f5}.topology-template-subsection .topology-template-panel-head{margin:0}.topology-template-output{display:grid;grid-template-columns:1fr 85px auto;gap:5px;align-items:center}.topology-template-output button,.topology-template-hook button{border:0;background:none;color:#b44d55;cursor:pointer;font-size:10px}.topology-template-hook{display:grid;gap:6px;padding:8px;border:1px solid #edf0f5;border-radius:6px}.topology-template-hook textarea{min-height:55px}.topology-template-hook label{font-size:11px;color:#7888a1}.topology-template-delete{justify-self:start;border:0;background:none;color:#b44d55;cursor:pointer}.topology-template-footer{display:flex;align-items:center;gap:8px;margin-top:12px;padding:11px;border:1px solid #e3e9f2;border-radius:8px;background:#fff}.topology-template-footer span{flex:1;color:#8998ad;font-size:10px}
    @media(max-width:900px){.topology-workbench{grid-template-columns:minmax(0,1fr)}.topology-template-editor-grid{grid-template-columns:minmax(0,1fr)}.topology-node-inspector,.topology-template-config{max-height:none}.topology-template-card-grid{grid-template-columns:1fr}}    .topology-modal-foot{justify-content:flex-end;gap:8px;border-top:1px solid #edf0f5;border-bottom:0}.topology-danger{margin-right:auto;border:0;background:transparent;color:#b44d55;cursor:pointer}
    @media(max-width:680px){.topology-root{padding:14px}.topology-banner{align-items:flex-start;flex-direction:column}.topology-modal-grid,.topology-template-namebar,.topology-template-config-row{grid-template-columns:1fr}.topology-template-footer{align-items:flex-start;flex-direction:column}.topology-template-detail-nodes article{grid-template-columns:24px 1fr}.topology-template-detail-nodes article>div:last-child{grid-column:2}.topology-canvas{height:calc(100vh - 390px);min-height:420px}}
  `

  return h('main', { className: 'topology-root' },
    h('style', null, styles),
    h('header', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 } },
      h('div', null,
        h('h1', { style: { margin: 0, fontSize: 21 } }, '任务拓扑编排'),
        h('p', { role: 'status', style: { margin: '5px 0 0', color: colors.muted, fontSize: 13 } }, connection),
      ),
      current
        ? h('div', { style: { display: 'flex', gap: 8 } },
            h('button', { type: 'button', style: { ...buttonStyle, color: colors.ink }, onClick: () => { setCurrent(null); setMenu(null) } }, '返回列表'),
            h('button', { type: 'button', disabled: busy || ['running', 'blocked'].includes(current.phase), style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary, opacity: busy || ['running', 'blocked'].includes(current.phase) ? 0.7 : 1 }, onClick: start }, busy ? '处理中…' : '启动'),
          )
      : creating
        ? h('button', { type: 'button', style: { ...buttonStyle, color: colors.ink }, onClick: () => { setCreating(false); setError('') } }, '返回列表')
        : h('div', { style: { display: 'flex', gap: 8 } },
            ...[['topologies', '拓扑会话'], ['templates', '模板空间']].map(([value, label]) => h('button', { key: value, type: 'button', style: { ...buttonStyle, color: view === value ? colors.primary : colors.muted, background: view === value ? '#f1f3ff' : '#fff' }, onClick: () => { setView(value); setError('') } }, label)),
            view === 'topologies' && h('button', { type: 'button', style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary }, onClick: beginCreate }, '＋ 新增拓扑会话'),
          ),
    ),
    error && h('p', { role: 'alert', style: { color: '#b44d55', background: '#fff1f1', padding: 10, borderRadius: 7 } }, error),
    creating && h('form', { onSubmit: create, style: { border: `1px solid ${colors.line}`, borderRadius: 10, padding: 16, background: '#fff', display: 'grid', gap: 14, marginBottom: 18 } },
      h('h2', { style: { margin: 0, fontSize: 16 } }, '新建拓扑会话'),
      h('label', { className: 'topology-field' }, '拓扑名称', h('input', { value: name, onChange: (event     ) => setName(event.target.value), style: inputStyle })),
      h('label', { className: 'topology-field' }, '工作区', h('select', { value: workspaceId, onChange: (event     ) => { setWorkspaceId(event.target.value); setStatePath(''); setStatePathEdited(false) }, style: inputStyle },
        h('option', { value: '' }, workspaces.length ? '请选择工作区' : '当前没有可用工作区'),
        ...workspaces.map((workspace     ) => h('option', { key: workspace.workspaceId, value: workspace.workspaceId }, `${workspace.title} · ${workspace.path}`)),
      )),
      h('div', null, h('strong', { style: { display: 'block', marginBottom: 8, fontSize: 12 } }, '创建方式'),
        h('label', { style: { marginRight: 18, fontSize: 12, color: colors.muted } }, h('input', { type: 'radio', checked: mode !== 'custom', onChange: () => setMode('page-development-workflow') }), '使用模板'),
        h('label', { style: { marginRight: 12, fontSize: 12, color: colors.muted } }, h('input', { type: 'radio', checked: mode === 'custom', onChange: () => setMode('custom') }), '自定义节点'),
        mode !== 'custom' && h('select', { value: mode, onChange: (event     ) => setMode(event.target.value), style: { ...inputStyle, marginTop: 8 } },
          ...[...(templateCatalog.fixed || []), ...(templateCatalog.custom || [])].map((template     ) => h('option', { key: template.id, value: template.id }, `${template.name} · ${template.id.startsWith('custom-') ? '自定义模板' : '固定模板'}`)),
        ),
      ),
      h('label', { className: 'topology-field' }, '该拓扑的 JSON 文件地址', h('input', { value: statePathEdited ? statePath : workspaceStatePath(workspaces.find((workspace     ) => workspace.workspaceId === workspaceId), name), onChange: (event     ) => { setStatePath(event.target.value); setStatePathEdited(true) }, placeholder: '选择工作区后自动生成，也可以手动修改', style: inputStyle })),
      h('div', { className: 'topology-hint' }, '默认保存在所选工作区的 .dsh/task-ort/ 目录下；每条拓扑会话使用一个 JSON 文件。'),
      h('div', null,
        h('button', { type: 'submit', disabled: busy, style: { ...buttonStyle, background: colors.primary, color: '#fff' } }, '创建并打开画布'),
        h('button', { type: 'button', onClick: () => setCreating(false), style: { ...buttonStyle, marginLeft: 8, color: colors.ink } }, '取消'),
      ),
    ),
    !current && !creating && (view === 'templates'
      ? h(TemplateSpace, { catalog: templateCatalog, onCatalogChange: setTemplateCatalog, onUseTemplate: (template     ) => { setView('topologies'); beginCreate(); setMode(template.id) } })
      : h(React.Fragment, null,
      listError && h('p', { role: 'alert', style: { color: '#b44d55' } }, listError),
      sessionId ? h('div', { style: { padding: 30, color: colors.muted } }, '当前会话没有关联的拓扑记录。') : h('section', { className: 'topology-session-list', style: { display: 'grid', gap: 10 } }, items.length
        ? groupTopologies(items, workspaces).map((group     ) => h('details', { key: group.key, open: group.defaultOpen, className: 'topology-workspace-group' },
            h('summary', { className: 'topology-workspace-summary' },
              h('span', { className: 'topology-workspace-arrow', 'aria-hidden': true }, '›'),
              h('span', { className: 'topology-workspace-icon', 'aria-hidden': true }, '▱'),
              h('span', { className: 'topology-workspace-heading' }, h('strong', null, group.title), group.path && h('span', { title: group.path }, group.path)),
              h('span', { className: 'topology-workspace-count' }, `${group.items.length} 个会话`)),
            h('div', { className: 'topology-session-grid' }, ...group.items.map((item     ) => h('button', { key: item.topologyId, type: 'button', className: 'topology-session-card', onClick: () => { if (!listMenu) { setCurrent(item); setGoal(item.goal || item.nodes?.[0]?.description || '') } }, onContextMenu: (event     ) => { event.preventDefault(); event.stopPropagation(); if (item.phase === 'draft') setListMenu({ x: event.clientX, y: event.clientY, item }) } },
              h('div', { className: 'topology-session-head' }, h('strong', null, item.name), h('span', { className: `topology-session-status ${item.phase}` }, ({ draft: '草稿', running: '运行中', completed: '已完成', failed: '失败', blocked: '受阻' }                          )[item.phase] || item.phase)),
              h('div', { className: 'topology-session-meta' }, h('span', null, `${item.nodes.length} 个节点`), h('span', null, `创建于 ${Number.isFinite(Date.parse(item.createdAt)) ? new Date(item.createdAt).toLocaleString() : '未知'}`)),
              h('div', { className: 'topology-session-file', title: item.statePath }, item.statePath),
            )))
          ))
        : h('div', { style: { border: `1px solid ${colors.line}`, borderRadius: 10, padding: 38, background: '#fff', textAlign: 'center', color: colors.muted } }, '还没有拓扑会话。点击“新增拓扑会话”开始.'),
      ),
    )),
    listMenu && h('div', { className: 'topology-context-menu topology-list-menu', style: { left: listMenu.x, top: listMenu.y }, onPointerDown: (event     ) => event.stopPropagation() },
      h('button', { type: 'button', style: { color: '#b44d55' }, onClick: () => deleteDraft(listMenu.item) }, h('span', null, '×'), '删除草稿及 JSON 文件')),
    current && h(React.Fragment, null,
      h('div', { className: 'topology-banner' },
        h('div', null,
          h('div', { className: 'topology-banner-title' }, current.name),
          h('div', { className: 'topology-banner-meta' }, `状态：${current.phase} · DSH 会话：${current.sessionId || '启动时创建'} · JSON：${current.statePath}`),
        ),
        h('button', { type: 'button', disabled: busy || ['running', 'blocked'].includes(current.phase), style: buttonStyle, onClick: saveCurrent }, '保存配置'),
      ),
      h('label', { className: 'topology-field', style: { marginBottom: 12 } }, '工作区',
        h('select', { value: current.workspaceId || '', disabled: ['running', 'blocked'].includes(current.phase), style: inputStyle, onChange: (event     ) => {
          const workspace = workspaces.find((item     ) => item.workspaceId === event.target.value)
          setCurrent({ ...current, workspaceId: workspace?.workspaceId || '', workspacePath: workspace?.path || '' })
        } },
          h('option', { value: '' }, '请选择工作区'),
          ...workspaces.map((workspace     ) => h('option', { key: workspace.workspaceId, value: workspace.workspaceId }, `${workspace.title} · ${workspace.path}`)),
        ),
      ),
      h('label', { className: 'topology-goal' }, '主会话目标',
        h('textarea', { value: goal, disabled: ['running', 'blocked'].includes(current.phase), onChange: (event     ) => { setGoal(event.target.value); current.goal = event.target.value }, rows: 2, style: inputStyle }),
      ),
      current.phase === 'blocked' && h('section', { role: 'status', style: { marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff7e8', color: '#76501a', fontSize: 12 } },
        h('strong', null, '流程受阻，后续节点已暂停'),
        ...current.nodes.filter((node     ) => node.status === 'blocked').map((node     ) => h('div', { key: node.id, style: { marginTop: 8 } },
          h('span', null, `${node.name}：${node.diagnostic || '未提供原因'}`),
          node.type === 'subagent' ? h('button', { type: 'button', disabled: busy, style: { ...buttonStyle, marginLeft: 10 }, onClick: () => retryNode(node.id) }, '重试节点') : h('span', null, '（请在主会话中处理并恢复 Goal）'),
        )),
        current.notificationError && h('div', { style: { marginTop: 8 } }, `通知主会话失败：${current.notificationError}`),
      ),
      current.phase === 'failed' && h('section', { role: 'alert', style: { marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff1f1', color: '#a34242', fontSize: 12 } },
        h('strong', null, '流程失败，后续节点已停止'),
        ...current.nodes.filter((node     ) => node.status === 'failed').map((node     ) => h('div', { key: node.id, style: { marginTop: 8 } }, `${node.name}：${node.diagnostic || current.lastError || '未提供原因'}`)),
        current.notificationError && h('div', { style: { marginTop: 8 } }, `通知主会话失败：${current.notificationError}`),
      ),
      h('div', { className: `topology-workbench${inspectorCollapsed || !editor ? ' inspector-collapsed' : ''}` },
        h(WorkflowCanvas, {
          key: current.topologyId, nodes: current.nodes, sessionId: current.sessionId, mode: 'topology', title: '流程画布', selectedNodeId: editor?.nodeId,
          inspectorOpen: Boolean(editor) && !inspectorCollapsed,
          onToggleInspector: editor ? () => setInspectorCollapsed((value         ) => !value) : undefined,
          onSelectNode: (nodeId        ) => openEditor('edit', nodeId),
          onEditNode: (nodeId        ) => openEditor('edit', nodeId),
          onAddNode: (nodeId        ) => openEditor('add', nodeId), onDeleteNode: removeNode,
          onPositionChange: async (nodeId        , position     , originalPosition     ) => {
            setCurrent((old     ) => ({ ...old, nodes: old.nodes.map((node     ) => node.id === nodeId ? { ...node, position } : node) }))
            try { await api('/position', { method: 'POST', body: JSON.stringify({ statePath: current.statePath, nodeId, ...position }) }) }
            catch (error     ) {
              setCurrent((old     ) => old?.statePath === current.statePath ? { ...old, nodes: old.nodes.map((node     ) => node.id === nodeId ? { ...node, position: originalPosition } : node) } : old)
              throw error
            }
          },
          openSession, onError: setError,
        }),
        editor && !inspectorCollapsed && h(TopologyNodeInspector, { current, editor, setEditor, saveNode, updateHook, removeNode, inputStyle, buttonStyle }),
      ),
      current.phase === 'running' && h('p', { style: { color: '#a86a1b', fontSize: 12 } }, '调度器正在运行；节点状态会自动刷新。'),
    ),
  )
}
function Icon() { return h('span', { 'aria-hidden': true }, '◇') }
const inject = ['slots', 'workspaces', 'uiWorkspace']
function apply(ctx     ) {
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: 'dsh-task-orchestrator',
    inject: () => ({ workspaceSource: ctx.workspaces?.list, openSession: (target     ) => ctx.uiWorkspace.openSession(target) }),
  }, Panel))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'dsh-task-orchestrator', order: 30, label: () => '拓扑编排' }, Icon))
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'dsh-task-orchestrator', order: 20, label: () => '拓扑',
    inject: (sessionId        ) => ({ sessionId, workspaceSource: ctx.workspaces?.list, openSession: (target     ) => ctx.uiWorkspace.openSession(target) }),
  }, Panel))
}

return { apply, inject }
} })
