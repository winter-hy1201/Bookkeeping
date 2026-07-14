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

## v1.1（2026-06-11）

v1.0 范围内对备份恢复页的两点小修，主要为"导出 = 直接下载到本地"和"恢复 = 多种文件入口"。

### 行为变更

- **导出备份**：写入 `_doc/backup_YYYYMMDD_HHmmss.json` 后再复制一份到 `_downloads/`（5+ 应用私有下载目录，文件管理可见），toast 提示下载路径。**不再弹系统分享面板**（v1.0 是写完文件后调用 `plus.share`，用户要二次选 App 才算"完成"）。
- **恢复备份**：保留粘贴 JSON 文本，新增两个入口：
  - **从已保存备份选择**：`listBackupFiles()` 列 `_doc/backup_*.json` 倒序，弹 `actionSheet` 选完直接覆盖导入。
  - **从本地文件选择**：Android App 端通过系统文件选择器（Intent `ACTION_GET_CONTENT`）读取 JSON；其他端 fallback 到 `uni.chooseFile`。选完内容填到粘贴框，再点"导入覆盖"完成。

### 实现位置

- `src/utils/backup.ts` — `exportBackup()` 返回 `ExportResult { internalPath, downloadPath }`；新增 `listBackupFiles()` / `readBackupFile(path)` / `pickLocalBackupText()`；删除 `shareFile()`。
- `src/pages/me/settings/backup.vue` — 三个恢复入口按钮；本地文件入口调用 `pickLocalBackupText()`，不再依赖 WebView `<input type="file">`。

### 关闭的 v1.0 已知限制

- 导入仅支持粘贴 JSON、无 plus.io 文件选择 → v1.1 起通过 Android 系统文件选择器 / `uni.chooseFile` fallback + `listBackupFiles()` 同时覆盖"本地文件选择"和"应用沙盒内已保存备份选择"两种场景。

### 已知限制（v1.1 仍保留）

| 限制 | 位置 / 表现 | 何时回头评估 |
| --- | --- | --- |
| 导出文件落在应用私有目录（`_downloads/`） | 标准基座下用户路径是 `Android/data/io.dcloud.HBuilder/files/Download/...`，文件管理可看但不是系统下载根目录；不申请 `WRITE_EXTERNAL_STORAGE` 权限以免引入权限流程 | 后续若需在系统下载根目录出现，再加权限申请 |
| Android 文件选择依赖系统文件管理器 | 极少数设备若没有可处理 `ACTION_GET_CONTENT` 的文件管理器，会提示"打开文件选择器失败" | 真实使用中遇到再补厂商兼容 |
| 无支出分类自定义增删 / 无"关于"页 / 备份导出不主动定时 | v1.0 候选未变 | v1.1 后续小版本 |

### 验证门禁

- 静态质量门禁 `pnpm type-check` / `pnpm lint` 通过
- 真机行为：待用户在 HBuilderX 真机验证（导出路径正确、三个恢复入口可走通）
- 工具链：HBuilderX 编译验证（CLI 不再支持真机 SQLite，故跳过 H5 build 验证）

---

## v1.2（2026-06-15）

补齐详情页删除与支出编辑能力，并明确后续删除策略。

### 新增功能

- **订单详情删除**：`src/pages/order/detail.vue` 新增删除订单入口；`src/api/orders.ts` 新增 `deleteOrder()`，硬删除订单。
- **支出详情页**：`src/pages/me/expenses/list.vue` 点击卡片进入 `src/pages/me/expenses/detail.vue`；详情页支持修改日期、分类、金额、备注，以及删除支出。
- **客户详情删除**：`src/pages/me/customers/detail.vue` 新增删除入口；客户存在订单或次卡依赖时拒绝删除并提示。
- **客户姓名判重**：`src/pages/me/customers/new.vue` 新增重复姓名保存提示；`src/api/customers.ts` 在创建/改名时按 trim 后姓名兜底判重。

### 行为决策

- 删除功能统一采用 **硬删除 + 回滚已产生副作用**。
- 已配送次卡订单删除时，事务内先把对应次卡 `used_meals` 扣回，并按剩余次数恢复 `active/depleted` 状态，再删除订单。
- 微信 / 现金订单、支出删除后，统计通过查询自然少算对应收入 / 支出。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过（保留既有 `src/pages/order/index.vue` `vue/v-slot-style` warning）。
- 真机行为：待用户在 HBuilderX 真机验证订单删除回滚次卡、支出详情编辑删除、客户依赖保护。

