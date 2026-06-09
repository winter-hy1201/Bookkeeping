# 盒记 — 实施进度

> 与 `memory-bank/implementation-plan.md` 配套
> 每完成一步，把对应的 [ ] 改为 [~]（进行中）或 [x]（完成）
> 每完成一个里程碑，**必须**更新本文件 + `memory-bank/architecture.md`

---

## 当前总览

- **开始日期**：未开始
- **当前阶段**：未开始
- **下一步**：Phase 1 Step 1.1 — 拉取 uni-app Vue 3 + Vite + TS 模板

---

## Phase 1 — 项目脚手架（0/8）

- [ ] Step 1.1 — 拉取 uni-app Vue 3 + Vite + TS 模板
- [ ] Step 1.2 — 安装 pnpm 依赖
- [ ] Step 1.3 — 配置 TypeScript 严格模式
- [ ] Step 1.4 — 配置 ESLint + Prettier
- [ ] Step 1.5 — 创建项目目录结构
- [ ] Step 1.6 — 创建 memory-bank 初始文件（本步）
- [ ] Step 1.7 — 配置 manifest.json（Android 基础）
- [ ] Step 1.8 — 配置 4 个 Tab 路由骨架

**里程碑 1.8 — 脚手架完成**：[ ]

---

## Phase 2 — 数据层（SQLite）（0/6）

- [ ] Step 2.1 — 编写 schema.ts（5 张表 DDL 字符串）
- [ ] Step 2.2 — 编写 migrations.ts（版本管理）
- [ ] Step 2.3 — 编写 seed.ts（默认分类）
- [ ] Step 2.4 — 编写 db/index.ts（连接 + tx）
- [ ] Step 2.5 — 在 App.vue 触发 init
- [ ] Step 2.6 — 端到端验证：DB 落盘

**里程碑 2.6 — 数据层就绪**：[ ]

---

## Phase 3 — 类型与工具（0/4）

- [ ] Step 3.1 — 定义 domain 类型
- [ ] Step 3.2 — 定义 API 入参出参类型
- [ ] Step 3.3 — 写日期工具 date.ts
- [ ] Step 3.4 — 写金额格式化 format.ts

**里程碑 3.4 — 类型与工具就绪**：[ ]

---

## Phase 4 — API 层（0/8）

- [ ] Step 4.1 — customers API（CRUD）
- [ ] Step 4.2 — meal-cards API
- [ ] Step 4.3 — orders API（基础 CRUD）
- [ ] Step 4.4 — orders API（markDelivered 流程）
- [ ] Step 4.5 — orders API（cancelOrder）
- [ ] Step 4.6 — expense-categories API
- [ ] Step 4.7 — expenses API
- [ ] Step 4.8 — stats API（聚合查询）

**里程碑 4.8 — API 层就绪**：[ ]

---

## Phase 5 — Pinia Stores（0/5）

- [ ] Step 5.1 — 安装 Pinia + 初始化
- [ ] Step 5.2 — customer store
- [ ] Step 5.3 — order store
- [ ] Step 5.4 — expense store
- [ ] Step 5.5 — stats store

**里程碑 5.5 — Stores 就绪**：[ ]

---

## Phase 6 — 通用 UI 组件（0/3）

- [ ] Step 6.1 — StatCard.vue
- [ ] Step 6.2 — AmountInput.vue
- [ ] Step 6.3 — CustomerPicker.vue

**里程碑 6.3 — 通用组件就绪**：[ ]

---

## Phase 7 — 页面实现（0/18）

- [ ] Step 7.1 — Tab 1 Dashboard 骨架（mock 数据）
- [ ] Step 7.2 — Dashboard 接入真实数据
- [ ] Step 7.3 — Tab 2 订单列表页骨架
- [ ] Step 7.4 — 新建订单表单（布局 + 客户选择）
- [ ] Step 7.5 — 新建订单：价格计算（A6 核心）
- [ ] Step 7.6 — 新建订单：支付方式 + 次卡选择
- [ ] Step 7.7 — 订单详情页（布局 + 取消）
- [ ] Step 7.8 — 订单详情：标记已配送（含次卡异常）
- [ ] Step 7.9 — Tab 3 统计页骨架
- [ ] Step 7.10 — 统计页：日趋势 + 分类占比
- [ ] Step 7.11 — Tab 4 客户列表
- [ ] Step 7.12 — 客户新建 / 编辑页
- [ ] Step 7.13 — 客户详情页（基础信息 + 历史订单）
- [ ] Step 7.14 — 客户详情：次卡卡片 + 开新卡入口
- [ ] Step 7.15 — 开次卡表单
- [ ] Step 7.16 — Tab 4 支出列表
- [ ] Step 7.17 — 支出新建页
- [ ] Step 7.18 — Tab 4 设置（备份/恢复）

**里程碑 7.18 — 所有页面就绪**：[ ]

---

## Phase 8 — 关键流程串联（0/6）

- [ ] Step 8.1 — 端到端：录单 → 配送 → 对账
- [ ] Step 8.2 — 端到端：次卡完整流程
- [ ] Step 8.3 — 端到端：次卡次数不够异常
- [ ] Step 8.4 — 端到端：取消订单
- [ ] Step 8.5 — 端到端：折扣 + 临时涨价
- [ ] Step 8.6 — 端到端：备份恢复

**里程碑 8.6 — 核心流程全部通过**：[ ]

---

## Phase 9 — 收尾与发布（0/5）

- [ ] Step 9.1 — 空状态 + Loading 防重复
- [ ] Step 9.2 — 错误处理兜底
- [ ] Step 9.3 — 真机性能 smoke test
- [ ] Step 9.4 — build Release APK + 侧载试装
- [ ] Step 9.5 — 写 CHANGELOG + v1.0 发布

**里程碑 9.5 — v1.0 发布**：[ ]

---

## 进度统计

| 阶段 | 总步数 | 已完成 | 进度 |
|---|---|---|---|
| Phase 1 脚手架 | 8 | 0 | 0% |
| Phase 2 数据层 | 6 | 0 | 0% |
| Phase 3 类型/工具 | 4 | 0 | 0% |
| Phase 4 API 层 | 8 | 0 | 0% |
| Phase 5 Stores | 5 | 0 | 0% |
| Phase 6 通用组件 | 3 | 0 | 0% |
| Phase 7 页面 | 18 | 0 | 0% |
| Phase 8 流程串联 | 6 | 0 | 0% |
| Phase 9 收尾 | 5 | 0 | 0% |
| **合计** | **63** | **0** | **0%** |

> 步骤编号与 `implementation-plan.md` v2 一致

---

## 更新日志

- 2026-06-10：初始创建（与 implementation-plan.md v2 同步）
