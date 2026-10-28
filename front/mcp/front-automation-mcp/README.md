# front-automation-mcp

通用前端页面检查与自动化测试 MCP。使用 Python + Playwright 连接已有 Chrome CDP 会话，支持用户手动输入地址并完成登录，再由 AI + MCP 接管页面采集。

## 当前工具

- `connect_browser`：连接指定 Chrome/CDP endpoint
- `connect_browsers`：发现并连接已启用远程调试的 Chrome/Chromium 实例；可传 `target_url` 诊断已连接页面
- `list_pages`：列出所有已连接实例的标签页，返回跨实例全局 `index`、`browserId` 和 `browserLabel`
- `open_browser_page` / `launch_login_browser`：打开页面或启动隔离 Chrome，登录由用户操作；启动前按 `[::1]`、`127.0.0.1` 探测当前 CDP 端点，端点可达时返回实际 `cdpUrl` 和 `reused: true`，不会重复打开 Chrome
- `navigate_page`：同源 SPA 路由导航
- `wait_until_ready`：轮询 route、loading 指示器、DOM 指纹、候选数量和 iframe readyState，确认页面稳定后再截图/采集
- `fill_text_control`：按 AI 提供的精确文本/label/placeholder/name 与 occurrence 填充可见文本控件；返回值只保留脱敏摘要
- `click_visible_control`：按 AI 提供的精确控件定位点击，返回 URL、route、DOM fingerprint、overlay 和内容变化证据
- `select_visible_option`：按 AI 提供的控件名称与选项文本选择可见选项
- `collect_page_structure`：统一执行增量滚动、截图、DOM/iframe 候选、导航菜单、Dialog/Drawer 检测
- `collect_navigation_tree`：等待页面稳定后枚举并去重可见菜单候选，不凭空推断父子层级
- `collect_tab_variants`：传入父路由和 Tab 名称列表，由 MCP 内部逐个回到父路由，完成等待、Tab 切换、截图、滚动、DOM 和 Dialog/Drawer 采集
- `page_snapshot`：截图、路由、DOM 文本、框架感知的交互候选
- `page_screenshot`：保存整页截图并返回路由和候选数量
- `inspect_dom`：读取 DOM、iframe、候选元素和路由信息
- `measure_layout`：按 AI 提供的精确元数据读取元素 rect、computed spacing、字体、viewport 与 DPR；只读，不滚动或交互
- `enumerate_navigation`：枚举 Vue/React/Ant/Element/View UI 等菜单候选
- `click_navigation_item`：点击可见菜单项并返回下一层菜单，支持 AI 递归遍历
- `scroll_page`：增量滚动窗口和内部滚动容器，触发懒加载
- `scroll_to_top`：重置窗口和内部滚动容器，并返回 `atTop`、`windowScrollY` 和容器复位证据；标准采集接口会自动先调用它
- `switch_tab`：按可见文本切换标准或自定义 Tab
- `click_and_collect_overlay(name, occurrence)`：点击低风险控件并采集 Dialog/Drawer；同时比较 URL/route 与主内容 fingerprint。存在 Dialog/Drawer 时优先返回 `transition.type=overlay`；无弹层时，URL/route 或主内容发生变化才返回 `page`、`collectionRequired=true`；同名按钮按可见 occurrence 遍历；只有确实没有页面内容变化时才返回 `state-change`
- Overlay 证据按顶层 Dialog/Drawer 去重，不能把 mask、wrap、content、header、body、footer 等内部节点重复写成多个弹层。
- `close_overlay`：关闭已验证的低风险 Dialog/Drawer，避免遮罩影响后续菜单采集
- `validate_view`：对比 AI 识别结果与 DOM 结果

### 布局测量

先通过 `inspect_dom` 或截图定位目标，再调用 `measure_layout`。`targets` 中每项需有唯一 `id`，并至少提供一个精确字段：`text`、`tag`、`role`、`className`、`ariaLabel` 或 `title`；每次最多测量 25 个目标。可用 `frameIndex` 指定 iframe，重复目标用 `occurrence` 消歧。不接受任意 CSS selector，也不自动滚动。

`rect` 数值以 CSS px 表示，坐标相对对应 frame 的 viewport；`inViewport` 单独表示矩形是否与当前 viewport 相交。`not-visible` 表示 CSS 隐藏或没有布局盒，不表示元素一定在屏外。computed style 保留浏览器序列化值，可能是 `px`、百分比或 `normal`，不要一概当作 px。响应还包含 viewport 尺寸、DPR、visual viewport scale 和滚动位置。目标状态包括 `measured`、`not-found`、`not-visible`、`ambiguous`、`occurrence-unavailable` 和 `frame-unavailable`。测量父容器与子元素时分别提交两个目标，由 AI 根据各自矩形和 computed style 计算视觉间距；MCP 不读取 Figma，也不判断设计差异或业务对错。

通用交互原语的职责边界：AI 负责根据截图和 DOM 识别控件、判断业务风险、决定调用顺序并解释结果；MCP 只负责可见控件定位、输入、点击、选择和状态证据采集。MCP 不内置登录字段、组织名称、业务按钮名称或业务流程。

候选发现采用两层通用策略：优先采集语义标签、ARIA、框架通用 class 和可访问属性；再回退到可见事件绑定、指针交互和通用交互 class 的非语义元素。MCP 返回原始候选与定位证据，AI 决定它是菜单、Tab、按钮、筛选器、业务动作还是未知项；不能把某个站点的文字、路由或流程下沉到 MCP。

