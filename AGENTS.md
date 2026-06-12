# AGENTS.md

> 给 Codex (codex.ai/code) / 其他下游 AI 助手的**操作手册**。
> 改任何代码前**先完整读完** 本文件、`memory-bank/architecture.md`、`memory-bank/design-document.md`。
> 完成后更新 `memory-bank/architecture.md` 与 `memory-bank/progress.md`。

---

## 0. 项目 30 秒理解

**盒记 (HeJi)** — 个人盒饭档口记账 App。Android 侧载，本地 SQLite，单用户。

业务闭环：晚上微信接单 → 次日 11:30/17:30 配送 → 当晚对账看利润。

**当前状态（2026-06-11）**：**v1.0 已发布**（Phase 1-9 全部完成；9.3 真机性能压测 / 9.4 Release APK 按用户决策跳过，用 HBuilderX 标准基座 debug APK 直接侧载）。
13 个页面、5 张表、4 个 Pinia store、3 个通用组件、5+ SQLite 已真机验证；Phase 8 6 条 E2E 流程全部通过；`memory-bank/CHANGELOG.md` v1.0 节 + `bookkeeping-v1.db` 阶段基线已落地。
**下一步**：v1.0 内使用 + 收集真实数据后再规划 v1.1（CSV 导出 / 自定义分类图标 / 备注模板 等）。改动前先看 `memory-bank/CHANGELOG.md` 已知限制节，避免重复实现 v1.1 候选。

---

## 1. 快速查找表（Codex 找入口用）

| 我要做 | 改哪些文件 | 关键约束 |
|---|---|---|
| 加一张表 / 一个字段 | `memory-bank/design-document.md §2.1` → `src/db/schema.ts` → `src/db/migrations.ts`（**追加**一段）→ `src/types/domain.ts` → `src/types/api.ts` → `src/api/*.ts` → `src/stores/*.ts` → 用到该表的页面 | schema 是单一事实源；MIGRATIONS 只追加不修改 |
| 加一个页面 | `src/pages.json` 注册路由 → 新建 `src/pages/xxx/index.vue` | 用 `<script setup lang="ts">`；表单控件用 uni-ui |
| 加一个跨页组件 | `src/components/Xxx.vue` → `architecture.md` 登记 | 不承接业务逻辑；事件上抛 |
| 改客户/订单/次卡/支出的写入逻辑 | `src/api/*.ts`（包在 `db.tx()` 里） | 写多表必走 `tx()`；单表也要在 catch 给用户可读提示 |
| 改统计口径 | `src/api/stats.ts` | 自然周 = 周一到周日，自然月 = 1 号到月底，本地时区 |
| 加新流程 | `memory-bank/design-document.md §4` 画流程 → 实现 → `architecture.md` §更新日志登记 | 同步更新 `progress.md` 勾选 |
| 改 UI 控件样式 | 直接改组件 | 业务表单**禁止**用原生 `input` / `textarea` / `picker` / `radio-group` / `slider` |
| 改日期/金额格式 | `src/utils/date.ts` / `src/utils/format.ts` | 展示用 helper；存储用 `REAL` 不要存字符串 |
| 改备份格式 | `src/utils/backup.ts` + `src/api/orders.ts` 等（依赖 listOrders） | 导出前/导入后必须校验 `schema_version` |

---

## 2. 必读文档（按顺序）

1. `CLAUDE.md` — 入口（自动引用本文件 `@AGENTS.md`，所有内容在此）
2. `memory-bank/architecture.md` — **每个文件的作用**（新建/删除/改职责必登记到对应表 + §更新日志）
3. `memory-bank/design-document.md` — 数据模型（§2.1 DDL）、状态机（§3）、关键流程（§4）、TBD（§8）
4. `memory-bank/CHANGELOG.md` — **v1.0 已实现 F1-F6 + 行为决策 A1/A3-A7 + 已知限制 + v1.1 候选**（看一眼就知道哪些不要重做）
5. `memory-bank/tech-stack.md` — 选型 + 反选清单（§3）
6. `memory-bank/implementation-plan.md` — 9 阶段 63 步（v1.0 已完成 61/63；9.3 / 9.4 跳过）
7. `debug-docs/DEBUG-HANDOFF.md` — Phase 2 SQLite 调试的根因复盘（**必读**：能帮你避开 `this.getCallbackIDByFunction` 那个坑）

