# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：Phase 5 Pinia Stores 完成，等待用户验证；验证通过后再进入 Phase 6 通用 UI 组件
- **已建文件**：`docs/PRD.md`、`CLAUDE.md`、`AGENTS.md`、`memory-bank/` 活文档、uni-app Vue 3 + Vite + TS 模板、5 张表 DDL + 迁移 + seed + tx() 工具、domain/api 类型、日期/金额工具、完整 API 层、4 个 Pinia store
- **DB 状态**：v0 基线已存（`memory-bank/bookkeeping-v0.db`，CLI sqlite smoke-test 生成）；真机 DB 已拉取到 `memory-bank/bookkeeping-real.db`，业务表齐全、默认分类 5 行、`user_version=1`
- **最后更新**：2026-06-11

---

## 编译工具链（重要 — 2026-06-10 调整）

> **CLI 模式（`pnpm dev:app-android`）不能编译 SQLite 原生模块**。`plus.sqlite` 的 JS 表面存在但底层是空壳，openDatabase 同步返回 undefined 且 callback 静默不触发。
> **必须用 HBuilderX 编译**才能把 SQLite 原生模块链进 APK。

| 任务 | 用什么 |
|---|---|
| 写代码 / TS 类型检查 / lint | CLI：`pnpm type-check` / `pnpm lint` |
| 跑 h5 编译验证 | CLI：`pnpm build:h5` / `pnpm dev:h5`；**Phase 5 起若坚持使用 HBuilderX 内置 Pinia 且不手动安装 npm `pinia`，CLI H5 构建会找不到 `pinia/dist/pinia.mjs`，本阶段以 type-check / lint + HBuilderX 真机验证为准** |
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
| `memory-bank/DEBUG-HANDOFF.md` | 调试交接文档（sqlite 在 HBuilderX 标准版基座下不工作） | 阶段性快照 / 跨 AI 交接时 |
| `memory-bank/*.db` | DB 备份（v0 基线、v1 发布版等） | 阶段性快照 |

---

## src/ — 应用代码

### 入口与配置

| 文件 | 作用 |
|---|---|
| `src/main.ts` | App 入口；导出 `createApp()`（Vue 3 SSR 工厂）装载 `App.vue`；按 uni-app Pinia 文档 `import * as Pinia from 'pinia'`，`app.use(Pinia.createPinia())`，并从 `createApp()` 返回 `Pinia`。Pinia 由 HBuilderX / uni-app 内置提供，不在 `package.json` 手动安装。 |
| `src/App.vue` | 根组件；处理 uni-app 全局生命周期 `onLaunch` / `onShow` / `onHide`；`onLaunch` 调 `db.init()` 并在失败时 toast 提示 |
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
| `src/stores/customer.ts` | 客户 store：state 为 `list: Customer[]` / `loading`；getter `byId(id)`；actions `refresh()` / `create(input)` / `update(id, input)` / `remove(id)`。写操作走 `api/customers.ts` 后自动刷新列表，Pinia 只缓存当前视图数据。 |
| `src/stores/order.ts` | 订单 store：state 为 `list: Order[]` / `currentDate`（默认 `today()`）/ `loading`；actions `setDate(date)` / `refreshForDate(date)` / `create(input)` / `markDelivered(id)` / `cancel(id)`。写操作走 `api/orders.ts` 后刷新当前日期；`InsufficientCardError` / `AlreadyDeliveredError` 不在 store 层吞掉。 |
| `src/stores/expense.ts` | 支出 store：state 为 `list: Expense[]` / `categories: ExpenseCategory[]` / `currentDate` / `loading`；actions `refreshForDate(date)` / `refreshCategories()` / `create(input)` / `remove(id)`。分类只读，支出写操作后刷新当前日期列表。 |
| `src/stores/stats.ts` | 统计 store：state 为 `summary: StatsSummary \| null` / `trend` / `breakdown` / `range` / `loading`；actions `refreshSummary(date)` / `refreshRange({ start, end })`。区间刷新同时调用 `getRangeSummary`、`getDailyTrend`、`getCategoryBreakdown`。 |

### db/ — SQLite 数据层

| 文件 | 作用 |
|---|---|
| `src/db/schema.ts` | 5 张表 DDL 字符串（`SCHEMA_CUSTOMERS` / `SCHEMA_MEAL_CARDS` / `SCHEMA_ORDERS` / `SCHEMA_EXPENSE_CATEGORIES` / `SCHEMA_EXPENSES`）+ `CURRENT_SCHEMA_VERSION`。字段 / 索引 / CHECK 约束严格对齐 `design-document.md §2.1`，**`meal_cards` 表无 end_date**。 |
| `src/db/migrations.ts` | 迁移引擎：`MIGRATIONS` 数组（每项一段可独立 SQL）/ `getCurrentVersion()`（读 PRAGMA user_version）/ `setVersion(v)` / `runMigrations()`（从 current 到 MIGRATIONS.length 顺序执行）。**改字段必须新加一段**，不在原段改。 |
| `src/db/seed.ts` | 首次启动 seed：`seedIfEmpty()` 写入 5 个默认支出分类（菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰），is_default=1。仅在 `expense_categories` 行数为 0 时插入，不强制覆盖用户数据。 |
| `src/db/index.ts` | 数据层入口：`init()` 启动序列（openDatabase → PRAGMA foreign_keys=ON → runMigrations → seedIfEmpty，逐步 await）/ `close()` / `tx<T>(fn)`（用 5+ `transaction` 的 begin/commit/rollback 包裹 + 嵌套防护）/ `exec()` / `select()`。5+ 官方 `executeSql` 不支持 args 数组，参数在本文件统一转义；`pify()` 动态调用 SQLite 方法时必须用 `fn.call(sqlite, options)` 保留 `this`；callback 静默不返回时 8 秒超时报错，便于识别 native bridge 缺失。**所有多表写入**（建单 / 取消 / 配送 / 开次卡）必须走 `tx()`。 |

