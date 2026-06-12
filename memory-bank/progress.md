# 盒记 — 实施进度

> 与 `memory-bank/implementation-plan.md` 配套
> 每完成一步，把对应的 [ ] 改为 [~]（进行中）或 [x]（完成）
> 每完成一个里程碑，**必须**更新本文件 + `memory-bank/architecture.md`

---

## 当前总览

- **开始日期**：2026-06-10
- **当前阶段**：**v1.0 已发布**（Phase 1-9 完成；9.3 / 9.4 按用户决策跳过，用 HBuilderX 标准基座 debug APK 侧载发布；CHANGELOG.md 已写 v1.0 节）
- **下一步**：v1.0 内使用 + 收集真实数据后再规划 v1.1（CSV 导出 / 自定义分类图标 / 备注模板 等）

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

## Phase 7 — 页面实现（18/18）

- [x] Step 7.1 — Tab 1 Dashboard 骨架（mock 数据）
- [x] Step 7.2 — Dashboard 接入真实数据
- [x] Step 7.3 — Tab 2 订单列表页骨架
- [x] Step 7.4 — 新建订单表单（布局 + 客户选择）
- [x] Step 7.5 — 新建订单：价格计算（A6 核心）
- [x] Step 7.6 — 新建订单：支付方式 + 次卡选择
- [x] Step 7.7 — 订单详情页（布局 + 取消）
- [x] Step 7.8 — 订单详情：标记已配送（含次卡异常）
- [x] Step 7.9 — Tab 3 统计页骨架
- [x] Step 7.10 — 统计页：日趋势 + 分类占比
- [x] Step 7.11 — Tab 4 客户列表
- [x] Step 7.12 — 客户新建 / 编辑页
- [x] Step 7.13 — 客户详情页（基础信息 + 历史订单）
- [x] Step 7.14 — 客户详情：次卡卡片 + 开新卡入口
- [x] Step 7.15 — 开次卡表单
- [x] Step 7.16 — Tab 4 支出列表
- [x] Step 7.17 — 支出新建页
- [x] Step 7.18 — Tab 4 设置（备份/恢复）

**里程碑 7.18 — 所有页面就绪**：[x]（2026-06-11）

---

## Phase 8 — 关键流程串联（6/6）

- [x] Step 8.1 — 端到端：录单 → 配送 → 对账
- [x] Step 8.2 — 端到端：次卡完整流程
- [x] Step 8.3 — 端到端：次卡次数不够异常
- [x] Step 8.4 — 端到端：取消订单
- [x] Step 8.5 — 端到端：折扣 + 临时涨价
- [x] Step 8.6 — 端到端：备份恢复

**里程碑 8.6 — 核心流程全部通过**：[x]（2026-06-11，HBuilderX 真机手测通过；`memory-bank/bookkeeping-v1.db` 已备份）

---

## Phase 9 — 收尾与发布（3/5，2 步跳过）

- [x] Step 9.1 — 空状态 + Loading 防重复（13 个页面 / 组件已全部就位：列表空态 + 加载中文案 + 全部保存按钮 `:disabled="!canSave"` + saving 防重 + 关键 async try/catch + toast）
- [x] Step 9.2 — 错误处理兜底（`App.vue` 新增 `onError` 全局钩子，DB 损坏时提示"数据库损坏，请用备份恢复"；`db/index.ts` `init()` 末尾跑 `PRAGMA integrity_check(1)`；`pnpm type-check` / `pnpm lint` 通过）
- [⏭] Step 9.3 — 真机性能 smoke test（**跳过**：个人内用 v1.0，规模小不跑 50 单压测；Phase 8 真机 6 条 E2E 流程已验证主路径流畅）
- [⏭] Step 9.4 — build Release APK + 侧载试装（**跳过**：用 HBuilderX 标准基座的 debug APK 直接侧载 v1.0；不打 Release 避免再加签名/云打包步骤）
- [x] Step 9.5 — 写 CHANGELOG + v1.0 发布（`memory-bank/CHANGELOG.md` v1.0 节已写好，明确记录"debug APK 直发"和"未做性能压测"两条限制；v1.0 发布 = HBuilderX 真机侧载该 debug APK）

