---
trigger: always_on
---
## 🔧 开发规范

### 📦 项目结构规范

#### 目录结构规范

**组件必须放在独立的文件夹内**，每个文件夹是一个完整的组件单元，包含主文件、样式、类型定义。

**规范模板：**

```
src/
├── pages/
│   └── page-name/                # 页面目录
│       ├── index.tsx             # 页面入口
│       ├── types.ts              # 页面级类型定义
│       ├── consts.ts             # 页面级常量定义
│       ├── components/           # 页面私有组件
│       │   ├── ComponentName/
│       │   │   ├── index.tsx     # 主组件
│       │   │   └── types.ts      # 组件类型
│       │   └── SubComponent/
│       │       └── index.tsx
│       └── hooks/                # 页面私有 hooks
│           └── useXxx.ts
│
├── components/                   # 公共组件（多页面复用）
│   ├── Button/
│   │   ├── index.tsx
│   │   └── types.ts
│   └── Modal/
│       ├── index.tsx
│       └── types.ts
│
├── stores/                       # 全局公共状态（Zustand），页面私有的放页面目录
│   └── useXxxStore.ts
│
├── hooks/                        # 全局公共 hooks，页面私有的放页面目录
│   └── useXxx.ts
│
├── services/                     # API 接口请求（按模块分文件夹）
│   └── XxxService/
│       ├── index.ts              # 接口请求方法
│       └── types.ts              # 接口类型定义
│
├── constants/                    # 公共常量（多模块复用，按业务领域拆分）
│   └── status.ts                 # 例：任务状态选项配置与颜色映射
│
├── types/                        # 仅全局通用类型
│   └── global.d.ts
│
└── mock/                         # Mock API
    └── xxx.js
```

**关键规定：**

1. **components 下每一层必须是文件夹**（名称为大驼峰），主组件文件必须命名为 `index.tsx`
2. **公共组件放 `src/components/`**，页面私有组件放 `src/pages/<page>/components/`
3. **`stores/` 和 `hooks/` 只放公共的**，页面私有的 Zustand Store 或 Hook 放对应页面目录下，stores 默认不使用在功能模块中
4. **`services/` 中每个 API 模块必须是独立文件夹**（如 `XxxService/index.ts` + `XxxService/types.ts`），不直接放 .ts 文件
5. **多个模块复用的公共常量必须放在 `src/constants/` 目录下**，页面私有常量放页面目录的 `consts.ts`；`src/constants/` 按业务领域拆分文件，命名使用小驼峰，例：`status.ts`、`frequency.ts`

#### 文件命名规范

- 主组件文件：`index.tsx`
- 样式文件：`index.less`（仅在 Tailwind 无法覆盖时使用）
- 类型定义：`types.ts`
- 常量定义：`consts.ts`
- 工具函数：`utils.ts`
- 测试文件：`index.test.tsx`

---

### 📝 组件开发规范

#### 组件模块化原则

如果封装的组件代码太少，或者没有必要，请不要单独封装组件，不要过度解耦

#### 命名规范

所有 React 组件必须使用 **大驼峰命名法 (PascalCase)**，即每个单词首字母大写。

**正确示例：**

```typescript
// 文件命名
UserProfileCard.tsx
DataTable.tsx
LoadingSpinner.tsx

// 组件定义
const UserProfileCard: React.FC = () => { ... }
export default UserProfileCard;
```

**错误示例：**

```typescript
// ❌ 小驼峰命名
userProfileCard.tsx;

// ❌ 烤肉串命名
user-profile-card.tsx;

// ❌ 蛇形命名
user_profile_card.tsx;
```

#### 组件导出规范

```typescript
// 默认导出组件
const UserCard: React.FC<UserCardProps> = (props) => {
  return <div>...</div>;
};
export default UserCard;

// 命名导出类型和工具函数
export interface UserCardProps { ... }
export const formatUserData = (data: UserCardProps) => { ... };
```

---

### 🔷 TypeScript 类型定义规范

#### 核心原则

**所有 TypeScript 类型定义必须放在 `types.ts` 文件中**，包括 `interface`、`type`、`enum` 等类型声明

#### 类型文件放置规则

1. **组件类型**：放在组件目录的 `types.ts` 中（如 `components/Button/types.ts`）
2. **页面类型**：放在页面目录的 `types.ts` 中（如 `pages/user-list/types.ts`）
3. **API 类型**：放在 services 模块的 `types.ts` 中（如 `services/UserService/types.ts`）
4. **全局类型**：放在 `src/types/` 目录下（如 `types/global.d.ts`），仅限全局通用类型

