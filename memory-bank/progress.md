# 盒记 — 实施进度

> v1.0 已发布（2026-06-11）。9 阶段 **61/63** 步完成，2 步按用户决策跳过（9.3 真机性能 / 9.4 Release APK 打包），用 HBuilderX 标准基座 debug APK 侧载替代。
> 下一步：v1.0 内使用 + 收集真实数据后再规划 v1.1（候选见 `CHANGELOG.md` 已知限制 / v1.1 节）。
> 完整步骤与里程碑详见 `memory-bank/implementation-plan.md`（已通过 9 阶段实施基线）。

---

## 阶段完成度（v1.0 终态）

| Phase | 内容 | 步数 | 状态 |
|---|---|---|---|
| 1 | 项目脚手架 | 8/8 | ✅ 2026-06-10 |
| 2 | 数据层（SQLite） | 6/6 | ✅ 2026-06-11 |
| 3 | 类型与工具 | 4/4 | ✅ 2026-06-11 |
| 4 | API 层 | 8/8 | ✅ 2026-06-11 |
| 5 | Pinia Stores | 5/5 | ✅ 2026-06-11 |
| 6 | 通用 UI 组件 | 3/3 | ✅ 2026-06-11 |
| 7 | 页面实现 | 18/18 | ✅ 2026-06-11 |
| 8 | 关键流程串联（E2E） | 6/6 | ✅ 2026-06-11（HBuilderX 真机手测全过） |
| 9 | 收尾与发布 | 3/5 | ✅ 2026-06-11（9.3 / 9.4 跳过） |

---

## 跳过的 2 步 + 原因

- **9.3 真机性能 smoke test**：v1.0 内使用规模小（个人档口日订单 < 50），SQLite 单表 < 1 万行；Phase 8 真机手测已覆盖 6 条 E2E 流程，UX 与功能无卡顿。性能压测在 v1.1+ 数据增长后再做。
- **9.4 build Release APK + 侧载试装**：用 HBuilderX「运行 → 运行到 Android App 基座」生成的 debug APK 即可侧载，v1.0 阶段无需正式 Release 签名打包；待 v1.1 真实数据验证后再上 Release。

---

## 更新日志

> 每条与 `memory-bank/architecture.md §更新日志` 同源，**改两边**。

- 2026-06-10：初始创建（与 `implementation-plan.md` v2 同步）。
- 2026-06-10：Phase 1 脚手架 8/8 完成，里程碑 1.8 达成。
- 2026-06-10：发现 CLI 模式编译不带 SQLite 原生模块；切到 HBuilderX 编译；`architecture.md` 新增「编译工具链」章节。
- 2026-06-10：5+ sqlite API 重写（callback 嵌 options、name 引用、async executeSql），type-check / lint 通过；HBuilderX "最新正式版" 标准基座下仍报 `getCallbackIDByFunction is not a function`。
- 2026-06-11：用户决定换 AI 接手，详细调试交接见 `debug-docs/DEBUG-HANDOFF.md`。
- 2026-06-11：接手后修复 `init()` 未 await / `transaction.operation` 误用函数 / SQL args 不被官方 API 支持 / callback 静默无超时等问题；3 项验证通过。
- 2026-06-11：发现动态取出 `plus.sqlite[method]` 后裸调用丢失 `this`；改 `fn.call(sqlite, options)` 保留 `this`，本地三项验证通过。
- 2026-06-11：用户真机落盘验证；`bookkeeping-real.db`（后并入 v1.db）确认业务表齐全、5 行默认分类、`user_version=1`；Phase 2 里程碑完成。
- 2026-06-11：Phase 3 类型与工具 4/4 完成；按用户要求验证前不进入 Phase 4。
- 2026-06-11：Phase 4 API 层 8/8 完成（customers / meal-cards / orders + errors / expense-categories / expenses / stats）；按用户要求验证前不进入 Phase 5。
- 2026-06-11：Phase 5 Stores 5/5 完成；按 uni-app 官方文档改用内置 Pinia，CLI `pnpm build:h5` 会因找不到 `pinia/dist/pinia.mjs` 失败，需走 HBuilderX 内置 Pinia 验证。
- 2026-06-11：Phase 6 通用组件 3/3 完成（StatCard / AmountInput / CustomerPicker）。
- 2026-06-11：用户确认 Phase 6 通过，进入 Phase 7；Step 7.1-7.18 完成（13 个页面 + `utils/ui.ts` / `utils/backup.ts`）；设置页导出走 `plus.io` + 系统分享。
- 2026-06-11：用户确认 Phase 7 真机验证通过，进入 Phase 8；预检修补两处核心流程：次卡次数不足改微信/现金时按客户默认价 × 折扣率重算；备份导入补齐 `schema_version` 校验。
- 2026-06-11：订单列表改用 `uni-collapse` 按午餐/晚餐折叠面板。
- 2026-06-11：次卡展示改为按所有 active 次卡汇总剩余 / 总次数（避免新开卡后只显示最新卡造成覆盖感）。
- 2026-06-11：订单详情新增 pending 订单编辑态；`api/orders.ts` 新增 `updateOrder`，限制只编辑 pending 订单。
- 2026-06-11：订单列表备注展示补齐；开次卡金额放开 0 元校验；`utils/backup.ts` 危险清空后重新 seed 5 个默认分类。
- 2026-06-11：首页状态色展示（待配送/已配送/已取消 → primary/success/warning）；订单折叠面板标题加粗 + 列表项加分割线。
- 2026-06-11：备份恢复 v1.1 小修：导出写 `_doc/backup_*.json` + 复制 `_downloads/`，恢复新增从已保存备份列表 / 本地 JSON 文件选择；真机文件路径待 HBuilderX 验证。
- 2026-06-12：新建订单日期字段补齐：`pages/order/new.vue` 新增可编辑日期，默认明天；`stores/order.ts` 新建后刷新到订单日期。
