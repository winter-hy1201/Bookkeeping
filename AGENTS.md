# AGENTS.md

> 盒记（HeJi）的运行时协作规则。这里仅保留会改变实现、验证或范围的约束；产品细节、历史复盘和完整 API 说明留在各自的权威文档。

## 0. 项目边界

- Android 侧载、单用户、本地 SQLite 的盒饭档口记账 App；业务闭环是接单 → 配送 → 对账。
- 当前基线：schema v5、v1.12 的一餐一单 / 组合支付 / 次卡预占，以及 v1.13 的 UI 设计基线均已落地；HBuilderX 真机回归仍待执行。
- 不扩展用户未要求的业务、依赖、页面或重构范围。保留已有未提交改动；除非用户明确要求，不提交、推送、发布或回滚。

## 1. 开始前：按任务取证

先读目标文件和 `memory-bank/architecture.md`，再按任务读取下表中的权威来源。不要把历史实现计划或本文件当成 API 文档。

| 任务 | 必读来源 | 入口 / 硬边界 |
|---|---|---|
| 数据模型、订单、次卡、统计、备份 | `memory-bank/design-document.md`、`memory-bank/CHANGELOG.md` | 先确认已有业务决策和兼容边界 |
| 页面视觉、交互、样式 token | `docs/design.md` | 沿用 `$hej-*` token；业务表单遵守其中的 §4 |
| 新增或重做 UI 交互 | `docs/uni-modules-ai-index.md` | 先查本地组件；满足条件才优先复用 |
| SQLite / 原生桥 / Android 异常 | `debug-docs/DEBUG-HANDOFF.md`、`src/db/index.ts` | 不依据 CLI 结果判断原生 SQLite 成败 |
| 文件职责、路由、依赖、现状 | `memory-bank/architecture.md` | 新建、删除或改变职责后必须同步它 |
| 里程碑、回归项、历史验收 | `memory-bank/progress.md`、`memory-bank/implementation-plan.md`、`memory-bank/CHANGELOG.md` | 只跑与本次风险相关的检查 |

## 2. 改动路由

| 要改什么 | 最小路径 |
|---|---|
| 表 / 字段 | design → `schema.ts` → **在 `migrations.ts` 末尾追加** → types → API → store / 页面 → 备份兼容 |
| 多表写入 | `src/api/*.ts` 内用 `db.tx()`；失败时向 UI 返回可读错误 |
| 页面 | `src/pages.json` 注册路由 → 页面；业务表单遵守 §6 |
| 跨页 UI | `src/components/`；只承接展示与事件上抛，不承接业务写入 |
| 统计 | `src/api/stats.ts`；本地时区自然周（周一至周日）/ 自然月（1 日至月末） |
| 备份 | `src/utils/backup.ts` 与关联 API；导出前、导入后都校验 `schema_version` |

## 3. 编译与验证

- CLI 只用于 `pnpm test`、`pnpm type-check`、`pnpm lint`、`pnpm build:h5`；实际执行哪些由本次变更决定。
- Android 原生 SQLite、触摸和视觉行为必须在 HBuilderX「运行到 Android App 基座」验证。不要新增虚假的 `dev:app-android` / `build:app-android` scripts。
- 需要真机 DB 时，标准基座包名是 `io.dcloud.HBuilder`；生产包名才是 `com.bookkeeping.app`。详细路径与首次配置见 `debug-docs/DEBUG-HANDOFF.md`。
- 只报告实际执行过的验证。文档改动至少检查链接/路径、覆盖范围和 `git diff --check`。

## 4. 5+ SQLite 速查

- 动态调用必须保留 `this`：`fn.call(plus.sqlite, options)`；`openDatabase` 的回调放在 options 内。
- `executeSql` 不接收 args 数组；只通过 `src/db/index.ts` 的 `exec()` / `select()` helper 处理占位符。
- `transaction.operation` 只能是 `'begin' | 'commit' | 'rollback'`；多表写入统一走 `tx<T>()`，不要嵌套事务。
- 数据库路径用 `'_doc/...'`；native callback 8 秒无响应先按桥接超时排查。

## 5. 业务不变量