#### 类型定义要求

1. **禁止在业务代码中直接定义类型**，所有类型声明必须提取到对应模块的 `types.ts` 文件中
2. **避免使用 `any` 类型**，优先使用 `unknown` 或明确的类型定义
3. **类型定义必须添加中文注释**说明用途
4. **使用 `Record<string, unknown>` 替代 `[key: string]: any`** 实现可扩展类型
5. **组件 Props 类型必须定义在同目录的 `types.ts` 中**
6. **API 请求参数和响应类型必须定义在 services 模块的 `types.ts` 中**

**正确示例：**

```typescript
// components/UserCard/types.ts

/**
 * 用户卡片组件 Props
 */
export interface UserCardProps {
  /** 用户信息 */
  user: UserInfo;
  /** 点击回调 */
  onClick?: (userId: string) => void;
}

/**
 * 用户信息类型
 */
export interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
}
```

**错误示例：**

```typescript
// ❌ 错误：在组件文件中直接定义类型
const UserCard: React.FC<{ user: any; onClick?: Function }> = (props) => {
  // ...
};

// ❌ 错误：使用 any 类型
const processData = (data: any) => { ... };
```

---

### 🎨 样式规范

#### 核心原则

**默认使用 Tailwind CSS 工具类**，直接在 JSX 中通过 className 使用

#### 样式实现规则

1. **优先使用 Tailwind 工具类组合**完成样式，避免自定义 CSS
2. **禁止在 JSX 中使用内联 `style={{}}`**，样式必须通过 Tailwind 工具类或 `.less` 文件中的 className 实现
3. **Less 仅作为补充**，用于 Tailwind 无法覆盖的复杂自定义样式（如动画、特殊布局）
4. **Less 文件命名为 `index.less`** 并与组件文件同目录
5. 遵循 BEM 命名规范（仅在使用 `.less` 文件时）
6. 长 className 列表使用 `classnames` 库（已安装）动态组合，保持 JSX 可读性

**正确示例：**

```typescript
// ✅ 使用 Tailwind 工具类
<div className="flex items-center gap-2 p-4 bg-white rounded-lg">
  <img src={avatar} className="w-10 h-10 rounded-full" />
  <span className="text-base font-medium">{name}</span>
</div>
```

**错误示例：**

```typescript
// ❌ 错误：使用内联样式
<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 16 }}>
  <img src={avatar} style={{ width: 40, height: 40, borderRadius: '50%' }} />
  <span style={{ fontSize: 16, fontWeight: 500 }}>{name}</span>
</div>
```

---

### 🔌 API 调用规范

1. **接口请求统一在 `src/services` 中管理**，按模块分文件夹
2. 使用 axios 进行 HTTP 请求（通过 `@/utils/request` 封装）
3. 错误处理统一封装
4. **API 类型定义放在同目录的 `types.ts` 中**

---

### 💬 操作反馈规范

**核心原则：所有用户触发的操作（新增、编辑、删除、提交等）必须在完成后给出明确的成功或失败提示。** 用户不应猜测操作是否生效。

#### 必须提示的场景

| 操作类型 | 成功提示 | 失败提示 |
|---|---|---|
| 新增/创建 | "xxx 创建成功" | "xxx 创建失败：<具体原因>" |
| 编辑/修改 | "xxx 修改成功" | "xxx 修改失败：<具体原因>" |
| 删除 | "xxx 已删除"，需二次确认 | "xxx 删除失败：<具体原因>" |
| 表单提交 | "提交成功" | "提交失败：<具体原因>" |
| 文件上传 | "上传成功"，显示文件名 | "上传失败：<具体原因>" |
| 批量操作 | "成功 N 条，失败 M 条" | 逐条列出失败原因 |
| 异步任务 | 操作中显示 loading 状态 | 失败后允许重试 |

#### 提示规范

1. **成功用绿色 Toast / message.success**，自动消失（2-3 秒），不阻塞用户
2. **失败用红色 Toast / message.error**，显示具体错误原因，而非笼统的"操作失败"
3. **错误信息必须来自后端返回**，禁止前端硬编码"网络错误"掩盖真实原因
4. **删除等不可逆操作必须弹窗二次确认**（Modal.confirm），确认后再执行并提示结果
5. **Loading 状态必须覆盖操作按钮**，禁止用户重复点击触发多次请求

**正确示例：**

