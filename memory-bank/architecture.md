# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：Phase 2 代码已就位，等待 HBuilderX 真机验证
- **已建文件**：`docs/PRD.md`、`CLAUDE.md`、`memory-bank/` 5 份活文档、uni-app Vue 3 + Vite + TS 模板、5 张表 DDL + 迁移 + seed + tx() 工具
- **DB 状态**：v0 基线已存（`memory-bank/bookkeeping-v0.db`，CLI sqlite smoke-test 生成）；HBuilderX 真机跑通后应 adb pull 覆盖
- **最后更新**：2026-06-10

---

## 编译工具链（重要 — 2026-06-10 调整）

> **CLI 模式（`pnpm dev:app-android`）不能编译 SQLite 原生模块**。`plus.sqlite` 的 JS 表面存在但底层是空壳，openDatabase 同步返回 undefined 且 callback 静默不触发。
> **必须用 HBuilderX 编译**才能把 SQLite 原生模块链进 APK。

| 任务 | 用什么 |
|---|---|
| 写代码 / TS 类型检查 / lint | CLI：`pnpm type-check` / `pnpm lint` |
| 跑 h5 编译验证 | CLI：`pnpm build:h5` / `pnpm dev:h5` |
| **真机调试 Android** | **HBuilderX**："运行 → 运行到 Android App 基座" |
| Release APK | HBuilderX："发行 → 原生 App-云打包"或"本地打包" |

**HBuilderX 关键配置**（第一次必做）：
- `src/manifest.json` 可视化编辑 → 「App 原生插件配置」 → 勾选 **「SQLite(数据库)」** 模块
- `工具 → 设置 → 运行配置 → Android 证书` → 生成自签名调试证书

**为什么 plan 反对 HBuilderX 但又必须用？**
- plan §3 反选清单里"不引 HBuilderX"指的是不用 HBuilderX 替代 VSCode 做 IDE（写代码仍用 VSCode）
- 但编译侧链 + 原生模块勾选 **只有 HBuilderX 能做**（uni-app 官方不发布 npm 版的 sqlite 模块）
- 解法：VSCode 写代码 + HBuilderX 编译验证，各取所长

---

## 顶层文件

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `CLAUDE.md` | Claude Code 入口；项目概述 + 关键设计约束 + 写代码约定 | 极少更新（约束类） |
| `docs/PRD.md` | 已定稿的产品需求基线（不改动） | 永不更新 |
| `docs/` | 仅存 PRD.md（已定稿文档目录） | — |
| `.gitignore` | git 忽略规则（node_modules、dist、IDE 文件等） | 加新忽略项时 |
| `index.html` | Vite H5 入口 HTML；`<script type="module" src="/src/main.ts">` | 几乎不改 |
| `package.json` | 项目元数据 + scripts（dev / build / lint / format / type-check） | 加新脚本/依赖时 |
| `pnpm-lock.yaml` | pnpm 锁定文件（**不要**手动编辑） | pnpm install 后自动 |
| `tsconfig.json` | TypeScript 配置；extends `@vue/tsconfig`，加 3 个 strict 选项 | 调整严格度时 |
| `vite.config.ts` | Vite 配置；只注册 `uni()` 插件 | 加 Vite 插件时 |
| `.eslintrc.cjs` | ESLint 配置：vue3 + ts + prettier；`src/pages/**` 关闭多字命名 | 改 lint 规则时 |
| `.prettierrc` | Prettier 配置：无分号 / 单引号 / 宽度 100 | 改格式时 |
| `node_modules/` | 依赖安装目录（git 忽略） | pnpm install 后 |

---

## memory-bank/ — 活文档区（AI 协作）

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `memory-bank/design-document.md` | 产品设计文档：数据模型、状态机、关键流程、UI 草图、TBD 清单 | 决策变更时（如 A1→A2） |
| `memory-bank/tech-stack.md` | 技术选型 + 明确不引入项 + 演进路径 | 选型变更时 |
| `memory-bank/implementation-plan.md` | 分步实施计划（63 步，9 阶段） | 计划调整时（极少） |
| `memory-bank/progress.md` | 实施进度（按 implementation-plan.md 步骤打勾） | 每完成一步 |
| `memory-bank/architecture.md` | **本文件**：每个代码文件的作用说明 | 每个文件新建/删除/职责变化时 |
| `memory-bank/*.db` | DB 备份（v0 基线、v1 发布版等） | 阶段性快照 |

---

## src/ — 应用代码

### 入口与配置

