# 盒记 — 实施进度

> 与 `memory-bank/implementation-plan.md` 配套
> 每完成一步，把对应的 [ ] 改为 [~]（进行中）或 [x]（完成）
> 每完成一个里程碑，**必须**更新本文件 + `memory-bank/architecture.md`

---

## 当前总览

- **开始日期**：2026-06-10
- **当前阶段**：Phase 6 通用 UI 组件已完成，等待用户验证
- **下一步**：用户验证通过后再进入 Phase 7 Step 7.1 — Tab 1 Dashboard 骨架（mock 数据）

---

## Phase 1 — 项目脚手架（8/8）

- [x] Step 1.1 — 拉取 uni-app Vue 3 + Vite + TS 模板（用 `dcloudio/uni-preset-vue#vite-ts`）
- [x] Step 1.2 — 安装 pnpm 依赖
- [x] Step 1.3 — 配置 TypeScript 严格模式
- [x] Step 1.4 — 配置 ESLint + Prettier
- [x] Step 1.5 — 创建项目目录结构
- [x] Step 1.6 — 创建 memory-bank 初始文件（本步）
- [x] Step 1.7 — 配置 manifest.json（Android 基础）
- [x] Step 1.8 — 配置 4 个 Tab 路由骨架

**里程碑 1.8 — 脚手架完成**：[x]（2026-06-10）

---

## Phase 2 — 数据层（SQLite）（6/6）

- [x] Step 2.1 — 编写 schema.ts（5 张表 DDL 字符串）
- [x] Step 2.2 — 编写 migrations.ts（版本管理）
- [x] Step 2.3 — 编写 seed.ts（默认分类）
- [x] Step 2.4 — 编写 db/index.ts（连接 + tx）
- [x] Step 2.5 — 在 App.vue 触发 init
- [x] Step 2.6 — 端到端验证：DB 落盘（HBuilderX / Android 真机验证通过；`bookkeeping-real.db` 已拉取并确认）

**里程碑 2.6 — 数据层就绪**：[x]（2026-06-11）

---

## Phase 3 — 类型与工具（4/4）

- [x] Step 3.1 — 定义 domain 类型
- [x] Step 3.2 — 定义 API 入参出参类型
- [x] Step 3.3 — 写日期工具 date.ts
- [x] Step 3.4 — 写金额格式化 format.ts

**里程碑 3.4 — 类型与工具就绪**：[x]（2026-06-11）

---

## Phase 4 — API 层（8/8）

- [x] Step 4.1 — customers API（CRUD）
- [x] Step 4.2 — meal-cards API
- [x] Step 4.3 — orders API（基础 CRUD）
- [x] Step 4.4 — orders API（markDelivered 流程）
- [x] Step 4.5 — orders API（cancelOrder）
- [x] Step 4.6 — expense-categories API
- [x] Step 4.7 — expenses API
- [x] Step 4.8 — stats API（聚合查询）

**里程碑 4.8 — API 层就绪**：[x]（2026-06-11）

---

## Phase 5 — Pinia Stores（5/5）

- [x] Step 5.1 — 使用 uni-app 内置 Pinia + 初始化
- [x] Step 5.2 — customer store
- [x] Step 5.3 — order store
- [x] Step 5.4 — expense store
- [x] Step 5.5 — stats store

**里程碑 5.5 — Stores 就绪**：[x]（2026-06-11）

---

## Phase 6 — 通用 UI 组件（3/3）

- [x] Step 6.1 — StatCard.vue
- [x] Step 6.2 — AmountInput.vue
- [x] Step 6.3 — CustomerPicker.vue

**里程碑 6.3 — 通用组件就绪**：[x]（2026-06-11）

---

## Phase 7 — 页面实现（0/18）