### api/ — 数据访问

| 文件 | 作用 |
|---|---|
| `src/api/customers.ts` | customers 表 CRUD：`listCustomers()` / `getCustomer(id)` / `createCustomer(input)` / `updateCustomer(id, input)` / `deleteCustomer(id)`。`createCustomer` 与 `updateCustomer` 返回最新客户记录；`deleteCustomer` 在客户存在次卡或订单依赖时返回 `false` 并保留数据，避免外键失败。 |
| `src/api/meal-cards.ts` | meal_cards 表基础 API：`getActiveCard(customerId): Promise<MealCardResult \| null>` / `listCards(customerId): Promise<MealCardResult[]>` / `openCard(input: OpenMealCardInput): Promise<MealCardResult>` / `getCard(id): Promise<MealCardResult \| null>`。`openCard` 用 `tx()` 包裹，写入 `used_meals=0`、`status='active'`。 |
| `src/api/orders.ts` | orders 表与订单流程 API：`listOrders(input: ListOrdersInput): Promise<OrderResult[]>` / `getOrder(id): Promise<OrderResult \| null>` / `createOrder(input: CreateOrderInput): Promise<OrderResult>` / `updateOrderStatus(id, status): Promise<OrderResult \| null>` / `updateOrderPayment(id, input): Promise<OrderResult \| null>` / `markDelivered(orderId): Promise<OrderResult>` / `cancelOrder(orderId): Promise<OrderResult \| null>`。`createOrder` 不扣次卡；`markDelivered` 在配送完成时扣次并在不足时回滚；`cancelOrder` 不返还次卡次。 |
| `src/api/errors.ts` | API 层业务异常：`InsufficientCardError`（次卡次数不足，供配送异常分支捕获）/ `AlreadyDeliveredError`（已配送订单禁止取消）。 |
| `src/api/expense-categories.ts` | expense_categories 只读 API：`listCategories(): Promise<ExpenseCategoryResult[]>` / `getCategory(id): Promise<ExpenseCategoryResult \| null>`。v1.0 不暴露分类增删改。 |
| `src/api/expenses.ts` | expenses 表 CRUD：`listExpenses(input: ListExpensesInput): Promise<ExpenseResult[]>` / `getExpense(id): Promise<ExpenseResult \| null>` / `createExpense(input: CreateExpenseInput): Promise<ExpenseResult>` / `deleteExpense(id): Promise<boolean>`。`createExpense` 用 `tx()` 包裹，`amount <= 0` 按 v1.0 约定拒绝。 |
| `src/api/stats.ts` | 统计聚合 API：`getDashboardSummary(date): Promise<StatsSummary>` / `getRangeSummary(input: DateRangeInput): Promise<StatsSummary>` / `getDailyTrend(input: DateRangeInput): Promise<DailyTrendPoint[]>` / `getCategoryBreakdown(input: DateRangeInput): Promise<CategoryBreakdown[]>`。收入口径 = 非 cancelled 订单金额 + 开次卡金额；支出口径 = expenses 金额；利润 = 收入 - 支出。 |

### utils/ — 工具函数

| 文件 | 作用 |
|---|---|
| `src/utils/date.ts` | dayjs 本地时区日期工具：`today()` 返回 `YYYY-MM-DD`；`weekRange(d)` 返回自然周周一到周日；`monthRange(d)` 返回自然月 1 号到月底；`formatDate(d)` 按当前年份显示 `MM-DD` 或 `YYYY-MM-DD`；`daysBetween(a, b)` 返回自然日整数差。 |
| `src/utils/format.ts` | 金额/百分比格式化工具：`formatMoney(n)` 输出 `¥1,234.50`（空值/非法值为 `¥—`）；`parseMoney(s)` 接受普通数字、`¥`、`￥`、千分位并解析为 number（非法为 0）；`formatPercent(n)` 四舍五入输出整数百分比。 |
| _（待 Phase 7.18 填写）_ | _`backup.ts`（JSON 导入导出）按设置页备份/恢复步骤再实现_ |

### types/ — TS 类型

