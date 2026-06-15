# 盒记 — 技术栈

> 基于 design-document.md · 2026-06-09 · 原则：**简单 + 健壮 + 沿用用户栈**

---

## 1. 选型原则

按重要性排序：

1. **沿用你的栈**：Vue / uni-app 熟悉度高，协作成本低
2. **简单**：个人项目，每加一层抽象都要有 10 倍收益才划算
3. **健壮**：数据是老板的真实账目，丢了不能重来
4. **可演进**：v1.0 → v1.x → v2.0 的扩展点要预留

---

## 2. 核心技术栈

| 层 | 选 | 版本 | 理由 |
|---|---|---|---|
| **框架** | **uni-app (Vue 3) + Vite** | uni-app 最新稳定 / Vue 3.4+ | 你的栈；单代码库编译为 Android APK；CLI 模式不依赖 HBuilderX |
| **语言** | **TypeScript** | 5.x | 5 张表 + 复杂状态机，类型保护能省大量排查时间 |
| **状态管理** | **Pinia** | 2.x | Vue 3 官方推荐；Pinia store 数量控制在 4 个以内 |
| **UI 组件** | **uni-ui**（官方轻量） | latest | 比 uView Plus 轻 ~60%；5 个核心页够用；后期可补 |
| **本地数据库** | **plus.sqlite** | 内置 | uni-app 原生 SQLite API，无第三方依赖；性能与稳定性最好 |
| **日期** | **dayjs** | 1.11.x | 7KB，tree-shakable；处理"日/周/月"分组够用 |
| **金额精确运算** | **big.js** | 7.0.x | 10KB 任意精度十进制运算；所有金额 `+ - * /` 走 `src/utils/format.ts` 的 5 个 helper（big.js 只在 helper 内部 import，业务侧不直接用）|
| **图标** | **emoji** | — | 零依赖；支出分类、状态指示用 emoji 即可，v1.1 再换图标库 |
| **图表** | **纯 CSS 进度条** | — | v1.0 不引图表库；统计页用文字 + CSS 简单条形图，v1.1 再加 uCharts |
| **构建** | **@dcloudio/vite-plugin-uni** | latest | uni-app 官方 Vite 插件 |
| **包管理** | **pnpm** | 8.x | 比 npm 快、省磁盘；lock 文件稳定 |
| **Lint** | **ESLint + @vue/eslint-config-typescript** | latest | 基础规范 |
| **Format** | **Prettier** | 3.x | 自动格式化 |
| **IDE** | **VSCode + Vue (Official) + TypeScript Vue Plugin (Volar)** | latest | Vue 3 + TS 必备；不要装 Vetur |
| **测试** | **手动 + 真机调试** | — | v1.0 不写单测（5 个页面、5 张表，手测覆盖即可）；后期可加 vitest |

---

## 3. 明确不引入的东西

为了"简单"，以下**全部不引入**：

| ❌ | 理由 |
|---|---|
| HBuilderX | 你的工作流是 VSCode + 终端，HBuilderX 是负担 |
| uView Plus / NutUI / TDesign | uni-ui 够用；多一层库就多一份维护成本 |
| uCharts / ECharts / F2 | v1.0 用文字 + CSS 进度条；图表是 v1.1 候选 |
| Vuex | 已废弃，Pinia 是替代 |
| moment.js | 太大（200KB+），dayjs 够了 |
| lodash | 个人项目用不上；需要时单独引入 `lodash-es` 的某个函数 |
| Tailwind / UnoCSS | 5 个页面不值得引原子化 CSS；uni-app 自带 rpx 单位处理移动端适配 |
| Vue Router | uni-app 自带 pages.json 路由 |
| Axios | 纯本地 App，无网络请求 |
| Pinia 持久化插件 | SQLite 本身就是持久层，不需要 pinia-plugin-persistedstate |
| ORM（如 Prisma / TypeORM）| 5 张表直接写 SQL 比 ORM 学习成本低；后期真要换再考虑 |
| TypeORM 装饰器方案 | 跟 uni-app 编译兼容性差 |
| Husky / lint-staged | 个人项目，commit 前手动 lint 即可 |
| CI/CD | 手动构建 + 微信传 APK 即可 |

---

## 4. 项目结构

