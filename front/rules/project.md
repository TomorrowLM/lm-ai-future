---
trigger: always_on
---
## �🔧 开发规范

### 📝 组件命名规范

#### 组件模块化规范
如果封装的组件代码太少，或者没有必要，请不要单独封装组件，不要过度解耦

#### 1. 大驼峰命名法 (PascalCase)

所有 React 组件必须使用 **大驼峰命名法**，即每个单词首字母大写。

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
user - profile - card.tsx;

// ❌ 蛇形命名
user_profile_card.tsx;
```

---

#### 2. 目录结构规范

**组件必须放在独立的文件夹内**，每个文件夹是一个完整的组件单元，包含主文件、样式、类型定义。

**规范模板：**

```
src/
├── pages/
│   └── page-name/                # 页面目录
│       ├── index.tsx             # 页面入口
│       ├── types.ts              # 页面级类型定义
│       ├── components/           # 页面私有组件
│       │   ├── ComponentName/
│       │   │   ├── index.tsx     # 主组件
│       │   │   ├── index.less    # 样式
│       │   │   └── types.ts      # 组件类型
│       │   └── SubComponent/
│       │       └── index.tsx
│       └── hooks/                # 页面私有 hooks
│           └── useXxx.ts
│
├── components/                   # 公共组件（多页面复用）
│   ├── Button/
│   │   ├── index.tsx
│   │   ├── index.less
│   │   └── types.ts
│   └── Modal/
│       ├── index.tsx
│       ├── index.less
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
│       └── index.ts
│
├── types/                        # 仅全局通用类型
│   └── global.d.ts
│
└── mock/                         # Mock API
    └── xxx.js
```

**关键规定：**

1. **components 下每一层必须是文件夹**（名称为大驼峰），主组件文件必须命名为 `index.tsx`
2. **页面私有类型放在页面目录的 `types.ts`**，不放入全局 `src/types/`
3. **`src/types/` 只放全局通用类型**（如 `global.d.ts`、第三方声明等），不存放业务类型
4. 公共组件放 `src/components/`，页面私有组件放 `src/pages/<page>/components/`
5. 样式文件必须命名为 `index.less`，且与组件文件在同一文件夹内
6. **`stores/` 和 `hooks/` 只放公共的**，页面私有的 Zustand Store 或 Hook 放对应页面目录下,stores默认不使用在功能模块中
7. **`services/` 中每个 API 模块也必须是独立文件夹**（如 `XxxService/index.ts`），不直接放 .ts 文件

#### 3. 文件命名规范

- 主组件文件：`index.tsx`
- 样式文件：`index.less`
- 类型定义：`types.ts`
- 工具函数：`utils.ts`
- 测试文件：`index.test.tsx`

#### 4. 组件导出规范

```typescript
// 默认导出组件
const UserCard: React.FC<UserCardProps> = (props) => {
  return <div>...</div>;
};
export default UserCard;

// 命名导出类型和工具函数
export interface UserCardProps { ... }
export const formatUserData = (data: any) => { ... };
```

---

### 🎯 其他开发规范

#### 代码风格

- 使用 TypeScript 严格模式
- 遵循组件化开发原则
- 保持代码可读性和可维护性

#### API 调用

- 接口请求统一在 `src/services` 中管理
- 使用 axios 进行 HTTP 请求
- 错误处理统一封装

#### 样式规范

- 使用 Less 预处理器
- 遵循 BEM 命名规范或使用 CSS Modules
- 组件样式与组件文件同名

#### 工程约定

- 路由模式：`hash`；基础路径 `base: '/an'`
- 微前端：启用 `qiankun` 子应用模式
- 资源路径：`publicPath` 基于输出目录名动态设置
- 目录约定路由：`conventionRoutes.exclude` 排除 `components/`、`models/`、`hooks/`、`utils/`

---