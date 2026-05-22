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
