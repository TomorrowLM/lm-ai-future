import { strict as assert } from 'node:assert'
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

test('resolveTaskInputFiles mounts original and rework input files once', () => {
  const task = createTask({
    status: 'rework_requested',
    rework: {
      id: 'rework-1',
      reason: '补齐视觉验收',
      prompt: '返工任务独立说明',
      inputFiles: ['/workspace/rework.md', '/workspace/spec.md'],
      status: 'requested',
      createdAt: '2026-08-25T00:00:00.000Z',
    },
  })

  assert.deepEqual(resolveTaskInputFiles(task), [
    '/workspace/spec.md',
    '/workspace/context.md',
    '/workspace/rework.md',
  ])
})

test('resolveTaskInputFiles supports legacy rework promptFile records', () => {
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

  assert.deepEqual(resolveTaskInputFiles(task), [
    '/workspace/spec.md',
    '/workspace/context.md',
    '/workspace/legacy-rework.md',
  ])
})

test('buildInstruction uses the rework standalone prompt', () => {
  const task = createTask({
    status: 'rework_requested',
    rework: {
      id: 'rework-1',
      reason: '补齐视觉验收',
      prompt: '返工任务独立说明',
      inputFiles: ['/workspace/rework.md'],
      status: 'requested',
      createdAt: '2026-08-25T00:00:00.000Z',
    },
  })

  assert.equal(buildInstruction(task), '返工任务独立说明')
})