---

## v1.3（2026-06-15）

支出管理补齐退差金额，并让统计按实际支出计算。

### 新增功能

- **支出退差金额**：`src/pages/me/expenses/new.vue` 与 `src/pages/me/expenses/detail.vue` 新增退差金额字段，默认 0。
- **实际支出预览**：新建 / 修改支出时展示 `支出金额 - 退差金额` 的实际支出；支出列表展示实际支出，有退差时补充显示原支出与退差。

### 行为变更

- schema 升级到 v2，`expenses` 新增 `refund_amount REAL NOT NULL DEFAULT 0`。
- 支出统计口径改为 `amount - refund_amount`，Dashboard / 统计汇总 / 日趋势 / 分类占比保持一致。
- 退差金额不可为负，也不可超过支出金额；旧数据迁移后退差金额为 0。
- 备份恢复允许 v1 备份导入到 v2，导入旧支出时自动补 `refund_amount=0`。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过（保留既有 `src/pages/order/index.vue` `vue/v-slot-style` warning）。
- 真机行为：待用户在 HBuilderX 真机验证 schema v2 迁移、新建 / 修改支出退差、统计口径。

---

## v1.4（2026-06-15）

订单列表补齐手动配送排序能力。

### 新增功能

- **订单拖拽排序**：`src/pages/order/index.vue` 在订单行最左侧展示 `<uni-icons type="bars" size="30"></uni-icons>` 把手；长按把手后可在午餐 / 晚餐分组内上下拖拽排序，松手后保存。
- **排序持久化**：schema 升级到 v3，`orders` 新增 `sort_order INTEGER NOT NULL DEFAULT 0`；`src/api/orders.ts` 新增 `reorderOrders()`，只更新当天同餐次订单排序号。

### 行为说明

- 排序只影响订单列表展示顺序，不影响收入、支出、利润、订单状态、次卡扣次。
- 新订单默认追加到同日同餐次末尾；未手动排序的旧订单仍按创建时间倒序展示。
- 备份恢复允许 v1/v2 备份导入到 v3，旧订单自动补 `sort_order=0`。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过；`pnpm build:h5` 通过（仅 uni-ui Sass deprecation warning）。
- 真机行为：待用户在 HBuilderX 真机验证长按左侧 bars 图标拖拽、松手保存、重进列表顺序保持。

---

## v1.5（2026-06-15）

修复首页利润、订单金额等 JS 浮点精度问题。

### 修复

- **首页利润尾数**：Dashboard 利润字段显示 `0.0000000004` 等浮点尾数（如 `100.10 + 0.20 - 100.30`），影响对账可信度。`src/api/stats.ts` 三处累加/差值（getRangeSummary / getDailyTrend / getCategoryBreakdown）改走 big.js 精确运算。
- **订单金额运算同步升级**：`src/api/orders.ts` 三处（次卡均摊单价、默认价 × 折扣率、单价 × 份数）、`src/utils/ui.ts` 两处客户默认价提示同步升级。schema 不变，无数据迁移。

### 新增依赖

- `big.js@7.0.1`（运行时）+ `@types/big.js@7.0.0`（仅类型）—— 仅增加 ~10KB 体积，纯前端任意精度十进制运算库。

### 行为说明

- `src/utils/format.ts` 新增 `roundMoney / addMoney / subtractMoney / multiplyMoney / divideMoney` 五个 helper；全局 `Big.RM = roundHalfUp`（不是银行家舍入，避免 `1.005 → 1.00` 的常见坑），所有结果强制 `toFixed(2)` 输出，确保 `number` 类型值永远只有 2 位小数。
- 业务侧禁止原生 `+ - * /` 直接算金额；金额运算必须走 helper。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过。
- 精度自测：`addMoney(0.1, 0.2, 0.3) = 0.6`（JS 原生得 `0.6000000000000001`）；`roundMoney(1.005) = 1.01`；`mulMoney(15, 0.95, 2) = 28.5`。
- 真机行为：待用户在 HBuilderX 真机重点复测首页 8.1 录单配送对账流程和 8.5 折扣临时涨价流程，确认利润字段为 `¥0.00` 而不是 `¥0.0000000004`。

---

## v1.6（2026-06-16）

修复订单列表拖拽排序在数据多时与页面滚动冲突、页面抖动拖不到指定位置的 bug。

### 背景：为什么之前的思路无效

