# 盒记 — 实施计划索引

> **v1.0 已发布**（2026-06-11，9 阶段 61/63 步完成，2 步按用户决策跳过）。详细 63 步回放见 `archive/implementation-plan-v1.0.md`（v1.0 实施基线）。
> **本文作用**：v1.1+ 起新需求进来时，按本文档的「阶段模板」拆步实施，不再依赖 v1.0 历史计划。
> 阶段进度见 `progress.md` §阶段完成度；文件级说明见 `architecture.md`。

---

## 10. 次卡充值记录与总次数校正（2026-07-14）

> 设计基线：`docs/superpowers/specs/2026-07-14-meal-card-recharge-records-design.md`

### Step 10.1 — 次卡总次数修改 API `[x]`

- `src/types/api.ts` 增加 `UpdateMealCardTotalInput`。
- `src/api/errors.ts` 增加 `MealCardTotalTooSmallError`。
- `src/api/meal-cards.ts` 增加 `updateCardTotalMeals()`，事务内校验下限并同步 `active/depleted`。

### Step 10.2 — 充值记录入口与列表 `[x]`

- `src/pages/me/customers/detail.vue` 增加“充值记录”入口。
- 新增 `src/pages/me/customers/card-records.vue`，按新到旧展示全部次卡记录。
- `src/pages.json` 注册充值记录路由。

### Step 10.3 — 开卡/编辑共用表单 `[x]`

- `src/pages/me/customers/open-card.vue` 改为 `<uni-forms>` + `<uni-forms-item>`。
- 带 `cardId` 时进入编辑模式，充值金额、日期和已用次数只读，仅允许修改总次数。

### Step 10.4 — 文档同步 `[x]`

- 同步 `design-document.md` / `architecture.md` / `progress.md` / `CHANGELOG.md`。
- 明确本次不改 schema、备份结构、历史充值金额和 `meal_card_usages`。

### Step 10.5 — 静态门禁与真机回归 `[~]`

- CLI：`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 已通过（H5 仅有既有 uni-ui Sass deprecation warnings）。
- HBuilderX 真机：覆盖调大、调小、调至已用数、低于已用数拦截、depleted 恢复 active、收入/扣次不变。

### **里程碑 10.5 — 充值记录可查可校正**：`[~]`（CLI 验证已通过，HBuilderX 真机待用户回归）

---

## 11. 组合支付、次卡预占与一餐一单（2026-07-22）

> 设计基线：`docs/superpowers/specs/2026-07-22-combined-payment-single-order-design.md`

### Step 11.1 — 领域规则与缺陷红灯用例 `[x]`

- 新增无运行时依赖的订单规则模块，承载支付拆分、次卡可用次数、备注合并和价格重算不变量。
- 用 Node 内置测试能力建立持久测试；先复现“剩余 1 次仍可保存 2 份纯次卡订单”。
- 不新增测试依赖，不用 SQL 文本 mock 伪造 `plus.sqlite`。

### Step 11.2 — schema v5、类型与备份兼容 `[x]`

- `orders` 追加 `meal_card_quantity`，旧次卡订单按 `quantity` 回填。
- 同步 domain / API 类型、v1-v4 备份导入和 v5 导出。
- 对兼容的历史 pending 重复订单做保守合并；冲突历史保留并记录诊断。

### Step 11.3 — 订单 API 与次卡预占 `[x]`

- 创建 / 编辑事务内统一校验实际剩余、其他 pending 预占和当前订单需要次数。
- 同键 pending 增量合并，delivered 阻止新增，支付冲突 / 价格变化返回可辨识业务错误。
- 配送只扣 `meal_card_quantity`；删除 delivered 组合订单按 usage 精确回滚。
- 充值记录总次数校正增加客户余额池预占保护。

### Step 11.4 — 新增 / 编辑组合支付表单 `[x]`

- 新增页与订单详情编辑态统一改为 `<uni-forms>` + `<uni-forms-item>`。
- 支持微信 / 现金 / 次卡 / 组合支付；组合支付次卡次数初始为空并手动填写。
- 新增页显示已有 pending 订单与合并后预览；价格变化、编辑撞单按规格二次确认。
- 次卡不足同时提供行内提示与 API 错误反馈。

### Step 11.5 — 订单列表与详情展示 `[x]`

- 列表删除末端“次卡 / 价格”区，副标题按餐次、总份数、次卡次数、货币金额、备注拼接。
- 备注完整换行；保留午餐 / 晚餐分组、状态、排序和拖拽行为。
- 详情只读态展示支付拆分；配送不足改为进入编辑支付，不再整单自动改微信 / 现金。

### Step 11.6 — 长期文档同步 `[x]`

- 更新 `AGENTS.md`，废除“组合支付另开单 / 禁止同单混合支付”的旧约束。
- 同步 `design-document.md`、`architecture.md`、`progress.md` 与 `CHANGELOG.md`。
- 补充 schema v5、一餐一单、pending 预占和新 E2E 回归矩阵。

### Step 11.7 — 静态门禁与真机回归 `[~]`

- 自动化：`pnpm test` 共 21 条订单规则、事务并发、列表文案与 schema / migration smoke test 已通过。
- CLI：`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 已通过；H5 仅有既有 Sass deprecation warnings。
- HBuilderX 真机：组合支付、重复增量合并、预占冲突、配送扣次 / 删除回滚、列表文案、v4→v5 和备份往返。

