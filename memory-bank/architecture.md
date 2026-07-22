# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：**v1.0 已发布**（Phase 1-9 全部完成；9.3 / 9.4 按用户决策跳过，用 HBuilderX 标准基座 debug APK 侧载；CHANGELOG.md v1.0 节已写好）
- **已建文件**：`docs/archive/PRD-v1.0.md`、`CLAUDE.md`、`AGENTS.md`、`memory-bank/` 活文档、uni-app Vue 3 + Vite + TS 模板、6 张表 DDL + 迁移 + seed + integrity_check + tx() 工具、domain/api 类型、日期/金额/页面/备份工具、完整 API 层、4 个 Pinia store、3 个通用 UI 组件、uni-ui 表单组件、4 个 Tab 与关键子页、App.vue 全局 onError 兜底
- **DB 状态**：v0 基线（`memory-bank/bookkeeping-v0.db`，CLI sqlite smoke-test 生成）；v1 阶段基线（`memory-bank/bookkeeping-v1.db`，Phase 8 真机 E2E 通过后归档，`user_version=1`）；当前 schema 版本为 5，`orders.meal_card_quantity` 支持组合支付与 pending 次卡预占，v4 → v5 真机迁移待回归
- **最后更新**：2026-07-22

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
| `docs/archive/PRD-v1.0.md` | v1.0 产品需求基线（已定稿，不修改；存于 archive/ 留作历史参考） | 永不更新 |
| `docs/` | `archive/` 保留历史基线；`superpowers/specs/` 保留已批准的增量功能设计 | 新增/归档设计文档时 |
| `docs/superpowers/specs/2026-07-14-meal-card-recharge-records-design.md` | 次卡充值记录入口与总次数校正的已批准设计、数据边界和验收标准 | 该功能设计变更时 |
| `docs/superpowers/specs/2026-07-14-customer-picker-pinyin-sort-design.md` | CustomerPicker 按客户姓名拼音分组并支持右侧索引跳转的已批准设计与验收标准 | 该分组索引行为变更时 |
| `docs/superpowers/specs/2026-07-22-customer-picker-form-label-design.md` | CustomerPicker 的字段标签归属、调用页统一表单标签与验收标准 | 该标签归属或调用方式变更时 |
| `docs/superpowers/specs/2026-07-14-customer-card-avatar-label-design.md` | 客户列表头像按当前可用次卡显示“次 / 普”的已批准设计与验收标准 | 该身份判定或展示变更时 |
| `docs/superpowers/specs/2026-07-22-combined-payment-single-order-design.md` | 一餐一单、组合支付、次卡预占、合并改单价确认、schema v5 与备份兼容的已批准设计 | 该订单支付 / 合并规则变更时 |
| `.gitignore` | git 忽略规则（node_modules、dist、IDE 文件等） | 加新忽略项时 |
| `index.html` | Vite H5 入口 HTML；`<script type="module" src="/src/main.ts">` | 几乎不改 |
| `package.json` | 项目元数据 + scripts（dev / build / test / lint / format / type-check） | 加新脚本/依赖时 |
| `tests/db-transaction.test.cjs` | Node 内置测试：验证单一 SQLite 连接上的并发顶层事务必须串行，防止双击建单 / 配送交错写入 | `tx()` 并发边界变化时 |
| `tests/order-rules.test.cjs` | Node 内置测试：覆盖次卡不足、纯 / 组合支付金额、非法次卡次数、备注去重、支付冲突和合并改单价预览 | 订单规则变化时 |
| `tests/schema-v5.test.cjs` | SQLite CLI 冒烟测试：验证 fresh schema v5 字段约束、v5 迁移追加与旧纯次卡订单回填 | schema / migration 变化时 |
| `pnpm-lock.yaml` | pnpm 锁定文件（**不要**手动编辑） | pnpm install 后自动 |
| `tsconfig.json` | TypeScript 配置；extends `@vue/tsconfig`，加 3 个 strict 选项；排除 `src/uni_modules` 第三方 uni-ui 源码 | 调整严格度时 |
| `vite.config.ts` | Vite 配置；只注册 `uni()` 插件 | 加 Vite 插件时 |
| `.eslintrc.cjs` | ESLint 配置：vue3 + ts + prettier；`src/pages/**` 关闭多字命名；忽略 `src/uni_modules/**` 第三方源码 | 改 lint 规则时 |
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
| `memory-bank/CHANGELOG.md` | 版本变更日志：每版记录新增功能 / 行为变更 / 修复 / 已知限制 / TBD；v1.0 起每个里程碑追加新章节，不修改已发布版本 | 每个里程碑完成时 |
| `debug-docs/DEBUG-HANDOFF.md` | 调试交接文档（sqlite 在 HBuilderX 标准版基座下不工作） | 阶段性快照 / 跨 AI 交接时 |
| `memory-bank/*.db` | DB 备份（v0 基线、v1 发布版等） | 阶段性快照 |

---

## src/ — 应用代码

### 入口与配置