---

## 3. 编译工具链 — 现实约束

> **CLI 不能编译 SQLite 原生模块**。`pnpm dev:app-android` 跑起来后 `plus.sqlite` 底层是空壳，`openDatabase` 同步返回 undefined、callback 静默不触发。
> **Android 真机调试必须用 HBuilderX**。CLI 只负责 type-check / lint / H5 构建。

| 任务 | 工具 | 命令 |
|---|---|---|
| 类型检查 | CLI | `pnpm type-check` |
| Lint | CLI | `pnpm lint` |
| 格式化 | CLI | `pnpm format` |
| H5 编译验证（无 Android 时）| CLI | `pnpm dev:h5` / `pnpm build:h5` |
| **Android 真机调试** | **HBuilderX** | 「运行 → 运行到 Android App 基座」 |
| Release APK | HBuilderX | 「发行 → 原生 App-云打包」或「本地打包」 |

**HBuilderX 首次必做**：

1. 打开本项目，**不要**在 `package.json` 新增 `dev:app-android` — 徒增误导。
2. `src/manifest.json` → 「App 原生插件配置」 → 勾选 **「SQLite(数据库)」** 模块。
3. 「工具 → 设置 → 运行配置 → Android 证书」 → 生成自签名调试证书。
4. Android 手机开「开发者选项」+「USB 调试」→ USB 连电脑 → 在 HBuilderX 触发运行。

**包名指纹（易混）**：

- `src/manifest.json` 里的 `appid` = `com.bookkeeping.app`（生产包名）
- HBuilderX 标准基座跑出来实际是 `io.dcloud.HBuilder`（基座包名）
- `adb pull` 真机 DB 路径：`/storage/emulated/0/Android/data/io.dcloud.HBuilder/apps/HBuilder/doc/bookkeeping.db`（**不是** com.bookkeeping.app 路径）
- 备份恢复后打包发布版本时再用 `com.bookkeeping.app` 路径

---

## 4. 5+ SQLite 三大踩坑（已踩过，看一眼省 2 小时）

> 详细复盘见 `debug-docs/DEBUG-HANDOFF.md §0`。

### 4.1 不要把方法从对象上拆下来裸调

```ts
// ❌ 错：丢失 this
const fn = plus.sqlite[method]
fn(options)

// ✅ 对：保留 this（5+ API 内部用 this.getCallbackIDByFunction 注册回调）
const fn = plus.sqlite[method]
fn.call(plus.sqlite, options)
```

`src/db/index.ts` 的 `pify()` 封装用 `fn.call(sqlite, options)` 是修复后状态，**不要**改回去。

### 4.2 openDatabase 的 callback 是 options 内嵌

```ts
// ❌ 错：当成函数
plus.sqlite.openDatabase(name, path, () => {}, () => {})

// ✅ 对：options 形式，success/fail 嵌进去
plus.sqlite.openDatabase({
  name: 'bookkeeping.db',
  path: '_doc/bookkeeping.db',  // 用相对路径 _doc/xxx，不要用绝对路径
  success: () => resolve(),
  fail: (e) => reject(e),
})
```

### 4.3 executeSql 不支持 args 数组

5+ `executeSql` 的 `sql` 字段只接受字符串或字符串数组，**不接受** `[sql, args]` 二元组。参数化 SQL 需要在 `src/db/index.ts` 的 `exec()` / `select()` helper 内自己转义 `?` 占位符。**不要**往 `executeSql` 直接传 `args`。

### 4.4 事务 operation 是字符串

