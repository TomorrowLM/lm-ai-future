import test from 'node:test'
import assert from 'node:assert/strict'
import { groupTopologies } from '../lib/topology-groups.js'

test('按工作区分组，组内创建时间倒序，缺少工作区的记录独立展示', () => {
  const items = [
    { name: 'old', workspaceId: 'a', workspacePath: 'D:\\A', createdAt: '2026-01-01' },
    { name: 'other', workspaceId: 'b', workspacePath: 'D:\\B', createdAt: '2026-02-01' },
    { name: 'new', workspaceId: 'a', workspacePath: 'D:\\A', createdAt: '2026-03-01' },
    { name: 'legacy', createdAt: '2026-04-01' },
  ]
  const groups = groupTopologies(items, [{ workspaceId: 'a', title: 'A', path: 'D:\\A' }])
  assert.deepEqual(groups.map(group => group.title), ['A', 'B', '未指定工作区'])
  assert.deepEqual(groups[0].items.map(item => item.name), ['new', 'old'])
  assert.deepEqual(groups[1].items.map(item => item.name), ['other'])
  assert.deepEqual(groups[2].items.map(item => item.name), ['legacy'])
  assert.deepEqual(groups.map(group => group.defaultOpen), [false, false, true])
})