v1.4 用 `@longpress` 激活 + `@touchmove` 绑在整个 `order-item` 上，零 `preventDefault`；scroll-view 在 touchstart 阶段已进入滚动跟踪，重排与滚动并发 → 抖动。
曾尝试用 `@touchstart.stop` + 阈值 + JS 层 `event.preventDefault()/stopPropagation()`（旧版 v1.6 文案），**但 AGENTS.md §11 自己承认：JS 层 `preventDefault` 在 Android HBuilderX 标准基座下不生效**，scroll-view 照样滚，bug 依旧。故改为**绕开冲突而非对抗它**。

### 修复（方案 B：动态 `:scroll-y` 开关 + 边缘自动滚屏）

- **核心：拖拽激活时 `:scroll-y="false"` 直接摘掉 scroll-view 的滚动能力**，从根本上不存在「滚动 vs 重排并发」。这依赖的不是 JS 层 `preventDefault`（无效），而是把滚动能力整个关掉 → 必然生效。`<scroll-view>` 改为 `:scroll-y="listScrollable"`、`@scroll="onListScroll"` 回写真实 `scrollTop`（受控 `:scroll-top` 必须同步，否则同值再设不触发）。
- **边缘自动滚屏**：手指拖到屏幕顶/底 64px（`DRAG_EDGE_PX`）内时，用 `setTimeout` 循环（16ms ≈ 60fps）驱动 `:scroll-top += direction * DRAG_EDGE_SPEED` 程序化滚屏，长列表也能拖到屏外目标。滚屏同时**反向修正 `dragState.startY`**（scrollTop 增大=内容上移=目标应往更高 index 走，startY 需减小），保证 targetIndex 跟着滚屏方向前进不错位。**坑 1：app-plus 逻辑层无 DOM API，`requestAnimationFrame` / `cancelAnimationFrame` 不可用（抛 `ReferenceError`），必须用 `setTimeout` / `clearTimeout`**。**坑 2：`scroll-y=false` 会连带禁用 `:scroll-top` 的程序化滚屏**（标准基座下滚动能力与程序化滚动耦合）——所以滚屏时必须在边缘区临时把 `listScrollable` 切回 `true`，离开边缘切回 `false` 防抖；因为手指在底/顶边缘时原生手势滚动方向与程序化滚屏方向一致，合力而非冲突，不会抖。`runEdgeAutoScroll` 是 `listScrollable` 状态切换的唯一负责者（进入边缘→true、离开边缘→false），`stopEdgeAutoScroll` 只清定时器不碰滚动状态。
- **激活改 touchstart + 阈值**：触摸事件从整个 `order-item` 下沉到 `drag-handle`；`@touchstart.stop="onHandleTouchStart"` 记录意图到新增 `dragIntent` ref，`@touchmove.stop="onHandleTouchMove"` 在移动 ≥ 10px（`DRAG_ACTIVATION_PX`）时才 `lockScroll()` + clone 列表 + 进入 `dragState`。阈值内不锁滚动，允许正常滚屏。不再用 `@longpress`（其合成事件无可用 `touches[0]`）。
- `DragState` 接口、`dragOrders / dragState / dragSaving / dragClickBlockedUntil` 四个 ref、`finishDrag / dragItemHeightPx / isDragging / touchY / clampIndex / moveOrder / sectionOrders / replaceSectionOrders` 全部保留。删除老的 `startDrag / handleTouchMove`。

### 行为说明

- 拖拽期间（`listScrollable=false`）**整个列表不能用手指滚动**，但手指在顶/底边缘附近会自动滚屏，所以仍能拖到屏外。
- 不拖拽时（默认 `listScrollable=true`）页面正常滚动。
- `dragClickBlockedUntil` 保留作为防御性兜底。
- `order/index.vue` 原有 `vue/v-slot-style` 已知 warning 不顺手修（按 AGENTS.md "不要扩面" 原则）。

### 已知限制（v1.6 范围内已定）