```ts
// ❌ 错：当函数用
plus.sqlite.transaction({ name, operation: () => { ... }, success, fail })

// ✅ 对：operation 是 'begin' | 'commit' | 'rollback'
plus.sqlite.transaction({ name, operation: 'begin', success, fail })
// ...执行 SQL...
plus.sqlite.transaction({ name, operation: 'commit', success, fail })
```

`src/db/index.ts` 的 `tx<T>(fn)` 已经按这个写了，**不要**在外部另写事务。

### 4.5 callback 静默不触发 = 8 秒超时

`pify()` 已加 8 秒超时报错。如果以后又看到 SQLite 失败，**先看是 8 秒超时（native 没装）还是立刻报错（this 丢失之类）**，不要先归因到基座没装 SQLite。

---

## 5. E2E 流程清单（v1.0 已通过，v1.1 起按相同格式追加）

> **状态**：Phase 8 6 条全部通过（2026-06-11 HBuilderX 真机手测），`memory-bank/bookkeeping-v1.db` 已备份。详细断言见 `memory-bank/implementation-plan.md §8`，已实现功能边界见 `memory-bank/CHANGELOG.md` v1.0 节。
> **为什么保留这张表**：v1.1 新增功能时按相同 6 列格式补行，整个表就是回归测试矩阵。手测的优势——这种规模没必要为它写一套 E2E 测试框架。

| # | 场景 | 关键断言（一行可读） |
|---|---|---|
| 8.1 | 录单 → 配送 → 对账 | Dashboard 数字、详情状态、利润三处对得上 |
| 8.2 | 次卡完整流程 | 开 20 次 ¥300 → 配送扣到 17/20，统计 = 0 订单 + 300 开卡 |
| 8.3 | 次卡次数不够 | 19/20 卡 + qty=2 → 弹改微信，按客户默认价×折扣率重算 |
| 8.4 | 取消订单 | pending → cancelled，Dashboard / 统计**不计** cancelled |
| 8.5 | 折扣 + 临时涨价 | 0.9 × 15 = 13.50 预填 → 改 18 保存；同客户再下单仍 13.50 |
| 8.6 | 备份恢复 | 导出 → 卸载重装 → 导入 → ID 完全一致 |

完成定义（v1.1 起遵循）：每条勾完所有断言 → `architecture.md §更新日志` 登记 → `cp memory-bank/bookkeeping-real.db memory-bank/bookkeeping-vN.db` 备查 → `CHANGELOG.md` 追加新版本节。

---

## 6. 关键设计约束（**不要违反**，违反前先讨论）

> 来源：`memory-bank/design-document.md` + `CLAUDE.md` + Phase 8 验证出的实际行为。

1. **次卡扣次 = 配送完成时**（A1）。创建订单**不**扣次；取消 pending 订单**不**返还；`markDelivered` 失败时 `tx()` 回滚扣次。
2. **客户默认单价 + 折扣率**（A6）。`unit_price = 默认价 × 折扣率` 自动预填，可手动覆盖；同客户新订单重算，不被历史订单影响。
3. **1 订单 = 1 餐 + 多份**（D1）。`orders.meal_type` + `orders.quantity`，**没有**多餐合并单。
4. **不收配送费**（D4）。schema 无 `delivery_fee`。
5. **次卡按"次"无有效期**。`meal_cards` **无** `end_date` 字段、**无** `expired` 状态。**禁止**添加。
6. **次卡次数不够**：捕获 `InsufficientCardError` → 引导改 wechat / cash，金额按**客户默认价 × 折扣率**整单重算；客户无默认价时回退订单原单价。**禁止**做"部分月卡 + 部分单点价"拆分到同一单。
7. **次卡订单 `amount = 0`**（开卡时已收款），`unit_price` 仍按客户默认价填入（用于 UI 显示和统计参考）。
8. **统计口径**：自然周（周一-周日）+ 自然月（1 号-月底），按本地时区。`dayjs` 工具在 `src/utils/date.ts`。
9. **开次卡无续卡概念**：depleted 后只能买新卡；允许同客户并存多张 active 卡（旧卡保留）。
10. **表单控件统一用 uni-ui**：业务页面**禁止**直接使用原生 `input` / `textarea` / `picker` / `radio-group` / `slider`；统一通过 easycom 使用 `uni-easyinput` / `uni-data-checkbox` / `uni-data-select` / `uni-datetime-picker` / `uni-number-box`。
11. **Pinia 只缓存视图数据**。**不**引 `pinia-plugin-persistedstate`。SQLite 是唯一持久层。
12. **不做软删除**，v1.0 一律硬删除。
13. **`PRAGMA foreign_keys = ON`** 已在 `db.init()` 开启；维护外键完整性。
14. **uni-easyinput `@input` 入参是字符串**，不是事件对象。`v-model` 或 `update:modelValue` 时注意类型转换（用 `parseMoney()` 等 helper）。