- [ ] Step 7.1 — Tab 1 Dashboard 骨架（mock 数据）
- [ ] Step 7.2 — Dashboard 接入真实数据
- [ ] Step 7.3 — Tab 2 订单列表页骨架
- [ ] Step 7.4 — 新建订单表单（布局 + 客户选择）
- [ ] Step 7.5 — 新建订单：价格计算（A6 核心）
- [ ] Step 7.6 — 新建订单：支付方式 + 次卡选择
- [ ] Step 7.7 — 订单详情页（布局 + 取消）
- [ ] Step 7.8 — 订单详情：标记已配送（含次卡异常）
- [ ] Step 7.9 — Tab 3 统计页骨架
- [ ] Step 7.10 — 统计页：日趋势 + 分类占比
- [ ] Step 7.11 — Tab 4 客户列表
- [ ] Step 7.12 — 客户新建 / 编辑页
- [ ] Step 7.13 — 客户详情页（基础信息 + 历史订单）
- [ ] Step 7.14 — 客户详情：次卡卡片 + 开新卡入口
- [ ] Step 7.15 — 开次卡表单
- [ ] Step 7.16 — Tab 4 支出列表
- [ ] Step 7.17 — 支出新建页
- [ ] Step 7.18 — Tab 4 设置（备份/恢复）

**里程碑 7.18 — 所有页面就绪**：[ ]

---

## Phase 8 — 关键流程串联（0/6）

- [ ] Step 8.1 — 端到端：录单 → 配送 → 对账
- [ ] Step 8.2 — 端到端：次卡完整流程
- [ ] Step 8.3 — 端到端：次卡次数不够异常
- [ ] Step 8.4 — 端到端：取消订单
- [ ] Step 8.5 — 端到端：折扣 + 临时涨价
- [ ] Step 8.6 — 端到端：备份恢复

**里程碑 8.6 — 核心流程全部通过**：[ ]

---

## Phase 9 — 收尾与发布（0/5）

- [ ] Step 9.1 — 空状态 + Loading 防重复
- [ ] Step 9.2 — 错误处理兜底
- [ ] Step 9.3 — 真机性能 smoke test
- [ ] Step 9.4 — build Release APK + 侧载试装
- [ ] Step 9.5 — 写 CHANGELOG + v1.0 发布

**里程碑 9.5 — v1.0 发布**：[ ]

---

## 进度统计

| 阶段 | 总步数 | 已完成 | 进度 |
|---|---|---|---|
| Phase 1 脚手架 | 8 | 8 | 100% |
| Phase 2 数据层 | 6 | 6 | 100% |
| Phase 3 类型/工具 | 4 | 4 | 100% |
| Phase 4 API 层 | 8 | 8 | 100% |
| Phase 5 Stores | 5 | 5 | 100% |
| Phase 6 通用组件 | 3 | 3 | 100% |
| Phase 7 页面 | 18 | 0 | 0% |
| Phase 8 流程串联 | 6 | 0 | 0% |
| Phase 9 收尾 | 5 | 0 | 0% |
| **合计** | **63** | **34** | **54%** |

> 步骤编号与 `implementation-plan.md` v2 一致

---

## 更新日志

