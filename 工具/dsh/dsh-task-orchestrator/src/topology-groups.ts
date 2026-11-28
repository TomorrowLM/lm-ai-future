export function groupTopologies(items: any[], workspaces: any[]) {
  const groups = new Map<string, any>()
  for (const item of items) {
    const workspace = workspaces.find((candidate: any) => candidate.workspaceId === item.workspaceId && item.workspaceId)
    const path = item.workspacePath || workspace?.path || ''
    const key = item.workspaceId ? `id:${item.workspaceId}` : path ? `path:${path}` : 'unknown'
    if (!groups.has(key)) groups.set(key, { key, path, title: workspace?.title || path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || (item.workspaceId ? '未知工作区' : '未指定工作区'), items: [] })
    groups.get(key).items.push(item)
  }
  const result = Array.from(groups.values())
  for (const group of result) group.items.sort((a: any, b: any) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0))
  const newest = result.reduce((best, group) => !best || (Date.parse(group.items[0].createdAt) || 0) > (Date.parse(best.items[0].createdAt) || 0) ? group : best, null)
  for (const group of result) group.defaultOpen = group === newest
  return result.sort((a, b) => a.key === 'unknown' ? 1 : b.key === 'unknown' ? -1 : a.title.localeCompare(b.title, 'zh-CN'))
}
