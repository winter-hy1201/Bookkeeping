# 盒记 — 实施计划索引

> **v1.0 已发布**（2026-06-11，9 阶段 61/63 步完成，2 步按用户决策跳过）。详细 63 步回放见 `archive/implementation-plan-v1.0.md`（v1.0 实施基线）。
> **本文作用**：v1.1+ 起新需求进来时，按本文档的「阶段模板」拆步实施，不再依赖 v1.0 历史计划。
> 阶段进度见 `progress.md` §阶段完成度；文件级说明见 `architecture.md`。

---

## 阶段模板

v1.0 的阶段切分（5-10 步/阶段，里程碑挂在最后一步）已被验证好抄。每个新需求按以下模板展开：

```text
## N. <阶段名>

### Step N.1 — <动作 / 产出物>
- 改动文件清单
- 验证方式（pnpm type-check / lint / HBuilderX 真机 / E2E 手测）
- 涉及数据层时先在 `db/index.ts` 跑 `tx()` 单测再上 UI

### Step N.2 — ...

### **里程碑 N.X — <阶段目标>**：[x]（<日期>）
```

进度标记：`[ ]` 未开始 / `[~]` 进行中 / `[x]` 完成。每完成一步更新 `progress.md`，每完成一个里程碑同步 `architecture.md §更新日志` + `CHANGELOG.md`。

---

## 阶段切分参考（v1.0 实战）

| 阶段 | 步数 | 内容 |
|---|---|---|
| 1 | 8 | 项目脚手架 |
| 2 | 6 | 数据层（SQLite） |
| 3 | 4 | 类型与工具 |
| 4 | 8 | API 层 |
| 5 | 5 | Pinia Stores |
| 6 | 3 | 通用 UI 组件 |
| 7 | 18 | 页面实现 |
| 8 | 6 | 关键流程串联（E2E 手测） |
| 9 | 5 | 收尾与发布 |

> v1.0 共 63 步 / 9 阶段。规模适合个人项目；v1.1 候选（CSV 导出 / 备注模板 / 自定义分类图标）预估每个 3-5 步，**单阶段不超过 8 步**避免失控。

---

## 跨阶段参考（v1.0 沉淀）

| 类别 | 指引 |
|---|---|
| SQLite 5+ API 踩坑 | `debug-docs/DEBUG-HANDOFF.md §0` + `AGENTS.md §4` |
| 编译工具链 | CLI 不带 SQLite 原生模块 → 必须 HBuilderX；`AGENTS.md §3` + `architecture.md` §编译工具链 |
| 数据层 schema 变更 | `schema.ts` → `migrations.ts`（**追加**新段，不改旧段）→ `types/domain.ts` → `api/*.ts` |
| 写多表 | 必走 `db.tx<T>(fn)`；单表写也要在 catch 给用户可读提示 |
| 业务表单控件 | 统一 uni-ui（`uni-easyinput` / `uni-data-checkbox` / `uni-datetime-picker` / `uni-number-box`），禁原生 |
| 已知 v1.0 不做 | 软删除、ORM、图表库、网络库、`pinia-plugin-persistedstate` —— 详见 `AGENTS.md §10 禁止清单` |

---

## 何时回头读 archive

- 写 E2E 流程时翻 v1.0 的 §8（关键流程串联）确认断言模式。
- 写新 API 时翻 v1.0 的 §4（API 层）确认命名 / 返回值 / 错误类约定。
- 写新页面时翻 v1.0 的 §7（页面实现）的 18 步模板。

> archive 文件**只读**，不要回头改；下次计划直接覆写本文。