| 文件 | 作用 |
|---|---|
| `src/types/domain.ts` | 与 schema snake_case 字段严格对齐的核心领域类型：`Customer` / `MealCard` / `Order` / `ExpenseCategory` / `Expense`，以及枚举联合类型 `MealType` / `PaymentMethod` / `OrderStatus` / `MealCardStatus`。可空 DB 字段统一为 `T \| null`。 |
| `src/types/api.ts` | 后续 API 层复用的入参/出参契约：客户创建/更新、开次卡、订单创建/支付方式更新/列表筛选、支出创建/筛选、统计范围、`StatsSummary` / `DailyTrendPoint` / `CategoryBreakdown` 等。仅定义类型，不实现 Phase 4 API。 |
| `src/types/pinia.d.ts` | 本地类型声明：在不手动安装 npm `pinia` 的前提下，让 `vue-tsc` 能识别 uni-app/HBuilderX 内置 Pinia 的 `createPinia` / `defineStore`。仅提供类型，不提供运行时代码。 |

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
| `memory-bank/bookkeeping-real.db` | 2026-06-11 Step 2.6；HBuilderX / Android 真机启动后从 `_doc/bookkeeping.db` 拉取 | 真实运行环境基线；已验证 5 张业务表、5 个默认分类、`user_version=1` |

---

## 外部依赖（package.json 当前）

| 依赖 | 用途 | 版本 |
|---|---|---|
| `@dcloudio/uni-app` 等 uni-* | uni-app 框架 | `3.0.0-4080420251103001` |
| `vue` | Vue 3 | `^3.4.21`（实际 3.5.x） |
| `vue-i18n` | 模板自带；v1.0 不用 | `^9.1.9` |
| `dayjs` | 日期工具；用于自然日/自然周/自然月计算 | `^1.11.21` |
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

> **未装**（按 plan 留到对应步骤）：`@dcloudio/uni-ui`（按需）。`pinia` 按用户要求使用 uni-app/HBuilderX 内置版本，不写入 `package.json`。

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
- 2026-06-10：Phase 2 数据层 5/6 代码就位 — `src/db/{schema,migrations,seed,index}.ts` + `App.vue` 触发 `dbInit()`；v0 DB 基线存 `memory-bank/bookkeeping-v0.db`（SQL smoke-test 通过：5 表 / 5 分类 / 10 索引 / user_version=1）；Step 2.6 真机落盘验证未完成
- 2026-06-11：Phase 2 Step 2.6 调试修正 — 按官方 5+ SQLite API 修复 `db/index.ts`：补齐 `await runMigrations()` / `await seedIfEmpty()`，`tx()` 改为 begin/commit/rollback，移除官方不支持的 args 透传并集中转义，增加 callback 超时诊断；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；当时等待真机落盘验证，后续已通过
- 2026-06-11：按用户提供的掘金 SQLite 封装文章对照，修复 `pify()` 动态方法调用丢失 `this` 的问题（改用 `fn.call(sqlite, options)`），该问题与 `this.getCallbackIDByFunction is not a function` 报错吻合；本地三项验证通过，后续真机复测通过
- 2026-06-11：Step 2.6 真机落盘验证通过 — `memory-bank/bookkeeping-real.db` 已生成并可被 sqlite3 打开，业务表齐全、默认分类 5 行、`user_version=1`；Phase 2 数据层完成
- 2026-06-11：Phase 3 类型与工具完成 — 新增 `src/types/domain.ts` / `src/types/api.ts` / `src/utils/date.ts` / `src/utils/format.ts`，安装 `dayjs`；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；按用户要求，等待验证后再进入 Phase 4
- 2026-06-11：Phase 4 Step 4.1 customers API 完成 — 新增 `src/api/customers.ts`，实现客户 CRUD；删除客户时检查次卡和订单依赖，命中则返回 `false`；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock smoke test 通过
- 2026-06-11：Phase 4 Step 4.2-4.8 API 层完成 — 新增 `src/api/meal-cards.ts` / `src/api/orders.ts` / `src/api/errors.ts` / `src/api/expense-categories.ts` / `src/api/expenses.ts` / `src/api/stats.ts`；实现次卡、订单配送扣次、订单取消、支出分类读取、支出 CRUD 和统计聚合；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock 端到端 smoke test 通过；等待用户验证后再进入 Phase 5
- 2026-06-11：Phase 5 Pinia Stores 完成 — 按 uni-app 官方文档使用内置 Pinia，清除手动安装的 `pinia` / `@vue/devtools-*` 依赖；`src/main.ts` 使用 `Pinia.createPinia()` 并返回 `Pinia`；新增 `src/types/pinia.d.ts` 供本地 TS 检查；新增 `src/stores/customer.ts` / `src/stores/order.ts` / `src/stores/expense.ts` / `src/stores/stats.ts`，store 只做视图缓存和 action 编排，写入仍走 API 层；`src/api/stats.ts` 导出 `getRangeSummary` 供 stats store 复用。`pnpm type-check` / `pnpm lint` 通过；零手动 Pinia 依赖下 CLI H5 构建失败，需用 HBuilderX 内置 Pinia 验证。