| 文件 | 作用 |
|---|---|
| `src/main.ts` | App 入口；导出 `createApp()`（Vue 3 SSR 工厂）装载 `App.vue`；按 uni-app Pinia 文档 `import * as Pinia from 'pinia'`，`app.use(Pinia.createPinia())`，并从 `createApp()` 返回 `Pinia`。Pinia 由 HBuilderX / uni-app 内置提供，不在 `package.json` 手动安装。 |
| `src/App.vue` | 根组件；处理 uni-app 全局生命周期 `onLaunch` / `onShow` / `onHide` / `onError`；`onLaunch` 调 `db.init()` 并在失败时 toast 提示；`onError` 全局兜底未捕获错误（含 DB 损坏），DB 损坏时提示"数据库损坏，请用备份恢复" |
| `src/env.d.ts` | Vite 客户端类型（`/// <reference types="vite/client" />`）|
| `src/manifest.json` | uni-app App 元数据：`name=盒记` / `appid=com.bookkeeping.app` / Android `minSdkVersion=21` `targetSdkVersion=30` |
| `src/pages.json` | uni-app 路由 + 全局样式 + `tabBar`（4 个 Tab：今日 / 订单 / 统计 / 我的） |
| `src/uni.scss` | uni-app 全局 SCSS 变量（rpx 换算等）|
| `src/shime-uni.d.ts` | 扩展 Vue `ComponentCustomOptions` 加上 uni-app 的 App/Page 实例类型（**注：文件名是模板的拼写，保留不修**） |
| `src/static/` | 静态资源（默认有 `logo.png`）|
| `src/uni_modules/` | uni-ui easycom 组件源码目录；业务表单统一使用其中的 `uni-easyinput` / `uni-data-checkbox` / `uni-data-select` / `uni-datetime-picker` 等组件，质量检查不 lint/type-check 该第三方源码 |

### pages/ — 页面（uni-app 自动路由；Phase 7 已实现）

| 文件 | 作用 |
|---|---|
| `src/pages/index/index.vue` | Tab 1「今日」Dashboard：`onShow` 刷新 stats/order/customer store，展示订单数、收入、支出、利润，以及待配送 / 已配送 / 已取消三组今日订单；三类状态计数卡片和列表分组用主题色展示。 |
| `src/pages/order/index.vue` | Tab 2「订单」列表：按日期筛选并用 `uni-collapse` 分成午餐 / 晚餐；列表项保留拖拽把手、客户名和状态，副标题按“餐次 · 总份数 · 次卡次数 · 微信/现金金额 · 完整备注”组合并自然换行，删除最右侧次卡 / 金额块；今日午餐全部配送后默认折叠。拖拽继续使用 v1.6 的动态 `:scroll-y` 开关 + `setTimeout(16)` 边缘自动滚屏方案并写回 `orders.sort_order`。 |
| `src/pages/order/new.vue` | `<uni-forms>` 新建订单表单：份数表示“本次增量”；支持微信 / 现金 / 次卡 / 组合支付四个一级选项，组合支付的次卡次数初始为空且由用户填写；查询同键有效订单并提示合并 / 已配送阻断，展示实际剩余、其他 pending 预占、保存后所需次数；切换客户 / 日期 / 餐次后立即清理旧价，只在新上下文查询成功后允许保存；合并改单价时展示旧价、新价、受影响份数与金额后二次确认。 |
| `src/pages/order/detail.vue` | 订单详情与 `<uni-forms>` 编辑：只读态分别展示总份数、支付摘要、次卡次数、货币份数、实际单价与货币金额；编辑态份数表示整单总量，支持组合支付、预占校验以及改变客户 / 日期 / 餐次后的目标订单合并确认。配送余额不足时整笔回滚并提示“去编辑支付”，不再自动整单改微信 / 现金；保留复制、整单配送 / 取消 / 删除能力。 |
| `src/pages/stats/index.vue` | Tab 3「统计」：今日/本周/本月/自定义区间切换，自定义日期用 `uni-datetime-picker`；展示收入、支出、利润、订单数、客单价、日趋势 CSS 进度条和支出分类占比。 |
| `src/pages/me/index.vue` | Tab 4「我的」入口：跳转客户管理、支出管理、备份恢复。 |
| `src/pages/me/customers/list.vue` | 客户列表：`onShow` 并行刷新 customer store 与当前有剩余次数的 active 次卡客户 ID，头像区按身份显示“次 / 普”；前端用 `uni-easyinput` 按姓名/微信/手机号/姓名拼音/拼音首字母搜索；按 `src/utils/pinyin.ts` 生成拼音首字母分组、右侧索引和滚动定位；展示折扣角标，支持新建和详情跳转。 |
| `src/pages/me/customers/new.vue` | 客户新建/编辑共用页：用 uni-ui 表单组件维护姓名、手机、微信、午餐/晚餐默认价、折扣率、备注；默认价未触碰时保存为 null；保存时捕获客户姓名重复错误并提示不可重复。 |
| `src/pages/me/customers/detail.vue` | 客户详情：展示基础信息、active 次卡汇总进度、历史订单；支持编辑、删除、开次卡和进入充值记录。删除走 `customerStore.remove()`，客户存在订单或次卡依赖时保持数据并提示不可删除。次卡区通过 `listCards(customerId)` 汇总所有 active 卡的剩余 / 总次数，避免新开卡后只显示最新一张而像是覆盖旧卡。历史订单通过 `listOrders({ customerId })` 查询。 |
| `src/pages/me/customers/card-records.vue` | 客户次卡充值记录列表：按时间倒序展示所有 `meal_cards` 的充值日期、金额、总/已用/剩余次数和状态；点击记录进入总次数修改。 |
| `src/pages/me/customers/open-card.vue` | 次卡开卡/充值记录修改共用页：用 `<uni-forms>` + `<uni-forms-item>` 统一承载校验；开卡模式默认 20 次且金额允许为 0，已有 active 次卡时先汇总确认；带 `cardId` 时只允许修改该记录总次数，下限为已用次数。 |
| `src/pages/me/expenses/list.vue` | 支出列表：用 `uni-datetime-picker` 按日期读取 expense store，展示分类 emoji/名称、实际支出金额和备注；有退差时补充展示原支出金额与退差金额；点击卡片进入支出详情，长按仍可快捷删除。 |
| `src/pages/me/expenses/new.vue` | 新建支出页：使用 `<uni-forms>` + `<uni-forms-item>` 承载日期、分类、支出金额、退差金额、备注；金额 > 0、分类已选、退差金额不超过支出金额才可保存，实际支出按 `amount - refund_amount` 预览。 |
| `src/pages/me/expenses/detail.vue` | 支出详情：按 id 读取单条支出与分类；使用 `<uni-forms>` + `<uni-forms-item>` 承载日期、分类、支出金额、退差金额、备注，展示实际支出，支持修改和硬删除；删除后返回列表，保存后按列表当前日期刷新。 |
| `src/pages/me/settings/backup.vue` | 备份恢复页：导出 JSON 到 `_doc/backup_YYYYMMDD_HHmmss.json` 并复制到 `_downloads/`，toast 展示可见路径，不再调用系统分享；恢复保留 `uni-easyinput` 粘贴 JSON，同时支持从已保存备份列表或本地 JSON 文件读取后全量覆盖导入；危险区三次确认清空客户、订单、次卡和支出，并恢复 5 个默认支出分类。 |

