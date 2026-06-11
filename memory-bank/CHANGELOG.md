# 盒记 — 变更日志

> v1.0 起的版本变更记录。每版一段：新增功能 / 行为变更 / 修复 / 已知限制 / TBD。
> 详细决策见 `memory-bank/design-document.md`，实施进度见 `memory-bank/progress.md`。

---

## v1.0（2026-06-11）

首个可发布版本。盒饭档口老板的个人记账 App，Android 侧载 / 本地 SQLite / 单用户。

### 已实现功能（按 PRD §4）

| # | 功能 | 状态 | 关键实现位置 |
| --- | --- | --- | --- |
| **F1** | 订单管理：录入、列表、详情、状态流转、编辑 | ✅ | `src/pages/order/{index,new,detail}.vue` + `src/api/orders.ts` + `src/stores/order.ts` |
| **F2** | 客户与次卡：客户档案、折扣率、默认单价、开次卡、剩余次数 | ✅ | `src/pages/me/customers/*` + `src/api/customers.ts` + `src/api/meal-cards.ts` |
| **F3** | 支出管理：录入、列表、删除、5 个默认分类 | ✅ | `src/pages/me/expenses/{list,new}.vue` + `src/api/expenses.ts` + `src/api/expense-categories.ts` |
| **F4** | 统计与对账：日/周/月/自定义区间，收入/支出/利润/订单数/客单价/日趋势/分类占比 | ✅ | `src/pages/stats/index.vue` + `src/api/stats.ts` |
| **F5** | 仪表盘（首页）：今日 4 数 + 待配送 / 已配送 / 已取消分组 + 订单明细 | ✅ | `src/pages/index/index.vue` |
| **F6** | 备份与恢复：JSON 全量导出（含系统分享）+ 粘贴 JSON 导入覆盖 + 危险区三次确认清空 | ✅ | `src/pages/me/settings/backup.vue` + `src/utils/backup.ts` |

### 关键行为决策（来自 design-document.md）

- **A1** 次卡扣次 = 配送完成时扣（创建订单不扣；pending 取消不返还）
- **A3** 备份导入 = 全量覆盖
- **A4** 统计口径 = 自然周（周一-周日）+ 自然月（1 号-月底），按本地时区
- **A5** 1 客户 = 1 微信身份（不支持家庭复合账户）
- **A6** 客户默认单价 + 折扣率：选客户后自动填默认价 × 折扣率，可手动覆盖
- **A7** 无期初投资功能（假设从今天开始记账）

### 收尾质量门

- 13 个页面 + 5 张表 + 4 个 Pinia store + 3 个通用组件，HBuilderX 真机 6 条 E2E 流程全部通过（Phase 8 8.1-8.6）
- 所有列表页有空态文案 + Loading 状态
- 全部保存按钮有 `:disabled` + `saving` 防重
- App.vue 全局 `onError` 兜底；DB 启动跑 `PRAGMA integrity_check(1)`，损坏时提示用备份恢复
- 静态质量门禁：`pnpm type-check` / `pnpm lint` 通过

### 已知限制（v1.0 范围内已定）

| 限制 | 位置 / 表现 | 何时回头评估 |
| --- | --- | --- |
| 无支出分类自定义增删 | 仅 5 个默认分类 | v1.1（design §8.4-A） |
| 无"关于"页 | 设置页只有备份 / 恢复 + 危险区 | v1.1（design §8.4-B） |
| "清空数据"塞在 backup 页（危险区） | 不另起独立页 | v1.1（design §8.4-C） |
| 导入仅支持粘贴 JSON | 无 plus.io 文件选择 | v1.1 |
| 备份导出不主动定时 | 用户手动触发 | v1.1 |
| 单设备 | 无云同步 / 局域网同步 | v1.2（design §7.3） |
| **未做 50 单性能压测** | 个人内用规模小，Phase 8 真机 6 条 E2E 流程已验证主路径流畅 | 真实使用一段时间后看响应 |
| **未打 Release APK** | v1.0 用 HBuilderX 标准基座的 debug APK 侧载发布，省掉自签名 keystore / 云打包步骤 | 后续若要分发给他人再补 Release |

### TBD / v1.1 候选（来自 design §7.2 / §8.2）

- CSV 单表导出（按 orders / expenses）
- 支出分类自定义图标
- 订单备注模板（"加辣" / "不要葱" 等）
- 客户一键拨号（依赖 `customers.phone` 已有）
- 仪表盘"今日利润"是否对比"昨日"百分比
- 客户列表是否需要搜索 / 拼音首字母排序
- 订单列表默认按"今天"还是"全部"
- 取消订单是否区分"配餐前取消"和"配餐后取消"（v1.1）

### 阶段基线

- 实施总进度：61 / 63 步（Phase 1-9 全部完成；Step 9.3 / 9.4 按用户决策跳过——个人内用规模无需 50 单压测和 Release 打包）
- 数据库基线：`memory-bank/bookkeeping-v1.db`（Phase 8 真机 E2E 通过后的归档）
- 工具链：HBuilderX（Android 真机 debug APK 侧载）；CLI 仅 type-check / lint / H5 编译验证
- 发布方式：HBuilderX 标准基座 debug APK 直发侧载，不走云打包 / 自签名 Release

---

> 后续版本将在本文件追加新章节，**不修改**已发布版本的内容。
