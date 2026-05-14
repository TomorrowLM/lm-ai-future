# GitNexus 作为 Superpowers 叠加增强层 — 集成设计

> 日期: 2026-05-11
> 状态: 待审查
> 方案: B — 标注式集成（单入口 + 全覆盖改动）

## 1. 背景

### 1.1 现状

- **superpowers**：工程工作流技能包，含 11 个流程类 + 4 个专项类 + 4 个叠加增强类技能
- **GitNexus**：基于知识图谱的代码智能工具集，7 个独立技能（guide / exploring / impact-analysis / debugging / pr-review / refactoring / cli）
- 两套体系目前**无任何集成关系**

### 1.2 目标

让 superpowers 在合适的流程节点上能按需调用 GitNexus 能力，提升代码理解、影响分析和安全重构的质量。

## 2. 核心架构

### 2.1 叠加模型

```
superpowers 主流程（不变）
    │
    ├── 流程类 skill
    │       │
    │       └── [检测到 GitNexus 触发信号？]
    │               │
    │               是 → 加载 gitnexus-guide → 由 guide 路由到具体子技能
    │               否 → 正常继续
    │
    └── 叠加增强层（并行，不阻塞主流程）
            ├── git-commit-conventions
            ├── git-workflow
            ├── code-rule
            └── gitnexus ← 新增，单入口
```

### 2.2 关键规则

| 规则 | 说明 |
|------|------|
| 单入口原则 | superpowers 只调用 `gitnexus-guide`，不直接调 exploring / impact 等 |
| 条件性加载 | 检测到触发信号时才加载，非强制 |
| 不阻塞主流程 | 增强是"叠加"不是"替换" |
| 内部路由 | 具体用哪个子技能由 `gitnexus-guide` 决定 |
| 前置条件 | 加载前需确认索引有效 |

### 2.3 强制性

**全部不是强制性的。** 原因：

1. GitNexus 有前置条件（项目必须被索引过）
2. superpowers 是通用工作流，不能假设项目有知识图谱
3. GitNexus 只解决"代码间关系"问题，纯新增/UI/配置变更不需要

### 2.4 流程类 Skill 与 GitNexus 的关系

| Skill | 关系级别 | 说明 |
|---|---|---|
| brainstorming | 可选 | 讨论方案时涉及影响评估可叠加 |
| writing-plans | **推荐** | 拆计划前了解依赖和爆炸半径 |
| executing-plans | 可选 | 执行到具体改动前可做影响分析 |
| subagent-driven-development | **推荐** | 分派任务前确认任务边界 |
| systematic-debugging | 强互补 | 调用链图谱路径 vs 日志/测试路径 |
| verification-before-completion | 几乎不用 | 关注测试通过与否 |
| requesting-code-review | 强互补 | 代码质量 + 影响范围双维度 |
| receiving-code-review | 几乎不用 | 处理反馈是改代码 |
| git-finishing-development-branch | 几乎不用 | 收尾是 git 操作 |

## 3. 触发信号

### 3.1 关键词表

| 信号类别 | 触发词/短语 |
|----------|-------------|
| 影响分析 | "爆炸半径"、"影响范围"、"改了X会怎样"、"波及哪些" |
| 架构理解 | "X是怎么工作的"、"调用链"、"执行流"、"架构探索" |
| Bug 追踪 | "沿调用链定位"、"根因追踪"、错误信息+"追踪" |
| PR 审查 | "PR review"、"PR 风险"、"合并安全"、"变更影响" |
| 重构 | "安全重命名"、"提取模块"、"跨文件重构" |
| 显式调用 | "gitnexus"、"知识图谱"、"图谱查询" |

## 4. 具体改动点

### 4.1 SKILL.md 改动

#### 改动 A: 子技能路由表（第 30 行后新增）

| 用户场景 | 首选技能 | 何时直接进入 | 常见叠加 |
|---|---|---|---|
| 涉及代码关系查询、影响分析、调用链追踪、PR 影响评估、安全重构 | `gitnexus-guide` | 用户提到爆炸半径/影响范围/调用链/知识图谱/gitnexus 时 | brainstorming / writing-plans / systematic-debugging / requesting-code-review |

