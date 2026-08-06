import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask } from '../dist/server/base/task-store/index.js'
import { pollTasks } from '../dist/server/feature/orchestrator/poller.js'

test('pollTasks returns live task status and syncs result file completion', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-poll-'))
  const task = await createTask({
    title: '轮询测试',
    prompt: '验证 pollTasks',
    workspaceRoot,
  })

  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, 'done', 'utf8')

  const result = await pollTasks(workspaceRoot, [task.id])

  assert.equal(result.summary.total, 1)
  assert.equal(result.summary.completed, 1)
  assert.equal(result.summary.pending, 0)
  assert.equal(result.tasks[0].status, 'completed')
  assert.equal(result.tasks[0].hasResult, true)
})
