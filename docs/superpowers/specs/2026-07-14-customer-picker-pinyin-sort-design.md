# CustomerPicker 客户拼音分组索引设计

## 目标

所有使用 `CustomerPicker` 的客户选择列表采用与客户管理页一致的通讯录式结构：按客户姓名拼音排序和分组，并通过右侧字母索引跳转。目前覆盖新建订单和订单详情编辑两个入口。

## 实现

- 在 `src/components/CustomerPicker.vue` 中复用 `src/utils/pinyin.ts` 导出的 `compareCustomerName` 和 `getCustomerInitial`。
- 客户数据先复制并按完整姓名拼音排序，再基于现有姓名、微信和手机号规则过滤。
- 把当前匹配客户按姓名拼音首字母分为 A-Z 与 `#` 分组，并在列表中显示分组标题。
- 增加 `class="index-bar"` 的右侧字母索引，索引内容来自当前可见分组；点击字母后通过 `scroll-into-view` 跳到对应分组。
- 搜索后重新计算分组和右侧索引，匹配结果仍保持拼音顺序；本次不扩展拼音搜索能力。
- 无法归入英文字母的姓名按现有比较器规则归入 `#` 并排在最后。
- 不修改 Customer Store、客户管理列表、数据库数据、选择交互或搜索范围。

## 影响范围

- `src/components/CustomerPicker.vue`：客户选择列表的拼音排序、分组和索引跳转行为。
- `src/pages/order/new.vue`：新建订单选择客户时获得分组索引列表。
- `src/pages/order/detail.vue`：编辑订单选择客户时获得分组索引列表。
- `memory-bank/architecture.md`、`memory-bank/progress.md`：同步记录行为变化。

## 验收标准

1. 打开新建订单的客户选择弹层，中文客户按姓名拼音 A-Z 排列并显示首字母分组标题。
2. 弹层右侧显示 `class="index-bar"` 的当前分组字母列表，点击后能滚动到对应分组。
3. 打开待配送订单编辑态的客户选择弹层，分组与索引行为和新建订单一致。
4. 输入姓名、微信或手机号搜索后，匹配结果重新按拼音分组，右侧索引只显示现有分组。
5. `#` 分组位于字母分组之后，选择客户、新建客户入口及折扣展示保持原行为。
6. `pnpm type-check`、`pnpm lint` 与 `pnpm build:h5` 通过。