| 文件 | 作用 |
|---|---|
| `src/main.ts` | App 入口；导出 `createApp()`（Vue 3 SSR 工厂）装载 `App.vue` |
| `src/App.vue` | 根组件；处理 uni-app 全局生命周期 `onLaunch` / `onShow` / `onHide`；**后续 Phase 2.5 在 `onLaunch` 调 `db.init()`** |
| `src/env.d.ts` | Vite 客户端类型（`/// <reference types="vite/client" />`）|
| `src/manifest.json` | uni-app App 元数据：`name=盒记` / `appid=com.bookkeeping.app` / Android `minSdkVersion=21` `targetSdkVersion=30` |
| `src/pages.json` | uni-app 路由 + 全局样式 + `tabBar`（4 个 Tab：今日 / 订单 / 统计 / 我的） |
| `src/uni.scss` | uni-app 全局 SCSS 变量（rpx 换算等）|
| `src/shime-uni.d.ts` | 扩展 Vue `ComponentCustomOptions` 加上 uni-app 的 App/Page 实例类型（**注：文件名是模板的拼写，保留不修**） |
| `src/static/` | 静态资源（默认有 `logo.png`）|

### pages/ — 页面（uni-app 自动路由；当前 4 个 Tab 占位）

| 文件 | 作用 |
|---|---|
| `src/pages/index/index.vue` | Tab 1「今日」Dashboard（占位；Phase 7 Step 7.1-7.2 真实实现）|
| `src/pages/order/index.vue` | Tab 2「订单」列表（占位；Phase 7 Step 7.3+ 真实实现）|
| `src/pages/stats/index.vue` | Tab 3「统计」（占位；Phase 7 Step 7.9-7.10 真实实现）|
| `src/pages/me/index.vue` | Tab 4「我的」（占位；Phase 7 Step 7.11+ 真实实现）|

### components/ — 跨页组件

| 文件 | 作用 |
|---|---|
| `src/components/.gitkeep` | 占位文件，让空目录被 git 跟踪 |
| _（待 Phase 6 填写）_ | _Phase 6 计划：`AmountInput.vue` / `CustomerPicker.vue` / `StatCard.vue`_ |

### stores/ — Pinia 状态

| 文件 | 作用 |
|---|---|
| _（空目录；Phase 5 填）_ | _Phase 5 计划：`order.ts` / `customer.ts` / `expense.ts` / `stats.ts`（≤ 4 个）_ |

### db/ — SQLite 数据层

| 文件 | 作用 |
|---|---|
| `src/db/schema.ts` | 5 张表 DDL 字符串（`SCHEMA_CUSTOMERS` / `SCHEMA_MEAL_CARDS` / `SCHEMA_ORDERS` / `SCHEMA_EXPENSE_CATEGORIES` / `SCHEMA_EXPENSES`）+ `CURRENT_SCHEMA_VERSION`。字段 / 索引 / CHECK 约束严格对齐 `design-document.md §2.1`，**`meal_cards` 表无 end_date**。 |
| `src/db/migrations.ts` | 迁移引擎：`MIGRATIONS` 数组（每项一段可独立 SQL）/ `getCurrentVersion()`（读 PRAGMA user_version）/ `setVersion(v)` / `runMigrations()`（从 current 到 MIGRATIONS.length 顺序执行）。**改字段必须新加一段**，不在原段改。 |
| `src/db/seed.ts` | 首次启动 seed：`seedIfEmpty()` 写入 5 个默认支出分类（菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰），is_default=1。仅在 `expense_categories` 行数为 0 时插入，不强制覆盖用户数据。 |
| `src/db/index.ts` | 数据层入口：`init()` 启动序列（openDatabase → PRAGMA foreign_keys=ON → runMigrations → seedIfEmpty，单例幂等）/ `getDb()`（取单例）/ `close()` / `tx<T>(fn)`（事务包裹 + 嵌套防护）。**所有多表写入**（建单 / 取消 / 配送 / 开次卡）必须走 `tx()`。 |

### api/ — 数据访问

| 文件 | 作用 |
|---|---|
| _（空目录；Phase 4 填）_ | _Phase 4 计划：`customers.ts` / `meal-cards.ts` / `orders.ts` / `expenses.ts` / `expense-categories.ts` / `stats.ts`_ |

### utils/ — 工具函数

| 文件 | 作用 |
|---|---|
| _（空目录；Phase 3 填）_ | _Phase 3 计划：`date.ts`（dayjs 封装）/ `format.ts`（金额格式化）/ `backup.ts`（JSON 导入导出）_ |

### types/ — TS 类型

| 文件 | 作用 |
|---|---|
| _（空目录；Phase 3 填）_ | _Phase 3 计划：`domain.ts`（5 个核心 interface）/ `api.ts`（入参出参）_ |

