# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：仅文档阶段，代码尚未脚手架
- **已建文件**：`docs/PRD.md`、`CLAUDE.md`、本目录 5 份活文档
- **DB 状态**：未创建
- **最后更新**：2026-06-10

---

## 顶层文件

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `CLAUDE.md` | Claude Code 入口；项目概述 + 关键设计约束 + 写代码约定 | 极少更新（约束类） |
| `docs/PRD.md` | 已定稿的产品需求基线（不改动） | 永不更新 |
| `docs/` | 仅存 PRD.md（已定稿文档目录） | — |

---

## memory-bank/ — 活文档区（AI 协作）

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `memory-bank/design-document.md` | 产品设计文档：数据模型、状态机、关键流程、UI 草图、TBD 清单 | 决策变更时（如 A1→A2） |
| `memory-bank/tech-stack.md` | 技术选型 + 明确不引入项 + 演进路径 | 选型变更时 |
| `memory-bank/implementation-plan.md` | 分步实施计划（67 步，9 阶段） | 计划调整时（极少） |
| `memory-bank/progress.md` | 实施进度（按 implementation-plan.md 步骤打勾） | 每完成一步 |
| `memory-bank/architecture.md` | **本文件**：每个代码文件的作用说明 | 每个文件新建/删除/职责变化时 |
| `memory-bank/*.db` | DB 备份（v0 基线、v1 发布版等） | 阶段性快照 |

---

## src/ — 应用代码（待创建）

### 入口与配置
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Step 1.x 填写）_ |

### pages/ — 页面（uni-app 自动路由）
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 7 填写）_ |

### components/ — 跨页组件
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 6 填写）_ |

### stores/ — Pinia 状态
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 5 填写）_ |

### db/ — SQLite 数据层
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 2 填写）_ |

### api/ — 数据访问
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 4 填写）_ |

### utils/ — 工具函数
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 3 填写）_ |

### types/ — TS 类型
| 文件 | 作用 |
|---|---|
| _（待创建）_ | _（待 Phase 3 填写）_ |

---

## 关键架构决策

| 决策 | 位置 | 影响范围 |
|---|---|---|
| 5 张表结构 | `memory-bank/design-document.md §2.1` | 所有 db / api / store |
| 次卡扣次 = 配送完成（A1） | `memory-bank/design-document.md §3.2 §4.3` | orders API、UI 流程 |
| 客户默认价 + 折扣率（A6） | `memory-bank/design-document.md §2.1 §4.1` | customers API、订单录入 UI |
| 1 订单 = 1 餐 + 多份（D1） | `memory-bank/design-document.md §2.1` | orders schema |
| 不收配送费（D4） | `memory-bank/design-document.md §2.1` | 不存在 delivery_fee 字段 |
| 次卡按"次"无有效期 | `memory-bank/design-document.md §2.1 §3.2` | meal_cards 无 end_date / expired 状态 |
| SQLite 是唯一数据源 | `memory-bank/tech-stack.md §7` | 不引 pinia 持久化插件 |
| 多表写入必走 tx() | `memory-bank/design-document.md §4` | db/index.ts 提供 tx() 工具 |

---

## 外部依赖（package.json 待创建时填）

| 依赖 | 用途 | 来源 |
|---|---|---|
| _（待 Step 1.1 后填）_ | _ | _ |

---

## 更新日志

- 2026-06-10：初始创建（仅文档阶段，src/ 全空）