#### 改动 B: 默认分流策略（第 7 条后新增第 8 条）

```
8. 用户提到"爆炸半径""影响分析""调用链""知识图谱""gitnexus"或涉及代码关系查询时，
   先加载 gitnexus-guide，由 guide 内部路由决定是否调用具体 GitNexus 子技能。
   GitNexus 是条件性增强，非强制；加载前需确认索引有效。
```

### 4.2 README.md 改动

#### 改动 C: 叠加增强类表格（`code-rule` 行后新增）

| Skill | 叠加在哪类流程上 | 说明 |
|---|---|---|
| `gitnexus` | brainstorming / writing-plans / systematic-debugging / requesting-code-review / subagent-driven-development / executing-plans | 单入口。基于知识图谱的代码智能增强。通过 gitnexus-guide 路由到具体子技能。条件性加载，非强制。 |

#### 改动 D: 典型链路标注

4 条链路标注 `[+gitnexus]`：

**#1. 新功能开发**
```
using-superpowers → brainstorming → writing-plans[+gitnexus] → code-rule →
subagent-driven-development[+gitnexus] → verification-before-completion →
requesting-code-review[+gitnexus] → receiving-code-review → git-finishing-development-branch
```

**#4. Bug 修复**
```
using-superpowers → systematic-debugging[+gitnexus] → test-driven-development →
verification-before-completion → requesting-code-review[+gitnexus] → git-finishing-development-branch
```

**#6. 中文团队代码审查**
```
using-superpowers → requesting-code-review[+gitnexus] → receiving-code-review → verification-before-completion
```

其余 7 条链路不变。

#### 改动 E: 场景查找表（末尾新增 3 行）

| 我现在要做什么 | 推荐进入的 Skill | 常见后续 Skill | 说明 |
|---|---|---|---|
| 我想了解"改这个函数会波及哪些代码" | `gitnexus`（叠加于当前流程） | 无 | 通过 gitnexus-guide 加载影响分析能力 |
| 我想追踪"X 是怎么被调用的" | `gitnexus`（叠加于当前流程） | brainstorming / systematic-debugging | 通过 gitnexus-guide 加载调用链探索能力 |
| 我想评估"这个 PR 合并风险高吗" | `gitnexus`（叠加于 requesting-code-review） | requesting-code-review | 通过 gitnexus-guide 加载 PR 影响评估能力 |

#### 改动 F: 触发信号速查表（场景查找表之后新增）

```markdown
> **GitNexus 触发速查**
>
> | 触发信号 | 映射到 | 典型叠加节点 |
> |----------|--------|-------------|
> | 爆炸半径/波及哪些/改了X会怎样 | impact-analysis | writing-plans, executing-plans |
> | X是怎么工作的/调用链/执行流 | exploring | brainstorming |
> | 沿调用链定位/根因追踪 | debugging | systematic-debugging |
> | PR风险/合并安全/变更影响 | pr-review | requesting-code-review |
> | 安全重命名/提取/跨文件重构 | refactoring | subagent-driven-development |
```

## 5. 优先级与冲突规则

### 5.1 与现有叠加层的优先级

| 场景 | 优先级 | 理由 |
|------|--------|------|
| gitnexus + code-rule | 并行 | 图谱 + 规范，不冲突 |
| gitnexus + requesting-code-review | gitnexus 先 | pr-review 需要先拿到影响数据再写意见 |

### 5.2 加载顺序

1. 检测是否满足前置条件（索引存在且未过期）
2. 加载 gitnexus-guide（单入口）
3. guide 路由到具体子技能
4. 子技能返回结果给主流程
5. 主流程继续正常推进

### 5.3 不加载的情况

- 项目无 `.gitnexus/` 目录 → 静默跳过
- 索引 stale → 提示用户，不自动 analyze
- 用户明确说"不用 gitnexus" → 尊重，跳过

## 6. 改动量估算

| 文件 | 改动类型 | 增量行数 |
|------|----------|----------|
| SKILL.md | 路由表 +1 行、分流策略 +3 行 | ~10 |
| README.md | 叠加表格 +1 行、链路标注 4 处、场景表 +3 行、速查表 +8 行 | ~35-45 |
| **合计** | | **~45-55 行增量** |
