# AGENTS.md

> 盒记（HeJi）的运行时协作规则。本文只保留稳定的项目边界、高频硬约束、任务路由和证据边界；产品细节、文件清单、当前状态和 API 事实由相应文档、源码和配置维护。说明与当前代码、配置、目录或脚本冲突时，以现场为准。

## 1. 现场优先：开工门

对每个非琐碎任务按顺序执行：

1. 检查 `git status --short --branch`，识别并保留用户已有的 dirty changes；读取 `memory-bank/architecture.md` 和目标文件，确认真实路径、职责、调用点与现有验证。
2. 按下表命中任务分支，读取对应权威来源；用户点名的文档、Spec 或 Ticket 先进入该分支。
3. 收敛为最小变更、明确不改范围和实际可执行的验证，再开始编辑。

开工门完成标准：能明确指出目标文件、唯一事实源、受影响不变量和验证路径；仍有关键未知时继续取证，不凭历史计划补全。

| 触发分支 | 读取路由 |
|---|---|
| 数据模型、字段、订单、次卡、统计、备份或业务流程 | 读 `memory-bank/design-document.md` 的相关章节；若有对应批准的 `docs/superpowers/specs/`，一并读取；检查实际 schema / API / tests；需要版本或历史边界时再读 `memory-bank/CHANGELOG.md` 的对应版本。 |
| 页面视觉、布局、样式 token 或业务表单 | 读 `docs/design.md §4` 和当前目标页面；UI 验收按 `docs/design.md §6`。 |
| 新增或重做 UI 交互 | 先读 `docs/uni-modules-ai-index.md`，再读选中组件的本地 README 与项目内用例；首次采用尚未验证的组件后安排 HBuilderX Android 回归。 |
| SQLite、`plus.sqlite`、原生桥或 Android 异常 | 先读 `debug-docs/DEBUG-HANDOFF.md §2–§4` 与 `src/db/index.ts`；原生结论只从对应 Android 验证取得。 |
| 新建、删除、移动文件，或改变文件职责、路由、依赖 | 读 `memory-bank/architecture.md` 和实际目录 / 配置；完成后登记职责变化。 |
| 计划、里程碑、回归状态或历史验收 | 读 `memory-bank/progress.md`、`memory-bank/implementation-plan.md` 和相关 `CHANGELOG` 条目；历史记录不替代当前实现检查。 |

## 2. 最小路径：范围与改动边界

- 盒记是 Android 侧载、单用户、本地 SQLite 的盒饭档口记账 App，闭环为接单 → 配送 → 对账。
- 当前 schema 与脚本以实际源码和 `package.json` 为准；版本、待验证项和历史状态以 `memory-bank/architecture.md`、`memory-bank/progress.md`、`memory-bank/CHANGELOG.md` 为准；不要把可变快照复制到本文件。
- 只实现用户请求及其必要连带改动；保留已有未提交改动。除非用户明确要求，不提交、推送、发布、部署、合并或回滚。
- 新依赖、批量删除 / 重命名、迁移历史、权限或生产配置变更，先说明影响、替代方案和恢复路径，取得明确授权后再做。

## 3. 事务边界：变更路由

| 要改什么 | 最小路径 |
|---|---|
| 表或字段 | `memory-bank/design-document.md` → `src/db/schema.ts` → 在 `src/db/migrations.ts` 末尾追加 → types → API → store / 页面 → 备份兼容。 |
| 多表写入 | 在 `src/api/*.ts` 内使用 `tx()`；让失败以可读业务错误返回 UI。 |
| 页面 | `src/pages.json` 注册路由 → 页面；业务表单遵守 §6。 |
| 跨页 UI | 放在 `src/components/`，只承接展示与事件上抛；业务写入留在 API 层。 |
| 统计 | 由 `src/api/stats.ts` 维护；日期口径按设备本地时区的自然周 / 自然月。 |
| 备份 | 由 `src/utils/backup.ts` 及关联 API 维护；导出前、导入后都校验 schema 版本。 |

## 4. 单一事实源：业务不变量

### 订单与支付

- 同一客户 + 日期 + 餐次只保留一个有效逻辑订单：pending 合并本次增量并保留原 ID / 排序；delivered 阻止新增；cancelled 作为历史，不复活。
- 支付形态只有纯微信、纯现金、纯次卡，或次卡 + 一种货币渠道。`orders.amount` 只存货币部分，纯次卡为 0；组合支付的次卡次数必须显式填写。

### 次卡

- pending 订单只形成 `meal_card_quantity` 逻辑预占；配送成功时才扣次。余额不足时整笔事务回滚，保留 `InsufficientCardError` 语义并引导用户编辑支付；不自动转换支付或部分扣次。
- 次卡按次数、无有效期；允许多张 active 卡；配送按客户余额池旧卡优先扣次，可跨卡完成一单；已配送订单删除按 `meal_card_usages` 精确回滚。

