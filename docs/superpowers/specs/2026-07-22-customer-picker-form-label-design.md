# CustomerPicker 表单标签归属设计

## 目标

订单新增和订单详情编辑中的“客户”字段，统一由外层 `uni-forms-item` 渲染字段标签，使它与日期、餐次等业务表单项保持相同的标签列和校验呈现。

## 现状与边界

`CustomerPicker` 是共享选择器，目前仅被 `src/pages/order/new.vue` 与 `src/pages/order/detail.vue` 使用。组件内部同时渲染“客户”文字，导致它绕开了外层 `uni-forms-item` 的标准标签能力。

本次不改变客户搜索、拼音分组、右侧索引、选择、新建客户入口、表单数据绑定、订单支付或数据库逻辑。

## 设计

1. `src/pages/order/new.vue` 和 `src/pages/order/detail.vue` 的 `customer_id` 表单项均使用 `label="客户"`。
2. `src/components/CustomerPicker.vue` 移除内部固定“客户”文本及其专用样式，只保留已选客户或“请选择客户”占位、箭头和选择弹层。
3. `CustomerPicker` 的 props、事件和选择交互保持不变；字段标签由调用方负责，因此组件可继续嵌入其他有独立表单标签约定的页面。

## 验收标准

1. 新建订单与编辑订单的客户字段只显示一次“客户”，且与日期、餐次标签对齐。
2. 未选择时仍显示“请选择客户”；选择客户后仍显示客户名与折扣信息。
3. 客户搜索、拼音分组、索引跳转和“新建客户”入口保持原行为。
4. `pnpm type-check`、`pnpm lint`、`pnpm build:h5` 和 `git diff --check` 通过。
