# Phase 2 SQLite 调试 — 交接文档

> 用户在 2026-06-10 ~ 06-11 调试 Phase 2 数据层时遇到困难，让另一个 AI 接手。
> 本文档记录：根因、已尝试的方案、当前代码状态、推荐的解决方向。

---

## 0. TL;DR

**最终结论（2026-06-11 已解决）**：SQLite native bridge 可以工作。真正根因是封装层把 `plus.sqlite.openDatabase` 等方法从对象上取出后裸调用，导致方法内部的 `this` 丢失，从而报 `this.getCallbackIDByFunction is not a function`。

**最终修复**：`src/db/index.ts` 的 `pify()` 保留动态分发，但改成 `fn.call(sqlite, options)`，让 5+ API 内部仍能通过 `this.getCallbackIDByFunction` 注册回调。

**最终验证**：
- App 启动日志出现 `[db] init OK`
- `memory-bank/bookkeeping-real.db` 已从真机拉取
- `sqlite3 memory-bank/bookkeeping-real.db` 可打开
- 业务表齐全：`customers` / `meal_cards` / `orders` / `expense_categories` / `expenses`
- `SELECT COUNT(*) FROM expense_categories;` 返回 `5`
- `PRAGMA user_version;` 返回 `1`

**2026-06-11 接手补充**：
- 交接中的"5+ API 代码层写法完全正确"不完全成立。官方文档与本地 `@dcloudio/types` 均显示 `plus.sqlite.transaction({ operation })` 的 `operation` 是 `'begin' | 'commit' | 'rollback'` 字符串，不是函数；已在 `src/db/index.ts` 修正。
- `init()` 原先未 `await runMigrations()` / `await seedIfEmpty()`，即使 native 可用也会提前打印初始化成功；已修正。
- 官方 `executeSql` 只支持 `sql` 字符串/字符串数组，不支持 `args` 参数；已改为在 `exec()` / `select()` helper 内集中转义 `?` 参数。
- 已给 callback 静默不触发的场景加 8 秒超时报错，下一次真机验证可明确区分"代码调用失败"与"SQLite native bridge 缺失"。
- 本地验证：`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；HBuilderX / Android 真机落盘验证已通过。
- 用户提供掘金 SQLite 封装文章后，对照发现文章示例均以 `plus.sqlite.openDatabase({...})` 形式直接调用；当前 `pify()` 曾先取出 `sqlite[method]` 再裸调用，可能丢失 `this`，正好触发 `this.getCallbackIDByFunction is not a function`。已改为 `fn.call(sqlite, options)` 保留 `this`。

**直接表现**：
- `isOpenDatabase(...)` 同步返回 `boolean: false`（**JS 同步方法能工作**）
- `selectSql(...)` / `openDatabase(...)` / `executeSql(...)` 都**抛 `TypeError: this.getCallbackIDByFunction is not a function`** 或返回 `undefined`
- `getCallbackIDByFunction` 在 `Object.keys(plus.sqlite)` 列表里，但**调用时不存在**——是 mock 实现

**原误判**：此前把 `this.getCallbackIDByFunction is not a function` 判断为"基座里 plus.sqlite 是空壳"。最终验证说明这个判断不成立。该错误更符合 JavaScript 方法脱离对象调用后 `this` 丢失。

**后续方向**：继续使用 `plus.sqlite`。不要改成 `uni.setStorageSync` 兜底，除非未来真机再次证明 SQLite 模块不可用。

---

## 0.1 错误总结（最终版）

### 现象

App 启动时 `db.init()` 失败，错误信息为：

```text
[db] init failed, Error: [db] openDatabase failed: code=unknown message=this.getCallbackIDByFunction is not a function at App.vue:14
```

### 根因

`src/db/index.ts` 的 `pify()` 原先这样调用 SQLite API：

```ts
const fn = sqlite[method]
fn(options)
```

这会把 `openDatabase` / `executeSql` / `selectSql` 从 `plus.sqlite` 对象上拆下来调用。5+ API 方法内部依赖 `this.getCallbackIDByFunction` 注册回调；裸调用后 `this` 不再指向 `plus.sqlite`，所以内部访问失败。

### 为什么会被误判

前面几次调试看到 callback 静默不触发、`selectSql` 返回异常、标准基座行为不稳定，于是把问题归因到 HBuilderX / SQLite native bridge。这个判断缺少一项对照：确认调用时 `this` 是否仍然是 `plus.sqlite`。

用户后来提供的掘金文章里所有示例都是直接调用：

```ts
plus.sqlite.openDatabase({ ... })
plus.sqlite.selectSql({ ... })
```

这提示了关键差异：文章写法保留了 `this`，当前封装写法丢了 `this`。

### 修复

保留动态分发，但使用 `call` 绑定接收者：

```ts
const fn = sqlite[method]
fn.call(sqlite, options)
```

同时保留本轮其他修正：

- `init()` 必须 `await runMigrations()` / `await seedIfEmpty()`
- `plus.sqlite.transaction` 的 `operation` 是 `'begin' | 'commit' | 'rollback'`
- 5+ `executeSql` 不支持 `args` 参数，参数在 helper 内转义
- callback 静默不返回时 8 秒超时，便于排查真实 native 问题

### 验证结果

本地：

```bash
pnpm type-check
pnpm lint
pnpm build:h5
```

真机：

```text
[db] init OK
```

DB：

```bash
sqlite3 memory-bank/bookkeeping-real.db ".tables"
sqlite3 memory-bank/bookkeeping-real.db "SELECT COUNT(*) FROM expense_categories;"
sqlite3 memory-bank/bookkeeping-real.db "PRAGMA user_version;"
```

结果确认：

- 业务表齐全
- 默认分类数为 `5`
- `user_version` 为 `1`

### 避免复发

- 调用 5+ API 对象方法时，不要把方法拆出来裸调。
- 如果必须动态分发，统一使用 `fn.call(plus.sqlite, options)`。
- 遇到 `this.xxx is not a function`，优先检查方法接收者是否丢失，不要先归因到 native 模块缺失。

---

## 1. 完整的调试时间线

### 1.1 Phase 1 + Phase 2 一次性跑完
- 8 步 Phase 1 脚手架完成（拉取 `dcloudio/uni-preset-vue#vite-ts`，TS 严格模式，ESLint，目录结构，4 Tab 占位，manifest 配 Android，pages.json 4 Tab）
- Phase 2 数据层 6 步（schema.ts / migrations.ts / seed.ts / db/index.ts / App.vue 触发 init / smoke-test）
- 用 sqlite3 CLI 跑 SQL 字符串生成 `memory-bank/bookkeeping-v0.db`（5 表 / 5 分类 / 10 索引 / `user_version=1` 全部正确）