| 限制 | 位置 / 表现 | 何时回头评估 |
|---|---|---|
| 拖拽中手动滚屏不可用 | `listScrollable=false` 期间靠边缘自动滚屏代偿；非边缘区域不能手动滚 | 用户反馈边缘 64px/速度 6 不顺手时调参 |
| H5 / 微信小程序端未验证 | 修复基于 Android HBuilderX 真机；H5/MP 的 scroll-view 受控行为可能不同 | 若发布到 H5 再真机验证 |
| `:scroll-top` 受控陷阱 | uni-app scroll-view 受控 `:scroll-top` 有「设一次同值不再滚」特性，靠 `@scroll` 同步 + 增量设值规避 | 真机若仍异常，回退到先归零再设 |
| 折叠面板动画中触摸把手 | uni-collapse 展开/折叠动画进行中触摸 handle，可能造成 1 帧跳位 | 真机遇到再处理 |

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过（保留既有 `vue/v-slot-style` warning）。
- 真机验证：HBuilderX 真机按下方"验证清单"逐条跑过。

### 验证清单（HBuilderX 真机手测）

| # | 场景 | 关键断言 |
|---|---|---|
| 1 | 阈值前能滚动 | 触摸把手移动 ≤10px，页面正常滚动，无重排 |
| 2 | 跨阈值后页面停止滚动并重排 | 移动 >10px 后 `listScrollable=false`，页面停止滚动，item 开始重排，**不抖动**（核心 bug 断言） |
| 3 | 阈值内不误触发重排 | 在 ±10px 范围内反复移动，`dragOrders` 不被改写 |
| 4 | 触摸把手不误进 detail | 把手上 touchstart→不动→touchend，不进 detail 页，无状态变化 |
| 5 | 拖动后松手排序保存生效 | 拖到目标位置松手，toast "排序已保存"，退出再进顺序保持 |
| 6 | 长列表边缘自动滚屏 | 列表 >1 屏时，手指拖到顶/底 64px 内页面自动滚屏，能拖到屏外目标；离开边缘停止滚屏 |
| 7 | 滚屏时 targetIndex 跟随不错位 | 边缘滚屏过程中，被拖 item 的目标位置随滚屏正确前进/后退 |
| 8 | dragSaving 防重入 | 保存中再次触摸把手，不进入新 drag |
| 9 | 拖出 section 边界 | 拖到午餐段底部/顶部继续拖，被 clamp 到边界 index 而非异常 |
| 10 | 主路径回归 | 8.1 录单配送对账 / 8.4 取消订单 不受拖拽改动影响 |

---

## v1.7（2026-06-22）

订单状态流转补齐配送后的自动排序行为。

### 行为变更

- **配送完成自动沉底**：`src/api/orders.ts` 的 `markDelivered()` 成功把订单从 `pending` 改为 `delivered` 时，同步把该订单 `sort_order` 更新为同日同餐次最大值 + 1。
- 从 `src/pages/order/detail.vue` 触发配送后返回 `src/pages/order/index.vue`，列表按既有 `sort_order ASC` 重新读取，已配送订单会自动排到对应午餐 / 晚餐分组最后一位。

### 行为说明

- 复用 v1.4 已落地的 `orders.sort_order`，不新增字段、不迁移 schema。
- 次卡扣次仍发生在配送事务内；若次卡次数不足抛 `InsufficientCardError`，状态和排序都会随事务一起回滚。
- 排序只影响同日同餐次列表展示，不影响收入、支出、利润、订单数或次卡统计。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过。
- 真机行为：待用户在 HBuilderX 真机验证从订单详情标记配送后返回列表，订单位于对应餐次最后一位。

---

## v1.8（2026-06-22）

订单列表补齐“午餐完成后收起”的展示行为。

### 行为变更

- **今日午餐全部已配送后自动折叠**：`src/pages/order/index.vue` 在计算 `uni-collapse` 默认展开面板时，如果筛选日期为今天、午餐分组非空且全部订单状态均为 `delivered`，则不再默认展开午餐面板。
- 晚餐分组、非今天日期、午餐中仍有待配送 / 已取消订单时，保持原有“有订单则默认展开”的逻辑。

### 实现说明

- 折叠面板由 `:model-value="defaultOpenSections"` 控制，避免默认展开列表为空数组时 `uni-collapse` 回退到空字符串导致面板不收起。
- 该行为只影响列表展示，不改变订单状态、`orders.sort_order`、统计口径或拖拽排序持久化。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过。
- 真机行为：待用户在 HBuilderX 真机验证今天午餐全部配送后午餐面板自动折叠，手动点开仍可查看已配送订单。

---

## v1.9（2026-06-26）

修复多张 active 次卡时订单绑定到单张剩余不足次卡，导致客户总余额足够却弹出“改为微信 / 现金”的问题。

### 行为变更

