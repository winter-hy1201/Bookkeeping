# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目

**盒记** — 个人盒饭档口记账 App。Android 端，本地 SQLite 存储，单用户侧载使用，不上应用市场。

## 设计文档（必读）

所有产品/技术决策都在 `docs/` 下，**改代码前先读这些**：

- `docs/PRD.md` — 需求来源（产品名、功能、使用路径）
- `memory-bank/design-document.md` — 数据模型、状态机、关键流程、UI 草图、TBD 清单
- `memory-bank/tech-stack.md` — 技术选型、明确不引入项、演进路径

---

## 技术栈

| 层 | 选 |
|---|---|
| 框架 | uni-app (Vue 3) + Vite + CLI（不用 HBuilderX） |
| 语言 | TypeScript |
| 状态 | Pinia（≤ 4 个 store） |
| UI 组件 | uni-ui（不引 uView Plus） |
| 数据库 | plus.sqlite（uni-app 内置） |
| 日期 | dayjs |
| 图标/图表 | emoji + CSS 进度条（v1.0 不引图表库） |
| 包管理 | pnpm |

完整反选清单（不引 HBuilderX、uCharts、ORM、Tailwind、Vuex、Axios、Pinia 持久化、CI/CD 等）见 `memory-bank/tech-stack.md §3`。

---

## 关键设计约束（影响代码，必须遵守）

1. **次卡扣次时机 = 配送完成时**（A1）。创建订单不扣次，取消 pending 订单不返还
2. **客户默认单价 + 折扣率**（A6）。`customers.default_lunch_price` / `default_dinner_price` / `discount_rate`；订单录入时 `unit_price = 默认价 × 折扣率`，用户可手动覆盖
3. **1 订单 = 1 餐，可含多份**（D1）。`orders.meal_type` + `orders.quantity`
4. **不收配送费**（D4）
5. **次卡按"次"计费，无有效期**（已精简）。**不要**加 `end_date` 字段或 `'expired'` 状态
6. **次卡异常（配送时次数不够）**：引导用户改 wechat / cash 整单按单点价，**不**做"部分月卡 + 部分单点价"拆分到同一单
7. **次卡订单的 `amount` 记 0**（开卡时已收款），`unit_price` 仍按客户默认价填入（用于 UI 显示和统计参考）
8. **统计口径** = 自然周（周一-周日）+ 自然月（1 号-月底），"今日"按本地时区
9. **开次卡无续卡概念**：depleted 后只能买新卡

---

## 数据层架构

5 张表（详细 DDL 见 `memory-bank/design-document.md §2.1`）：

| 表 | 用途 |
|---|---|
| `customers` | 客户档案 + 默认价 + 折扣率 |
| `meal_cards` | 次卡（典型 20 次，配送完成扣次，status: active/depleted）|
| `orders` | 订单（meal_type / quantity / unit_price / amount / payment_method / meal_card_id / status）|
| `expense_categories` | 支出分类（首次启动 seed 5 个默认）|
| `expenses` | 支出记录 |

**关键规则**：
- 启动时读 `PRAGMA user_version`，按 `db/migrations.ts` 顺序升级
- 所有多表写入（建单 / 取消 / 标记已配送 / 开次卡）必须用 `db/index.ts` 的 `tx()` 包裹
- **SQLite 是唯一数据源**，Pinia 只缓存当前 view 所需的数据，**不引** `pinia-plugin-persistedstate`
- 不做软删除，v1.0 一律硬删除

---

## 目录结构

```
src/
├── pages/        # uni-app 自动路由（4 个 Tab + 子页）
├── components/   # 跨页复用（AmountInput / CustomerPicker / StatCard）
├── stores/       # Pinia：order / customer / expense / stats
├── db/           # schema / migrations / seed / tx
├── api/          # 数据访问层：orders / customers / meal-cards / expenses / stats
├── utils/        # date / format / backup
└── types/        # 共享 TS 类型
```

完整结构与理由见 `memory-bank/tech-stack.md §4`。

---

## 常用命令

**当前状态**：项目文档已就绪，**代码尚未脚手架**。起项目从 `npx degit dcloudio/uni-preset-vue#vite` 开始（详见 `memory-bank/tech-stack.md §12`）。

脚手架完成后：

```bash
# 开发
pnpm dev:app-android          # 连真机 / 模拟器调试

# 构建
pnpm build:app-android         # Debug APK（自己能跑、不能上架）
pnpm build:app-android:release # Release APK（自签名，侧载安装）

# 代码质量
pnpm lint
pnpm format
```

