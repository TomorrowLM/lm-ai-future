# DSH 拓扑编排

DSH Web 侧栏插件提供拓扑会话列表、新建入口、模板空间、节点编辑和启动操作。模板空间包含只读固定模板与可编辑自定义模板；`index.html` 仍是独立的画布交互原型，运行中的侧栏界面由 `src/client.ts` 提供。

## 当前切片

- 每条拓扑会话使用独立 JSON 文件，保存拓扑节点、绑定的 DSH sessionId 和节点状态；浏览器本地目录索引仅保存已登记 JSON 路径。
- 首次启动时调用 DSH Session Controller `create`，先将返回的 sessionId 写回拓扑 JSON，再调用 `prompt` 向主会话提交目标；已有 sessionId 时复用。
- 模板按“需求分析 → 技术方案 → 实现计划 → 编码实现 → 测试验收 → 收尾交付”生成顺序节点，可修改节点名称和目标。
- 固定模板只能查看或复制；自定义模板可编辑节点、依赖、执行会话、Hook 定义和输出文件。模板库保存在 DSH 用户目录 `.dsh/task-ort/templates.json`，供各工作区共享；创建拓扑时将模板节点复制为会话 JSON 快照。
- 当前 Hook 定义可保存到模板和拓扑 JSON，但运行调度器尚未执行 Hook；带 Hook 的拓扑在启动校验阶段会被拒绝。
- JSON 文件采用临时文件写入；新拓扑不会覆盖已存在的其他拓扑文件。损坏或不兼容 JSON 会显示错误。
- 当前只提交根目标并记录根节点运行状态，尚未接通 Goal/Session 完成事件，因此不会自动判定后续节点完成或推进 DAG。页面会明确显示此限制。
- Session Controller API 已在 DSH 0.2.2-rc.3 类型声明中确认；隔离 profile 中的实际浏览器认证和真实模型调用仍需手动验收，自动化测试用 stub 验证请求契约。

## 构建与测试

需要 Node.js 24.9 或更高版本及 DSH 0.2.2-rc.3 Web 环境。

```powershell
npm run build
npm test
```

构建脚本使用 Node 实验性 `stripTypeScriptTypes`，不执行 TypeScript 类型检查。测试覆盖路由注册/卸载、创建/复用主会话及提交目标、子代理成功和失败状态转换。
