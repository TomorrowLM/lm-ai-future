import { strict as assert } from 'node:assert'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import {
  buildInstruction,
  resolveTaskInputFiles,
} from '../dist/server/feature/orchestrator/open-task-chats/chat-launcher.js'

function createTask(overrides = {}) {
  return {
    id: 'task-test',
    title: '测试任务',
    prompt: '普通任务独立说明',
    workspaceRoot: '/workspace',
    inputFiles: ['/workspace/spec.md', '/workspace/context.md'],
    resultFile: '/workspace/result.md',
    visualDir: '/workspace/assets',
    status: 'pending',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T00:00:00.000Z',
    ...overrides,
  }
}

test('resolveTaskInputFiles mounts task file, resources, and rework files once', async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'agent-task-files-'))
  const taskFile = path.join(workspaceRoot, 'task.md')
  const contextFile = path.join(workspaceRoot, 'context.md')
  const reworkFile = path.join(workspaceRoot, 'rework.md')
  const specFile = path.join(workspaceRoot, 'spec.md')
  await Promise.all([
    writeFile(taskFile, 'task', 'utf8'),
    writeFile(contextFile, 'context', 'utf8'),
    writeFile(reworkFile, 'rework', 'utf8'),
    writeFile(specFile, 'spec', 'utf8'),
  ])

  const task = createTask({
    workspaceRoot,
    task: taskFile,
    resources: [contextFile],
    status: 'rework_requested',
    rework: {
      id: 'rework-1',
      reason: '补齐视觉验收',
      task: reworkFile,
      resources: [specFile],
      notes: '返工任务补充说明',
      status: 'requested',
      createdAt: '2026-08-25T00:00:00.000Z',
    },
  })

  assert.deepEqual(await resolveTaskInputFiles(task), [
    taskFile,
    contextFile,
    reworkFile,
    specFile,
  ])
})

test('resolveTaskInputFiles supports legacy rework promptFile records', async () => {
  const task = createTask({
    status: 'rework_requested',
    rework: {
      id: 'rework-1',
      reason: '补齐视觉验收',
      prompt: '返工任务独立说明',
      promptFile: '/workspace/legacy-rework.md',
      status: 'requested',
      createdAt: '2026-08-25T00:00:00.000Z',
    },
  })

  assert.deepEqual(await resolveTaskInputFiles(task), [
    '/workspace/spec.md',
    '/workspace/context.md',
    '/workspace/legacy-rework.md',
  ])
})

test('buildInstruction uses unified rework task and notes', () => {
  const task = createTask({
    task: '/workspace/task.md',
    resources: ['/workspace/context.md'],
    status: 'rework_requested',
    rework: {
      id: 'rework-1',
      reason: '补齐视觉验收',
      task: '/workspace/rework.md',
      resources: ['/workspace/rework-context.md'],
      notes: '返工任务补充说明',
      status: 'requested',
      createdAt: '2026-08-25T00:00:00.000Z',
    },
  })

  const instruction = buildInstruction(task)

  assert.match(instruction, /^【测试任务】/)
  assert.match(instruction, /## 子任务\n.*\/workspace\/rework\.md/)
  assert.match(instruction, /## 补充说明\n返工任务补充说明/)
  assert.match(instruction, /返工原因：补齐视觉验收/)
  assert.match(instruction, /agent_complete_task/)
})

test('buildInstruction supports inline task descriptions and notes', () => {
  const task = createTask({
    task: '实现成员列表查询和空态展示',
    resources: ['/workspace/member-spec.md', '/workspace/AGENTS.md'],
    notes: '不处理导入和导出',
  })

  const instruction = buildInstruction(task)

  assert.match(instruction, /^【测试任务】/)
  assert.match(instruction, /## 子任务\n实现成员列表查询和空态展示/)
  assert.match(instruction, /## 补充说明\n不处理导入和导出/)
  assert.match(instruction, /## 参考资源\n- \/workspace\/member-spec\.md\n- \/workspace\/AGENTS\.md/)
  assert.match(instruction, /agent_complete_task/)
  assert.match(instruction, /workspaceRoot.*\/workspace/)
  assert.match(instruction, /taskId.*task-test/)
})