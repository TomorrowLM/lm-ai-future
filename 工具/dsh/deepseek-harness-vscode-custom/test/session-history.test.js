'use strict';
/**
 * DSH session/page 游标错误兼容回归测试。
 * 运行：node test/session-history.test.js
 */
const assert = require('assert');
const http = require('http');
const path = require('path');
const Module = require('module');

const vscodeStub = {
  workspace: { getConfiguration: () => ({ get: (key, fallback) => fallback }), workspaceFolders: [] },
  env: {},
  window: {},
  commands: { registerCommand: () => ({ dispose() {} }) },
  Uri: { parse: (value) => ({ toString: () => value }) }
};
const originalLoad = Module._load;
Module._load = function (request) {
  if (request === 'vscode') return vscodeStub;
  return originalLoad.apply(this, arguments);
};

const { fetchSessionHistory } = require(path.join(__dirname, '..', 'extension.js')).__internals;
const assistantEvent = {
  seq: 2,
  type: 'assistant/message',
  data: { message: { content: [{ type: 'text', text: 'history entry' }] } }
};
const requests = [];

function sendJson(response, value) {
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify(value));
}

const server = http.createServer((request, response) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    const message = JSON.parse(body);
    const page = message.payload && message.payload.args && message.payload.args.request;
    if (request.url !== '/api/session/page' || !page) {
      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('not found');
      return;
    }
    requests.push(page);
    if (page.throughSeq === Number.MAX_SAFE_INTEGER) {
      sendJson(response, {
        type: 'server-response',
        rpcId: message.rpcId,
        result: {
          ok: false,
          error: {
            code: 'gateway/bad-request',
            message: 'session history cut 9007199254740991 exceeds 2'
          }
        }
      });
      return;
    }
    sendJson(response, {
      type: 'server-response',
      rpcId: message.rpcId,
      result: { ok: true, value: { records: [{ event: assistantEvent }] } }
    });
  });
});

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    const history = await fetchSessionHistory(`http://127.0.0.1:${address.port}`, 'session-test');
    assert.deepStrictEqual(history.events, [assistantEvent], '应取回当前会话页的事件');
    assert.deepStrictEqual(requests.map((request) => request.throughSeq), [Number.MAX_SAFE_INTEGER, 2], '应从新版错误文案提取游标并重试该页');
    console.log('通过：新版 session/page 游标错误能继续读取会话历史');
  } finally {
    Module._load = originalLoad;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