### **里程碑 11.7 — 一餐一单支持组合支付且次卡不超卖**：`[~]`（自动化 / CLI / H5 已通过，HBuilderX 真机待回归）

---

## 12. 订单与对账 UI 基线（2026-07-22）

> 设计基线：`docs/design.md`。本阶段只调整界面层级、文案和视觉 token；不改 SQLite、订单状态机、支付规则或统计公式。

### Step 12.1 — 项目级设计规范与 token `[x]`

- 新增 `docs/design.md`，明确语义 token、按钮 / 状态 / 空态规则及 UI 验收清单。
- `src/uni.scss` 新增 `$hej-*` 画布、表面、文字、状态、间距、圆角、阴影和字级 token；保留 `$uni-color-*` 原有主题色，避免影响未重构的今日页。

### Step 12.2 — 订单空态与今日页回滚 `[x]`

- 订单列表空态可直接新建当前所选日期的首单。
- 按用户反馈，今日页恢复既有概览、状态计数和待配送 / 已配送 / 已取消三组订单布局，不再放入本阶段重构。

### Step 12.3 — 新建 / 编辑订单确认区 `[x]`

- 两个 `<uni-forms>` 统一按“订单对象 → 配送与支付（含金额） → 备注”分区；金额作为配送与支付卡内的分隔小节，不另起卡片。
- 新建 / 编辑页将本次实际金额和保存动作固定在页面底部；微信 / 现金份数摘要明确写出渠道；既有校验、合并确认、价格确认与次卡预占逻辑保持不变。

### Step 12.4 — 对账指标与趋势 `[x]`

- 统计指标改为入账收入、支出、利润、有效订单、平均每单收入。
- “收入趋势”改为“收支 / 利润趋势”，按天同时显示入账、支出和正 / 负利润；只改展示层，不改统计 API。

### Step 12.5 — 订单页顶部操作区、样式编译与录单提示 `[x]`

- 订单页只调整顶部日期 / 新建区：增加内边距，日期控件保持弱表面，新建按钮使用 `$hej-color-accent` 实心蓝；订单列表与拖拽布局不变。
- `src/pages/order/index.vue` 的 `$hej-*` 样式改用 `<style scoped lang="scss">` 编译，修复 App 回退平台默认按钮样式的问题；新增 `tests/ui-style-preprocess.test.cjs` 防止同类遗漏。
- 新建订单的合并、已配送冲突、次卡可用次数、加载 / 失败和字段占位提示改为说明原因与下一步，不改订单规则。
- 新建 / 编辑订单将“配送与支付”与“金额”合并为一张卡，金额保留为内部分隔小节；固定确认区按当前渠道写出“1 份微信支付”或“1 份现金支付”。

