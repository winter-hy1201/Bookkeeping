# Phase 2 SQLite 调试 — 归档（2026-06-11 已解决）

> 2026-06-10 ~ 06-11 调试 v1.0 数据层时遇到 `this.getCallbackIDByFunction is not a function` 报错，跨 AI 协作定位根因。本文档归档：根因、误判复盘、5 条已确认的 5+ API 规则。
> 5 条规则的速查表见 `AGENTS.md §4`（每次写 SQLite 代码前看）；本文供"想了解背景"时翻。

---

## 0. TL;DR

**根因**：`src/db/index.ts` 的 `pify()` 把 `plus.sqlite[method]` 从对象上拆下来裸调用，丢失 `this`，触发 `this.getCallbackIDByFunction is not a function`。

**修复**：`fn.call(plus.sqlite, options)` 保留 `this`。

**验证**：HBuilderX / Android 真机输出 `[db] init OK`；`memory-bank/bookkeeping-v1.db`（从 real.db 归档而来）业务表齐全、`expense_categories=5`、`user_version=1`。

---

## 1. 调试时间线（一段话压缩）

Phase 1+2 一次性跑完（v0.db CLI smoke-test 通过）→ 真机 `init()` 报 `Cannot read property 'executeSql' of undefined`（openDatabase 同步返回 void，我误拿句柄）→ 改 callback 形式后 `adb pull` 0 字节文件 → `openDatabase` callback 静默不触发，曾误判为 HBuilderX 标准基座 SQLite 模块空壳 → 加 `isOpenDatabase` / `selectSql` 深度诊断确认 `isOpenDatabase` 这种 JS 同步方法能调、native 调用全是 stub → 用户切到 HBuilderX 调试基座（包名变 `io.dcloud.HBuilder`）→ 用户提供掘金 SQLite 封装文章示例（都是 `plus.sqlite.openDatabase({...})` 直接调用），对照发现当前 `pify()` 取出方法后裸调用丢 `this` → 改 `fn.call(sqlite, options)` → 真机 `[db] init OK`。

---

## 2. 5+ SQLite API 已确认的 6 条规则

按"踩坑会复发"程度排序；这 6 条是 v1.0 真机验证沉淀下来的硬约束：

1. **方法不要从对象上拆下来裸调** — 5+ API 内部用 `this.getCallbackIDByFunction` 注册回调。`fn.call(plus.sqlite, options)` 是唯一允许的动态分发。
2. **`openDatabase` 的 callback 嵌在 options 里** — `{ name, path, success, fail }`，success 无参数。拆成位置参数会失败。
3. **`executeSql` 不接受 args 数组** — 5+ 官方 `sql` 字段只接受字符串/字符串数组。参数化 SQL 在 `src/db/index.ts` 的 `exec()` / `select()` helper 内手工转义 `?` 占位符。
4. **`transaction` 的 `operation` 是字符串** — 必须是 `'begin' | 'commit' | 'rollback'`，不是函数。多表写入统一走 `tx<T>(fn)`。
5. **callback 静默不触发 = 8 秒超时** — `pify()` 已加 8 秒超时报错，便于识别 native 桥缺失。先看是超时还是立刻报错，不要先归因到基座没装 SQLite。
6. **`path` 用相对路径 `'_doc/xxx'`** — 不要用绝对路径（5+ 推荐相对路径，绝对路径在调试基座下会变）。

---

## 3. 误判复盘（避免下次重蹈覆辙）

| 误判 | 真相 |
|---|---|
| `this.getCallbackIDByFunction is not a function` = 基座里 plus.sqlite 是空壳 | 是封装层裸调用丢 `this`；空壳会让同步方法也失败，但 `isOpenDatabase` 是 JS 同步方法能调 |
| `selectSql` 返回 `undefined` = native 不工作 | 是 `selectSql` 内部用 `this` 失败后没返回；用 `fn.call` 修复后正常 |
| callback 不触发 = path 错或 module 没装 | 多数情况是 callback 内 `this` 失败；用 8 秒超时 + `isOpenDatabase` 诊断 |
| 标准基座 SQLite 不可用，要装"App 开发版" | 3.4.6+ 已统一标准包，SQLite 通过「App 开发版插件」提供；先勾 `manifest.json` 的 SQLite 模块 |

---

## 4. 关键参考

| 文档 | 用途 |
|---|---|
| [5+ sqlite API 文档](https://www.html5plus.org/doc/zh_cn/sqlite.html) | openDatabase / executeSql / selectSql / transaction 正确签名 |
| [HBuilderX 版本说明](https://ask.dcloud.net.cn/article/35765) | 3.4.6+ 统一标准包，SQLite 通过插件获得 |
| `AGENTS.md §3` 编译工具链 | CLI 不带 SQLite → 必须 HBuilderX 真机编译 |
| `AGENTS.md §4` 5+ SQLite 三大踩坑 | 速查表（每次写 SQLite 代码前看） |
| `memory-bank/architecture.md` §db/ | `src/db/index.ts` 当前实现说明 |
| `memory-bank/design-document.md §2.1` | 5 张表 DDL |

---

## 5. 环境指纹（截至 v1.0 验证）

- 平台：macOS Darwin 25.5.0
- Node v20.19.5 / pnpm 10.17.1
- 项目路径：`/Users/anke/Downloads/002_个人/code/Bookkeeping`
- 生产包名：`com.bookkeeping.app`（HBuilderX 调试基座下变 `io.dcloud.HBuilder`）
- DB 推荐路径（5+）：`_doc/bookkeeping.db`
- DB 实际映射（基座）：`/storage/emulated/0/Android/data/io.dcloud.HBuilder/apps/HBuilder/doc/bookkeeping.db`
- uni-app 模板来源：`dcloudio/uni-preset-vue#vite-ts`
- TS 4.9.5 / vue-tsc 1.8.27（不升 5.x，模板基线不稳）