### components/ — 跨页组件

| 文件 | 作用 |
|---|---|
| `src/components/.gitkeep` | 占位文件，让空目录被 git 跟踪 |
| `src/components/StatCard.vue` | 通用数字卡片；props 为 `label` / `value` / `color?: 'normal' \| 'positive' \| 'negative'` / `hint?`；上方展示 label，下方展示大号 value，可选 hint；利润 label 在未显式传 color 时按数值正负自动映射绿色/红色。 |
| `src/components/AmountInput.vue` | 金额输入组件；props 为 `modelValue: number` / `label` / `placeholder?`；事件 `update:modelValue`；内部用 `uni-easyinput` 保留字符串输入态，使用 `parseMoney()` 将输入解析为 number 回传，模板提供 `¥` 前缀。 |
| `src/components/CustomerPicker.vue` | 客户选择组件；props 为 `modelValue: Customer \| null` / `showCreate?`；事件 `update:modelValue` / `create`；字段标签由外层 `<uni-forms-item>` 负责，组件只展示已选客户或占位和选择入口；点击输入区打开底部选择弹层，内部用 `uni-easyinput` 支持按姓名、微信、手机号前端搜索；列表复用 `src/utils/pinyin.ts` 按姓名拼音排序和首字母分组，右侧 `index-bar` 可跳转到对应分组，并展示客户名和折扣角标。 |

### stores/ — Pinia 状态

| 文件 | 作用 |
|---|---|
| `src/stores/customer.ts` | 客户 store：state 为 `list: Customer[]` / `loading`；getter `byId(id)`；actions `refresh()` / `create(input)` / `update(id, input)` / `remove(id)`。写操作走 `api/customers.ts` 后自动刷新列表，Pinia 只缓存当前视图数据。 |
| `src/stores/order.ts` | 订单 store：state 为 `list: Order[]` / `currentDate`（默认 `today()`）/ `loading`；actions `setDate(date)` / `refreshForDate(date)` / `create(input)` / `update(id, input)` / `markDelivered(id)` / `cancel(id)` / `remove(id)` / `reorder(date, mealType, orderedIds)`。写操作走 `api/orders.ts`；新建后刷新到订单日期，其他写操作刷新当前日期；`InsufficientCardError` / `AlreadyDeliveredError` 不在 store 层吞掉。 |
| `src/stores/expense.ts` | 支出 store：state 为 `list: Expense[]` / `categories: ExpenseCategory[]` / `currentDate` / `loading`；actions `refreshForDate(date)` / `refreshCategories()` / `create(input)` / `update(id, input)` / `remove(id)`。分类只读，支出写操作后刷新当前日期列表。 |
| `src/stores/stats.ts` | 统计 store：state 为 `summary: StatsSummary \| null` / `trend` / `breakdown` / `range` / `loading`；actions `refreshSummary(date)` / `refreshRange({ start, end })`。区间刷新同时调用 `getRangeSummary`、`getDailyTrend`、`getCategoryBreakdown`。 |

### db/ — SQLite 数据层

| 文件 | 作用 |
|---|---|
| `src/db/schema.ts` | 6 张表 DDL 字符串 + `CURRENT_SCHEMA_VERSION=5`。`orders.meal_card_quantity` 保存次卡支付次数，`amount` 只保存货币部分；其余退差、排序与 usage 字段继续对齐 `design-document.md §2.1`；**`meal_cards` 表无 end_date**。 |
| `src/db/migrations.ts` | 迁移引擎与 v2-v5 追加迁移。v5 只在数组末尾追加 `orders.meal_card_quantity`，旧纯次卡订单按 `quantity` 回填；`reconcileCompatiblePendingOrders()` 仅合并同客户 / 日期 / 餐次且支付渠道、单价兼容的历史 pending 重复单，冲突数据保留并输出诊断。新库重复 `ADD COLUMN` 继续按列存在检查跳过；**不修改已发布迁移段**。 |
| `src/db/seed.ts` | 首次启动 seed：`seedIfEmpty()` 写入 5 个默认支出分类（菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰），is_default=1。仅在 `expense_categories` 行数为 0 时插入，不强制覆盖用户数据。 |
| `src/db/index.ts` | 数据层入口：`init()` 启动序列（openDatabase → PRAGMA foreign_keys=ON → runMigrations → seedIfEmpty → PRAGMA integrity_check(1)，逐步 await；integrity_check 失败抛错让 `App.vue` 提示用备份恢复）/ `close()` / `tx<T>(fn)`（用 5+ `transaction` 的 begin/commit/rollback 包裹，并用 Promise 队列串行单连接上的顶层事务；`fn` 内不嵌套 `tx()`）/ `exec()` / `select()`。5+ 官方 `executeSql` 不支持 args 数组，参数在本文件统一转义；`pify()` 动态调用 SQLite 方法时必须用 `fn.call(sqlite, options)` 保留 `this`；callback 静默不返回时 8 秒超时报错，便于识别 native bridge 缺失。**所有多表写入**（建单 / 取消 / 配送 / 开次卡）必须走 `tx()`。 |