```typescript
import { message, Modal } from 'antd';

// ✅ 新增操作：loading + 成功提示 + 失败提示
const handleCreate = async (values: CreateFormData) => {
  setSubmitting(true);
  try {
    await createUser(values);
    message.success('用户创建成功');
    onSuccess?.();
  } catch (err: any) {
    message.error(err?.message || '用户创建失败，请重试');
  } finally {
    setSubmitting(false);
  }
};

// ✅ 删除操作：二次确认 + 结果提示
const handleDelete = (id: string) => {
  Modal.confirm({
    title: '确认删除',
    content: '删除后数据不可恢复，确定要删除吗？',
    onOk: async () => {
      try {
        await deleteUser(id);
        message.success('用户已删除');
        refreshList();
      } catch (err: any) {
        message.error(err?.message || '删除失败，请重试');
      }
    },
  });
};
```

**错误示例：**

```typescript
// ❌ 操作后无任何提示，用户不知道是否成功
const handleCreate = async (values: CreateFormData) => {
  await createUser(values);
  onSuccess?.();
};

// ❌ 失败只打印日志，用户看不到
const handleDelete = async (id: string) => {
  try {
    await deleteUser(id);
  } catch (err) {
    console.error(err);
  }
};

// ❌ 错误提示笼统，不显示真实原因
const handleSubmit = async () => {
  try {
    await submitForm(data);
  } catch {
    message.error('操作失败');  // 用户不知道原因，无法自助修复
  }
};
```

---

### 💻 代码风格规范

1. **使用 TypeScript 严格模式**
2. **遵循组件化开发原则**，保持代码可读性和可维护性
3. **所有类型定义必须集中管理在 `types.ts` 文件中**
4. **禁止在组件或业务逻辑代码中直接使用 `any` 类型**
5. 注释解释"为什么"，而非"做了什么"
6. 文本缩进 2 个空格
7. 提交前格式化代码

---

### ⚙️ 工程约定

- 路由模式：`history`；基础路径 `base: './'`
- 资源路径：`publicPath` 基于输出目录名动态设置
- 目录约定路由：`conventionRoutes.exclude` 排除 `components/`、`models/`、`hooks/`、`utils/`

---

### 🌍 跨平台兼容规范

**核心原则：代码必须在 macOS、Windows、Linux 等多种环境下均可正常开发、构建和运行。**

#### 🚫 严禁基于当前电脑硬编码（最高优先级）

**任何配置、路径、环境值都不得基于开发者当前使用的机器进行硬编码。** 你在 macOS 上写代码，同事可能在 Windows 上运行，CI 可能在 Linux 上构建——硬编码你本机的路径/配置会导致其他环境直接崩溃。

**硬编码自查清单（出现以下任一情况即为违规）：**

| 硬编码行为 | 为什么不行 | 正确做法 |
|---|---|---|
| 写死 `/Users/xxx/...`、`C:\Users\xxx\...` 等本机绝对路径 | 换一台电脑就不存在 | 用 `path.join(projectRoot, ...)` 或 `os.homedir()` 动态获取 |
| 写死 `~/Library/Application Support/...` | Windows/Linux 无此目录 | 用 `os.platform()` 判断后拼接，或用 `process.env.APPDATA` |
| 写死 `/Users/zm/...` 个人用户名路径 | 同事机器上没有你的用户名 | 用 `os.homedir()` |
| 写死 `localhost:3000` 或 `192.168.x.x` 作为 API 地址 | 不同环境端口/地址不同 | 用环境变量 `VITE_API_BASE_URL` 配置 |
| 写死文件绝对路径分隔符 `/` 或 `\` | 不同平台分隔符不同 | 用 `path.join()` / `path.resolve()` |
| 写死 `export NODE_ENV=xxx` 等 macOS 专属语法 | Windows cmd 不支持 | 用 `cross-env` |
| 写死 `process.env.HOME` | Windows 没有 `HOME` | 用 `os.homedir()` |

**正确示例（参考 [path-resolver.ts](file:///Users/zm/lm/lm-console/console/core/path-resolver.ts) 的实现模式）：**

```typescript
import os from 'os';
import path from 'path';

// ✅ 动态获取用户主目录，不硬编码路径
const home = os.homedir();

// ✅ 根据平台动态拼接，而非写死 macOS 路径
const configDir = os.platform() === 'darwin'
  ? path.join(home, 'Library', 'Application Support', 'MyApp')
  : os.platform() === 'win32'
    ? path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'MyApp')
    : path.join(home, '.config', 'MyApp');