- 2026-06-10：初始创建（与 implementation-plan.md v2 同步）
- 2026-06-10：Phase 1 脚手架 8/8 完成，里程碑 1.8 达成
- 2026-06-10：Phase 2 数据层 5/6 完成，Step 2.6 阻塞等 HBuilderX 真机验证
- 2026-06-10：发现 CLI 模式编译不带 SQLite 原生模块（`plus.sqlite` JS 表面存在但底层空壳，openDatabase 同步返回 undefined）；切到 HBuilderX 编译；architecture.md 新增「编译工具链」章节
- 2026-06-10：5+ sqlite API 重写完成（callback 在 options 里、name 引用、async executeSql），type-check / lint 通过；但 HBuilderX "最新正式版" 标准基座下 `getCallbackIDByFunction is not a function`，sqlite native 仍是空壳
- 2026-06-11：用户决定换 AI 接手，详细调试交接见 `memory-bank/DEBUG-HANDOFF.md`
- 2026-06-11：接手后重查 `DEBUG-HANDOFF.md` 与官方 5+ SQLite API，修复 `init()` 未 await、`transaction.operation` 误用函数、SQL args 不被官方 API 支持、callback 静默无超时等问题；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；当时等待 Step 2.6 真机验证，后续已通过
- 2026-06-11：按用户提供的掘金 SQLite 封装文章对照，发现动态取出 `plus.sqlite[method]` 后裸调用会丢失 `this`，与 `this.getCallbackIDByFunction is not a function` 报错吻合；已改为 `fn.call(sqlite, options)` 保留 `this`，本地三项验证通过
- 2026-06-11：用户完成真机落盘验证；`memory-bank/bookkeeping-real.db` 可被 sqlite3 打开，业务表齐全、默认支出分类 5 行、`PRAGMA user_version=1`；Phase 2 里程碑完成
- 2026-06-11：Phase 3 类型与工具 4/4 完成：新增 `src/types/domain.ts`、`src/types/api.ts`、`src/utils/date.ts`、`src/utils/format.ts`，安装 `dayjs`；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过。按用户要求，验证前不进入 Phase 4
- 2026-06-11：Phase 4 Step 4.1 完成：新增 `src/api/customers.ts`，实现 `listCustomers` / `getCustomer` / `createCustomer` / `updateCustomer` / `deleteCustomer`；删除客户时会拦截已有次卡或订单依赖，避免外键失败；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock smoke test 通过
- 2026-06-11：Phase 4 Step 4.2 完成：新增 `src/api/meal-cards.ts`，实现 `getActiveCard` / `listCards` / `openCard` / `getCard`；`openCard` 用 `tx()` 写入 active 次卡
- 2026-06-11：Phase 4 Step 4.3-4.5 完成：新增 `src/api/orders.ts` 与 `src/api/errors.ts`，实现订单基础 CRUD、`markDelivered` 配送扣次、`cancelOrder` 取消；次卡次数不足会抛 `InsufficientCardError` 并事务回滚，已配送订单取消会抛 `AlreadyDeliveredError`
- 2026-06-11：Phase 4 Step 4.6 完成：新增 `src/api/expense-categories.ts`，只读默认支出分类，不暴露 v1.0 不做的分类增删改
- 2026-06-11：Phase 4 Step 4.7 完成：新增 `src/api/expenses.ts`，实现支出列表 / 详情 / 创建 / 删除；`amount <= 0` 按 v1.0 约定拒绝
- 2026-06-11：Phase 4 Step 4.8 完成：新增 `src/api/stats.ts`，实现 Dashboard 汇总、日趋势、支出分类占比；收入口径对齐 design §5.2（非 cancelled 订单 + 开次卡收入）；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock 端到端 smoke test 通过；Phase 4 里程碑完成，等待用户验证后再进入 Phase 5
- 2026-06-11：Phase 5 Step 5.1 完成：按 uni-app 官方文档改用内置 Pinia，不在 `package.json` 手动安装；`src/main.ts` 使用 `import * as Pinia from 'pinia'`、`app.use(Pinia.createPinia())`，并从 `createApp()` 返回 `Pinia`；新增 `src/types/pinia.d.ts` 供本地 `vue-tsc` 在零运行时依赖模式下识别类型。
- 2026-06-11：Phase 5 Step 5.2 完成：新增 `src/stores/customer.ts`，提供客户列表缓存、`loading`、`byId(id)` getter，以及 `refresh` / `create` / `update` / `remove` actions；写操作后自动刷新列表。
- 2026-06-11：Phase 5 Step 5.3 完成：新增 `src/stores/order.ts`，提供订单日期筛选、列表缓存、`loading`，以及 `setDate` / `refreshForDate` / `create` / `markDelivered` / `cancel` actions；配送和取消异常不在 store 层吞掉，交给页面处理。
- 2026-06-11：Phase 5 Step 5.4 完成：新增 `src/stores/expense.ts`，提供支出列表、默认分类、当前日期和 `loading` 状态，以及 `refreshForDate` / `refreshCategories` / `create` / `remove` actions；支出写入后自动刷新当前日期列表。
- 2026-06-11：Phase 5 Step 5.5 完成：新增 `src/stores/stats.ts`，提供 Dashboard summary、日趋势、支出分类占比、当前 range 和 `loading` 状态；`src/api/stats.ts` 导出已有的 `getRangeSummary` 供统计页区间汇总复用。`pnpm type-check` / `pnpm lint` 通过；按用户要求不手动安装 Pinia 后，CLI `pnpm build:h5` 会因找不到 `pinia/dist/pinia.mjs` 失败，需走 HBuilderX 内置 Pinia 验证。Phase 5 里程碑完成，等待用户验证后再进入 Phase 6。
- 2026-06-11：Phase 6 Step 6.1-6.3 完成：新增 `src/components/StatCard.vue` / `src/components/AmountInput.vue` / `src/components/CustomerPicker.vue`；分别提供通用数字卡片、金额输入和客户选择弹层。组件可被后续 Dashboard、统计页、订单录入和客户管理页复用；本阶段不进入 Phase 7 页面实现。