**里程碑 9.5 — v1.0 发布**：[x]（2026-06-11，HBuilderX 真机 debug APK 侧载发布）

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
| Phase 7 页面 | 18 | 18 | 100% |
| Phase 8 流程串联 | 6 | 6 | 100% |
| Phase 9 收尾 | 5 | 3 | 60% (2 步跳过) |
| **合计** | **63** | **61** | **97%** |

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
- 2026-06-11：用户确认 Phase 6 验证通过，进入 Phase 7。Phase 7 Step 7.1-7.18 完成：实现 Dashboard、订单列表/新建/详情、统计页、我的入口、客户列表/新建编辑/详情/开次卡、支出列表/新建、备份恢复设置页；新增 `src/utils/ui.ts` 与 `src/utils/backup.ts`，扩展 `listOrders` 支持按客户查询历史订单；`pnpm type-check` / `pnpm lint` 通过。设置页导出使用 `plus.io` 写沙盒并调用系统分享，导入采用粘贴 JSON 后全量覆盖，避免引入额外文件选择插件。
- 2026-06-11：用户确认 Phase 7 真机验证通过，进入 Phase 8。Phase 8 预检修补两处核心流程：次卡次数不足改微信/现金时，按客户默认价 × 折扣率重算 `unit_price` / `amount`，而不是沿用次卡次均价；备份导入补齐 `schema_version` 兼容性校验。`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过。当前 Step 8.1 标记为进行中，待 HBuilderX / Android 真机逐条手动断言 8.1-8.6。
- 2026-06-11：订单列表体验调整：`src/pages/order/index.vue` 使用 uni-ui `uni-collapse` 按午餐 / 晚餐分成两个折叠面板，面板标题统计有效订单数、份数和金额；Phase 8 手测状态不变，仍待真机断言。
- 2026-06-11：次卡展示修正：`src/pages/me/customers/detail.vue`、`open-card.vue` 与 `src/pages/order/new.vue` 改为按所有 active 次卡汇总剩余 / 总次数；新开卡后客户详情和订单录入页都显示为旧卡 + 新卡的叠加次数，不再只显示最新卡造成覆盖感。Phase 8 手测状态不变，仍待真机断言。
- 2026-06-11：订单详情编辑能力补齐：`src/pages/order/detail.vue` 新增 pending 订单编辑态，支持修改客户、日期、餐次、份数、价格、支付方式与备注；`src/api/orders.ts` 新增 `updateOrder`，限制只编辑 pending 订单，避免已配送次卡扣次回写复杂化；Phase 8 手测状态不变。
- 2026-06-11：订单列表备注展示补齐：`src/pages/order/index.vue` 的订单元信息行在单价后显示非空备注；Phase 8 手测状态不变。
- 2026-06-11：开次卡金额校验调整：`src/pages/me/customers/open-card.vue` 放开 0 元次卡保存，保留总次数大于 0 与金额非负有效数字校验；Phase 8 手测状态不变。
- 2026-06-11：危险清空修复：`src/utils/backup.ts` 的 `clearAllData()` 清空后在同一事务内重新 seed 5 个默认支出分类，`backup.vue` 与 design/architecture 文档同步说明，修复清空所有数据后新增支出页分类无选项的问题；Phase 8 手测状态不变。
- 2026-06-11：首页状态色展示：`src/pages/index/index.vue` 将今日订餐的待配送 / 已配送 / 已取消计数卡片和列表分组改为主题色展示，颜色分别取 `$uni-color-primary` / `$uni-color-success` / `$uni-color-warning`；Phase 8 手测状态不变。
- 2026-06-11：订单列表折叠面板样式微调：`src/pages/order/index.vue` 的午餐 / 晚餐面板标题使用 `$uni-color-primary` 并加粗，面板内订单列表项之间增加分割线。
- 2026-06-11：备份恢复 v1.1 小修：导出备份不再走系统分享，改为写 `_doc/backup_*.json` 后复制到 `_downloads/` 并提示路径；恢复保留粘贴 JSON，同时新增从已保存备份列表选择和从本地 JSON 文件选择。`pnpm type-check` / `pnpm lint` 通过，真机文件路径待 HBuilderX 验证。
- 2026-06-12：新建订单日期字段补齐：`src/pages/order/new.vue` 新增可编辑日期，默认取设备本地日期的明天；保存写入 `orders.order_date`；`src/stores/order.ts` 新建后刷新到订单日期，返回订单列表时直接展示对应日期。
