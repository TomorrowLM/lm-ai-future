import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask, writeTaskResult } from '../dist/server/base/task-store/index.js'
import { requestRework } from '../dist/server/feature/orchestrator/request-rework/rework.js'

test('requestRework updates task status without generating document', async () => {
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

  // Agent 先写入返工文档，再调 MCP 记账
  const reworkDir = path.join(workspaceRoot, 'docs', 'reworks')
  await mkdir(reworkDir, { recursive: true })
  const reworkFile = path.join(reworkDir, `${task.id}-rework-1.md`)
  await writeFile(reworkFile, '# 返工任务：返工测试\n\n## 返工原因\n\n缺少边界场景分析\n\n## 执行清单\n\n- [ ] 读取所有输入文件\n', 'utf8')

  const updated = await requestRework(workspaceRoot, task.id, '缺少边界场景分析', reworkFile)

  assert.equal(updated.status, 'rework_requested')
  assert.equal(updated.reworkCount, 1)
  assert.equal(updated.reviewNote, '缺少边界场景分析')
  assert.equal(updated.error, undefined)
  assert.equal(updated.rework?.id, 'rework-1')
  assert.equal(updated.rework?.reason, '缺少边界场景分析')
  assert.equal(updated.rework?.status, 'requested')
  assert.equal(
    updated.rework?.prompt,
    '请读取已挂载的原始任务输入文件和本次返工输入文件，严格按返工要求补齐实现。完成后覆盖原 resultFile，并调用 agent_complete_task。',
  )
  assert.equal(updated.rework?.promptFile, undefined)
  assert.equal(updated.rework?.inputFiles?.[0], reworkFile)
  assert.equal(updated.reworks?.length, 1)
  assert.deepEqual(updated.reworks?.[0], updated.rework)
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

  const reworkDir = path.join(workspaceRoot, 'docs', 'design', 'demo', 'reworks')
  await mkdir(reworkDir, { recursive: true })
  const reworkFile1 = path.join(reworkDir, `${task.id}-rework-1.md`)
  const reworkFile2 = path.join(reworkDir, `${task.id}-rework-2.md`)
  await writeFile(reworkFile1, '# 返工任务\n\n## 返工原因\n\n第一次返工\n', 'utf8')
  await writeFile(reworkFile2, '# 返工任务\n\n## 返工原因\n\n第二次返工\n', 'utf8')

  const first = await requestRework(workspaceRoot, task.id, '第一次返工', reworkFile1)
  const second = await requestRework(workspaceRoot, task.id, '第二次返工', reworkFile2)

  assert.equal(second.reworkCount, 2)
  assert.equal(second.rework?.id, 'rework-2')
  assert.equal(second.reworks?.length, 2)
  assert.equal(second.reworks?.[0].inputFiles?.[0], reworkFile1)
  assert.equal(second.rework?.inputFiles?.[0], reworkFile2)

  const completed = await writeTaskResult(workspaceRoot, task.id, '返工后结果')

  assert.equal(completed.status, 'completed')
  assert.equal(completed.resultFile, path.join(workspaceRoot, resultFile))
  assert.equal(completed.rework?.status, 'completed')
  assert.equal(completed.reworks?.[0].status, 'requested')
  assert.equal(completed.reworks?.[1].status, 'completed')
})