**真机调试**：Android 手机开"开发者选项" + "USB 调试" → USB 连电脑 → `pnpm dev:app-android` → 热更新

**构建 Release**：见 `memory-bank/tech-stack.md §8.3`

---

## 写代码时的约定

- **加新表 / 新字段**：先改 `memory-bank/design-document.md §2.1`，再写代码。schema 是单一事实源，文档与代码必须同步
- **加新流程**：先在 `memory-bank/design-document.md §4` 画流程，再实现
- **遇到 §8 TBD 里的问题**：在代码注释或 commit message 里说明选择的处理方式，方便后续回头调整
- **不要做的事**：`memory-bank/tech-stack.md §3` 列了完整反选清单，常见违规：引入 ORM、引入图表库、用 Vuex、用 Axios、用 Pinia 持久化插件、用 HBuilderX
- **数据写入原则**：多表操作必走 `tx()`，单表也要在出错时给用户可读提示（不要静默失败）
- **价格与单位**：所有金额存 `REAL`（浮点），展示时用 `format.ts` 的工具函数格式化（保留 2 位小数、加千分位、加 ¥）

---

## 未来扩展（不动主结构）

- v1.1：CSV 单表导出、订单备注模板、支出分类自定义图标
- v1.2：局域网 HTTP 同步（同一 WiFi 下两台设备互推）
- v2.0：视情况加 H5 / iOS 适配（uni-app 直接编译，不用换栈）


重要提示：
写任何代码前必须完整阅读 memory-bank/@architecture.md
写任何代码前必须完整阅读 memory-bank/@design-document.md
每完成一个重大功能或里程碑后，必须更新 memory-bank/@architecture.md

<claude-mem-context>
# Memory Context

# [Bookkeeping] recent context, 2026-06-11 5:36pm GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 30 obs (11,981t read) | 0t work

### Jun 11, 2026
28 4:26p 🔵 Phase 6 implementation plan created with 3 UI components
30 " 🟣 Phase 6 UI components implemented
31 4:28p ✅ architecture.md updated to register Phase 6 components
32 4:29p ✅ architecture.md patched in 2 hunks to register components
35 " 🔴 Type-check failures fixed via type-narrowing helpers and button type removal
36 4:31p 🔴 CustomerPicker refresh error handling added
39 4:32p 🔵 Phase 6 final state verified: all checks green, code matches design
48 4:44p ⚖️ Phase7 implementation kickoff requested after Phase6 verification
50 4:47p ⚖️ Phase7 implementation plan registered after Phase6 verification
51 " 🔵 Phase7 page scaffolding dependencies already present from Phases1-6
52 " 🔵 Phase7 implementation plan Step7.1-7.18 spec confirmed
55 4:53p ✅ Phase7 utility modules created: src/utils/ui.ts and src/utils/backup.ts
57 4:54p ✅ Phase 7 page implementation completed (Steps 7.1–7.18)
58 " 🔴 Type-check surfaced 10 errors blocking Phase 7 verification
61 5:05p 🔴 Bookkeeping 真机编译报 pinia 模块解析失败
63 5:08p 🔵 Phase 8 实施指令 — 从 Phase 7 已验证完成过渡到 Phase 8 开始
64 5:11p 🔵 Phase 8 启动 — 主会话阅读活文档与实施计划定位
65 " 🔴 Step 8.3 — 次卡不足改支付路径改用客户默认价 × 折扣率
66 " ✅ Step 8.3 — 备份 schema_version 兼容性校验补齐
68 5:12p ✅ Step 8.1 进度标记为进行中 + 总览阶段描述更新
71 5:15p ✅ Phase 8 预检收尾：progress.md / architecture.md 双文档同步 + 计划四步全部 completed
73 5:29p 🔵 Bookkeeping 用户请求把表单组件改用 uni-ui
74 " 🔵 Bookkeeping Phase 7 表单页面与组件清单
75 " ⚖️ uni-ui 引入与工具链约束
76 " 🔵 主会话在 brainstorming 阶段读取上下文
82 5:31p 🔵 Bookkeeping 完整 uni-ui 组件清单（uni_modules 形式已就位）
83 " 🔵 Bookkeeping 表单组件与表单字段映射
84 " 🔄 AmountInput 改用 uni-easyinput
85 " 🔄 CustomerPicker 搜索框改用 uni-easyinput
86 " 🔵 uni-easyinput @input 入参差异（关键迁移纪律）
</claude-mem-context>