---

## 关键架构决策

| 决策 | 位置 | 影响范围 |
|---|---|---|
| 5 张表结构 | `memory-bank/design-document.md §2.1` | 所有 db / api / store |
| 次卡扣次 = 配送完成（A1） | `memory-bank/design-document.md §3.2 §4.3` | orders API、UI 流程 |
| 客户默认价 + 折扣率（A6） | `memory-bank/design-document.md §2.1 §4.1` | customers API、订单录入 UI |
| 1 订单 = 1 餐 + 多份（D1） | `memory-bank/design-document.md §2.1` | orders schema |
| 不收配送费（D4） | `memory-bank/design-document.md §2.1` | 不存在 delivery_fee 字段 |
| 次卡按"次"无有效期 | `memory-bank/design-document.md §2.1 §3.2` | meal_cards 无 end_date / expired 状态 |
| SQLite 是唯一数据源 | `memory-bank/tech-stack.md §7` | 不引 pinia 持久化插件 |
| 多表写入必走 tx() | `memory-bank/design-document.md §4` | db/index.ts 提供 tx() 工具 |
| PRAGMA foreign_keys = ON | db/index.ts init() | 维护 customer_id / meal_card_id / category_id 外键完整性 |
| `user_version` 驱动迁移 | db/migrations.ts | 首次建表=v1；未来加字段在 MIGRATIONS 末尾追加 |

## DB 备份

| 文件 | 来源 | 用途 |
|---|---|---|
| `memory-bank/bookkeeping-v0.db` | 2026-06-10 Phase 2.6；用 `sqlite3` CLI 跑 schema DDL + seed 生成的"等价基线"（**非**真机 DB） | 后续步骤的 DB 形状参照；真机 adb pull 后**应覆盖**此文件 |

---

## 外部依赖（package.json 当前）

| 依赖 | 用途 | 版本 |
|---|---|---|
| `@dcloudio/uni-app` 等 uni-* | uni-app 框架 | `3.0.0-4080420251103001` |
| `vue` | Vue 3 | `^3.4.21`（实际 3.5.x） |
| `vue-i18n` | 模板自带；v1.0 不用 | `^9.1.9` |
| `@dcloudio/vite-plugin-uni` | uni-app Vite 插件 | `3.0.0-4080420251103001` |
| `vite` | 构建工具 | `5.2.8` |
| `typescript` | TS 编译器 | `^4.9.4`（实际 4.9.5） |
| `vue-tsc` | Vue + TS 类型检查 | `^1.0.24`（实际 1.8.27） |
| `@vue/tsconfig` | Vue 3 推荐的 tsconfig 基线 | `^0.1.3` |
| `@dcloudio/types` | uni-app 全局类型 | `^3.4.8` |
| `eslint` | JS/TS lint | `^8.57.1` |
| `eslint-plugin-vue` | Vue 文件 lint | `^9.33.0` |
| `@vue/eslint-config-typescript` | TS + Vue 组合规则 | `^13.0.0` |
| `prettier` | 代码格式化 | `^3.8.4` |
| `eslint-config-prettier` | 关掉与 prettier 冲突的 lint 规则 | `^9.1.2` |

> **未装**（按 plan 留到对应步骤）：`pinia`（Phase 5）、`dayjs`（Phase 3）、`@dcloudio/uni-ui`（按需）

---

## 工具脚本（pnpm scripts）

| 命令 | 作用 |
|---|---|
| `pnpm dev:app-android` | Android 真机/模拟器开发（热更新）；模板自带 |
| `pnpm dev:h5` | H5 开发；用于无 Android 环境时验证编译 |
| `pnpm build:h5` | H5 构建；Phase 1 验证用 |
| `pnpm type-check` | `vue-tsc --noEmit` 类型检查（无产物） |
| `pnpm lint` | `eslint --ext .ts,.vue src/` |
| `pnpm format` | `prettier --write` 自动格式化 |

---

## 更新日志

- 2026-06-10：初始创建（仅文档阶段，src/ 全空）
- 2026-06-10：Phase 1 脚手架 8/8 完成 — 补全所有顶层文件、src/ 入口、4 个 Tab 占位、版本快照、文件级作用说明
- 2026-06-10：Phase 2 数据层 6/6 完成 — `src/db/{schema,migrations,seed,index}.ts` + `App.vue` 触发 `dbInit()`；v0 DB 基线存 `memory-bank/bookkeeping-v0.db`（SQL smoke-test 通过：5 表 / 5 分类 / 10 索引 / user_version=1）