### 1.2 用户第一次报错
```
[db] init failed,  TypeError: Cannot read property 'executeSql' of undefined at App.vue:14
```

**根因**：我最初写的 `init()` 用同步调用 `plus.sqlite.openDatabase({...})` 拿句柄，但**该函数在无 callback 时不返回任何值**（TS 签名也是 `void`），所以 `_db` 是 `undefined`，下一行 `_db.executeSql` 崩。

**修复**：改用 callback 形式。**这一步代码改对了**。

### 1.3 用户第二次测，pull 出 0 字节文件
- `adb pull` 出来 `bookkeeping.db` 是 0 字节
- `ls files/` 里**没有 .db 文件**
- `databases/` 目录根本不存在

**根因**：`openDatabase` 的 callback **静默不触发**（既没 SUCCESS 也没 ERROR）。可能是 path 不对，也可能是 native 模块没工作。

### 1.4 加重诊断 + 改用 `plus.io.resolveLocalFileSystemURL` 拿绝对路径
- 删了 setTimeout（uni-app 编译时把它当 Vue 模板 ref 替换，崩）
- 用 `plus.io.resolveLocalFileSystemURL('_doc/')` 解析出**绝对路径** `/storage/emulated/0/Android/data/com.bookkeeping.app/apps/__UNI__040649E/doc/`
- 传给 `openDatabase`，**callback 仍然不触发**
- 看到 `plus.io.PRIVATE_DOC = 2`（**number**，不是路径字符串）— 文档说 `path` 应用 `'_doc/xxx'` 字符串

### 1.5 试 sync return + callback 兜底
- 假设这个版本 callback 不触发但 sync 返回 handle
- `openDatabase({...})` 同步返回值是 `undefined`
- 兜底 callback 也不触发

### 1.6 加深度诊断（isOpenDatabase / selectSql）
- **`isOpenDatabase(...)` = boolean: false** ← JS 同步方法工作
- **`selectSql('SELECT 1')` = undefined** ← native 链不工作
- 确认：**`isOpenDatabase` 这种 JS 同步方法能调，native 调用全是 stub**

