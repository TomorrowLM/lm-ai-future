import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask } from '../dist/server/base/task-store/index.js'
import { pollTasks } from '../dist/server/feature/orchestrator/poll-tasks/poller.js'

test('pollTasks returns live task status and syncs result file completion', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-poll-'))
  const task = await createTask({
    title: '轮询测试',
    prompt: '验证 pollTasks',
    workspaceRoot,
  })

  assert.equal(task.resultFile, path.join(workspaceRoot, 'docs', '.agent-orchestrator', 'results', `${task.id}.md`))

  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, 'done', 'utf8')

  const result = await pollTasks(workspaceRoot, [task.id])

  assert.equal(result.summary.total, 1)
  assert.equal(result.summary.completed, 1)
  assert.equal(result.summary.pending, 0)
  assert.equal(result.tasks[0].status, 'completed')
  assert.equal(result.tasks[0].hasResult, true)
})

test('createTask stores tasks.json next to explicit .agent-orchestrator result file', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-feature-store-'))
  const resultFile = path.join(
    'docs',
    'design',
    '2026-08-07-city-list-design',
    '.agent-orchestrator',
    'results',
    '01-result.md',
  )

  const task = await createTask({
    title: '功能目录存储测试',
    prompt: '验证 tasks.json 跟随 resultFile',
    workspaceRoot,
    resultFile,
  })

  const expectedStoreFile = path.join(
    workspaceRoot,
    'docs',
    'design',
    '2026-08-07-city-list-design',
    '.agent-orchestrator',
    'tasks.json',
  )
  const store = JSON.parse(await readFile(expectedStoreFile, 'utf8'))

  assert.equal(task.resultFile, path.join(workspaceRoot, resultFile))
  assert.equal(store.tasks.length, 1)
  assert.equal(store.tasks[0].id, task.id)

  const result = await pollTasks(workspaceRoot, [task.id])

  assert.equal(result.summary.total, 1)
  assert.equal(result.tasks[0].resultFile, task.resultFile)
})

test('pollTasks returns visualDir for agent placement decisions', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-poll-visual-dir-'))
  const task = await createTask({
    title: '轮询视觉目录测试',
    prompt: '验证 pollTasks visualDir',
    workspaceRoot,
    visualDir: path.join('docs', 'design', 'demo', 'brainstorm'),
  })

  const result = await pollTasks(workspaceRoot, [task.id])

  assert.equal(result.tasks[0].visualDir, task.visualDir)
})

test('createTask infers visualDir from requirement input file', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-visual-dir-'))
  const inputFile = path.join(
    workspaceRoot,
    'docs',
    'design',
    'checkplan-task-supervisor-role',
    'spec.md',
  )
  await mkdir(path.dirname(inputFile), { recursive: true })
  await writeFile(inputFile, 'spec', 'utf8')

  const task = await createTask({
    title: '视觉目录推断测试',
    prompt: '验证 visualDir',
    workspaceRoot,
    inputFiles: [inputFile],
  })

  assert.equal(
    task.visualDir,
    path.join(
      workspaceRoot,
      'docs',
      'design',
      'checkplan-task-supervisor-role',
      'brainstorm',
    ),
  )
})

test('createTask honors explicit visualDir inside workspace', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-visual-dir-explicit-'))
  const task = await createTask({
    title: '显式视觉目录测试',
    prompt: '验证 visualDir',
    workspaceRoot,
    visualDir: path.join('docs', 'design', 'demo', 'brainstorm'),
  })

  assert.equal(
    task.visualDir,
    path.join(workspaceRoot, 'docs', 'design', 'demo', 'brainstorm'),
  )
})