```
bookkeeping/
├── docs/                          # 已定稿文档
│   └── PRD.md
│
├── memory-bank/                   # 活文档区（AI 协作）
│   ├── design-document.md
│   ├── tech-stack.md              # 本文件
│   ├── implementation-plan.md
│   ├── progress.md
│   └── architecture.md
│
├── src/
│   ├── pages/                     # uni-app 自动路由
│   │   ├── index/                 # Tab 1 Dashboard
│   │   ├── order/                 # Tab 2 订单
│   │   │   ├── list.vue
│   │   │   ├── new.vue            # 新建订单
│   │   │   └── detail.vue
│   │   ├── stats/                 # Tab 3 统计
│   │   └── me/                    # Tab 4 我的
│   │       ├── customers/
│   │       │   ├── list.vue
│   │       │   ├── new.vue
│   │       │   └── detail.vue     # 含开次卡入口
│   │       ├── expenses/
│   │       │   ├── list.vue
│   │       │   └── new.vue
│   │       └── settings/
│   │           ├── backup.vue
│   │           └── categories.vue # 支出分类管理
│   ├── components/                # 跨页复用组件
│   │   ├── AmountInput.vue        # 金额输入（含格式化）
│   │   ├── CustomerPicker.vue     # 客户选择器（搜索 + 新建）
│   │   └── StatCard.vue           # 统计卡片（订单数/收入/支出/利润）
│   ├── stores/                    # Pinia stores（≤ 4 个）
│   │   ├── order.ts
│   │   ├── customer.ts
│   │   ├── expense.ts
│   │   └── stats.ts
│   ├── db/                        # SQLite 数据层
│   │   ├── index.ts               # 连接管理 + 初始化
│   │   ├── schema.ts              # 5 张表 DDL
│   │   ├── migrations.ts          # 版本迁移脚本
│   │   └── seed.ts                # 首次启动种子数据
│   ├── api/                       # 数据访问层（封装的 SQL）
│   │   ├── orders.ts
│   │   ├── customers.ts
│   │   ├── meal-cards.ts
│   │   ├── expenses.ts
│   │   └── stats.ts               # 聚合查询
│   ├── utils/
│   │   ├── date.ts                # dayjs 封装
│   │   ├── format.ts              # 金额 / 百分比
│   │   └── backup.ts              # JSON 导入导出
│   ├── types/                     # 共享 TS 类型
│   │   ├── domain.ts              # Customer / Order / MealCard / Expense
│   │   └── api.ts                 # 入参出参
│   ├── App.vue
│   └── main.ts
│
├── pages.json                     # uni-app 路由配置
├── manifest.json                  # Android 包名 / 图标 / 权限
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
└── README.md
```

---

## 5. 关键依赖清单

### `package.json`（核心）

```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "pinia": "^2.1.0",
    "dayjs": "^1.11.10",
    "@dcloudio/uni-app": "latest",
    "@dcloudio/uni-ui": "latest"
  },
  "devDependencies": {
    "@dcloudio/vite-plugin-uni": "latest",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "vue-tsc": "^1.8.0",
    "@types/node": "^20.0.0",
    "eslint": "^8.55.0",
    "@vue/eslint-config-typescript": "^13.0.0",
    "prettier": "^3.1.0"
  }
}
```

> 注：uni-app 系列包的具体版本以 `npx degit dcloudio/uni-preset-vue#vite` 模板里的为准，跟随官方升级。

---

## 6. 数据层设计要点

### 6.1 启动时序

```
App 启动
   ↓
plus.sqlite 打开/创建数据库文件 `bookkeeping.db`
   ↓
读 PRAGMA user_version（数据库 schema 版本）
   ↓
对照当前代码期望版本（from schema.ts）
   ↓
若 user_version < 期望版本：顺序执行 migrations
   ↓
首次启动：执行 seed（插入默认支出分类）
   ↓
写 PRAGMA user_version = 期望版本
```

### 6.2 事务包裹

**所有"创建订单 / 标记已配送 / 取消订单 / 开次卡"**等涉及多表写入的流程必须用 `BEGIN ... COMMIT` 包裹，防止部分写入导致数据错乱。

伪代码：
```ts
// db/index.ts
export function tx<T>(fn: () => T): T {
  plus.sqlite.executeSql({ sql: 'BEGIN' })
  try {
    const result = fn()
    plus.sqlite.executeSql({ sql: 'COMMIT' })
    return result
  } catch (e) {
    plus.sqlite.executeSql({ sql: 'ROLLBACK' })
    throw e
  }
}
```

### 6.3 查询层

- **轻量查询直接用 SQL**（5 张表不多，ORM 没必要）
- **类型安全**：在 `api/*.ts` 顶部定义 `interface`，每个查询返回类型用 `as` 断言
- **聚合查询**（统计页）放 `api/stats.ts`，独立维护

### 6.4 不做软删除

v1.0 一律硬删除。软删除增加复杂度（所有查询要带 `WHERE deleted_at IS NULL`），单设备单用户场景不需要。

---

## 7. 状态管理要点

### 7.1 Pinia Store 设计原则

| Store | 管什么 | 不管什么 |
|---|---|---|
| `order` | 当前选中的日期筛选、订单列表缓存 | 订单的 SQL 写入（写到 api 层） |
| `customer` | 客户列表缓存、最近选中的客户 | 客户的 SQL 写入 |
| `expense` | 支出列表缓存、当前筛选 | 支出的 SQL 写入 |
| `stats` | 当前统计范围、统计数据 | 聚合查询 SQL |