### 1.7 用户切到 HBuilderX 编译
- 用户的 HBuilderX "最新正式版" → 包名变成 `io.dcloud.HBuilder`（HBuilderX 调试基座）
- diag 仍然 `selectSql = undefined`

### 1.8 用户说"已经勾选 SQLite"
- 还是不工作

### 1.9 我建议装 "App 开发版"
- 用户说"只有正式版没有开发版"
- 我查了 [HBuilderX 版本区别说明](https://ask.dcloud.net.cn/article/35765)，发现 **3.4.6+ 已统一标准包**，通过插件获得 sqlite 能力
- 建议"工具 → 插件安装"装"App 开发版插件"

### 1.10 用户测试重写后的代码
```
[db] init failed, TypeError: this.getCallbackIDByFunction is not a function at App.vue:14
```

**当时误判**：曾认为这是"基座里 plus.sqlite 是 mock"的关键证据。最终复盘后确认，真正问题是 `pify()` 动态取出方法后裸调用，丢失了 `this`。

### 1.11 用户最终决定：让另一个 AI 接手

### 1.12 最终修复与验证

- 用户提供掘金 SQLite 封装文章，文章示例均直接调用 `plus.sqlite.openDatabase({...})`
- 对照发现当前 `pify()` 使用 `const fn = sqlite[method]; fn(options)`，会丢失 `this`
- 修复为 `fn.call(sqlite, options)`
- App 启动输出 `[db] init OK`
- 真机 DB 拉取到 `memory-bank/bookkeeping-real.db`
- sqlite3 验证业务表齐全、默认分类 5 行、`user_version=1`

---

## 2. 当前代码状态（截至 2026-06-11）

### 2.1 已确认正确的部分
- ✅ Phase 1 全部 8 步（脚手架）
- ✅ Phase 2 Step 2.1 schema.ts（5 段 DDL，sqlite3 smoke-test 通过）
- ✅ Phase 2 Step 2.2-2.3 migrations / seed（逻辑正确，只是当前无法在真机执行）
- ✅ Phase 2 Step 2.5 App.vue 触发 init

### 2.2 5+ API 风格已正确适配的代码
**`src/db/index.ts`** 现状（关键设计）：
```ts
const DB_NAME = 'bookkeeping.db'
const DB_PATH = `_doc/${DB_NAME}`  // 文档推荐的相对路径

// pify 工具：把 5+ callback API 包成 Promise
function pify<T>(method, options): Promise<T> {
  return new Promise((resolve, reject) => {
    // ... 加 success/fail 到 options
    plus.sqlite[method]({ ...options, success, fail })
  })
}

export async function init(): Promise<void> {
  if (!isOpenDatabase({name, path})) {
    await pify('openDatabase', {name, path})
  }
  await pify('executeSql', {name, sql: 'PRAGMA foreign_keys = ON'})
  await runMigrations()  // 内部用 select/exec
  await seedIfEmpty()
}

// 事务：用 plus.sqlite.transaction(operation, success, fail)
export async function tx<T>(fn: () => T) {
  // operation 必须是同步函数（5+ API 限制）
}

// helpers
export function exec(sql, args?)  // executeSql 包装
export function select<T>(sql, args?)  // selectSql 包装
```

**`src/db/migrations.ts`** 现状：异步版 `getCurrentVersion` / `setVersion` / `runMigrations`，用 `select` / `exec`。

**`src/db/seed.ts`** 现状：异步 `seedIfEmpty`，先 `SELECT COUNT(*)`，为 0 时插入 5 个默认分类。

**`src/db/schema.ts`** 现状：5 段 DDL 字符串（用 `IF NOT EXISTS`），索引 + CHECK 约束齐。`meal_cards` **无 end_date** ✓。

### 2.3 已经验证的工具链
- `pnpm type-check` ✓
- `pnpm run lint` ✓
- `pnpm build:h5` ✓（H5 build 成功，DB 层只是 import 不会被实际调用）
- `sqlite3 memory-bank/bookkeeping-v0.db ".tables"` ✓（5 表）
- 用户的 `run-as com.bookkeeping.app cat files/diag.log` ✓（能拉到诊断日志）

---

## 3. 已知 + 待解决

### 3.1 已确认

1. **SQLite native bridge 可以工作**：HBuilderX / Android 真机启动已输出 `[db] init OK`。
2. **最终根因是 `this` 丢失**：动态取出 `plus.sqlite[method]` 后裸调用，会让 5+ API 内部的 `this.getCallbackIDByFunction` 失效。
3. **path 参数应该用 `'_doc/xxx'` 相对路径**（不是绝对路径）。
4. **callback 形式必须是 options 内嵌**：`{name, path, success, fail}`，success 无参数。
5. **事务必须用 `plus.sqlite.transaction({name, operation, success, fail})`**，operation 是 `'begin' | 'commit' | 'rollback'`。
6. **5+ executeSql 不支持 args 数组**，参数化 SQL 需要自行转义或改为安全的 SQL 构造 helper。

### 3.2 已解决

- Step 2.6 已通过：真机 DB 已拉取到 `memory-bank/bookkeeping-real.db`
- sqlite3 验证：
  - 业务表齐全
  - `expense_categories` 为 5 行
  - `PRAGMA user_version` 为 1

### 3.3 TBD 后续

- Phase 3 Step 3.1：定义 domain 类型
- 后续写 API 层时必须复用 `src/db/index.ts` 的 `exec()` / `select()` / `tx()`，不要绕过封装直接调 `plus.sqlite`

---

## 4. 关键文档参考

| 文档 | 路径 | 用途 |
|---|---|---|
| 5+ sqlite API 文档 | https://www.html5plus.org/doc/zh_cn/sqlite.html | openDatabase / executeSql / selectSql / transaction 正确签名 |
| HBuilderX 版本说明 | https://ask.dcloud.net.cn/article/35765 | 3.4.6+ 统一标准包说明 |
| HBuilderX 下载 | https://www.dcloud.io/hbuilderx.html | 三个主题版本（绿柔/雅蓝/酷黑）— 都是标准包 |
| 数据模型 DDL | `memory-bank/design-document.md §2.1` | 5 张表字段定义、CHECK 约束、索引 |
| 状态机 | `memory-bank/design-document.md §3` | 订单 / 次卡状态机 |
| 关键流程 | `memory-bank/design-document.md §4` | 建单 / 取消 / 配送 / 开卡的事务要求 |
| 实施计划 | `memory-bank/implementation-plan.md` | Phase 1-9 完整 63 步 |
| 当前进度 | `memory-bank/progress.md` | 14/63 步完成（Phase 1 8 + Phase 2 6/6） |
| 架构基线 | `memory-bank/architecture.md` | 每个文件作用 + 工具链说明 |

---

## 5. 接手 AI 的建议路径

**已废弃建议**：不再建议切到 `uni.setStorageSync` 兜底。SQLite 已在真机验证通过。

**后续接手建议**：
- 继续 Phase 3 Step 3.1
- API 层统一使用 `exec()` / `select()` / `tx()`
- 如果再次出现 `this.getCallbackIDByFunction`，先检查是否有新的裸调用：`const fn = plus.sqlite.xxx; fn(...)`

---

## 6. 用户的硬约束（从 CLAUDE.md 提取）

- 不引 HBuilderX 作为 IDE 替代（但用 HBuilderX 编译 OK）
- 不引 uView Plus / uCharts / ORM / Tailwind / Axios / Vuex / Pinia 持久化 / CI/CD
- 不收配送费（D4）
- 客户默认单价 + 折扣率（A6）
- 次卡扣次 = 配送完成（A1），1 订单 = 1 餐 + 多份（D1）
- 次卡按"次"无有效期，**`meal_cards` 无 end_date**
- 次卡异常 → 引导改 wechat / cash（不部分拆单）
- 次卡订单 amount=0，unit_price 按次均单价
- 统计口径 = 自然周 + 自然月
- v1.0 不做支出分类管理 / "关于" / 独立"清空数据"页

---

## 7. 已确认的"环境指纹"

- 平台：macOS Darwin 25.5.0
- Node v20.19.5
- pnpm 10.17.1
- 用户项目路径：`/Users/anke/Downloads/002_个人/code/Bookkeeping`
- 设备包名：`com.bookkeeping.app`（HBuilderX 基座下会变成 `io.dcloud.HBuilder`）
- DB 路径（5+ 推荐）：`_doc/bookkeeping.db`
- DB 路径（实际映射）：`/storage/emulated/0/Android/data/io.dcloud.HBuilder/apps/HBuilder/doc/bookkeeping.db`
- uni-app 模板来源：`dcloudio/uni-preset-vue#vite-ts`
- TS 4.9.5 / vue-tsc 1.8.27（不要升到 5.x，模板基线不稳）
