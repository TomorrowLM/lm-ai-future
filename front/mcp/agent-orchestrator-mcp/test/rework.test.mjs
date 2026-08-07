import { strict as assert } from 'node:assert'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask, writeTaskResult } from '../dist/server/base/task-store/index.js'
import { requestRework } from '../dist/server/feature/orchestrator/rework.js'

test('requestRework updates task and writes rework prompt for reopening chat', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-rework-'))
  const inputFile = path.join(workspaceRoot, 'input.md')
  await writeFile(inputFile, 'input', 'utf8')

  const task = await createTask({
    title: '返工测试',
    prompt: '原始任务',
    workspaceRoot,
    inputFiles: [inputFile],
  })
  await writeTaskResult(workspaceRoot, task.id, '上次结果')

  const updated = await requestRework(workspaceRoot, task.id, '缺少边界场景分析')

  assert.equal(updated.status, 'rework_requested')
  assert.equal(updated.reworkCount, 1)
  assert.equal(updated.reviewNote, '缺少边界场景分析')
  assert.equal(updated.error, '缺少边界场景分析')
})
