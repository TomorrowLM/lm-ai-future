import { strict as assert } from 'node:assert'
import { mkdir, mkdtemp, readFile, utimes, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { createTask, updateTask } from '../dist/server/base/task-store/index.js'
import { pollTasks } from '../dist/server/feature/orchestrator/poll-tasks/poller.js'

test('pollTasks returns live task status and syncs result file completion', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-poll-'))
  const task = await createTask({
    title: '轮询测试',
    prompt: '验证 pollTasks',
    workspaceRoot,
  })

  assert.equal(task.resultFile, path.join(workspaceRoot, 'docs', 'results', `${task.id}.md`))

  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, 'done', 'utf8')

  const result = await pollTasks(workspaceRoot, [task.id])

  assert.equal(result.summary.total, 1)
  assert.equal(result.summary.completed, 1)
  assert.equal(result.summary.pending, 0)
  assert.equal(result.tasks[0].status, 'completed')
  assert.equal(result.tasks[0].hasResult, true)
})

test('pollTasks ignores a stale result until the current rework writes a fresh result', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-poll-rework-'))
  const task = await createTask({
    title: '返工结果新鲜度测试',
    prompt: '验证旧结果不能完成当前返工',
    workspaceRoot,
  })

  await mkdir(path.dirname(task.resultFile), { recursive: true })
  await writeFile(task.resultFile, 'stale result', 'utf8')
  const staleTime = new Date(Date.now() - 10_000)
  await utimes(task.resultFile, staleTime, staleTime)

  const startedAt = new Date(Date.now() - 1_000).toISOString()
  const rework = {
    id: 'rework-1',
    reason: '重新执行',
    prompt: '读取返工输入并执行',
    inputFiles: [],
    status: 'running',
    createdAt: startedAt,
    startedAt,
  }
  await updateTask(workspaceRoot, task.id, {
    status: 'running',
    startedAt,
    rework,
    reworks: [rework],
  })

  const stalePoll = await pollTasks(workspaceRoot, [task.id])
  assert.equal(stalePoll.tasks[0].status, 'running')

  await writeFile(task.resultFile, 'fresh result', 'utf8')

  const freshPoll = await pollTasks(workspaceRoot, [task.id])
  assert.equal(freshPoll.tasks[0].status, 'completed')

  const completedTask = await updateTask(workspaceRoot, task.id, {})
  assert.equal(completedTask.rework?.status, 'completed')
})

test('createTask stores tasks.json under requirement dir for explicit design result file', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-feature-store-'))
  const resultFile = path.join(
    'docs',
    'design',
    '2026-08-07-city-list-design',
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

test('createTask infers resultFile and tasks.json from requirement input file', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-feature-default-'))
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
    title: '功能目录默认存储测试',
    prompt: '验证默认 resultFile 跟随需求目录',
    workspaceRoot,
    inputFiles: [inputFile],
  })
  const expectedStoreFile = path.join(
    workspaceRoot,
    'docs',
    'design',
    'checkplan-task-supervisor-role',
    'tasks.json',
  )
  const store = JSON.parse(await readFile(expectedStoreFile, 'utf8'))

  assert.equal(
    task.resultFile,
    path.join(
      workspaceRoot,
      'docs',
      'design',
      'checkplan-task-supervisor-role',
      'results',
      `${task.id}.md`,
    ),
  )
  assert.equal(store.tasks[0].id, task.id)
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