### api/ — 数据访问

| 文件 | 作用 |
|---|---|
| `src/api/customers.ts` | customers 表 CRUD：`listCustomers()` / `getCustomer(id)` / `createCustomer(input)` / `updateCustomer(id, input)` / `deleteCustomer(id)`。`createCustomer` 与 `updateCustomer` 返回最新客户记录；创建/改名时按 trim 后姓名判重；`deleteCustomer` 在客户存在次卡或订单依赖时返回 `false` 并保留数据，避免外键失败。 |
| `src/api/meal-cards.ts` | meal_cards 表基础 API。`updateCardTotalMeals()` 除校验新总次数不小于已用次数外，还校验修改后客户余额池足以覆盖全部 pending `meal_card_quantity` 预占，再同步 `active/depleted`。 |
| `src/api/orders.ts` | orders 表与订单流程 API：新增 `findEffectiveOrder()` / `getMealCardAvailability()`；`createOrder()` 在事务内维护“一客户一日期一餐次一张有效订单”，重复新增按增量合入原 pending ID / 排序；`updateOrder()` 支持目标 pending 合并确认；两者统一校验支付形态、货币渠道、改单价确认和 pending 次卡预占。`markDelivered()` 仅 FIFO 扣 `meal_card_quantity` 并写 usage，不足时整笔回滚；取消自然释放预占，删除 delivered 组合订单按 usage 精确回滚。 |
| `src/api/errors.ts` | API 层可辨识业务异常：次卡所需 / 可用次数、已配送同键冲突、支付渠道冲突、合并改单价确认、编辑目标合并确认、充值记录侵占预占次数、历史重复单诊断，以及既有取消 / 重名 / 总次数下限错误。 |
| `src/api/expense-categories.ts` | expense_categories 只读 API：`listCategories(): Promise<ExpenseCategoryResult[]>` / `getCategory(id): Promise<ExpenseCategoryResult \| null>`。v1.0 不暴露分类增删改。 |
| `src/api/expenses.ts` | expenses 表 CRUD：`listExpenses(input: ListExpensesInput): Promise<ExpenseResult[]>` / `getExpense(id): Promise<ExpenseResult \| null>` / `createExpense(input: CreateExpenseInput): Promise<ExpenseResult>` / `updateExpense(id, input): Promise<ExpenseResult \| null>` / `deleteExpense(id): Promise<boolean>`。`createExpense` / `updateExpense` 用 `tx()` 包裹，`amount <= 0` 拒绝，`refund_amount` 默认为 0 且不可为负或超过 `amount`；`deleteExpense` 硬删除支出。 |
| `src/api/stats.ts` | 统计聚合 API：`getDashboardSummary(date): Promise<StatsSummary>` / `getRangeSummary(input: DateRangeInput): Promise<StatsSummary>` / `getDailyTrend(input: DateRangeInput): Promise<DailyTrendPoint[]>` / `getCategoryBreakdown(input: DateRangeInput): Promise<CategoryBreakdown[]>`。收入口径 = 非 cancelled 订单金额 + 开次卡金额；支出口径 = `expenses.amount - expenses.refund_amount`；利润 = 收入 - 支出。 |

### utils/ — 工具函数

| 文件 | 作用 |
|---|---|
| `src/utils/date.ts` | dayjs 本地时区日期工具：`today()` / `tomorrow()` 返回 `YYYY-MM-DD`；`weekRange(d)` 返回自然周周一到周日；`monthRange(d)` 返回自然月 1 号到月底；`formatDate(d)` 按当前年份显示 `MM-DD` 或 `YYYY-MM-DD`；`daysBetween(a, b)` 返回自然日整数差。 |
| `src/utils/format.ts` | 金额/百分比格式化与精确计算工具（基于 big.js，全局 `Big.RM = roundHalfUp`，所有 helper 输出强制 `toFixed(2)` 保证 2 位小数）：`formatMoney(n)` 输出 `¥1,234.50`（空值/非法值为 `¥—`）；`parseMoney(s)` 接受普通数字、`¥`、`￥`、千分位并解析为 number（非法为 0）；`formatPercent(n)` 四舍五入输出整数百分比；`roundMoney/addMoney/subtractMoney/multiplyMoney/divideMoney` 提供按分精确运算，所有金额计算（订单单价、份数、统计累加/差值、次卡均摊）必须走这些 helper，禁止原生 `+ - * /` |
| `src/utils/order-rules.ts` | 订单纯规则模块：支付拆分、次卡可用判断、备注合并去重、支付兼容与合并改单价预览；API 与 Node 测试共享，金额计算只走 big.js helper。 |
| `src/utils/ui.ts` | 页面层小工具：toast / confirm / actionSheet、数值与状态文案、客户默认价提示，以及组合支付摘要和列表副标题拼接。 |
| `src/utils/backup.ts` | JSON 全量备份恢复；v5 随 orders 导入导出 `meal_card_quantity`，导入 v1-v4 时按旧 `payment_method` 推导，组合 delivered usage 继续精确恢复，并在导入后执行兼容 pending 重复单合并。 |
| `src/utils/pinyin.ts` | 客户姓名拼音工具：基于纯 JS `pinyin-pro`，使用姓氏优先模式把中文姓名转为无声调拼音 key、拼音首字母串和 A-Z / `#` 分组字母，并提供客户姓名排序函数；用于 Android App 端客户列表分组、索引和拼音搜索。 |