**核心规则**：Pinia 是"当前视图的数据缓存"，**SQLite 是唯一真实数据源**。

### 7.2 不引入持久化插件

`pinia-plugin-persistedstate` 看似方便，但会让"数据到底在哪"产生混淆。本项目里 SQLite 才是真相，Pinia 只缓存当前 view 所需的数据，无需持久化。

---

## 8. 开发工作流

### 8.1 常用命令

```bash
# 一次性初始化（从 uni-app 模板）
npx degit dcloudio/uni-preset-vue#vite bookkeeping
cd bookkeeping
pnpm install

# 开发（连真机或模拟器）
pnpm dev:app-android

# 打包 Debug APK（自己能跑、不能上架）
pnpm build:app-android

# 打包 Release APK（自签名，侧载）
pnpm build:app-android:release

# Lint + Format
pnpm lint
pnpm format
```

> 注：以上 dev/build 命令需要在 `package.json` 的 `scripts` 里配置。`npx degit` 拉下来的模板已含基础 scripts，需要按需调整。

### 8.2 真机调试流程

1. Android 手机开启"开发者选项" + "USB 调试"
2. USB 连电脑
3. 运行 `pnpm dev:app-android`
4. uni-app 会把编译后的 H5 包推到手机浏览器 / 内置基座
5. 改代码 → 自动热更新

### 8.3 构建 Release APK

1. 准备签名：用 HBuilderX 或 `keytool` 生成 `.keystore` 文件（一次性）
2. `manifest.json` 填入证书信息
3. `pnpm build:app-android:release`
4. 产物在 `dist/build/app-plus/release/` 下，文件名 `app-release.apk`
5. 微信"文件传输助手"传到手机安装

---

## 9. 健壮性保障（不复杂但关键）

| 项 | 措施 | 投入 |
|---|---|---|
| 数据写入原子性 | 关键操作全用 `tx()` 包裹 | 1 个工具函数 |
| 备份提醒 | 每周首次启动时弹"建议导出 JSON" | 几行代码 |
| 启动时 schema 升级 | `migrations.ts` 顺序执行 + user_version | ~30 行 |
| 低版本 Android 兼容 | uni-app 自带；manfest.json 配 `minSdkVersion: 21` | 1 行 |
| 大数据量性能 | 5 张表加好索引，订单 < 5W 行无压力 | 已在 design doc 写好 |
| 异常提示 | 关键错误 toast + 日志到 `plus.console` | 几行 |

---

## 10. 演进路径

| 阶段 | 增量 |
|---|---|
| **v1.0** | 当前 stack 不变 |
| **v1.1** | 加 uCharts 图表、CSV 导出、订单备注模板 |
| **v1.2** | 局域网 HTTP 同步时，加 axios（极小依赖）|
| **v2.0** | 如果要做 H5/iOS，uni-app 直接编译；不用换栈 |

> **栈稳定性**：v1.0 → v2.0 整条路线，框架（uni-app）、状态（Pinia）、数据库（plus.sqlite）都不需要换。增加的都是"附加依赖"（uCharts、axios），不影响主结构。

---

## 11. 决策记录

| # | 选择 | 替代方案 | 为什么这么选 |
|---|---|---|---|
| 1 | uni-app Vue 3 + Vite | Capacitor / Taro / RN | 你的栈；CLI 友好 |
| 2 | TypeScript | JavaScript | 5 张表 + 状态机值得 TS |
| 3 | Pinia | Vuex | Vue 3 标配 |
| 4 | uni-ui | uView Plus / NutUI | 官方、轻量、够用 |
| 5 | plus.sqlite | Capacitor SQLite 插件 / wxSQLite | uni-app 内置无依赖 |
| 6 | dayjs | moment / date-fns | 7KB vs 200KB |
| 7 | pnpm | npm / yarn | 速度快、磁盘省 |
| 8 | 不用图标库 | uView Plus 自带 / iconfont | emoji 够用，0 依赖 |
| 9 | 不用图表库 | uCharts / F2 | v1.0 文字+CSS 即可 |
| 10 | 不用 ORM | Prisma / TypeORM | 5 张表写 SQL 简单 |
| 11 | 不用单测 | vitest | v1.0 5 页手测覆盖 |
| 12 | 不用 CI/CD | GitHub Actions | 手动构建 + 微信传 APK |

---

## 12. 第一次跑起来要做的 5 件事

1. `npx degit dcloudio/uni-preset-vue#vite` 起项目
2. `pnpm install` 装依赖
3. `pnpm dev:app-android` 跑起来（确认 HBuilderX 不需要也能用）
4. 写 `db/schema.ts` 5 张表 DDL + `db/index.ts` 初始化
5. 写一个最简 Dashboard 页（显示 hardcoded 数字）确认 Vue 3 + TS 编译通过
