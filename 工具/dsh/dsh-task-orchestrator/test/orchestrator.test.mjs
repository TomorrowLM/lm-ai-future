import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { TaskOrchestrator } from '../lib/orchestrator.js'

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

async function readUntilPhase(filePath, expected) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const record = JSON.parse(await readFile(filePath, 'utf8'))
    if (record.phase === expected) return record
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  throw new Error(`运行状态未到达 ${expected}`)
}

async function setup(t, resultPromise) {
  const folder = await mkdtemp(path.join(tmpdir(), 'dsh-orchestrator-'))
  t.after(() => rm(folder, { recursive: true, force: true }))
  const parent = { id: 'main-session' }
  let receivedSpec
  const orchestrator = new TaskOrchestrator({
    agents: { get: id => id === parent.id ? parent : undefined },
    subagents: {
      getProvider: name => name === 'spawn' ? { name } : undefined,
      async startActivation(spec) { receivedSpec = spec; return { childId: 'child-session', result: resultPromise } },
    },
  })
  const statePath = path.join(folder, 'run.json')
  return { orchestrator, parent, folder, statePath, getReceivedSpec: () => receivedSpec }
}

test('waits for a successful DSH child result, persists it, then completes only after approval', async t => {
  const child = deferred()
  const { orchestrator, parent, statePath, getReceivedSpec } = await setup(t, child.promise)
  const run = await orchestrator.start({ sessionId: parent.id, task: '整理需求并给出方案', statePath })

  assert.equal(run.phase, 'running')
  assert.equal(getReceivedSpec().provider, 'spawn')
  assert.equal(getReceivedSpec().parent, parent)
  assert.equal(getReceivedSpec().delivery, 'caller')

  child.resolve({ stopReason: 'completed', output: [{ type: 'text', text: '需求分析结果' }] })
  const waiting = await readUntilPhase(statePath, 'waiting-approval')
  assert.equal(waiting.nodes.find(node => node.id === 'subagent').status, 'succeeded')
  assert.equal(waiting.nodes.find(node => node.id === 'subagent').resultText, '需求分析结果')
  assert.equal(waiting.nodes.find(node => node.id === 'approval').status, 'waiting-approval')

  const completed = await orchestrator.decide({ runId: run.runId, decision: 'approved', note: '确认结果' })
  assert.equal(completed.phase, 'completed')
  assert.equal(completed.nodes.find(node => node.id === 'approval').status, 'succeeded')
  assert.equal(JSON.parse(await readFile(statePath, 'utf8')).phase, 'completed')
})

test('does not dispatch to human approval when the DSH child ends abnormally', async t => {
  const child = deferred()
  const { orchestrator, parent, statePath } = await setup(t, child.promise)
  const run = await orchestrator.start({ sessionId: parent.id, task: '完成分析', statePath })
  child.resolve({ stopReason: 'error', output: [{ type: 'text', text: '部分结果' }], diagnostic: '模型请求失败' })

  const failed = await readUntilPhase(statePath, 'failed')
  assert.equal(failed.runId, run.runId)
  assert.equal(failed.nodes.find(node => node.id === 'subagent').status, 'failed')
  assert.equal(failed.nodes.find(node => node.id === 'approval').status, 'pending')
  assert.match(failed.nodes.find(node => node.id === 'subagent').diagnostic, /模型请求失败/)
})