### types/ — TS 类型

| 文件 | 作用 |
|---|---|
| `src/types/domain.ts` | 与 schema snake_case 字段严格对齐的领域类型；`Order` 新增必填 `meal_card_quantity`。 |
| `src/types/api.ts` | API 入参 / 出参契约；订单创建 / 编辑增加次卡次数与价格 / 合并确认标志，新增 `MealCardAvailabilityResult`。 |
| `src/types/pinia.d.ts` | 本地类型声明：在不手动安装 npm `pinia` 的前提下，让 `vue-tsc` 能识别 uni-app/HBuilderX 内置 Pinia 的 `createPinia` / `defineStore`。仅提供类型，不提供运行时代码。 |

---

## 关键架构决策

| 决策 | 位置 | 影响范围 |
|---|---|---|
| 6 张表结构 | `memory-bank/design-document.md §2.1` | 所有 db / api / store |
| 次卡扣次 = 配送完成（A1），按客户余额池旧卡优先扣次 | `memory-bank/design-document.md §3.2 §4.3` | orders API、UI 流程 |
| 客户默认价 + 折扣率（A6） | `memory-bank/design-document.md §2.1 §4.1` | customers API、订单录入 UI |
| 1 订单 = 1 餐 + 多份（D1） | `memory-bank/design-document.md §2.1` | orders schema |
| 不收配送费（D4） | `memory-bank/design-document.md §2.1` | 不存在 delivery_fee 字段 |
| 次卡按"次"无有效期 | `memory-bank/design-document.md §2.1 §3.2` | meal_cards 无 end_date / expired 状态 |
| SQLite 是唯一数据源 | `memory-bank/tech-stack.md §7` | 不引 pinia 持久化插件 |
| 多表写入必走 tx() | `memory-bank/design-document.md §4` | db/index.ts 提供 tx() 工具 |
| 删除 = 硬删除 + 回滚已产生副作用 | `memory-bank/design-document.md §4.6` | orders / expenses / customers API 与详情页删除入口 |
| PRAGMA foreign_keys = ON | db/index.ts init() | 维护 customer_id / meal_card_id / category_id 外键完整性 |
| `user_version` 驱动迁移 | db/migrations.ts | 首次建表=v1，当前=v5；未来加字段在 MIGRATIONS 末尾追加 |
| 客户姓名应用层判重 | `src/api/customers.ts` / `src/pages/me/customers/new.vue` | 重复姓名不可新增；编辑时允许保持原姓名 |
| 表单控件统一使用 uni-ui | `src/uni_modules` + 各表单页 | 业务页面不直接使用原生 `input` / `textarea` / `picker` / `radio-group` / `slider`，改用 easycom 的 uni-ui 表单组件 |

## DB 备份

| 文件 | 来源 | 用途 |
|---|---|---|
| `memory-bank/bookkeeping-v0.db` | 2026-06-10 Phase 2.6；用 `sqlite3` CLI 跑 schema DDL + seed 生成的"等价基线"（**非**真机 DB） | 后续步骤的 DB 形状参照；真机 adb pull 后**应覆盖**此文件 |
| `memory-bank/bookkeeping-real.db` | 2026-06-11 Step 2.6；HBuilderX / Android 真机启动后从 `_doc/bookkeeping.db` 拉取 | 真实运行环境基线；已验证 5 张业务表、5 个默认分类、`user_version=1` |
| `memory-bank/bookkeeping-v1.db` | 2026-06-11 Phase 8.6 通过后；`cp bookkeeping-real.db bookkeeping-v1.db` | v1.0 阶段基线（含 6 条 E2E 流程跑通后的真机数据形态）；v1.1 起按相同节奏归档 `bookkeeping-v1.1.db` 等 |

---

## 外部依赖（package.json 当前）

| 依赖 | 用途 | 版本 |
|---|---|---|
| `@dcloudio/uni-app` 等 uni-* | uni-app 框架 | `3.0.0-4080420251103001` |
| `vue` | Vue 3 | `^3.4.21`（实际 3.5.x） |
| `vue-i18n` | 模板自带；v1.0 不用 | `^9.1.9` |
| `dayjs` | 日期工具；用于自然日/自然周/自然月计算 | `^1.11.21` |
| `pinyin-pro` | 纯 JS 拼音转换；用于 Android App 端客户姓名拼音排序、分组索引和拼音搜索 | `^3.28.1` |
| `sass` | uni-ui 组件 `lang="scss"` 编译依赖 | `^1.100.0` |
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

