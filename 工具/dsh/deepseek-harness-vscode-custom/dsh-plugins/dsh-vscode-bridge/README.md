# DSH VS Code Bridge

## 中文

`dsh-vscode-bridge` 是一个可独立打包的 DeepSeek Harness Cordis 插件。它把 DSH 的引用插入能力提供给 VS Code 扩展，并支持从 VS Code 资源管理器或系统文件管理器拖入文件。

### 功能

- 通过 DSH 输入服务依次插入多个文件或代码行范围引用，保留输入框已有内容，不自动发送。
- 在 DSH 插件端暴露 `dshVscodeBridge` 服务，其他 Cordis 插件可注册请求处理器或直接插入引用。
- 在 DSH 页面捕获阶段处理 VS Code 文件树拖放和系统文件拖放，避免原生上传遮罩抢先处理；先检查 DSH 服务端是否能读取原路径，不能读取时仅在浏览器提供了可唯一匹配的文件内容后，才保存到会话工作区的 `.dsh-drop/<sessionId>/`。
- 识别 VS Code Explorer 的 `CodeFiles` 路径数组与 `application/vnd.code.tree.<tree-id>` 类型；tree MIME 仅含节点句柄时，从 `CodeFiles` 提取真实文件路径。
- 通过 DSH 已认证的 `/api/dsh-vscode-drop` 上传文件，单文件上限为 24 MiB；仅所有者的已认证浏览器会话可访问上传与路径检查接口。
- 上传目录会解析真实路径并限制在当前会话工作区内；创建文件时拒绝覆盖现有路径，防止符号链接把内容写到工作区之外。
- 若路径在 DSH 服务端不可读，且浏览器未提供文件内容，或同名文件无法唯一匹配，则跳过该项、不插入无效引用，并在输入框附近显示中英文提示。

### VS Code 宿主请求协议

支持通用请求的宿主注册命令 `dshPanel.sendPluginRequest`，参数格式：

```js
await vscode.commands.executeCommand('dshPanel.sendPluginRequest', {
  pluginId: 'dsh-vscode-bridge',
  method: 'insertReferences',
  payload: {
    references: [
      { filePath: 'D:/project/README.md', startLine: 10, endLine: 15 },
      { filePath: 'D:/project/src/app.ts', startLine: 20, endLine: 24 }
    ]
  }
})
```

调用返回 `{ inserted, total, failedIndex }`。`failedIndex` 为从 0 开始的失败项序号；全部成功时为 `-1`。宿主只负责通用转发和回执，不解析引用语义。

### Cordis 插件 API

其他 DSH 客户端插件可以注入 `dshVscodeBridge`：

```js
export const inject = ['dshVscodeBridge']

export function apply(ctx) {
  ctx.dshVscodeBridge.registerHandler('my-plugin', 'doWork', async ({ sessionId, payload }) => {
    // 处理来自支持通用桥接的 VS Code 扩展的请求。
    return { accepted: true, sessionId, payload }
  })
}
```

处理器注册名由插件自行选择；VS Code 扩展请求时使用相同的 `pluginId` 与 `method`。`insertReferences({ sessionId, references })` 也可供 DSH 内其他客户端插件直接使用。

### 部署

插件源文件位于 `dsh-plugins/dsh-vscode-bridge/`，可在该目录执行 `npm pack` 生成独立 npm 包。LM Custom DSH VS Code 扩展会在启动时将随包插件部署到 DSH `web` profile，并停用旧 `dsh-drop-caret` bundle 以避免重复处理拖放事件；需要重启 DSH Web 服务后加载新客户端代码。

## English

`dsh-vscode-bridge` is a standalone DeepSeek Harness Cordis plugin. It exposes reference insertion to VS Code extensions and handles files dropped from the VS Code Explorer or the operating system file manager.

### Features

- Inserts multiple file or source-range references in order, preserves the existing draft, and never submits the chat.
- Exposes the `dshVscodeBridge` Cordis service so other DSH client plugins can register request handlers or insert references directly.
- Captures VS Code tree drops and operating-system file drops before DSH's native upload overlay can claim them. It checks whether DSH can read each path and uploads dropped bytes to `.dsh-drop/<sessionId>/` only when the browser file can be uniquely matched to that path.
- Reads VS Code Explorer's `CodeFiles` path array and `application/vnd.code.tree.<tree-id>` MIME type; when the tree payload contains only item handles, the actual file paths come from `CodeFiles`.
- Uses DSH's authenticated `/api` routes for upload (24 MiB per file) and path checks; only the authenticated browser owner can call them.
- Resolves the upload directory and keeps it inside the session workspace. Files are created exclusively so a pre-existing symlink cannot redirect an upload.
- If DSH cannot access a path and the browser provides no uniquely matchable file bytes, that item is skipped instead of inserting a broken reference; a bilingual notice appears near the composer.

The VS Code host command `dshPanel.sendPluginRequest` is a generic request/response transport. Set `pluginId` and `method` to the handler registered by the target DSH plugin. The response includes `inserted`, `total`, and `failedIndex` for `insertReferences`.

The LM Custom DSH VS Code extension deploys the bundled plugin to the DSH `web` profile and disables the legacy `dsh-drop-caret` bundle to prevent duplicate drop handling. Restart the DSH Web service to load the new client bundle.
