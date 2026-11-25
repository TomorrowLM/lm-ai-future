'use strict';

/**
 * dsh-vscode-bridge 文件拖放客户端回归测试。
 * 运行：node test/vscode-bridge-drop.test.js
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const clientSource = fs.readFileSync(
  path.join(__dirname, '..', 'dsh-plugins', 'dsh-vscode-bridge', 'lib', 'client.js'),
  'utf8'
);

function makeHarness() {
  const listeners = [];
  const cleanups = [];
  const uploads = [];
  const pathChecks = [];
  const inserted = [];
  const nativeDocumentDrops = [];
  let BridgeInput;

  const win = {
    parent: {},
    addEventListener(type, fn, capture) { listeners.push({ type, fn, capture }); },
    removeEventListener(type, fn, capture) {
      const index = listeners.findIndex((item) => item.type === type && item.fn === fn && item.capture === capture);
      if (index >= 0) listeners.splice(index, 1);
    },
    postMessage() {}
  };

  const React = {
    useState(initial) { return [initial, () => {}]; },
    useRef(initial) { return { current: initial }; },
    useEffect(effect) {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    createElement() { return null; }
  };

  const moduleLoader = {
    load(definition) {
      const loaded = definition.factory((name) => {
        assert.strictEqual(name, 'react');
        return React;
      });
      loaded.apply(context);
    }
  };
  win.__ModuleLoader__ = moduleLoader;

  const conversationInput = {
    state: { getSnapshot: () => ({ draft: '', occurrences: [], draftRev: 1 }) },
    insertReference(reference) { inserted.push(reference); return true; }
  };
  const sessions = {
    scope(sessionId) {
      assert.strictEqual(sessionId, 'session-1');
      return { get: (name) => name === 'conversation' ? { input: { for: () => conversationInput } } : undefined };
    },
    get: () => ({ header: { cwd: 'D:/workspace' } })
  };

  const context = {
    provide() {},
    effect(effect) {
      const cleanup = effect();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
    },
    sessions,
    inputTriggers: { registerSource: () => () => {} },
    slots: {
      inject(name, install) {
        assert.strictEqual(name, 'conversation.input.left');
        install();
      },
      register(metadata, component) {
        assert.strictEqual(metadata.id, 'dsh-vscode-bridge');
        BridgeInput = component;
        return () => {};
      }
    }
  };

  const fetch = async (url, options) => {
    if (url === '/api/dsh-vscode-drop') {
      uploads.push(options);
      return { ok: true, json: async () => ({ path: 'D:/workspace/.dsh-drop/session-1/file.ts' }) };
    }
    if (url === '/api/dsh-vscode-path-check') {
      const payload = JSON.parse(options.body);
      pathChecks.push(payload);
      return { ok: true, json: async () => ({ accessible: payload.paths.map(() => true) }) };
    }
    throw new Error('unexpected fetch ' + url);
  };

  const sandbox = {
    window: win,
    fetch,
    navigator: { language: 'zh-CN' },
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 1,
    clearTimeout() {}
  };
  vm.runInNewContext(clientSource, sandbox, { filename: 'dsh-vscode-bridge-client.js' });
  assert.strictEqual(typeof BridgeInput, 'function', 'bridge composer component is registered');
  BridgeInput({ ctx: context, sessionId: 'session-1' });

  function dispatch(type, dataTransfer, target) {
    const event = {
      type,
      dataTransfer,
      target: target || { closest: () => null },
      defaultPrevented: false,
      propagationStopped: false,
      immediatePropagationStopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopPropagation() { this.propagationStopped = true; },
      stopImmediatePropagation() { this.immediatePropagationStopped = true; }
    };
    for (const listener of listeners.slice()) {
      if (listener.type === type) listener.fn(event);
      if (event.immediatePropagationStopped) break;
    }
    if (!event.propagationStopped) nativeDocumentDrops.push(type);
    return event;
  }

  return { dispatch, uploads, pathChecks, inserted, cleanups, listeners, nativeDocumentDrops };
}

async function main() {
  const harness = makeHarness();

  const osFile = { name: 'file.ts', size: 12, type: 'text/plain' };
  const osTransfer = { types: ['Files'], files: [osFile], items: [], dropEffect: 'none', getData: () => '' };
  const overlayTarget = { closest: () => null };
  const osDragEnter = harness.dispatch('dragenter', osTransfer, overlayTarget);
  assert.strictEqual(osDragEnter.defaultPrevented, true, 'system file drag enter does not activate DSH overlay');
  assert.strictEqual(osDragEnter.propagationStopped, true, 'system file drag enter is stopped before DSH handlers');
  assert.strictEqual(osDragEnter.immediatePropagationStopped, true, 'same-window DSH drag listeners are stopped');
  assert.strictEqual(osTransfer.dropEffect, 'copy', 'system file drag shows an accepted drop cursor');
  const osDragOver = harness.dispatch('dragover', osTransfer, overlayTarget);
  assert.strictEqual(osDragOver.defaultPrevented, true, 'system file drag over DSH overlay is claimed');
  assert.strictEqual(osTransfer.dropEffect, 'copy', 'system file dragover keeps the drop accepted');
  const osDrop = harness.dispatch('drop', osTransfer, overlayTarget);
  assert.strictEqual(osDrop.defaultPrevented, true, 'system file drop over DSH overlay is claimed');
  assert.strictEqual(osDrop.immediatePropagationStopped, true, 'DSH native upload overlay does not receive the drop');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(harness.uploads.length, 1, 'system file bytes are uploaded once');
  assert.strictEqual(harness.inserted.length, 1, 'uploaded file is inserted as a reference');
  assert.deepStrictEqual(harness.nativeDocumentDrops, [], 'DSH native file attachment handlers do not receive the drag');

  const explorerMime = 'application/vnd.code.tree.workbench.explorer.fileview';
  const explorerPayload = JSON.stringify({ id: 'workbench.explorer.fileview', itemHandles: ['file-1'] });
  const explorerFiles = JSON.stringify(['D:/workspace/src/file.ts']);
  const explorerTransfer = {
    // VS Code Explorer carries the file paths under CodeFiles; its tree MIME only has handles.
    types: [explorerMime, 'ResourceURLs', 'CodeFiles'],
    files: [],
    items: [],
    dropEffect: 'none',
    getData(type) {
      if (type === explorerMime) return explorerPayload;
      if (type === 'CodeFiles') return explorerFiles;
      return '';
    }
  };
  const explorerDragOver = harness.dispatch('dragover', explorerTransfer, overlayTarget);
  assert.strictEqual(explorerDragOver.defaultPrevented, true, 'Explorer resource drag is accepted outside the editor');
  assert.strictEqual(explorerTransfer.dropEffect, 'copy');
  const explorerDrop = harness.dispatch('drop', explorerTransfer, overlayTarget);
  assert.strictEqual(explorerDrop.defaultPrevented, true, 'VS Code Explorer tree drop is claimed');
  await new Promise((resolve) => setImmediate(resolve));
  assert.strictEqual(harness.pathChecks.length, 1, 'Explorer tree URI is checked with DSH');
  assert.deepStrictEqual(harness.pathChecks[0].paths, ['D:\\workspace\\src\\file.ts']);
  assert.strictEqual(harness.inserted.length, 2, 'Explorer path is inserted as a reference');
  assert.strictEqual(harness.inserted[1].ref, 'D:\\workspace\\src\\file.ts');

  for (const cleanup of harness.cleanups) cleanup();
  assert.strictEqual(harness.listeners.length, 0, 'global drag listeners are removed on unmount');
  console.log('PASS: OS file capture, VS Code Explorer CodeFiles MIME, and listener cleanup');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