### 价格、统计与删除

- 默认价 × 折扣率只用于预填，用户可改；历史订单价格不反向影响新订单。
- 统计排除 cancelled：收入 = 有效订单货币金额 + 开卡金额，支出 = `amount - refund_amount`，利润 = 收入 - 支出。
- 删除采用硬删除并回滚已产生的业务副作用；保持 `PRAGMA foreign_keys = ON`。无法安全回滚的删除入口拒绝操作并给出原因与下一步。

## 5. 数据与金额约定

- schema 是数据库的单一事实源；已发布的 `MIGRATIONS` 段保持不变，新表 / 字段只能在末尾追加迁移。
- 金额落库为 `REAL`，展示使用 `formatMoney()`；业务金额运算统一使用 `roundMoney` / `addMoney` / `subtractMoney` / `multiplyMoney` / `divideMoney`，不在业务代码中直接使用 `+ - * /`、`toFixed()` 或 `Math.round()`。
- SQLite 是唯一持久数据源；Pinia 只缓存视图数据，所有写入由 API 负责。
- 保持现有 uni-app + 本地 SQLite + uni-ui 方案。ORM、持久化 store、Tailwind / UnoCSS、图表库、网络库或无必要 UI 库只有在说明缺口并获明确授权后才能引入。

## 6. UI 与本地组件

- 新增或重做 UI 先走 §1 的组件索引路由；本地组件同时满足交互、Android App、设计规范和无多余行为时优先复用。不要因组件已存在而批量替换既有实现。
- 纯 CSS、业务逻辑或数据层变更沿用现有实现，不触发组件选型。
- 业务表单统一使用 `<

>` + `<uni-forms-item name="...">`；输入 / 选择控件放在对应 item 内，提交走 `formRef.validate()`。业务字段不使用原生 `input` / `textarea` / `picker` / `radio-group` / `slider`。
- 表单视觉、标签列、控件对齐、表面、状态、底部确认区和迁移边界只以 `docs/design.md §4` 为准；引用 `$hej-*` 的 Vue 样式块声明 `lang="scss"`。
- `uni-easyinput` 的 `@input` 传字符串；金额输入使用现有解析 helper。组件只承接展示和事件，不承接业务写入。

## 7. 平台边界：按需读取原生陷阱

- 代码编写、静态检查和 H5 构建使用现有 CLI；CLI 只运行 `package.json` 实际声明的脚本。Android 原生 SQLite、触摸和视觉验收走 HBuilderX「运行到 Android App 基座」；详细基座、插件、包名和路径以 `debug-docs/DEBUG-HANDOFF.md` 为准。
- CLI、H5、静态检查、mock 或模拟器结果只证明各自范围，不能升级为 Android 真机 SQLite / 触摸 / 视觉验收。
- 修改 `src/db` 或 `plus.sqlite` 时，动态调用保留 `this`（`fn.call(plus.sqlite, options)`），回调放在 options 内，SQL 参数经 `exec()` / `select()` helper，事务使用 `begin / commit / rollback` 字符串且不嵌套；数据库路径沿用 `_doc/...`，8 秒 callback 超时按原生桥诊断处理。
- app-plus 逻辑层没有 `window`、`document`、`requestAnimationFrame`；需要帧循环使用 `setTimeout(fn, 16)`。修改订单拖拽 / 滚动前读取 `memory-bank/CHANGELOG.md` v1.6，保持现有动态 `scroll-y`、`@scroll` 回写和边缘自动滚屏契约。

## 8. 证据分级与收口

- 按风险选择验证：行为变更跑相关测试；类型、lint、构建只在本次风险涉及时运行；文档变更检查路径 / 链接、覆盖范围和 `git diff --check`。
- 只报告实际执行的验证，并标注证据等级：`PASS` = 命令 / 平台步骤完成且结果符合目标；`BLOCKED` = 已尝试但被设备、权限或环境阻断；`NOT_RUN` = 未尝试。保留平台、范围和已知限制。
- 按分支更新权威文档：产品决策 / schema / 流程写 `design-document.md` 或对应 Spec；文件职责写 `architecture.md`；实施进度、验证、未验证项和阻塞写 `progress.md`；已发布或对外可见行为写 `CHANGELOG.md`；原生调试快照写 `DEBUG-HANDOFF.md`。不把这些文档的可变状态复制回本文件。
- 完成里程碑并形成真机 DB 基线时，按 `memory-bank/` 既有命名留存版本副本，并把实际验证范围写入进度 / 变更记录。

收口完成标准：diff 只包含请求及触发的文档同步；无敏感信息、临时文件和无关改动；路径 / 链接检查通过；`git diff --check` 通过；最终报告逐项列出实际验证、`BLOCKED` / `NOT_RUN` 项和下一步。