敏感输入通过 `sensitive=true`（默认值）标记时，MCP 只返回 `provided`、`length` 和 `redacted`，不在返回值、异常摘要或采集 JSON 中回显原文。验证码等一次性值由调用方提供，MCP 不自动获取。

## 工程结构

```text
python-core/
├── server.py                 # Python MCP 入口
├── front_automation_mcp/
│   ├── tools/                # MCP 工具适配层，只负责参数和调用编排
│   ├── collectors/           # 页面结构统一采集流程
│   ├── browser/              # CDP/Playwright 适配，按职责拆分
│   │   ├── session.py        # 浏览器连接、页面生命周期
│   │   ├── navigation.py     # 路由、菜单、递归导航
│   │   ├── interaction.py    # Tab、文本定位、控件交互
│   │   ├── overlay.py        # Dialog、Drawer、Popover
│   │   ├── readiness.py      # 页面加载完成与稳定性判定
│   │   ├── scrolling.py      # 增量滚动和懒加载
│   │   └── snapshot.py       # DOM、iframe、截图证据
│   ├── models/               # 路由、快照、按钮和视图节点契约
│   ├── serializers/          # MCP JSON 输出
│   └── config.py             # 选择器和浏览器端脚本
├── tests/                    # Python 实现测试
└── pyproject.toml
```

根目录的 `server.py` 是外层启动器，会转发到 `python-core`；Python 实现内部的 `browser.py`、`models.py` 仍作为旧脚本兼容入口。新代码应从 `front_automation_mcp` 包导入。

采集约束：

- 候选元素同时覆盖语义标签、ARIA、Vue/React 常见 class、iframe；每个候选保留类型、路由、文本、class、frame 信息。
- 页面采集使用增量滚动，最多 `max_scroll_rounds` 轮，并在连续稳定轮次后停止，以触发懒加载又避免无限滚动。
- Dialog/Drawer 只做识别和结构采集；保存、删除、提交等高风险操作默认只记录、不执行。
- 按钮点击后必须比较点击前后的 URL/route：route 变化时分类为页面入口，等待新页面稳定并继续采集详情页；“导入”“查看”“编辑”“新增”不能默认当作弹窗或普通按钮结束。
- `collect_page_structure` 的结果是 AI 生成统一 `menu -> children -> page/tab/dialog/drawer/button` JSON 的证据源；截图与 DOM 必须双重核验，不能仅凭截图跳过 DOM。
- 页面流程必须是 `wait_until_ready → MCP 截图 → AI 根据用户意图生成视觉采集/测试决策（visual-analysis.json）→ inspect_dom/find_text_elements → MCP 操作 → 操作后截图与 DOM 复核`；视觉分析至少包含目标、动作、排除项、风险和未知项。
- 业务 JSON 和 `outputs/evidence/<name>-mcp.json` 只保留精简 `mcpEvidence` 摘要与交互统计；完整 DOM/iframe/滚动 raw 证据不默认注入 AI 上下文，发现漏项或异常时按页面通过 MCP 重新采集，避免重复数据导致 token 膨胀。
- `front-automation-mcp` 是唯一浏览器自动化与采集执行层；工程外不得新增 Python 驱动、CDP/Playwright 自动化、DOM 后处理、路由/按钮硬编码或 JSON 拼装脚本。外部调用方只能保存 MCP 原始返回和 MCP 生成的结构化结果。

## 启动

```bash
uv run --directory front/mcp/front-automation-mcp/python-core python server.py
```

`connect_browsers` 会检查各平台的 Chrome/Chromium 默认用户数据目录，并读取运行进程参数中的自定义 `--user-data-dir`。只有存在有效 `DevToolsActivePort` 的实例才会连接；它不会启动浏览器、创建标签页或导航已有标签页。Chrome 144+ 可在目标实例打开 `chrome://inspect/#remote-debugging` 并允许远程调试；旧式 CDP 实例可使用 `--remote-debugging-port` 启动。MCP 进程必须能读取对应用户数据目录，macOS 隐私权限可能阻止读取。远程调试会让 MCP 访问该实例中已登录的页面，只应对可信的本地 MCP 启用。

`connect_browsers(target_url="https://...")` 可选地按完整 URL（包括 query 和 hash）检查当前已连接实例的页面，不会创建页面或执行导航。`targetDiagnostic.status` 区分 `no_debuggable_instances`、`connected_instances_empty`、`url_mismatch`、`matched` 和 `ambiguous`；`scope` 与 `skippedInstanceCount` 说明诊断只覆盖已附加页面，且是否有已发现实例无法连接。

`list_pages` 的 `index` 是所有已连接实例和 context 的全局索引，可直接传给页面操作工具。`browserId` 和 `browserLabel` 用于区分来源。`connect_browser` 仍支持手动指定单个 CDP endpoint。未启用远程调试、目录不可读或 endpoint 失效的实例不会被附加；此功能只发现 Chrome/Chromium，不扫描 Edge、Brave、Firefox 或 Safari。

多聊天窗之间不共享 MCP 会话状态。macOS 可能同时存在 IPv6/IPv4 两个 loopback listener，手动连接时应沿用工具返回的实际 `cdpUrl`；空页面列表表示当前已连接的 endpoint 暂无可见页面，不表示需要新开浏览器。