---

## 7. 当前目录结构（与代码同步）

```
bookkeeping/
├── docs/PRD.md                          # 已定稿（不修改）
├── memory-bank/                         # 活文档
│   ├── design-document.md               # 数据模型 / 状态机 / 流程 / TBD
│   ├── tech-stack.md                    # 选型 + §3 反选清单
│   ├── implementation-plan.md           # 9 阶段 63 步
│   ├── progress.md                      # 步骤勾选
│   ├── architecture.md                  # ★ 文件级作用；登记 + 更新日志
│   ├── CHANGELOG.md                     # ★ v1.0 已发布功能 + 已知限制 + v1.1 候选
│   ├── bookkeeping-v0.db                # CLI sqlite smoke-test 基线
│   ├── bookkeeping-real.db              # 真机拉取基线（user_version=1）
│   └── bookkeeping-v1.db                # v1.0 阶段基线（Phase 8 E2E 通过归档）
├── debug-docs/DEBUG-HANDOFF.md          # SQLite 5+ API 根因复盘
├── src/
│   ├── main.ts                          # createApp + Pinia.createPinia()
│   ├── App.vue                          # onLaunch → db.init()
│   ├── env.d.ts / shime-uni.d.ts        # 类型补丁
│   ├── pages.json                       # 4 Tab + 9 子页路由
│   ├── manifest.json                    # appid=com.bookkeeping.app + SQLite 模块
│   ├── uni.scss / static/               # 全局样式 + 静态资源
│   ├── uni_modules/                     # uni-ui easycom 源码（TS/lint 排除）
│   ├── pages/
│   │   ├── index/index.vue              # Tab 1 今日 Dashboard
│   │   ├── order/{index,new,detail}.vue # Tab 2 订单
│   │   ├── stats/index.vue              # Tab 3 统计
│   │   └── me/
│   │       ├── index.vue                # Tab 4 我的
│   │       ├── customers/{list,new,detail,open-card}.vue
│   │       ├── expenses/{list,new}.vue
│   │       └── settings/backup.vue
│   ├── components/
│   │   ├── StatCard.vue                 # 数字卡片（label / value / color / hint）
│   │   ├── AmountInput.vue              # 金额（基于 uni-easyinput + parseMoney）
│   │   └── CustomerPicker.vue           # 客户选择（基于 uni-easyinput 搜索）
│   ├── stores/                          # 4 个 store
│   │   ├── customer.ts / order.ts / expense.ts / stats.ts
│   ├── db/
│   │   ├── schema.ts                    # 5 DDL + CURRENT_SCHEMA_VERSION = 1
│   │   ├── migrations.ts                # MIGRATIONS[] + runMigrations
│   │   ├── seed.ts                      # 5 个默认支出分类
│   │   └── index.ts                     # init() / tx() / exec() / select()
│   ├── api/
│   │   ├── customers.ts / meal-cards.ts / orders.ts
│   │   ├── expense-categories.ts / expenses.ts / stats.ts
│   │   └── errors.ts                    # InsufficientCardError / AlreadyDeliveredError
│   ├── utils/
│   │   ├── date.ts                      # dayjs 自然日/周/月
│   │   ├── format.ts                    # formatMoney / parseMoney / formatPercent
│   │   ├── ui.ts                        # toast/confirm/actionSheet Promise 化 + 文案
│   │   └── backup.ts                    # JSON 导出/导入 + schema_version 校验
│   └── types/
│       ├── domain.ts                    # 核心领域类型（与 schema snake_case 对齐）
│       ├── api.ts                       # API 入参/出参
│       └── pinia.d.ts                   # 内置 Pinia 的本地类型
├── index.html / package.json / pnpm-lock.yaml
├── tsconfig.json / vite.config.ts
├── .eslintrc.cjs / .prettierrc / .gitignore
```