- **次卡按客户余额池扣次**：`markDelivered()` 不再只看订单绑定的单张 `meal_card_id`，而是汇总该客户所有 active 次卡剩余次数；总剩余足够时按旧卡优先扣次，允许同一单跨多张卡。
- **扣次明细可回滚**：schema 升级到 v4，新增 `meal_card_usages` 表记录每个已配送次卡订单实际从哪些卡扣了几次；删除已配送次卡订单时按 usage 精确回滚各卡 `used_meals` 和 `active/depleted` 状态。
- **录单 / 编辑弱化单卡概念**：新建订单和订单详情编辑态仍保留参考 `meal_card_id` 兼容旧字段，但优先选择能覆盖本单份数的 active 卡，页面展示客户 active 次卡总剩余，减少“明明总剩余够却绑定到另一张卡”的错觉。
- **备份兼容**：导出 JSON 新增 `meal_card_usages`；导入 v1-v3 老备份到 v4 时，会按旧的已配送次卡订单 `meal_card_id + quantity` 自动补 usage 明细。

### 行为说明

- 开卡收入仍按 `meal_cards.amount` 和 `created_at` 统计，后台保留每次开卡记录，不把多张卡物理合成一行。
- `orders.meal_card_id` 现在是“首张扣次卡 / 兼容旧数据”的参考字段；精确扣次来源以 `meal_card_usages` 为准。
- 若客户所有 active 次卡总剩余仍小于订单 `quantity`，原有 `InsufficientCardError` 分支不变，继续弹出“改为微信 ¥XX / 改为现金 ¥XX / 取消标记”。

### 验证门禁

- 静态质量门禁：`pnpm type-check` 通过；`pnpm lint` 通过。
- 真机行为：待用户在 HBuilderX 真机验证客户多张 active 次卡时，订单数量小于等于总剩余即可正常标记配送；删除该已配送订单后，各次卡扣次按明细回滚。

---

## v1.10（2026-07-14）

增加客户次卡充值记录查看与总次数数据校正能力。

### 新增功能

- **充值记录入口**：客户详情次卡区域增加“充值记录”，可查看该客户全部历史次卡。
- **充值记录列表**：新增 `src/pages/me/customers/card-records.vue`，展示充值日期、金额、总次数、已用次数、剩余次数和卡状态。
- **总次数修改**：点击充值记录后可修改原 `meal_cards.total_meals`；金额、日期和已用次数只读。

### 业务规则

- 新总次数必须为正整数，且不得小于该卡已用次数。
- 新总次数等于已用次数时，卡状态改为 `depleted`；大于已用次数时为 `active`。
- 只校正原充值记录的总次数；不重复计入收入，不修改历史订单、`used_meals` 和 `meal_card_usages`。
- 本次不改 schema 和备份 JSON 结构。

### 实现说明

- `src/api/meal-cards.ts` 新增 `updateCardTotalMeals()`，在事务内校验下限、更新总次数并同步状态。
- `src/pages/me/customers/open-card.vue` 改为 `<uni-forms>` + `<uni-forms-item>`，兼容开卡和充值记录修改两种模式。
- 设计基线见 `docs/superpowers/specs/2026-07-14-meal-card-recharge-records-design.md`。

### 验证门禁

- 静态质量门禁：`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；H5 build 仅有既有 uni-ui Sass deprecation warnings。
- 真机行为：待用户在 HBuilderX 验证调大、调小、调至已用数、低于已用数拦截、depleted 恢复 active，以及充值收入/历史扣次不变。

---

## v1.11（2026-07-14）

客户列表增加当前次卡身份标识。

### 行为变更

- 客户列表头像区不再显示姓名首字；当前存在 `status='active' AND used_meals < total_meals` 次卡的客户显示“次”，其他客户显示“普”。
- 已用完的次卡不再把客户标记为次卡用户。

### 实现说明

- `src/api/meal-cards.ts` 新增 `listActiveMealCardCustomerIds()`，用一条批量 SQL 返回当前次卡用户 ID，避免逐客户查询。
- `src/pages/me/customers/list.vue` 在 `onShow` 同时刷新客户列表与次卡身份集合，保留原有搜索、拼音分组、右侧索引和详情跳转。
- 本次不修改 schema、备份格式或其他页面。

### 验证门禁

- 静态质量门禁：`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；H5 build 仅有既有 uni-ui Sass deprecation warnings。
- 真机行为：待用户在 HBuilderX 验证有剩余次数客户显示“次”，已用完和从未开卡客户显示“普”。
