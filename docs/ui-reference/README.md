# 盒记 UI 重构参考图

本目录收录已审核的 23 张 Android 页面参考图，统一为 375×812 px。图片用于 UI 重构时对照页面结构、层级、密度、色彩和主动作，不是可直接实现的像素规范。

## 使用边界

- 页面、路由与推荐图片以本文为准。
- 视觉实现必须同时遵守上一级 [`../design.md`](../design.md) 的现行 token、组件和表单规范。
- 业务字段、状态机和流程仍以 `AGENTS.md`、`memory-bank/design-document.md` 及现有代码为准；参考图不得用于新增业务能力。
- 完整生图提示词见 [`../ui-image-generation-prompts.md`](../ui-image-generation-prompts.md)。
- 本仓库只保存 375×812 参考图，不保存 ImageGen `source.png` 母版。

## 页面与图片映射

| ID | 页面 | 路由 | 推荐版本 | 参考图 |
|---|---|---|---|---|
| 01 | 今日 | `pages/index/index` | v2 | [01-today-v2-375x812.png](images/01-today-v2-375x812.png) |
| 02 | 订单列表 | `pages/order/index` | v2 | [02-orders-v2-375x812.png](images/02-orders-v2-375x812.png) |
| 03 | 新建订单 | `pages/order/new` | v2 | [03-order-new-v2-375x812.png](images/03-order-new-v2-375x812.png) |
| 04 | 订单详情 | `pages/order/detail` | v2 | [04-order-detail-v2-375x812.png](images/04-order-detail-v2-375x812.png) |
| 05 | 统计 | `pages/stats/index` | v4 | [05-stats-v4-375x812.png](images/05-stats-v4-375x812.png) |
| 06 | 我的 | `pages/me/index` | v3 | [06-me-v3-375x812.png](images/06-me-v3-375x812.png) |
| 07 | 客户管理 | `pages/me/customers/list` | v2 | [07-customers-v2-375x812.png](images/07-customers-v2-375x812.png) |
| 08 | 客户档案 | `pages/me/customers/new` | v1 | [08-customer-form-v1-375x812.png](images/08-customer-form-v1-375x812.png) |
| 09 | 客户详情 | `pages/me/customers/detail` | v1 | [09-customer-detail-v1-375x812.png](images/09-customer-detail-v1-375x812.png) |
| 10 | 开次卡 | `pages/me/customers/open-card` | v2 | [10-meal-card-open-v2-375x812.png](images/10-meal-card-open-v2-375x812.png) |
| 11 | 充值记录 | `pages/me/customers/card-records` | v2 | [11-meal-card-records-v2-375x812.png](images/11-meal-card-records-v2-375x812.png) |
| 12 | 支出管理 | `pages/me/expenses/list` | v1 | [12-expenses-v1-375x812.png](images/12-expenses-v1-375x812.png) |
| 13 | 新建支出 | `pages/me/expenses/new` | v1 | [13-expense-new-v1-375x812.png](images/13-expense-new-v1-375x812.png) |
| 14 | 支出详情 | `pages/me/expenses/detail` | v2 | [14-expense-detail-v2-375x812.png](images/14-expense-detail-v2-375x812.png) |
| 15 | 每日菜单 | `pages/me/menus/list` | v2 | [15-menus-v2-375x812.png](images/15-menus-v2-375x812.png) |
| 16 | 新建或编辑菜单 | `pages/me/menus/edit` | v1 | [16-menu-edit-v1-375x812.png](images/16-menu-edit-v1-375x812.png) |
| 17 | 文案模板列表 | `pages/me/menu-templates/list` | v1 | [17-menu-templates-v1-375x812.png](images/17-menu-templates-v1-375x812.png) |
| 18 | 新建或编辑社群文案 | `pages/me/menu-templates/edit` | v1 | [18-menu-template-edit-v1-375x812.png](images/18-menu-template-edit-v1-375x812.png) |
| 19 | 模板历史 | `pages/me/menu-templates/history` | v1 | [19-menu-template-history-v1-375x812.png](images/19-menu-template-history-v1-375x812.png) |
| 20 | 月卡文案模板列表 | `pages/me/meal-card-templates/list` | v2 | [20-card-templates-v2-375x812.png](images/20-card-templates-v2-375x812.png) |
| 21 | 新建或编辑月卡模板 | `pages/me/meal-card-templates/edit` | v1 | [21-card-template-edit-v1-375x812.png](images/21-card-template-edit-v1-375x812.png) |
| 22 | 月卡模板历史 | `pages/me/meal-card-templates/history` | v2 | [22-card-template-history-v2-375x812.png](images/22-card-template-history-v2-375x812.png) |
| 23 | 备份与恢复 | `pages/me/settings/backup` | v2 | [23-backup-v2-375x812.png](images/23-backup-v2-375x812.png) |

## 重构建议

1. 先以 `docs/design.md` 和现有页面代码确定可复用 token、组件及业务不变量。
2. 再按本表找到对应参考图，拆分为页面骨架、可复用组件和页面专属区域。
3. 参考图中的文字与数据仅用于展示；实现时必须以真实 store / API 字段为准。
4. 根页面才有四栏 Tab；子页面只保留返回导航。每屏保持一个视觉最强的主动作。
5. 完成页面后同时做 375×812 H5 结构检查和 HBuilderX Android 真机视觉、触摸回归。