完整文件级说明见 `memory-bank/architecture.md`（**改文件时必同步更新它**）。

---

## 8. 常用命令

```bash
# 静态质量门禁（提交前必跑）
pnpm type-check                # vue-tsc --noEmit
pnpm lint                      # eslint --ext .ts,.vue src/
pnpm format                    # prettier --write

# H5 编译验证（无 Android 时确认编译通过）
pnpm dev:h5
pnpm build:h5

# 真机 DB 验证（前提：adb pull 真机 DB 到 memory-bank/）
sqlite3 memory-bank/bookkeeping-real.db ".tables"
sqlite3 memory-bank/bookkeeping-real.db "SELECT COUNT(*) FROM expense_categories;"
sqlite3 memory-bank/bookkeeping-real.db "PRAGMA user_version;"
# 期望：5 张业务表 / 5 个分类 / user_version = 1

# Android 真机调试：HBuilderX「运行 → 运行到 Android App 基座」
# Release APK：HBuilderX「发行 → 原生 App-云打包」或「本地打包」
```

---

## 9. 写代码时的约定

- **加新表 / 新字段**：`design-document.md §2.1` → `schema.ts` → `migrations.ts`（**追加**一段）→ `types/domain.ts` → `types/api.ts` → `api/*.ts` → `stores/*.ts` → 页面。
- **加新流程**：`design-document.md §4` 画流程 → 实现 → `architecture.md §更新日志` 登记 → `progress.md` 勾选。
- **新建/删除/改职责文件**：`architecture.md` 对应表登记 + §更新日志。
- **完成里程碑**（阶段结束 / E2E 流程跑通）：`cp memory-bank/bookkeeping-real.db memory-bank/bookkeeping-vN.db` 备份。
- **TBD 处理**（`design-document.md §8`）：在代码注释或 commit message 写明选择，方便后续回头调整。
- **价格与单位**：金额存 `REAL`；展示用 `format.ts` 的 `formatMoney()`（2 位小数 + 千分位 + ¥）。
- **多表写入必走 `tx()`**；单表也要在 catch 给用户可读提示，不要静默失败。

---

## 10. 禁止清单（违反前先在 PR 说明）

| ❌ 禁止 | 理由 |
|---|---|
| 引入 ORM（Prisma / TypeORM） | 5 张表直接写 SQL 成本更低；与 uni-app 编译兼容差 |
| 引入图表库（uCharts / ECharts / F2） | v1.0 用文字 + CSS 进度条；v1.1 再加 |
| 引入 Tailwind / UnoCSS | 5 个页面不值得引原子化 CSS；uni-app rpx 够用 |
| 引入 Axios / 网络库 | 纯本地 App，无网络请求 |
| 用 Vuex | 已废弃 |
| 引入 `pinia-plugin-persistedstate` | SQLite 本身就是持久层 |
| 用 HBuilderX 做 IDE | 写代码用 VSCode；HBuilderX **只**用于编译 |
| 业务表单用原生 `input` / `textarea` / `picker` / `radio-group` / `slider` | 必须用 uni-ui |
| 软删除 | v1.0 一律硬删除 |
| `meal_cards` 加 `end_date` / `expired` 状态 | 次卡按"次"无有效期（设计已精简） |
| 改 `MIGRATIONS` 已有段 | 字段变更只追加新段 |
| 把 `plus.sqlite[method]` 拆出来裸调 | 丢失 `this` → 报 `this.getCallbackIDByFunction is not a function` |
| 给 5+ `executeSql` 传 `args` 数组 | 不支持；参数在 `db/index.ts` 的 helper 内转义 |
| `plus.sqlite.transaction` 的 `operation` 用函数 | 必须是 `'begin' \| 'commit' \| 'rollback'` 字符串 |
| 跳过 `tx()` 直接在外部拼多表写入 | 失去事务回滚保护 |
| 在 `package.json` 加 `dev:app-android` / `build:app-android` scripts | CLI 跑不出可用的 SQLite，徒增误导 |