### Step 12.6 — 静态门禁与 HBuilderX 回归 `[~]`

- 自动化与 CLI：`pnpm test`（22 条）/ `pnpm type-check` / `pnpm lint` / `pnpm build:h5` / `git diff --check` 已通过；H5 仅输出既有 uni-ui / Dart Sass deprecation warnings。
- HBuilderX 真机：验证今日页既有概览与三组订单显示、订单页顶部日期 / 新建区间距与蓝色主按钮、订单空态日期带入、新建 / 编辑配送与支付卡内的金额小节、微信 / 现金份数摘要、固定确认区不遮挡最后字段、按钮文字垂直居中，以及统计页正负利润与长日期范围可读。

### **里程碑 12.6 — 订单录入与对账界面**：`[~]`（CLI / H5 已通过，HBuilderX 真机视觉 / 交互待回归）

---

## 阶段模板

v1.0 的阶段切分（5-10 步/阶段，里程碑挂在最后一步）已被验证好抄。每个新需求按以下模板展开：

```text
## N. <阶段名>

### Step N.1 — <动作 / 产出物>
- 改动文件清单
- 验证方式（pnpm type-check / lint / HBuilderX 真机 / E2E 手测）
- 涉及数据层时先在 `db/index.ts` 跑 `tx()` 单测再上 UI

### Step N.2 — ...

### **里程碑 N.X — <阶段目标>**：[x]（<日期>）
```

进度标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成。每完成一步更新 `progress.md`，每完成一个里程碑同步 `architecture.md §更新日志` + `CHANGELOG.md`。

---

## 阶段切分参考（v1.0 实战）

| 阶段 | 步数 | 内容 |
|---|---|---|
| 1 | 8 | 项目脚手架 |
| 2 | 6 | 数据层（SQLite） |
| 3 | 4 | 类型与工具 |
| 4 | 8 | API 层 |
| 5 | 5 | Pinia Stores |
| 6 | 3 | 通用 UI 组件 |
| 7 | 18 | 页面实现 |
| 8 | 6 | 关键流程串联（E2E 手测） |
| 9 | 5 | 收尾与发布 |

> v1.0 共 63 步 / 9 阶段。规模适合个人项目；v1.1 候选（CSV 导出 / 备注模板 / 自定义分类图标）预估每个 3-5 步，**单阶段不超过 8 步**避免失控。

---

## 跨阶段参考（v1.0 沉淀）

| 类别 | 指引 |
|---|---|
| SQLite 5+ API 踩坑 | `debug-docs/DEBUG-HANDOFF.md §0` + `AGENTS.md §4` |
| 编译工具链 | CLI 不带 SQLite 原生模块 → 必须 HBuilderX；`AGENTS.md §3` + `architecture.md` §编译工具链 |
| 数据层 schema 变更 | `schema.ts` → `migrations.ts`（**追加**新段，不改旧段）→ `types/domain.ts` → `api/*.ts` |
| 写多表 | 必走 `db.tx<T>(fn)`；单表写也要在 catch 给用户可读提示 |
| 业务表单控件 | 统一 uni-ui（`uni-easyinput` / `uni-data-checkbox` / `uni-datetime-picker` / `uni-number-box`），禁原生 |
| 已知 v1.0 不做 | 软删除、ORM、图表库、网络库、`pinia-plugin-persistedstate` —— 详见 `AGENTS.md §10 禁止清单` |

---

## 何时回头读 archive

- 写 E2E 流程时翻 v1.0 的 §8（关键流程串联）确认断言模式。
- 写新 API 时翻 v1.0 的 §4（API 层）确认命名 / 返回值 / 错误类约定。
- 写新页面时翻 v1.0 的 §7（页面实现）的 18 步模板。

> archive 文件**只读**，不要回头改；下次计划直接覆写本文。
