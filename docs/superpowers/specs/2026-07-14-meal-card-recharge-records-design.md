# 次卡充值记录与总次数修改设计

> 状态：用户已复核，实现已完成，HBuilderX 真机回归待执行
> 日期：2026-07-14

## 1. 背景与目标

当前每次开次卡都会在 `meal_cards` 中生成一条独立记录，并以开卡时的 `amount` 和 `created_at` 记录收入与时间。这些记录已经具备“充值记录”的语义，不需要增加新表。

本次改动目标：

1. 在客户详情页增加“充值记录”入口。
2. 展示该客户的全部次卡充值记录。
3. 允许修改指定充值记录的总次数 `total_meals`。
4. 保证已使用次数、扣次明细和充值收入历史不被破坏。

## 2. 范围

### 2.1 本次实现

- 客户详情页次卡区域增加“充值记录”按钮。
- 新增客户次卡充值记录列表页。
- 列表展示充值日期、充值金额、总次数、已用次数、剩余次数和状态。
- 点击记录后进入修改页，仅编辑总次数。
- API 层校验总次数并同步次卡状态。
- 同步项目架构、设计、进度和变更文档。

### 2.2 不在本次范围

- 不修改充值金额 `amount`。
- 不修改充值日期 `created_at`。
- 不修改已用次数 `used_meals`。
- 不删除充值记录。
- 不新增充值记录表，不做 schema 迁移。
- 不重算历史订单或 `meal_card_usages` 扣次明细。
- 不改变客户次卡余额池的 FIFO 扣次规则。

## 3. 用户界面

### 3.1 客户详情入口

`src/pages/me/customers/detail.vue` 的“次卡”标题区保留“+ 开新卡”，并新增“充值记录”按钮。点击后带上 `customerId` 跳转到充值记录页。

### 3.2 充值记录列表

新增 `src/pages/me/customers/card-records.vue`，通过 `listCards(customerId)` 读取全部次卡，沿用当前的充值时间倒序。

每条记录展示：

- 充值日期：由 `created_at` 转换为用户可读日期。
- 充值金额：使用 `formatMoney()` 展示。
- 次数：`total_meals` 总次数、`used_meals` 已用次数、两者之差为剩余次数。
- 状态：`active` 显示“使用中”，`depleted` 显示“已用完”。

列表为空时显示“暂无充值记录”。点击一条记录后，跳转到 `open-card.vue` 的编辑模式。

### 3.3 充值记录修改

复用 `src/pages/me/customers/open-card.vue`：

- 仅带 `customerId` 时为开卡模式。
- 同时带 `customerId` 和 `cardId` 时为修改模式。
- 修改模式动态将页面标题设为“修改充值记录”。
- 充值金额、充值日期、已用次数和当前状态只读展示。
- 总次数通过 `<uni-forms>` + `<uni-forms-item>` 统一校验和提交。
- 开卡模式也一并调整为同样的 forms 结构，保持业务表单规则一致。

## 4. 数据规则

修改后的 `total_meals` 必须满足：

1. 是大于 0 的整数。
2. 不小于该卡当前的 `used_meals`。
3. 页面层与 API 层都执行校验。

状态同步规则：

- `total_meals === used_meals` 时，`status = 'depleted'`。
- `total_meals > used_meals` 时，`status = 'active'`。

修改总次数直接影响该卡以后可用的剩余次数和状态：

- `amount` 保持不变，充值收入不重复计入，也不回溯调整。
- `used_meals` 保持不变。
- `meal_card_usages` 保持不变，仍是历史扣次和订单删除回滚的事实来源。
- 历史订单中已写入的 `unit_price` 不回溯修改；修改后新建的次卡订单仍按现有逻辑使用校正后的 `amount / total_meals` 作为参考次均价。
- 客户余额池会在页面重新读取后按新的总次数汇总。

## 5. API 设计

`src/types/api.ts` 新增：

```ts
export interface UpdateMealCardTotalInput {
  total_meals: number
}
```

`src/api/meal-cards.ts` 新增：

```ts
updateCardTotalMeals(
  id: number,
  input: UpdateMealCardTotalInput,
): Promise<MealCardResult | null>
```

处理流程：

1. 读取指定次卡，不存在时返回 `null`。
2. 验证 `total_meals` 为正整数且不小于 `used_meals`。
3. 根据新总次数计算 `active/depleted` 状态。
4. 在单次数据库交易中更新 `total_meals` 和 `status`。
5. 返回更新后的次卡记录。

当新总次数小于已用次数时，API 抛出明确业务错误，页面提示“总次数不能小于已用次数 X”。

## 6. 文件改动

| 文件 | 改动 |
|---|---|
| `src/pages/me/customers/detail.vue` | 增加充值记录入口 |
| `src/pages/me/customers/card-records.vue` | 新增充值记录列表页 |
| `src/pages/me/customers/open-card.vue` | 支持开卡/修改两种模式，改为 uni-forms |
| `src/pages.json` | 注册充值记录路由 |
| `src/types/api.ts` | 增加总次数修改输入类型 |
| `src/api/meal-cards.ts` | 增加总次数修改 API 与双层校验 |
| `memory-bank/design-document.md` | 补充充值记录与总次数修改流程 |
| `memory-bank/architecture.md` | 登记新页面与文件职责变化 |
| `memory-bank/progress.md` | 登记实施进度与验证状态 |
| `memory-bank/CHANGELOG.md` | 追加本次功能与验证记录 |

不修改 `src/db/schema.ts`、`src/db/migrations.ts` 和备份 JSON 结构。

## 7. 错误处理

- 客户或次卡参数无效：提示参数无效，不执行写入。
- 次卡不存在：页面显示“充值记录不存在”。
- 总次数不是正整数：表单阻止提交并显示错误。
- 总次数小于已用次数：页面与 API 均拒绝，页面展示当前最小允许值。
- 数据库写入失败：保留原数据，提示“修改失败”。
- 保存期间禁用按钮，防止重复写入。

## 8. 验证方案

### 8.1 静态验证

- `pnpm type-check`
- `pnpm lint`
- `pnpm build:h5`

### 8.2 手工回归

1. 新客户无次卡时，充值记录页显示空状态。
2. 客户有多张次卡时，列表按新到旧展示全部充值记录。
3. 把总次数调大，该卡剩余次数增加，状态为 `active`。
4. 把总次数调小但仍大于已用次数，剩余次数正确减少，状态为 `active`。
5. 把总次数调整为等于已用次数，剩余为 0，状态变为 `depleted`。
6. 尝试把总次数调整为小于已用次数，页面拒绝提交且数据不变。
7. 把已用完次卡的总次数调大，状态恢复为 `active`。
8. 修改后返回客户详情，active 次卡汇总剩余次数与记录页数据一致。
9. 对该客户的次卡订单执行配送和删除回滚，`meal_card_usages` 仍按原规则记录和回滚。
10. 充值金额和统计收入在修改前后保持不变。

## 9. 验收标准

- 用户可从客户详情进入该客户的全部次卡充值记录。
- 用户可修改任意一条充值记录的总次数。
- 系统不允许新总次数小于该卡已用次数。
- 系统依据新总次数自动切换 `active/depleted`。
- 充值金额、历史扣次明细、历史订单和收入统计不被回溯改写。
- 新页面与修改页均具有加载、空状态、保存防重和可读错误提示。