---

## 11. 错误速查（Codex 自查用）

| 现象 | 大概率原因 | 修复 |
|---|---|---|
| `TypeError: this.getCallbackIDByFunction is not a function` | 有新的 `const fn = plus.sqlite.xxx; fn(...)` 裸调用 | 改 `fn.call(plus.sqlite, options)`；检查 `db/index.ts` 里的 pify 封装没被改回去 |
| `Cannot read property 'executeSql' of undefined` | `_db` 句柄是 `undefined`（openDatabase 同步返回 void） | 用 callback 形式 + `isOpenDatabase` 校验；不要用 sync return |
| callback 静默不触发 8 秒后报超时 | SQLite native 模块没装（`manifest.json` 没勾选）；或 HBuilderX 标准基座版本过老 | 1) `manifest.json` 勾选「SQLite(数据库)」；2) HBuilderX 升 3.4.6+；3) 「工具 → 插件安装」装「App 开发版插件」 |
| `openDatabase` 的 path 用绝对路径 | 5+ 推荐用 `'_doc/xxx'` 相对路径 | 改成 `path: '_doc/bookkeeping.db'` |
| `pnpm build:h5` 找不到 `pinia/dist/pinia.mjs` | 当前 Phase 5 起的现状：依赖 HBuilderX 内置 Pinia | 用 HBuilderX 跑 Android；H5 验证只在 `manifest.json` 勾选前提下可绕过 |
| `uni-easyinput` 的 `@input` 拿不到值 | `@input` 给的是字符串值不是事件对象 | 用 `v-model` 或 `update:modelValue`；数值字段走 `parseMoney()` |
| `pnpm type-check` 报 src/uni_modules 错误 | tsconfig 没排除第三方源码 | `tsconfig.json` 已配 `exclude: ["src/uni_modules/**"]`，不要改回去 |
| 备份导入后 ID 错乱 | 没校验 `schema_version` 直接 INSERT | `utils/backup.ts` 已加 `schema_version` 校验，**不要**删除 |
| 次卡配送报 `InsufficientCardError` 没处理 | UI 层没捕获 | `pages/order/detail.vue` 已捕获并弹改支付；**不要**在 store 层静默吞 |
| 利润 = 负数且数字对不上 | 忘了 cancelled 不计入；或开次卡的金额被算重了 | `api/stats.ts` 的口径：非 cancelled 订单金额 + 开次卡金额；检查 `getDashboardSummary` 没被改 |

---

## 12. 未来扩展（不动主结构）

- **v1.1**：CSV 单表导出、订单备注模板、支出分类自定义图标
- **v1.2**：局域网 HTTP 同步（同一 WiFi 下两台设备互推）
- **v2.0**：视情况加 H5 / iOS 适配（uni-app 直接编译，不用换栈）


<claude-mem-context>
# Memory Context

# [Bookkeeping] recent context, 2026-06-12 10:10am GMT+8

Legend: 🎯session 🔴bugfix 🟣feature 🔄refactor ✅change 🔵discovery ⚖️decision
Format: ID TIME TYPE TITLE
Fetch details: get_observations([IDs]) | Search: mem-search skill

Stats: 32 obs (12,657t read) | 0t work

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
87 5:38p ✅ Bookkeeping 收紧构建检查范围并修复 AmountInput 类型问题
94 5:40p 🟣 Bookkeeping Phase8 表单组件迁移 uni-ui化任务立项
</claude-mem-context>