```

**错误示例：**

```typescript
// ❌ 硬编码 macOS 路径——Windows/Linux 直接炸
const configDir = '/Users/zm/Library/Application Support/MyApp';

// ❌ 硬编码 Windows 路径——macOS/Linux 直接炸
const configDir = 'C:\\Users\\zm\\AppData\\Roaming\\MyApp';

// ❌ 硬编码本机用户名
const dbPath = '/Users/zm/data/app.db';
```

#### 路径处理

1. **禁止硬编码平台路径分隔符**，统一使用 `path.join()` 或 `path.resolve()` 拼接路径
2. **禁止使用 `\` 或 `/` 硬拼路径**，Node.js `path` 模块会自动适配不同平台
3. **import/require 路径始终使用正斜杠 `/`**，打包工具（Vite/webpack）会统一处理

**正确示例：**

```typescript
// ✅ 使用 path.join 拼接路径
import path from 'path';
const configPath = path.join(__dirname, 'config', 'app.json');
const outputDir = path.resolve(process.cwd(), 'dist');
```

**错误示例：**

```typescript
// ❌ 硬编码平台路径分隔符
const configPath = `${__dirname}\\config\\app.json`; // Windows only
const outputDir = `${process.cwd()}/dist`;            // macOS/Linux only
```

#### 环境变量

1. **环境变量命名统一使用 `UPPER_SNAKE_CASE`**（如 `VITE_API_BASE_URL`），跨平台 `.env` 文件均可识别
2. **避免依赖平台特定的环境变量**（如 `%OS%`、`$HOME`），改用跨平台方案（`os.homedir()`、`process.env` 通用变量）
3. **敏感配置通过 `.env.local` 管理**，`.env.local` 已在 `.gitignore` 中排除

#### 脚本与命令

1. **`package.json` 中的 scripts 必须跨平台可用**：
   - 避免 shell 特定语法（`&&`、`;` 分隔符可用，但避免 `set`、`export ENV=xxx &&` 等平台特定写法）
   - 优先使用 `cross-env` 设置跨平台环境变量
   - 文件操作优先使用 Node.js 脚本或 `rimraf`、`copyfiles` 等跨平台工具，而非 `rm -rf`、`cp` 等平台命令
2. **Git Hooks（husky）必须在 Windows 下可执行**：确保 `.sh` 脚本有对应的跨平台替代或使用 Node 脚本

**正确示例：**

```json
{
  "scripts": {
    "build": "cross-env NODE_ENV=production vite build",
    "clean": "rimraf dist",
    "copy-assets": "copyfiles -u 1 src/assets/**/* dist/assets"
  }
}
```

**错误示例：**

```json
{
  "scripts": {
    "build": "NODE_ENV=production vite build",
    "clean": "rm -rf dist",
    "copy-assets": "cp -r src/assets dist/assets"
  }
}
```

#### 换行符与编码

1. **`.gitattributes` 必须配置 `* text=auto`**，Git 自动处理 CRLF/LF 转换
2. **`.editorconfig` 必须配置 `end_of_line = lf`**，编辑器统一使用 LF
3. **源文件一律使用 UTF-8 编码**，禁止使用 GBK 等平台特定编码

**`.editorconfig` 配置示例：**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
trim_trailing_whitespace = true
insert_final_newline = true
```

#### 依赖与工具链

1. **包管理器使用 pnpm**，锁文件 `pnpm-lock.yaml` 确保跨平台依赖版本一致
2. **Node 版本通过 `.nvmrc` 或 `package.json` 的 `engines` 字段统一约束**
3. **避免依赖平台特定的 npm 包**（如 `fsevents` 仅在 macOS 可用），如无法避免，使用 `optionalDependencies` 声明
4. **CI/CD 流程必须在 Ubuntu/MacOS/Windows 至少两种平台验证通过**

#### 文件系统大小写敏感

1. **文件引用路径必须与实际文件名大小写完全一致**（macOS 默认大小写不敏感，但 Linux/CI 环境敏感，不一致会导致构建失败）
2. **组件导入路径的大小写必须与文件名精确匹配**

**正确示例：**

```typescript
// ✅ 文件名：UserProfileCard.tsx
import UserProfileCard from '@/components/UserProfileCard';
```

**错误示例：**

```typescript
// ❌ 文件名：UserProfileCard.tsx，但引用时大小写不一致
import UserProfileCard from '@/components/userProfileCard';  // macOS 可能不报错，Linux/CI 报错
```