- 同一客户 + 日期 + 餐次只保留一张有效订单：pending 按本次增量合并，delivered 阻止新增，cancelled 不复活。
- 次卡仅在配送成功时扣 `meal_card_quantity`；pending 只预占。余额不足必须整笔事务回滚并引导编辑支付，不自动改支付。
- 只允许纯微信、纯现金、纯次卡，或次卡 + 一种货币渠道；禁止微信 + 现金或三种混用。`orders.amount` 只存货币部分，纯次卡为 0。
- 次卡按次数、无有效期；不加 `end_date` 或 `expired`。允许多张 active 卡，配送按客户余额池旧卡优先扣；删除已配送订单按 usage 精确回滚。
- 默认价 × 折扣率只用于预填，用户可改；历史订单价格不反向影响新订单。
- 统计排除 cancelled；收入 = 有效订单货币金额 + 开卡金额，支出 = `amount - refund_amount`，利润 = 收入 - 支出。
- 删除一律硬删除并回滚已产生的副作用；`PRAGMA foreign_keys = ON` 必须保持。

## 6. UI 与本地组件

- 新增或重做 UI 先查 `docs/uni-modules-ai-index.md`：本地存在、交互匹配、支持 Android App、符合设计/表单规则且不引入多余行为时，优先使用本地组件。
- 索引是选型路由，不是 API 副本。选中后读取本地 README 与项目内用例；未验证组件首次使用要做对应 Android 回归。
- 业务表单必须由 `<uni-forms>` + `<uni-forms-item name="...">` 承载；禁止原生 `input` / `textarea` / `picker` / `radio-group` / `slider`，也禁止散用 uni-ui 输入组件。提交走 `formRef.validate()`。
- 业务表单的视觉基准、结构、尺寸、间距、状态和迁移边界统一维护在 `docs/design.md §4`；本文件只保留组件与验证硬约束，不复制视觉参数。新增、重做或修改表单布局时必须先读该节。
- 不因为本地已有组件批量替换既有实现；纯 CSS 微调、业务逻辑和数据层变更无需触发组件检索。
- 本地组件确实不满足时先做最小自定义；新增第三方依赖前说明缺口、替代方案和影响，并等待用户同意。

## 7. 代码与数据约定

- schema 是单一事实源；已发布的 `MIGRATIONS` 段只能追加，不能修改。
- 金额存 `REAL`、展示用 `formatMoney()`；所有业务金额运算只能用 `roundMoney` / `addMoney` / `subtractMoney` / `multiplyMoney` / `divideMoney`，禁止原生 `+ - * /`、ad-hoc `toFixed()` 或 `Math.round()`。
- Pinia 只缓存视图数据，SQLite 是唯一持久层；写入仍由 API 层负责。
- `uni-easyinput` 的 `@input` 给的是字符串值，不是事件对象；数值走 `parseMoney()` 等现有 helper。

## 8. 文档与交接

- 新建、删除或改变文件职责：更新 `memory-bank/architecture.md`。
- 产品决策、schema / 流程：更新 `memory-bank/design-document.md`；完成里程碑或行为版本：更新 `CHANGELOG.md` 与 `progress.md`。
- 完成任意本仓库改动时，至少同步 `architecture.md` 与 `progress.md` 的更新日志；不把历史说明复制回本文件。
- 完成里程碑且有真机 DB 基线时，按既有命名在 `memory-bank/` 留存版本副本。

## 9. 范围与交付

- 先复现或查现场，再做最小充分改动；不顺手重构、不清理无关问题、不覆盖用户已有改动。
- 新依赖、批量删除/重命名、迁移历史、权限或生产配置变更，先说明影响并获得明确授权。
- 结束前检查 diff 中无敏感信息、临时文件和无关改动；行为/接口/流程变化时同步对应文档。

## 10. 禁止与需说明事项

- 不引 ORM、Vuex、Pinia 持久化、Tailwind/UnoCSS、图表库、网络库或无必要 UI 库；确有必要时先获授权。
- 不做软删除、次卡有效期/过期状态、自动支付转换、静默吞掉 `InsufficientCardError`。
- 不绕过 `tx()` 写多表、不改旧迁移、不把 `plus.sqlite` 方法拆出裸调。
- 不把 HBuilderX 当日常 IDE；只用于 App 原生编译与真机验证。

## 11. App 端陷阱

- app-plus 逻辑层没有 `window`、`document`、`requestAnimationFrame`；需要帧循环用 `setTimeout(fn, 16)`。
- Android 标准基座下，`scroll-view` 内依赖 JS `preventDefault()` / `.stop.prevent` 对抗滚动不可靠。订单拖拽沿用动态 `:scroll-y` 开关、`@scroll` 回写和边缘 `setTimeout` 自动滚屏；详见 `memory-bank/CHANGELOG.md` v1.6。
