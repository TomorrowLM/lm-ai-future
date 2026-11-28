function TemplateSpace({ catalog, onCatalogChange, onUseTemplate }: { catalog: any; onCatalogChange: (value: any) => void; onUseTemplate: (template: any) => void }) {
  const [selectedId, setSelectedId] = React.useState('page-development-workflow')
  const [editing, setEditing] = React.useState(null as any)
  const [selectedNodeId, setSelectedNodeId] = React.useState('')
  const [inspectorCollapsed, setInspectorCollapsed] = React.useState(false)
  const [error, setError] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const buttonStyle = { border: `1px solid ${colors.line}`, borderRadius: 7, padding: '8px 12px', background: '#fff', color: colors.primary, fontWeight: 650, cursor: 'pointer' }
  const inputStyle = { boxSizing: 'border-box', width: '100%', border: `1px solid ${colors.line}`, borderRadius: 7, padding: '9px 11px', font: 'inherit', color: colors.ink, background: '#fbfcfe' }
  const all = [...(catalog?.fixed || []), ...(catalog?.custom || [])]
  const selected = all.find((template: any) => template.id === selectedId) || all[0]
  const editingNode = editing?.nodes.find((node: any) => node.id === selectedNodeId) || editing?.nodes[0]
  const fixed = (catalog?.fixed || []).filter((template: any) => template.name.toLowerCase().includes(search.toLowerCase()))
  const custom = (catalog?.custom || []).filter((template: any) => template.name.toLowerCase().includes(search.toLowerCase()))
  const setNode = (nodeId: string, changes: any) => setEditing((value: any) => ({ ...value, nodes: value.nodes.map((node: any) => node.id === nodeId ? { ...node, ...changes } : node) }))
  const remap = (template: any, name = `${template.name}（自定义）`) => {
  
  const idMap = new Map(template.nodes.map((node: any) => [node.id, `node-${crypto.randomUUID()}`]))
  
  return {
  
  
  id: `custom-${crypto.randomUUID()}`, name, description: template.description || '',
  
  
  nodes: template.nodes.map((node: any) => ({
  
  
  
  ...node, id: idMap.get(node.id), dependencies: node.dependencies.map((id: string) => idMap.get(id)),
  
  
  
  hooks: (node.hooks || []).map((hook: any) => ({ ...hook, output: hook.output ? { ...hook.output } : undefined })),
  
  
  
  outputs: (node.outputs || []).map((output: any) => ({ ...output })),
  
  
  
  ...(node.position ? { position: { ...node.position } } : {}),
  
  
  })),
  
  }
  }
  const editTemplate = (template: any) => {
  
  const draft = remap(template, template.name)
  
  draft.id = template.id.startsWith('custom-') || !(catalog.fixed || []).some((item: any) => item.id === template.id) ? template.id : draft.id
  
  draft.createdAt = template.createdAt
  
  setEditing(draft); setSelectedNodeId(draft.nodes[0]?.id || ''); setInspectorCollapsed(false); setError('')
  }
  const createTemplate = () => {
  
  const blankSource = (catalog.fixed || []).find((item: any) => item.id === 'blank-topology') || { name: '空白拓扑模板', description: '', nodes: [{ id: 'step-1', name: '主会话', type: 'main', description: '', dependencies: [], executionSession: 'root', hooks: [], outputs: [] }] }
  
  const blank = remap(blankSource, '新建自定义模板')
  
  setEditing(blank); setSelectedNodeId(blank.nodes[0].id); setInspectorCollapsed(false); setError('')
  }
  const copyTemplate = (template: any) => {
  
  const copy = remap(template, `${template.name}（副本）`)
  
  setEditing(copy); setSelectedNodeId(copy.nodes[0]?.id || ''); setInspectorCollapsed(false); setError('')
  }
  const saveTemplate = async (event: any) => {
  
  event.preventDefault()
  
  if (!editing || !editing.name.trim()) return
  
  setBusy(true); setError('')
  
  try {
  
  
  const saved = await api('/templates', { method: 'POST', body: JSON.stringify({ ...editing, name: editing.name.trim() }) })
  
  
  const next = [...(catalog.custom || []).filter((item: any) => item.id !== saved.id), saved].sort((a: any, b: any) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  
  
  onCatalogChange({ ...catalog, custom: next }); setSelectedId(saved.id); setEditing(null)
  
  } catch (e: any) { setError(`保存模板失败：${e.message}`) }
  
  finally { setBusy(false) }
  }
  const addNode = (predecessorId?: string) => {
  
  const id = `node-${crypto.randomUUID()}`
  
  const predecessor = editing.nodes.find((item: any) => item.id === predecessorId) || editing.nodes[editing.nodes.length - 1]
  const node = { id, name: '新步骤', type: 'subagent', description: '', dependencies: predecessor ? [predecessor.id] : [], executionSession: predecessor ? 'parent' : 'root', hooks: [], outputs: [] }
  
  setEditing({ ...editing, nodes: [...editing.nodes, node] }); setSelectedNodeId(id); setInspectorCollapsed(false)
  }
  const removeNode = (nodeId: string) => {
  
  if (editing.nodes[0]?.id === nodeId) return
  
  const nodes = editing.nodes.filter((node: any) => node.id !== nodeId).map((node: any) => ({ ...node, dependencies: node.dependencies.filter((id: string) => id !== nodeId) }))
  
  setEditing({ ...editing, nodes }); setSelectedNodeId(nodes[0]?.id || '')
  }
  const updateHook = (index: number, changes: any) => setNode(editingNode.id, { hooks: editingNode.hooks.map((hook: any, i: number) => i === index ? { ...hook, ...changes } : hook) })
  const updateOutput = (index: number, changes: any) => setNode(editingNode.id, { outputs: editingNode.outputs.map((output: any, i: number) => i === index ? { ...output, ...changes } : output) })
  const newOutput = () => setNode(editingNode.id, { outputs: [...(editingNode.outputs || []), { path: '', format: 'Markdown', description: '' }] })
  const addHook = () => setNode(editingNode.id, { hooks: [...(editingNode.hooks || []), normalizeHook({})] })
  const field = (label: string, value: any, onChange: (event: any) => void, placeholder = '', multiline = false) => h('label', { className: 'topology-field', key: label }, label, multiline
  
  ? h('textarea', { value: value || '', onChange, placeholder, style: inputStyle })
  
  : h('input', { value: value || '', onChange, placeholder, style: inputStyle }))
  if (editing) return h('section', { className: 'topology-template-space' },
  
  h('header', { className: 'topology-template-header' }, h('div', null, h('h2', null, editing.createdAt ? '编辑自定义模板' : '新建自定义模板'), h('p', null, '编辑模板只更新模板定义；已创建的拓扑会话保留自己的配置快照。')), h('button', { type: 'button', style: buttonStyle, onClick: () => setEditing(null) }, '返回模板空间')),
  
  error && h('p', { role: 'alert', className: 'topology-template-error' }, error),
  
  h('form', { onSubmit: saveTemplate },
  
  
  h('div', { className: 'topology-template-namebar' }, h('label', { className: 'topology-field' }, '模板名称', h('input', { required: true, maxLength: 120, value: editing.name, onChange: (event: any) => setEditing({ ...editing, name: event.target.value }), style: inputStyle })), h('label', { className: 'topology-field' }, '模板说明', h('input', { value: editing.description, onChange: (event: any) => setEditing({ ...editing, description: event.target.value }), style: inputStyle }))),
  
  
  h('div', { className: `topology-template-editor-grid${inspectorCollapsed ? ' collapsed' : ''}` },
  
  
  
  h(WorkflowCanvas, {
    key: editing.id, nodes: editing.nodes, mode: 'template', title: '模板流程画布', selectedNodeId: editingNode?.id,
    inspectorOpen: !inspectorCollapsed, onToggleInspector: () => setInspectorCollapsed(!inspectorCollapsed), addButtonLabel: '添加节点',
    onSelectNode: setSelectedNodeId, onEditNode: (nodeId: string) => { setSelectedNodeId(nodeId); setInspectorCollapsed(false) },
    onAddNode: (nodeId?: string) => addNode(nodeId), onDeleteNode: removeNode,
    onPositionChange: (nodeId: string, position: any) => setEditing((value: any) => ({ ...value, nodes: value.nodes.map((node: any) => node.id === nodeId ? { ...node, position } : node) })),
  }),
  !inspectorCollapsed && editingNode && h('aside', { className: 'topology-template-config' },
  
  
  
  
  h('h3', null, `节点配置 · ${editingNode.name}`),
  
  
  
  
  field('节点名称', editingNode.name, (event: any) => setNode(editingNode.id, { name: event.target.value })),
  
  
  
  
  editingNode.id === editing.nodes[0]?.id
  
  
  
  
  
  ? h('label', { className: 'topology-field' }, '节点类型', h('input', { value: '主会话（首节点固定）', disabled: true, style: inputStyle }))
  
  
  
  
  
  : h('div', { className: 'topology-template-config-row' },
  
  
  
  
  
  
  
  h('label', { className: 'topology-field' }, '节点类型', h('select', { value: editingNode.type, onChange: (event: any) => setNode(editingNode.id, { type: event.target.value }), style: inputStyle }, h('option', { value: 'subagent' }, '子代理'), h('option', { value: 'human' }, '人工确认'), h('option', { value: 'custom' }, '自定义节点'))),
  
  
  
  
  
  
  
  field('步骤模板 / 执行角色', editingNode.template, (event: any) => setNode(editingNode.id, { template: event.target.value }), '例如：需求分析师')),
  
  
  
  
  field('节点说明（该节点要达成的最终目标）', editingNode.description, (event: any) => setNode(editingNode.id, { description: event.target.value }), '描述本节点的目标与预期结果', true),
  
  
  
  
  editingNode.id !== editing.nodes[0]?.id && h(React.Fragment, null,
  
  
  
  
  
  h('label', { className: 'topology-field' }, '执行会话', h('select', { value: editingNode.executionSession || 'parent', onChange: (event: any) => setNode(editingNode.id, { executionSession: event.target.value }), style: inputStyle }, h('option', { value: 'root' }, '根主会话'), h('option', { value: 'parent' }, '父节点会话（默认）'), ...editing.nodes.filter((node: any) => node.type === 'main' || node.type === 'subagent').map((node: any) => h('option', { key: node.id, value: `node:${node.id}` }, `节点会话：${node.name}`)))),
  
  
  
  
  
  h('div', { className: 'topology-field' }, '前置依赖（全部成功后触发）', h('div', { className: 'topology-template-deps' }, ...dependencyCandidates(editing.nodes, editingNode, editing.nodes.findIndex((node: any) => node.id === editingNode.id), editingNode.dependencies).map((node: any) => h('label', { key: node.id }, h('input', { type: 'checkbox', checked: editingNode.dependencies.includes(node.id), onChange: (event: any) => setNode(editingNode.id, { dependencies: event.target.checked ? [...editingNode.dependencies, node.id] : editingNode.dependencies.filter((id: string) => id !== node.id) }) }), node.name)))),
  
  
  
  
  ),
  
  
  
  
  h('section', { className: 'topology-template-subsection' }, h('div', { className: 'topology-template-panel-head' }, h('strong', null, '输出文件'), h('button', { type: 'button', style: buttonStyle, onClick: newOutput }, '＋ 添加')), ...(editingNode.outputs || []).map((output: any, index: number) => h('div', { className: 'topology-template-output', key: index }, h('input', { value: output.path, placeholder: '相对或绝对文件路径', onChange: (event: any) => updateOutput(index, { path: event.target.value }), style: inputStyle }), h('input', { value: output.format, placeholder: '格式', onChange: (event: any) => updateOutput(index, { format: event.target.value }), style: inputStyle }), h('button', { type: 'button', onClick: () => setNode(editingNode.id, { outputs: editingNode.outputs.filter((_: any, i: number) => i !== index) }) }, '移除')))),
  
  
  
  
  h('section', { className: 'topology-template-subsection' }, h('div', { className: 'topology-template-panel-head' }, h('strong', null, 'Hook 事件'), h('button', { type: 'button', style: buttonStyle, onClick: addHook }, '＋ 添加事件')), !(editingNode.hooks || []).length && h('p', { className: 'topology-template-hint' }, '可为所有节点配置节点生命周期或 DSH 事件。'), ...(editingNode.hooks || []).map((hook: any, index: number) => h('div', { className: 'topology-template-hook', key: index }, h('select', { value: hook.event, onChange: (event: any) => updateHook(index, { event: event.target.value }), style: inputStyle }, h('option', { value: '' }, '请选择 DSH 事件'), ...hookEvents.map((group: any) => h('optgroup', { key: group.group, label: group.group }, ...group.items.map(([value, label]: string[]) => h('option', { key: value, value }, `${value} — ${label}`))))), h('textarea', { value: hook.action, onChange: (event: any) => updateHook(index, { action: event.target.value }), placeholder: '动作描述', style: inputStyle }), hook.event === 'orchestrator/node-end' && h('textarea', { value: hook.nextCondition, onChange: (event: any) => updateHook(index, { nextCondition: event.target.value }), placeholder: '满足什么条件后通知调度器进入后续节点', style: inputStyle }), h('label', null, h('input', { type: 'checkbox', checked: hook.output.enabled, onChange: (event: any) => updateHook(index, { output: { ...hook.output, enabled: event.target.checked } }) }), '节点结果输出（可选）'), hook.output.enabled && h(React.Fragment, null, h('input', { value: hook.output.format, onChange: (event: any) => updateHook(index, { output: { ...hook.output, format: event.target.value } }), placeholder: '结果格式', style: inputStyle }), h('input', { value: hook.output.path, onChange: (event: any) => updateHook(index, { output: { ...hook.output, path: event.target.value } }), placeholder: '结果文件路径', style: inputStyle }), h('textarea', { value: hook.output.template, onChange: (event: any) => updateHook(index, { output: { ...hook.output, template: event.target.value } }), placeholder: '输出内容说明', style: inputStyle })), h('button', { type: 'button', onClick: () => setNode(editingNode.id, { hooks: editingNode.hooks.filter((_: any, i: number) => i !== index) }) }, '移除事件')))),
  
  
  
  
  editingNode.id !== editing.nodes[0]?.id && h('button', { type: 'button', className: 'topology-template-delete', onClick: () => removeNode(editingNode.id) }, '删除节点'),
  
  
  
  ),
  
  
  ),
  
  
  h('footer', { className: 'topology-template-footer' }, h('span', null, '自定义模板保存在当前 DSH 用户配置中，供所有工作区复用。Hook 定义会保存；当前调度器尚未执行 Hook。'), h('button', { type: 'button', style: buttonStyle, onClick: () => setEditing(null) }, '取消'), h('button', { type: 'submit', disabled: busy, style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary } }, busy ? '保存中…' : '保存模板')),
  
  ),
  )
  return h('section', { className: 'topology-template-space' },
  
  h('header', { className: 'topology-template-header' }, h('div', null, h('h2', null, '模板空间'), h('p', null, '固定模板可查看或复制，自定义模板可编辑。模板对所有工作区共享。')), h('button', { type: 'button', style: { ...buttonStyle, background: colors.primary, color: '#fff', borderColor: colors.primary }, onClick: createTemplate }, '＋ 新建模板')),
  
  error && h('p', { role: 'alert', className: 'topology-template-error' }, error),
  
  h('input', { value: search, onChange: (event: any) => setSearch(event.target.value), placeholder: '搜索模板', style: { ...inputStyle, marginBottom: 12 } }),
  
  h('details', { className: 'topology-template-group', open: true }, h('summary', null, h('span', null, '›'), h('strong', null, '固定模板'), h('span', null, '只读，可复制为自定义模板'), h('small', null, `${fixed.length} 个模板`)), h('div', { className: 'topology-template-card-grid' }, ...fixed.map((template: any) => h('article', { key: template.id, className: `topology-template-card${template.id === selected?.id ? ' selected' : ''}`, onClick: () => setSelectedId(template.id) }, h('div', { className: 'topology-template-card-head' }, h('strong', null, template.name), h('span', null, '固定模板')), h('p', null, `${template.nodes.length} 个阶段 · ${template.description}`), h('button', { type: 'button', style: buttonStyle, onClick: (event: any) => { event.stopPropagation(); copyTemplate(template) } }, '复制为自定义模板'))))),
  
  h('details', { className: 'topology-template-group', open: false }, h('summary', null, h('span', null, '›'), h('strong', null, '自定义模板'), h('span', null, '你创建或复制的模板'), h('small', null, `${custom.length} 个模板`)), h('div', { className: 'topology-template-card-grid' }, ...custom.map((template: any) => h('article', { key: template.id, className: `topology-template-card${template.id === selected?.id ? ' selected' : ''}`, onClick: () => setSelectedId(template.id) }, h('div', { className: 'topology-template-card-head' }, h('strong', null, template.name), h('span', null, '自定义模板')), h('p', null, `${template.nodes.length} 个阶段 · 修改于 ${new Date(template.updatedAt).toLocaleString()}`), h('div', { className: 'topology-template-card-actions' }, h('button', { type: 'button', style: buttonStyle, onClick: (event: any) => { event.stopPropagation(); editTemplate(template) } }, '编辑模板')))))),
  
  selected && h('section', { className: 'topology-template-detail' }, h('header', null, h('div', null, h('h3', null, selected.name), h('p', null, `${selected.description || ''} · ${selected.nodes.length} 个节点`)), selected.id.startsWith('custom-') ? h('button', { type: 'button', style: buttonStyle, onClick: () => editTemplate(selected) }, '编辑模板') : h('button', { type: 'button', style: buttonStyle, onClick: () => onUseTemplate(selected) }, '用此模板新建拓扑')), h('div', { className: 'topology-template-detail-nodes' }, ...selected.nodes.map((node: any, index: number) => h('article', { key: node.id }, h('span', null, String(index + 1).padStart(2, '0')), h('div', null, h('strong', null, node.name), h('p', null, node.description)), h('div', null, ...(node.outputs || []).map((output: any) => h('code', { key: output.path }, output.path))))))),
  
  !all.length && h('p', null, '模板正在加载…'),
  )}