> uni-ui 通过 `src/uni_modules` easycom 方式随项目携带，不通过 npm 安装 `@dcloudio/uni-ui`；`sass` 是这些组件参与 H5/Vite 构建所需的 devDependency。

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
- 2026-06-11：Phase 6 通用 UI 组件完成 — 新增 `src/components/StatCard.vue` / `src/components/AmountInput.vue` / `src/components/CustomerPicker.vue`；组件只提供跨页 UI 能力和事件上抛，不承接 Phase 7 页面业务实现。
- 2026-06-11：Phase 7 页面实现完成 — 新增订单、统计、客户、次卡、支出和备份恢复子页，更新 `pages.json` 路由；新增 `src/utils/ui.ts` 与 `src/utils/backup.ts`；扩展 `listOrders` 支持按客户查历史订单；页面层接入既有 store/API，保持次卡创建不扣次、配送完成扣次、次卡不足整单改微信/现金的核心约束。`pnpm type-check` / `pnpm lint` 通过；未进入 Phase 8 端到端流程串联。
- 2026-06-11：Phase 8 预检进行中 — 用户确认 Phase 7 真机验证通过后进入关键流程串联；修补次卡次数不足异常分支的改支付金额（按客户默认价 × 折扣率，不再沿用次卡次均价）和备份导入 `schema_version` 校验；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，等待真机逐条跑 8.1-8.6。
- 2026-06-11：表单组件统一改造 — 业务页面原生 `input` / `textarea` / `picker` / `radio-group` / `slider` 已替换为 uni-ui easycom 组件（`uni-easyinput` / `uni-data-checkbox` / `uni-data-select` / `uni-datetime-picker` / `uni-number-box`）；`tsconfig.json` 与 `.eslintrc.cjs` 排除 `src/uni_modules` 第三方源码；新增 `sass` 供 uni-ui SCSS 编译；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过（H5 build 仅有 uni-ui 内部 Sass deprecation warning）。
- 2026-06-11：订单列表按餐次折叠分组 — `src/pages/order/index.vue` 改为使用 uni-ui `uni-collapse` 固定展示午餐 / 晚餐两个面板，标题汇总有效订单数、份数和金额，取消订单继续展示但不计入标题统计。
- 2026-06-11：次卡展示修正 — `src/pages/me/customers/detail.vue`、`open-card.vue` 与 `src/pages/order/new.vue` 改为汇总所有 active 次卡的剩余 / 总次数；新开卡后客户详情和订单录入页都显示为次数叠加，不再只显示最新卡导致看起来覆盖旧卡。
- 2026-06-11：订单详情编辑能力 — `src/pages/order/detail.vue` 新增 pending 订单编辑态，可修改客户、日期、餐次、份数、价格、支付方式与备注；`src/api/orders.ts` 新增 `updateOrder`，限制只编辑 pending 订单，次卡编辑仍不扣次，扣次继续发生在配送完成时。
- 2026-06-11：订单列表备注展示 — `src/pages/order/index.vue` 的订单元信息行在单价后追加非空备注，空备注不显示，便于配送前快速查看口味 / 临时要求。
- 2026-06-11：开次卡金额校验调整 — `src/pages/me/customers/open-card.vue` 保存条件放开 0 元次卡，仍要求客户有效、总次数大于 0、金额为非负有效数字；`src/api/meal-cards.ts` 原本已允许 `amount >= 0`。
- 2026-06-11：危险清空默认分类恢复 — `src/utils/backup.ts` 的 `clearAllData()` 清空业务数据后在同一事务内重新执行 `seedIfEmpty()`，`src/pages/me/settings/backup.vue` 同步文案，修复清空后新增支出页分类无选项的问题。
- 2026-06-11：首页状态色展示 — `src/pages/index/index.vue` 将今日订餐的待配送 / 已配送 / 已取消计数和列表分组改为主题色展示，分别使用 `$uni-color-primary` / `$uni-color-success` / `$uni-color-warning`。
- 2026-06-11：Phase 8 关键流程串联完成 — 用户在 HBuilderX 真机逐条跑通 8.1-8.6（录单配送对账 / 次卡完整 / 次卡不足异常 / 取消订单 / 折扣临时涨价 / 备份恢复）；6 条流程全部断言通过，`memory-bank/bookkeeping-real.db` 备份为 `memory-bank/bookkeeping-v1.db` 作为 v1 阶段基线。
- 2026-06-11：Phase 9.1 空状态 + Loading 防重复验收 — 13 个页面 / 组件现状全部就位：列表页全有 `v-if="loading"` + 友好空态文案（Dashboard / 订单列表 / 客户列表 / 客户详情 / 支出列表 / 统计页 / 订单详情 / CustomerPicker），全部保存按钮 `:disabled="!canSave"` 且 canSave 含 `saving.value` 防重（订单新建 / 订单详情编辑 / 客户新建编辑 / 开次卡 / 支出新建 / 备份页），关键 async 操作均 try/catch + `showToast` 兜底。本步骤不需新增代码，已在 progress.md 标记完成。
- 2026-06-11：Phase 9.2 错误处理兜底 — `src/App.vue` 新增 `onError` 全局钩子，DB 损坏时识别 `integrity_check` 关键字并提示"数据库损坏，请用备份恢复"；`src/db/index.ts` `init()` 末尾跑 `PRAGMA integrity_check(1)`，失败抛 `[db] integrity_check failed: ...` 错误让 `onError` 捕获。`pnpm type-check` / `pnpm lint` 通过。
- 2026-06-11：Phase 9.5 CHANGELOG 落地 — 新增 `memory-bank/CHANGELOG.md` 写 v1.0 节：已实现 F1-F6 功能 + 关键行为决策（A1/A3/A4/A5/A6/A7）+ 收尾质量门 + 已知限制（含"未做 50 单压测"和"未打 Release APK"两条）+ v1.1 TBD 候选。
- 2026-06-11：**v1.0 发布**（按用户决策）— Step 9.3 真机性能 smoke test 和 Step 9.4 Release APK 打包侧载**跳过**（个人内用 v1.0 用 HBuilderX 标准基座的 debug APK 侧载，省掉自签名 keystore / 云打包）；`memory-bank/CHANGELOG.md` 已知限制节同步标注这两条；`progress.md` Phase 9 标记为 3/5 完成、里程碑 9.5 勾选。
- 2026-06-11：订单列表折叠面板样式微调 — `src/pages/order/index.vue` 的午餐 / 晚餐面板标题使用 `$uni-color-primary` 并加粗，面板内订单列表项之间增加分割线。
- 2026-06-11：备份恢复 v1.1 小修 — `src/utils/backup.ts` 移除系统分享路径，导出后复制到 `_downloads/` 并返回 `ExportResult`；新增 `listBackupFiles()` / `readBackupFile()` / `pickLocalBackupText()`；`src/pages/me/settings/backup.vue` 保留粘贴 JSON 导入，并新增从已保存备份选择、本地 JSON 文件选择两个入口；本地文件选择在 Android App 端使用系统 Intent，不再依赖 WebView `<input type="file">`。`pnpm type-check` / `pnpm lint` 通过；真机文件路径待 HBuilderX 验证。
- 2026-06-12：新建订单日期可选 — `src/pages/order/new.vue` 新增日期字段，默认 `tomorrow()` 且可手动修改；`src/stores/order.ts` 新建订单后刷新到该订单日期，避免返回列表仍停在旧日期；`src/utils/date.ts` 新增 `tomorrow()`。
- 2026-06-13：备份恢复本地文件选择修正 — Android 客户端不支持 WebView `<input type="file">`，`src/pages/me/settings/backup.vue` 移除隐藏 input；`src/utils/backup.ts` 新增 `pickLocalBackupText()`，Android App 端通过系统 Intent 选择 JSON 并用 `ContentResolver.openInputStream()` 读取，其他端 fallback 到 `uni.chooseFile`。
- 2026-06-15：删除能力补齐 — 订单详情新增硬删除，已配送次卡订单删除时回滚已扣次数；支出列表点击进入新增的支出详情页，详情页支持修改和删除；客户详情新增删除入口，存在订单或次卡依赖时拒绝删除；`design-document.md` 明确后续删除统一采用"硬删除 + 回滚已产生副作用"。
- 2026-06-15：客户姓名判重 — `src/api/customers.ts` 在创建/改名时按 trim 后姓名检查重复并抛 `DuplicateCustomerNameError`；`src/pages/me/customers/new.vue` 捕获后提示重复姓名不可保存。
- 2026-06-15：支出退差金额上线 — schema 升级到 v2，`expenses` 新增 `refund_amount` 字段；新建 / 修改支出页补退差金额输入与实际支出预览；统计页支出口径、日趋势和分类占比统一按 `amount - refund_amount` 计算；备份恢复允许 v1 备份导入到 v2 时为旧支出补 0。
- 2026-06-15：订单列表拖拽排序 — schema 升级到 v3，`orders` 新增 `sort_order` 字段与同日同餐次排序索引；`src/api/orders.ts` 新增 `reorderOrders()`，新订单自动追加到同日同餐次末尾；`src/pages/order/index.vue` 支持长按左侧 `uni-icons bars` 把手在午餐 / 晚餐分组内拖拽排序；备份恢复允许 v1/v2 备份导入到 v3 时为旧订单补 `sort_order=0`。
- 2026-06-15：客户列表拼音索引 — 新增纯 JS 依赖 `pinyin-pro` 与 `src/utils/pinyin.ts`；`src/pages/me/customers/list.vue` 按中文客户名拼音首字母分组排序，支持右侧字母索引跳转，并把搜索扩展到姓名拼音和拼音首字母。
- 2026-06-15：金额精确计算统一接入 big.js — 新增 `big.js@7.0.1` 与 `@types/big.js` 依赖；`src/utils/format.ts` 新增 `roundMoney / addMoney / subtractMoney / multiplyMoney / divideMoney` 五个 helper（全局 `Big.RM = roundHalfUp`，所有结果强制 `toFixed(2)` 保证输出干净）；`src/api/stats.ts` 三处累加/差值（getRangeSummary / getDailyTrend / getCategoryBreakdown）、`src/api/orders.ts` 三处订单金额计算（次卡均摊单价、默认价 × 折扣率、单价 × 份数）、`src/utils/ui.ts` 两处客户默认价提示全部改走 helper。修复首页利润显示 `0.0000000004` 的 JS 浮点尾数问题。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（首页 8.1 流程 + 8.5 折扣临时涨价重点复测）。
- 2026-06-16：订单列表拖拽滚动冲突修复（v1.6 重做）—— 原 v1.4（longpress 激活 + `@touchmove` 绑整个 order-item）与 scroll-view 并发滚动导致抖动；曾尝试 v1.6（`@touchstart.stop` + 阈值 + JS 层 `preventDefault`）但 AGENTS.md §11 自己承认 preventDefault 在 Android 标准基座不生效，bug 依旧。本次改用**方案 B：动态 `:scroll-y` 开关 + 边缘自动滚屏**绕开冲突：`src/pages/order/index.vue` 的 `<scroll-view>` 改 `:scroll-y="listScrollable"` `:scroll-top="listScrollTop"` `@scroll="onListScroll"`；触摸事件下沉到 drag-handle（`@touchstart.stop`→dragIntent、`@touchmove.stop`→跨阈值 10px 后 `lockScroll()` 关闭滚动能力 + clone 列表）；激活后手指拖到顶/底 64px 内用 `setTimeout(16)` 驱动 `:scroll-top` 程序化滚屏（app-plus 逻辑层无 `requestAnimationFrame`），并反向修正 `dragState.startY`（scrollTop 增大→内容上移→目标 index 应增大→startY 需减小）让 targetIndex 跟随不错位。新增 `DragIntent` 接口 + `dragIntent` ref + `listScrollable` / `listScrollTop` ref + `lockScroll / unlockScroll / onListScroll / stopEdgeAutoScroll / applyReorder / runEdgeAutoScroll / onHandleTouchStart / onHandleTouchMove / onHandleTouchEnd` 九个函数；删除 `startDrag` / `handleTouchMove`。`DragState` / `dragOrders` / `dragState` / `dragSaving` / `dragClickBlockedUntil` 与 `finishDrag` / `dragItemHeightPx` 等保留。`CHANGELOG.md` v1.6 节改写为方案 B、`progress.md` 同步、`AGENTS.md §11` 最后一行更新为方案 B。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（CHANGELOG v1.6 节验证清单 10 条）。
- 2026-06-16：统计 SUM 出口精度收口 —— `src/api/stats.ts` 三处 SQL `SUM` 出口的 number 之前在 `getRangeSummary` 的 `expense = num(row?.expense)` 与 `getCategoryBreakdown` 的 `amount: num(row.amount)` 两条路径**完全没**经过 `roundMoney`（income / 利润走 `addMoney` / `subtractMoney` 隐式 `.toFixed(2)` 才保住精度）；本次把 `getRangeSummary` 的 `orderIncome` / `cardIncome` / `expense`、`getDailyTrend` 三组 `income` / `expense`、`getCategoryBreakdown` 的 `amount` / `total` 全部显式 `roundMoney()` 后再相加相减；首页 Dashboard `summary.expense` 与统计页支出分类两个浮点尾数源头修复。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（首页 8.1 流程 + 统计页 8.5 重点复测）。
- 2026-06-22：订单详情复制信息 — `src/pages/order/detail.vue` 只读态新增「复制信息」按钮，通过 `uni.setClipboardData` 写入客户名、订单份数和备注；空备注不写入复制内容，复制成功 / 失败沿用现有 toast 提示。
- 2026-06-22：配送完成后自动沉底 — `src/api/orders.ts` 的 `markDelivered()` 成功配送时同步把订单 `sort_order` 更新为同日同餐次最大值 + 1；从订单详情触发配送后，`src/pages/order/index.vue` 重新读取列表即可把该订单排到对应餐次最后。
- 2026-06-22：今日午餐完成后自动折叠 — `src/pages/order/index.vue` 的默认展开面板改为 `:model-value` 控制；筛选日期为今天且午餐分组所有订单均为 `delivered` 时，午餐面板从默认展开列表中移除。
- 2026-06-26：次卡余额池扣次 — schema 升级到 v4，新增 `meal_card_usages` 记录已配送次卡订单的实际扣次明细；`markDelivered()` 改为按客户所有 active 次卡旧卡优先扣次，支持一单跨多张卡，只有总剩余不足才弹改微信 / 现金；`deleteOrder()` 按 usage 明细精确回滚；新建 / 编辑订单页优先选择能覆盖本单份数的 active 卡作为参考 `meal_card_id`，展示上弱化单张卡编号；备份恢复支持 v1-v3 旧备份自动补 usage 明细。
- 2026-07-14：次卡充值记录与总次数校正 — 客户详情增加充值记录入口，新增 `card-records.vue` 展示全部历史卡；`open-card.vue` 重构为 uni-forms 并兼容编辑模式；`updateCardTotalMeals()` 禁止总次数小于已用次数，并自动切换 `active/depleted`；不改 schema、充值金额或历史扣次明细。
- 2026-07-14：客户选择器拼音分组索引 — `CustomerPicker.vue` 复用 `compareCustomerName()` / `getCustomerInitial()` 按客户姓名拼音排序和分组，右侧 `index-bar` 点击后通过 `scroll-into-view` 跳转；新建订单与订单详情编辑同时生效。
- 2026-07-14：客户列表次卡身份头像 — `src/api/meal-cards.ts` 新增单次批量查询当前有剩余次数的 active 次卡客户 ID；`src/pages/me/customers/list.vue` 头像区将这类客户显示为“次”，其他客户显示为“普”，不改 schema 和其他页面。
- 2026-07-22：一餐一单与组合支付（v1.12）—— schema 升至 v5，`orders` 新增 `meal_card_quantity`；新增 `src/utils/order-rules.ts` 与三组 Node / SQLite CLI 测试。订单 API 在事务内合并同客户 / 日期 / 餐次 pending 增量、校验次卡预占、支付渠道和改单价确认，配送 / 删除只处理次卡分配部分；`tx()` 串行顶层事务，详情状态操作增加 in-flight 锁，防止双击 / 多页并发重复扣次或建单；新增 / 编辑页重构为 uni-forms，列表改为完整组合支付副标题；备份与充值记录校正同步 v5 口径。静态门禁与 H5 构建结果见 `CHANGELOG.md v1.12`，HBuilderX 真机回归待执行。
- 2026-07-22：客户表单标签统一 — 新建订单与订单详情编辑均由 `<uni-forms-item label="客户">` 提供字段标签；`CustomerPicker` 移除内部重复标签，保留选择、搜索和拼音分组交互。
