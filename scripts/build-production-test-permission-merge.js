const fs = require('fs');
const path = require('path');

const base = '/Users/zm/work/old/dsb-admin/docs/page-permission-structure';
const productionFile = path.join(base, 'long_text_855b4449-b9c5-447e-97b0-767f59d130a9.json');
const testFile = path.join(base, '页面权限结构产品视角-权限按钮-有效权限节点.json');
const outputJson = path.join(base, '页面权限结构产品视角-权限按钮-生产合并有效权限节点.json');
const outputHtml = path.join(base, '页面权限结构产品视角-权限按钮.html');

const production = JSON.parse(fs.readFileSync(productionFile, 'utf8'));
const testPayload = JSON.parse(fs.readFileSync(testFile, 'utf8'));

const routePath = value => {
  const raw = value && typeof value === 'object' ? (value.path || '') : (value || '');
  if (!raw) return '';
  try {
    if (/^https?:\/\//i.test(raw)) return new URL(raw).pathname.replace(/\/$/, '') || '/';
  } catch (_) {}
  const noQuery = String(raw).split('?')[0].split('#')[0];
  const withSlash = noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
  return withSlash.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
};

const routeFull = value => {
  const raw = value && typeof value === 'object' ? (value.fullUrl || value.path || '') : (value || '');
  return raw || '';
};

const normalizeName = name => String(name || '').replace(/[\s/（）()：:·•“”"'_-]/g, '').toLowerCase();
const allTestNodes = [];
const testParent = new Map();
const flattenTest = (node, parent = null, ancestors = []) => {
  if (!node || typeof node !== 'object') return;
  const item = { ...node, routePath: routePath(node.route), routeFull: routeFull(node.route) };
  allTestNodes.push(item);
  testParent.set(item.id, { parent, ancestors });
  (node.children || []).forEach(child => flattenTest(child, item, [...ancestors, item]));
};
(testPayload.productStructure || []).forEach(root => flattenTest(root));

const testChildren = node => (node.children || []).slice();
const testDescendants = node => {
  const result = [];
  const visit = n => testChildren(n).forEach(child => { result.push(child); visit(child); });
  visit(node);
  return result;
};

const aliases = new Map([
  ['数据驾驶舱', new Set(['数据大屏'])],
  ['街道成员管理', new Set(['机构及成员管理', '企业成员管理', '内部通讯录'])],
  ['组织架构', new Set(['用户管理'])],
  ['服务单位通讯录', new Set(['纳税人管理'])],
  ['数据统计', new Set(['数据统计'])],
]);
const aliasMatch = (productionNode, testNode) => {
  if (productionNode.name === testNode.name) return true;
  return aliases.get(productionNode.name)?.has(testNode.name) || false;
};

const productionNodes = [];
const productionById = new Map();
const productionByRoute = new Map();
const productionByName = new Map();
let productionSequence = 1;
let actionSequence = 1;

const productionNodeId = () => `P${String(productionSequence++).padStart(4, '0')}`;
const productionActionId = () => `PA${String(actionSequence++).padStart(4, '0')}`;

const registerProduction = node => {
  productionById.set(node.id, node);
  if (node.route.path) {
    if (!productionByRoute.has(node.route.path)) productionByRoute.set(node.route.path, []);
    productionByRoute.get(node.route.path).push(node);
  }
  const nameKey = normalizeName(node.name);
  if (!productionByName.has(nameKey)) productionByName.set(nameKey, []);
  productionByName.get(nameKey).push(node);
};

const buildProductionNode = (raw, parentId, depth) => {
  const children = raw.childList || [];
  const route = raw.url || '';
  const node = {
    id: productionNodeId(),
    type: depth === 0 || children.length ? (depth === 0 ? 'menu' : 'menu') : 'page',
    name: raw.name || '未命名生产节点',
    route: { path: routePath(route), fullUrl: routeFull(route) },
    status: '生产待测试',
    description: `生产菜单结构节点${children.length ? `，包含 ${children.length} 个直属菜单节点` : ''}。`,
    children: [],
    _matched: false,
    _descendantMatched: false,
    _testNodeIds: [],
  };
  registerProduction(node);
  node.children = children.map(child => buildProductionNode(child, node.id, depth + 1));
  return node;
};
production.forEach(root => productionNodes.push(buildProductionNode(root, null, 0)));

const prodRoots = productionNodes.slice();
const descendants = node => {
  const result = [];
  const visit = n => n.children.forEach(child => { result.push(child); visit(child); });
  visit(node);
  return result;
};
const isStructural = node => node.type === 'menu' || node.type === 'page';
const structuralProduction = productionNodes.filter(isStructural);

const routeNameAliases = new Map([
  ['/custom-iframe-page', new Set(['数据大屏', '办税地图', '税企亲清', '流程管理'])],
  ['/org-manage/org-member', new Set(['机构及成员管理', '企业成员管理', '街道成员管理'])],
]);
const findProductionMatch = testNode => {
  const route = testNode.routePath || routePath(testNode.route);
  const name = normalizeName(testNode.name);
  const exactName = structuralProduction.filter(p => normalizeName(p.name) === name);
  if (exactName.length === 1) return exactName[0];
  const aliasName = structuralProduction.filter(p => aliasMatch(p, testNode));
  if (aliasName.length === 1) return aliasName[0];
  if (route) {
    const candidates = productionByRoute.get(route) || [];
    const named = candidates.find(p => aliasMatch(p, testNode));
    if (named) return named;
    const routeAliases = routeNameAliases.get(route);
    if (routeAliases?.has(testNode.name)) {
      const candidate = candidates.find(p => routeAliases.has(p.name) || p.name === '数据驾驶舱' || p.name === '街道成员管理');
      if (candidate) return candidate;
    }
    if (candidates.length === 1 && (testNode.type === 'page' || testNode.type === 'menu')) return candidates[0];
  }
  return null;
};

const actionKey = node => `${normalizeName(node.name)}|${node.type}|${node.route.path}`;
const appendTestClone = (parent, testNode) => {
  const clone = {
    id: `T${String(testNode.id).replace(/^N/, '')}`,
    type: testNode.type || 'action',
    name: testNode.name || '未命名测试节点',
    route: { path: testNode.routePath || routePath(testNode.route), fullUrl: testNode.routeFull || routeFull(testNode.route) },
    status: '测试补充-生产未发现',
    description: `${testNode.description || testNode.desc || ''}${testNode.status ? ` 测试原状态：${testNode.status}。` : ''}`.trim(),
    children: [],
    _matched: false,
    _descendantMatched: false,
    _testNodeIds: [testNode.id],
  };
  const existing = parent.children.find(child => actionKey(child) === actionKey(clone));
  if (existing) {
    for (const child of testChildren(testNode)) {
      if (!isStructural(child)) appendTestClone(existing, child);
    }
    return existing;
  }
  parent.children.push(clone);
  for (const child of testChildren(testNode)) {
    if (!isStructural(child)) appendTestClone(clone, child);
  }
  return clone;
};

const markMatched = (prodNode, testNode) => {
  prodNode._matched = true;
  prodNode._testNodeIds.push(testNode.id);
  if (testNode.status) prodNode._testStatuses = [...(prodNode._testStatuses || []), testNode.status];
};

const mergeTestChildren = (prodParent, testParentNode) => {
  for (const testChild of testChildren(testParentNode)) {
    const match = findProductionMatch(testChild);
    if (match) {
      markMatched(match, testChild);
      mergeTestChildren(match, testChild);
    } else if (!isStructural(testChild)) {
      appendTestClone(prodParent, testChild);
    }
  }
};

for (const testNode of allTestNodes.filter(node => node.type === 'menu' || node.type === 'page')) {
  const match = findProductionMatch(testNode);
  if (!match) continue;
  markMatched(match, testNode);
  mergeTestChildren(match, testNode);
}

const hasTestAction = (prodNode, buttonName) => {
  const keys = new Set([
    normalizeName(buttonName),
    normalizeName(buttonName).replace(/人员|企业|部门|数据/g, ''),
  ]);
  return allTestNodes.some(testNode => {
    if (testNode.type !== 'action' && testNode.type !== 'dialog') return false;
    const parent = testParent.get(testNode.id)?.parent;
    const parentMatch = parent && findProductionMatch(parent);
    if (parentMatch !== prodNode) return false;
    const testKey = normalizeName(testNode.name).replace(/人员|企业|部门|数据/g, '');
    return keys.has(normalizeName(testNode.name)) || (testKey && keys.has(testKey));
  });
};

const finalize = node => {
  for (const child of node.children) finalize(child);
  node.children = node.children.filter(child => child.type === 'menu' || child.type === 'page' || child.status !== '生产待测试');
  node._descendantMatched = node.children.some(child => child._matched || child._descendantMatched || child.status === '已匹配测试' || child.status === '部分匹配测试');
  if (node._matched) node.status = '已匹配测试';
  else if (node._descendantMatched) node.status = '部分匹配测试';
  else if (node.status !== '测试补充-生产未发现') node.status = '生产待测试';
  if (node.id.startsWith('PA')) {
    const buttonMatched = hasTestAction(node._parent, node.name);
    node.status = buttonMatched ? '已匹配测试' : '生产待测试';
  }
  delete node._matched;
  delete node._descendantMatched;
  delete node._testNodeIds;
  delete node._testStatuses;
  delete node._parent;
};
const assignParents = node => { node.children.forEach(child => { child._parent = node; assignParents(child); }); };
prodRoots.forEach(assignParents);
prodRoots.forEach(finalize);

const countNodes = roots => {
  let total = 0;
  const walk = nodes => nodes.forEach(node => { total++; walk(node.children || []); });
  walk(roots);
  return total;
};
const output = {
  mcpVersion: 'production-test-merge-v1',
  generatedAt: new Date().toISOString(),
  mergePolicy: {
    canonicalStructure: 'production',
    productionFile: path.basename(productionFile),
    testFile: path.basename(testFile),
    routeMatching: '优先按规范化路由匹配，补充已确认的菜单名称别名；生产数据驾驶舱保留生产完整 URL。',
    unmatchedProductionStatus: '生产待测试',
    unmatchedTestStatus: '测试补充-生产未发现',
    sourceFieldsRemoved: true,
  },
  normalizationRules: testPayload.normalizationRules || {},
  unclosedItems: [],
  statistics: { rootCount: prodRoots.length, nodeCount: countNodes(prodRoots) },
  productStructure: prodRoots,
};
fs.writeFileSync(outputJson, JSON.stringify(output, null, 2) + '\n');

const flattenForHtml = roots => {
  const rows = [];
  const walk = (nodes, parentId = null) => nodes.forEach(node => {
    rows.push({ id: node.id, parentId, name: node.name, type: node.type, route: node.route.fullUrl || node.route.path || '', status: node.status, desc: node.description || '', open: false });
    walk(node.children || [], node.id);
  });
  walk(roots);
  return rows;
};

const htmlData = JSON.stringify(flattenForHtml(prodRoots));
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>页面权限结构清单（权限按钮版）</title>
<style>
:root{--blue:#173f69;--line:#dbe4ee;--bg:#f5f7fa;--muted:#718096;--warn:#a16207;--extra:#7c3aed}*{box-sizing:border-box}body{margin:0;background:var(--bg);font:14px -apple-system,BlinkMacSystemFont,"Microsoft YaHei",sans-serif;color:#1f2937}.app{height:calc(100vh - 32px);margin:16px auto;max-width:1500px;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;display:flex;flex-direction:column}header{padding:20px 28px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;gap:20px;flex:none}h1,h2{margin:0;color:var(--blue)}h1{font-size:22px}.sub{color:var(--muted);margin-top:5px}.toolbar{padding:14px 28px;border-bottom:1px solid var(--line);display:flex;gap:10px;background:#fbfcfe;flex:none}input,select,textarea{border:1px solid #cbd5e1;border-radius:6px;padding:9px 10px;font:inherit}input{flex:1}button{border:0;border-radius:6px;padding:9px 14px;font:inherit;cursor:pointer}.primary{background:var(--blue);color:#fff}.secondary{background:#edf3f9;color:var(--blue)}.layout{display:grid;grid-template-columns:58% 42%;min-height:0;flex:1;overflow:hidden}.tree-panel,.detail-panel{padding:22px 26px;overflow:auto}.tree-panel{border-right:1px solid var(--line)}.tree-header{position:sticky;top:-22px;padding:22px 0 14px;background:#fff;z-index:2;display:flex;justify-content:flex-start;gap:10px;align-items:center}.tree-header h2{font-size:18px;margin-right:auto}.count{font-weight:400;color:var(--muted);font-size:13px}.node{margin:3px 0}.row{display:flex;gap:7px;align-items:center;padding:9px 10px;border-radius:7px;cursor:pointer}.row:hover,.row.active{background:#eaf3fb}.name{flex:1;min-width:0}.type,.status{font-size:11px;border-radius:12px;padding:3px 8px;background:#e4effb;color:#28608f;white-space:nowrap}.status.production{background:#fff4d6;color:var(--warn)}.status.extra{background:#f1e8ff;color:var(--extra)}.action{background:#e8f5df;color:#477735}.dialog{background:#fff0e7;color:#a65c34}.toggle{width:18px;height:18px;padding:0;border:0;border-radius:0;background:transparent;color:#64748b;line-height:18px;font-size:13px;appearance:none}.edit,.remove{border:0;background:transparent;color:#7890a8;padding:3px 5px}.remove:hover{color:#c33}.children{margin-left:25px;padding-left:8px;border-left:1px solid var(--line)}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}.field{display:flex;flex-direction:column;gap:6px}.full{grid-column:1/-1}.label{font-weight:600;color:#475569}.actions{display:flex;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)}.modal-bg{position:fixed;inset:0;background:#10253d66;display:none;align-items:center;justify-content:center;z-index:2000}.modal-bg.show{display:flex}.modal{position:relative;z-index:2001;width:min(680px,calc(100% - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#fff;padding:24px;border-radius:12px;box-shadow:0 20px 60px #10253d55}.modal-head{display:flex;justify-content:space-between;margin-bottom:16px}.modal-head button{padding:0;background:none;font-size:22px;color:var(--muted)}.file-button{display:inline-flex;align-items:center;gap:6px}.file-button input{display:none}@media(max-width:900px){.layout{grid-template-columns:1fr}.detail-panel{border-top:1px solid var(--line)}header{align-items:flex-start;flex-direction:column}}
</style></head>
<body><main class="app">
<header><div><h1>页面权限结构清单（生产合并版）</h1><div class="sub">生产菜单为主结构，合并测试 menu/page 下的权限节点；生产未匹配与测试补充节点均保留状态。</div></div><div><label class="secondary file-button">导入 JSON<input id="jsonFile" type="file" accept=".json,application/json"></label> <button class="secondary" id="exportJson">导出 JSON</button></div></header>
<div class="toolbar"><input id="search" placeholder="搜索节点名称、路由或说明"><select id="kind"><option value="">全部类型</option><option>menu</option><option>page</option><option>tab</option><option>section</option><option>action</option><option>dialog</option><option>drawer</option></select><select id="status"><option value="">全部状态</option><option>已匹配测试</option><option>部分匹配测试</option><option>生产待测试</option><option>测试补充-生产未发现</option><option>已验证</option><option>部分验证</option><option>待确认</option><option>仅记录</option></select><button class="secondary" id="reset">重置</button></div>
<section class="layout"><aside class="tree-panel"><div class="tree-header"><h2>页面结构树 <span class="count" id="count"></span></h2><button class="secondary" id="collapse">全部折叠</button><button class="primary" id="add">＋ 新增节点</button><button class="primary" id="addRoot">＋ 新增根节点</button></div><div id="tree"></div></aside><section class="detail-panel"><h2>节点详情 <span class="count" id="selected"></span></h2><div id="detail"></div></section></section></main>
<div id="modal" class="modal-bg"><div class="modal"><div class="modal-head"><h2 id="modalTitle">编辑节点</h2><button id="close">×</button></div><div id="modalBody"></div></div></div>
<script>
let nodes=${htmlData};
let selected=nodes[0]?.id||null,draftNode=null,pendingDeleteId=null;
const storageKey='page-permission-structure:production-merge-v1';
const $=id=>document.getElementById(id); const kids=id=>nodes.filter(n=>n.parentId===id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const routeValue=n=>typeof n.route==='object'?(n.route.path||n.route.fullUrl||''):(n.route||'');
const pathOf=id=>{const a=[];let n=nodes.find(x=>x.id===id);while(n){a.unshift(n.name);n=nodes.find(x=>x.id===n.parentId)}return a.join(' ＞ ')};
const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(nodes))}catch(e){}};
const match=n=>{const q=$('search').value.trim().toLowerCase(),t=$('kind').value,s=$('status').value;return(!q||[n.name,routeValue(n),n.desc].join(' ').toLowerCase().includes(q))&&(!t||n.type===t)&&(!s||n.status===s)};
const branch=n=>match(n)||kids(n.id).some(branch);
function render(){const box=$('tree');box.innerHTML='';let total=0;function draw(parent,container){kids(parent).forEach(n=>{if(!branch(n))return;total++;const el=document.createElement('div');el.className='node';const statusClass=n.status==='生产待测试'?'production':(n.status==='测试补充-生产未发现'?'extra':'');el.innerHTML='<div class="row '+(selected===n.id?'active':'')+'" data-id="'+esc(n.id)+'"><button class="toggle">'+(kids(n.id).length?(n.open?'▾':'▸'):'')+'</button><span class="name">'+esc(n.name)+'</span><span class="type '+esc(n.type)+'">'+esc(n.type)+'</span><span class="status '+statusClass+'">'+esc(n.status||'未标注')+'</span><button class="edit">编辑</button><button class="remove">删除</button></div>';const row=el.firstChild;row.onclick=e=>{if(e.target.closest('.toggle')){n.open=!n.open;render();return}if(e.target.closest('.edit')){openEdit(n.id);return}if(e.target.closest('.remove')){removeNode(n.id);return}selected=n.id;render();showDetail()};const sub=document.createElement('div');sub.className='children';sub.style.display=n.open?'':'none';el.appendChild(sub);container.appendChild(el);draw(n.id,sub)})}draw(null,box);$('count').textContent=total+' 个节点'}
function showDetail(){const n=nodes.find(x=>x.id===selected);if(!n){$('selected').textContent='';$('detail').innerHTML='<p>请选择节点</p>';return}$('selected').textContent=n.id;$('detail').innerHTML='<div class="grid"><label class="field"><span class="label">节点名称</span><input value="'+esc(n.name)+'" readonly></label><label class="field"><span class="label">节点类型</span><input value="'+esc(n.type)+'" readonly></label><label class="field full"><span class="label">层级路径</span><input value="'+esc(pathOf(n.id))+'" readonly></label><label class="field"><span class="label">路由 path</span><input value="'+esc(routeValue(n))+'" readonly></label><label class="field"><span class="label">状态</span><input value="'+esc(n.status)+'" readonly></label><label class="field"><span class="label">父级节点</span><input value="'+esc(n.parentId||'无（根节点）')+'" readonly></label><label class="field full"><span class="label">统一说明</span><textarea readonly>'+esc(n.desc)+'</textarea></label></div><div class="actions"><button class="primary" id="detailEdit">编辑节点</button></div>';$('detailEdit').onclick=()=>openEdit(n.id)}
function validParents(editing){const blocked=new Set([editing]);let changed=true;while(changed){changed=false;nodes.forEach(n=>{if(blocked.has(n.parentId)&&!blocked.has(n.id)){blocked.add(n.id);changed=true}})}return nodes.filter(n=>!blocked.has(n.id))}
function parentOptions(current,editing){return '<option value="">无（根节点）</option>'+validParents(editing).map(n=>'<option value="'+esc(n.id)+'" '+(n.id===current?'selected':'')+'>'+esc(pathOf(n.id))+'</option>').join('')}
function form(n){return '<div class="grid"><label class="field"><span class="label">节点名称</span><input id="mn" value="'+esc(n.name)+'"></label><label class="field"><span class="label">节点类型</span><select id="mt">'+['menu','page','tab','section','action','dialog','drawer'].map(x=>'<option '+(x===n.type?'selected':'')+'>'+x+'</option>').join('')+'</select></label><label class="field full"><span class="label">父级节点</span><select id="mp">'+parentOptions(n.parentId||'',n.id)+'</select></label><label class="field full"><span class="label">路由 path</span><input id="mr" value="'+esc(routeValue(n))+'"></label><label class="field"><span class="label">状态</span><input id="ms" value="'+esc(n.status||'待确认')+'"></label><label class="field full"><span class="label">统一说明</span><textarea id="md">'+esc(n.desc||'')+'</textarea></label></div><div class="actions"><button class="secondary" id="cancel">取消</button><button class="primary" id="save">保存</button></div>'}
function openEdit(id){const n=nodes.find(x=>x.id===id);if(!n)return;draftNode=null;$('modalTitle').textContent='编辑节点';$('modalBody').innerHTML=form(n);$('modal').classList.add('show');$('cancel').onclick=closeModal;$('save').onclick=saveEdit}
function openDraft(n){$('modalTitle').textContent='新增节点';$('modalBody').innerHTML=form(n);$('modal').classList.add('show');$('cancel').onclick=closeModal;$('save').onclick=saveEdit}
function saveEdit(){const target=draftNode||nodes.find(x=>x.id===selected);if(!target)return;const updated={...target,id:target.id,parentId:$('mp').value||null,name:$('mn').value.trim()||target.name,type:$('mt').value,route:$('mr').value.trim(),status:$('ms').value.trim()||'待确认',desc:$('md').value.trim()};if(draftNode){nodes.push(updated);selected=updated.id;draftNode=null}else Object.assign(target,updated);if(updated.parentId){const p=nodes.find(n=>n.id===updated.parentId);if(p)p.open=true}persist();closeModal();render();showDetail()}
function addNode(){draftNode={id:'TNEW'+Date.now(),parentId:selected,name:'新节点',type:'action',route:'',status:'待确认',desc:'待补充说明',open:false};openDraft(draftNode)}
function addRootNode(){draftNode={id:'TNEW'+Date.now(),parentId:null,name:'新根节点',type:'menu',route:'',status:'待确认',desc:'待补充说明',open:false};openDraft(draftNode)}
function removeNode(id){const n=nodes.find(x=>x.id===id);if(!n)return;pendingDeleteId=id;$('modalTitle').textContent='删除节点';$('modalBody').innerHTML='<p>确认删除节点“'+esc(n.name)+'”及其全部子节点？</p><div class="actions"><button class="secondary" id="cancel">取消</button><button class="primary" id="confirm">确认删除</button></div>';$('modal').classList.add('show');$('cancel').onclick=closeModal;$('confirm').onclick=confirmRemove}
function confirmRemove(){const ids=[pendingDeleteId];for(let i=0;i<ids.length;i++)kids(ids[i]).forEach(n=>ids.push(n.id));nodes=nodes.filter(n=>!ids.includes(n.id));selected=null;pendingDeleteId=null;persist();closeModal();render();showDetail()}
function closeModal(){draftNode=null;pendingDeleteId=null;$('modal').classList.remove('show')}
function normalizeImported(payload){const roots=Array.isArray(payload)?payload:(payload?.productStructure||payload?.nodes||[]),flat=[];function copy(n,parentId){if(!n||!n.id)return;flat.push({id:String(n.id),parentId:parentId===undefined?(n.parentId??null):parentId,name:n.name||'未命名节点',type:n.type||'action',route:routeValue(n),status:n.status||'待确认',desc:n.desc??n.description??'',open:false});(n.children||[]).forEach(c=>copy(c,n.id))}roots.forEach(n=>copy(n,null));return flat}
function importJson(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{try{nodes=normalizeImported(JSON.parse(reader.result));selected=nodes[0]?.id||null;persist();$('search').value='';$('kind').value='';$('status').value='';render();showDetail()}catch(e){alert('JSON 导入失败：'+e.message)}};reader.readAsText(file,'utf-8')}
function nested(){const by=new Map(nodes.map(n=>[n.id,{id:n.id,type:n.type,name:n.name,route:{path:routeValue(n),fullUrl:''},status:n.status,description:n.desc,children:[]} ]));const roots=[];nodes.forEach(n=>{const item=by.get(n.id);if(n.parentId&&by.has(n.parentId))by.get(n.parentId).children.push(item);else roots.push(item)});return roots}
function exportJson(){const blob=new Blob([JSON.stringify({mcpVersion:'production-test-merge-v1',generatedAt:new Date().toISOString(),productStructure:nested()},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='页面权限结构产品视角-权限按钮-生产合并有效权限节点.json';a.click();URL.revokeObjectURL(a.href)}
$('jsonFile').onchange=e=>importJson(e.target.files[0]);$('exportJson').onclick=exportJson;$('collapse').onclick=()=>{nodes.forEach(n=>n.open=false);render()};$('add').onclick=addNode;$('addRoot').onclick=addRootNode;$('reset').onclick=()=>{$('search').value='';$('kind').value='';$('status').value='';render()};$('search').oninput=render;$('kind').onchange=render;$('status').onchange=render;$('close').onclick=closeModal;$('modal').onclick=e=>{if(e.target===$('modal'))closeModal()};
render();showDetail();
</script></body></html>`;
fs.writeFileSync(outputHtml, html);
console.log(JSON.stringify({ outputJson, outputHtml, roots: output.statistics.rootCount, nodes: output.statistics.nodeCount }, null, 2));
