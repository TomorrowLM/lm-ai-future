import { strict as assert } from 'node:assert'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask, writeTaskResult } from '../dist/server/base/task-store/index.js'
import { requestRework } from '../dist/server/feature/orchestrator/request-rework/rework.js'

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
  assert.equal(updated.error, undefined)
  assert.equal(updated.rework?.id, 'rework-1')
  assert.equal(updated.rework?.reason, '缺少边界场景分析')
  assert.equal(updated.rework?.status, 'requested')
  assert.ok(updated.rework?.prompt.includes('缺少边界场景分析'))
  assert.equal(
    updated.rework?.promptFile,
    path.join(workspaceRoot, 'reworks', `${task.id}-rework-1.md`),
  )
  assert.equal(updated.reworks?.length, 1)
  assert.deepEqual(updated.reworks?.[0], updated.rework)
  assert.equal(await readFile(updated.rework.promptFile, 'utf8'), updated.rework.prompt)
})

test('requestRework appends flat rework history and completion syncs current rework', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-rework-history-'))
  const resultFile = path.join('docs', 'design', 'demo', 'results', '01-result.md')

  const task = await createTask({
    title: '返工历史测试',
    prompt: '原始任务',
    workspaceRoot,
    resultFile,
  })

  const first = await requestRework(workspaceRoot, task.id, '第一次返工')
  const second = await requestRework(workspaceRoot, task.id, '第二次返工')

  assert.equal(second.reworkCount, 2)
  assert.equal(second.rework?.id, 'rework-2')
  assert.equal(second.reworks?.length, 2)
  assert.equal(
    second.reworks?.[0].promptFile,
    path.join(workspaceRoot, 'docs', 'design', 'demo', 'reworks', `${task.id}-rework-1.md`),
  )
  assert.equal(
    second.rework?.promptFile,
    path.join(workspaceRoot, 'docs', 'design', 'demo', 'reworks', `${task.id}-rework-2.md`),
  )

  const completed = await writeTaskResult(workspaceRoot, task.id, '返工后结果')

  assert.equal(completed.status, 'completed')
  assert.equal(completed.resultFile, path.join(workspaceRoot, resultFile))
  assert.equal(completed.rework?.status, 'completed')
  assert.equal(completed.reworks?.[0].status, 'requested')
  assert.equal(completed.reworks?.[1].status, 'completed')
})
