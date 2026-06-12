# 盒记 — 实施计划 v2

> 基于 memory-bank/design-document.md + memory-bank/tech-stack.md · 2026-06-09
> 9 个阶段，63 步；每步独立可验证、可回退
> **写代码前必读**：CLAUDE.md、memory-bank/design-document.md、memory-bank/tech-stack.md
> **每步完成后必做**：更新 memory-bank/architecture.md（如本步是里程碑）

---

## 0. 总览

### 0.1 阶段规划

| 阶段 | 主题 | 步骤 | 估时 |
|---|---|---|---|
| 1 | 项目脚手架 | 8 | ~0.5 天 |
| 2 | 数据层（SQLite） | 6 | ~1 天 |
| 3 | 类型与工具 | 4 | ~0.5 天 |
| 4 | API 层 | 8 | ~2 天 |
| 5 | Pinia Stores | 5 | ~1 天 |
| 6 | 通用 UI 组件 | 3 | ~1 天 |
| 7 | 页面（4 Tab + 子页） | 18 | ~5 天 |
| 8 | 关键流程串联 | 6 | ~2 天 |
| 9 | 收尾与发布 | 5 | ~1 天 |
| **合计** | | **63** | **~14 天** |

### 0.2 每步固定模板

每步用统一 8 段格式，便于 AI 严格执行：

| 段 | 用途 |
|---|---|
| **目标** | 1 句话说明本步达成的最终状态 |
| **前置** | 列出依赖的前置步骤、文件、状态 |
| **后置** | 完成后系统的状态变化 |
| **任务** | 1-7 个具体动作，按顺序执行；**不含代码** |
| **测试用例** | TC1 / TC2 / 边界 三类，可执行的检查 |
| **本步不处理** | 明确边界，防止范围蔓延 |
| **自检清单** | AI 必须自问自答的硬性检查项 |
| **完成定义** | 全部 ✅ 才算本步完成 |

### 0.3 进度标记

执行时填：
- [ ] 未开始　[~] 进行中　[x] 完成

---

## 1. 项目脚手架

> 目标：能从 `pnpm dev:app-android` 跑出一个空的 uni-app 项目骨架

### Step 1.1 — 拉取 uni-app Vue 3 + Vite + TS 模板

- **目标**：在项目根目录生成一份 uni-app Vue 3 + Vite + TypeScript 标准模板
- **前置**：Node ≥ 18、pnpm ≥ 8、Android 设备/模拟器
- **后置**：`src/`、`pages.json`、`manifest.json`、`package.json`、`tsconfig.json` 存在
- **任务**：
  1. 用 `npx degit` 拉取 `dcloudio/uni-preset-vue#vite` 到当前目录
  2. 删除模板自带的 `package-lock.json`（如有），统一用 pnpm
  3. 确认 5 个关键文件存在：`src/main.ts`、`src/App.vue`、`pages.json`、`manifest.json`、`tsconfig.json`
- **测试用例**：
  - TC1 [正常路径]：在 Android 模拟器上跑默认首页看到 uni-app logo
  - 边界 [无 Android 环境]：至少 H5 能跑通（虽然 plus.sqlite 在 H5 不工作，但能确认编译）
- **本步不处理**：不修改 `manifest.json`、不装额外依赖、不建子目录
- **自检清单**：
  - [ ] 5 个关键文件存在
  - [ ] 默认首页在真机/模拟器可见
  - [ ] 没有遗留 `package-lock.json`
- **完成定义**：
  - [ ] `pnpm dev:app-android` 不报错
  - [ ] 真机/模拟器看到 uni-app 默认欢迎页

### Step 1.2 — 安装 pnpm 依赖

- **目标**：项目所有依赖通过 pnpm 安装完毕
- **前置**：1.1 完成
- **后置**：`pnpm-lock.yaml` + `node_modules/.pnpm` 存在
- **任务**：
  1. 运行 `pnpm install`
  2. 确认 `pnpm-lock.yaml` 生成（无 `package-lock.json`）
- **测试用例**：
  - TC1 [正常]：依赖装完，`pnpm dev:app-android` 仍能跑
- **本步不处理**：不装额外的依赖（pinia、dayjs 等留到后面需要时再装）
- **完成定义**：
  - [ ] `pnpm-lock.yaml` 存在
  - [ ] `node_modules/.pnpm` 存在
  - [ ] `pnpm dev` 仍正常

### Step 1.3 — 配置 TypeScript 严格模式

- **目标**：TS 严格检查全开
- **前置**：1.2 完成
- **后置**：`tsconfig.json` 启用 `strict`、`noUncheckedIndexedAccess`、`noImplicitOverride`
- **任务**：
  1. 编辑 `tsconfig.json` 的 compilerOptions
  2. 添加：`strict: true`、`noUncheckedIndexedAccess: true`、`noImplicitOverride: true`、`noFallthroughCasesInSwitch: true`
- **测试用例**：
  - TC1 [正向]：临时写 `const x: number = "abc"` → `pnpm build` 报错"Type 'string' is not assignable to type 'number'"
  - TC2 [边界]：删除测试代码后 `pnpm build` 不再报此错
- **本步不处理**：不安装 `@types/*`、不配路径别名
- **完成定义**：
  - [ ] `tsconfig.json` 含 4 个新增选项
  - [ ] 反向验证（写错类型能报错）通过

### Step 1.4 — 配置 ESLint + Prettier

- **目标**：代码风格统一、可自动修复
- **前置**：1.3 完成
- **后置**：`pnpm lint` 和 `pnpm format` 可用
- **任务**：
  1. 安装：`eslint` `@vue/eslint-config-typescript` `eslint-plugin-vue` `prettier` `eslint-config-prettier`
  2. 创建 `.eslintrc.cjs`（继承 `@vue/eslint-config-typescript`，加 `parser: 'vue-eslint-parser'`）
  3. 创建 `.prettierrc`（单引号、无分号、宽度 100）
  4. 在 `package.json` 添加 `scripts`：`"lint": "eslint --ext .ts,.vue src/"`、`"format": "prettier --write \"src/**/*.{ts,vue}\""`
- **测试用例**：
  - TC1 [正常]：故意写 `const x=1`（无空格）→ `pnpm format` 自动改为 `const x = 1`
  - TC2 [正常]：写 `var x = 1` → `pnpm lint` 报错"Unexpected var, use let or const"
- **本步不处理**：不配 husky / lint-staged（个人项目手动执行）
- **完成定义**：
  - [ ] `pnpm lint` 能跑
  - [ ] `pnpm format` 能跑
  - [ ] 反向验证通过

### Step 1.5 — 创建项目目录结构

- **目标**：`src/` 下 7 个子目录就位
- **前置**：1.4 完成
- **后置**：`src/{pages,components,stores,db,api,utils,types}/` 7 个空目录
- **任务**：
  1. 创建 `src/pages/`、`src/components/`、`src/stores/`、`src/db/`、`src/api/`、`src/utils/`、`src/types/`
  2. 在 `src/components/` 放一个 `.gitkeep`（让目录不被忽略）
- **测试用例**：
  - TC1：`tree src/`（或 `ls src/`）显示 7 个目录
- **本步不处理**：不在各目录放文件（每个目录的第一个文件在后续步骤放）
- **完成定义**：
  - [ ] 7 个目录存在

### Step 1.6 — 创建 memory-bank 初始文件

- **目标**：`memory-bank/architecture.md` 就位，作为里程碑记录基线
- **前置**：1.5 完成
- **后置**：`memory-bank/architecture.md` 存在并记录当前状态
- **任务**：
  1. 创建 `memory-bank/` 目录
  2. 创建 `memory-bank/architecture.md`，内容包含：
     - 项目名 + 平台
     - 当前进度（脚手架阶段）
     - 技术栈版本快照（uni-app / Vue / TS / Pinia 的版本）
     - 目录结构（来自 1.5）
- **测试用例**：
  - TC1：文件存在且含上述 4 个小节
- **本步不处理**：不写实际数据（DB 还没建）
- **完成定义**：
  - [ ] `memory-bank/architecture.md` 含 4 个小节

### Step 1.7 — 配置 manifest.json（Android 基础）

- **目标**：`manifest.json` 含 Android 必要字段
- **前置**：1.1 完成
- **后置**：`name: "盒记"`、`appid: "com.bookkeeping.app"`、`versionName: "0.1.0"`、`minSdkVersion: 21`
- **任务**：
  1. 打开 `manifest.json`
  2. 填入 name / appid / versionName / versionCode
  3. 在 `app-plus` 下配 `minSdkVersion: 21`、`targetSdkVersion: 30`（保守起见）
  4. 暂不配图标（用 uni-app 默认）
- **测试用例**：
  - TC1：装到 Android 设备，桌面图标文字显示"盒记"（默认 uni-app 图标）
- **本步不处理**：不配应用图标、不配推送权限、不配 splash
- **完成定义**：
  - [ ] 4 个字段已填
  - [ ] 重装 APK 后桌面显示"盒记"

### Step 1.8 — 配置 4 个 Tab 路由骨架

- **目标**：`pages.json` 含 4 个 Tab，每个 Tab 一个空页
- **前置**：1.7 完成
- **后置**：`src/pages/{index,order,stats,me}/index.vue` 4 个空页 + `pages.json` TabBar 配置
- **任务**：
  1. 在 `src/pages/` 下创建 4 个目录：`index/`、`order/`、`stats/`、`me/`
  2. 每目录放一个 `index.vue`，内容只显示文字"Tab 1 / 2 / 3 / 4 占位"
  3. 编辑 `pages.json` 的 `pages` 数组注册 4 个页面
  4. 编辑 `pages.json` 的 `tabBar` 数组，4 个 Tab：list 图标 + pagePath + text
- **测试用例**：
  - TC1 [正常路径]：App 启动看到底部 4 个 Tab，点击切换到对应占位页
  - TC2 [边界]：4 个 Tab 文字正确（"今日"/"订单"/"统计"/"我的"，具体见 design §1.1）
- **本步不处理**：图标用 uni-app 默认（不替换）；TabBar 颜色用默认
- **完成定义**：
  - [ ] 4 个空页可访问
  - [ ] TabBar 文字符合 design doc §1.1
  - [ ] 切换无报错

### **里程碑 1.8 — 脚手架完成**
- 更新 `memory-bank/architecture.md`：补全当前栈版本、目录结构、Tab 路由
- 验收命令：`pnpm dev:app-android` 跑通 + 4 个 Tab 可切

---

## 2. 数据层（SQLite）

> 目标：App 启动自动建表 + seed 默认数据；`tx()` 工具就绪

### Step 2.1 — 编写 schema.ts（5 张表 DDL 字符串）

- **目标**：`src/db/schema.ts` 导出 5 段 CREATE TABLE SQL
- **前置**：1.8 完成
- **后置**：5 段 SQL 字符串可被外部 import
- **任务**：
  1. 创建 `src/db/schema.ts`
  2. 导出 5 个常量：`SCHEMA_CUSTOMERS`、`SCHEMA_MEAL_CARDS`、`SCHEMA_ORDERS`、`SCHEMA_EXPENSE_CATEGORIES`、`SCHEMA_EXPENSES`
  3. 每段严格按 `memory-bank/design-document.md §2.1` 的字段、类型、NOT NULL、DEFAULT
  4. 字段名用 snake_case（`unit_price`、`meal_card_id`、`default_lunch_price`）
  5. CHECK 约束：`orders.status IN ('pending', 'delivered', 'cancelled')`、`orders.payment_method IN ('wechat', 'cash', 'meal_card')`、`meal_cards.status IN ('active', 'depleted')`
  6. 索引：参考 design doc（`idx_customers_name`、`idx_cards_status`、`idx_orders_date`、`idx_orders_customer`、`idx_orders_status`、`idx_orders_card`、`idx_expenses_date`、`idx_expenses_category`）
- **测试用例**：
  - TC1 [正向]：5 段 SQL 字符串导出可用，`pnpm build` 不报 TS 错
  - TC2 [合规性]：每段 SQL 字段数与 design doc §2.1 一致（customers 12 字段、orders 14 字段等）
  - 边界 [无过期]：确认 `meal_cards` 表 SQL **不**含 `start_date` 和 `end_date` 字段
- **本步不处理**：不创建 db 实例、不执行 SQL
- **自检清单**：
  - [ ] 对照 design doc §2.1 逐字段核对
  - [ ] CHECK 约束齐全
  - [ ] 索引齐全
  - [ ] **次卡表无 end_date**
- **完成定义**：
  - [ ] 5 段 SQL 字符串导出
  - [ ] TS 编译通过

### Step 2.2 — 编写 migrations.ts（版本管理）

- **目标**：`src/db/migrations.ts` 导出 `runMigrations()` 函数和 `MIGRATIONS` 数组
- **前置**：2.1 完成
- **后置**：可调用 `runMigrations()` 完成 schema 部署
- **任务**：
  1. 创建 `src/db/migrations.ts`
  2. 导出数组 `MIGRATIONS: string[]`，第 0 项 = 5 段 schema SQL 拼接（用 `;\n` 分隔）
  3. 导出 `getCurrentVersion()`：读 `PRAGMA user_version`
  4. 导出 `setVersion(v: number)`：写 `PRAGMA user_version = v`
  5. 导出 `runMigrations()`：对比 `current` 与 `MIGRATIONS.length`，从 `current` 起顺序执行每一项，每执行完一项 `setVersion(i + 1)`
- **测试用例**：
  - TC1 [首次运行]：DB 全新，调 `runMigrations()` → `getCurrentVersion()` 返回 `1`，5 张表都存在
  - TC2 [二次运行]：DB 已是 v1，再调 `runMigrations()` → 仍返回 `1`，5 张表仍存在（**不**重复 CREATE）
  - TC3 [降级容错]：DB 已是 v2，但代码里 `MIGRATIONS.length === 1`（回退）→ 不抛错，跳过所有
- **本步不处理**：不写 `tx()`（下一步）、不处理 SQL 执行失败重试
- **完成定义**：
  - [ ] 3 个测试用例全通过（用 sqlite 工具或临时 debug 页验证）

### Step 2.3 — 编写 seed.ts（默认分类）

- **目标**：`src/db/seed.ts` 导出 `seedIfEmpty()`
- **前置**：2.2 完成
- **后置**：`expense_categories` 表首次启动有 5 行默认数据
- **任务**：
  1. 创建 `src/db/seed.ts`
  2. 导出 `seedIfEmpty()`：查 `expense_categories` 行数，若为 0 则插入 5 行（菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰），`is_default=1`，`sort_order` 1-5
  3. 不重复插入：依赖行数判断
- **测试用例**：
  - TC1 [首次]：删 App 重装 → 启动后 `SELECT COUNT(*) FROM expense_categories` = 5
  - TC2 [二次]：不卸载直接重启 → 仍为 5 行（不重复插入）
  - TC3 [手动数据]：若用户已手动加 1 个自定义分类（共 6 行）→ 启动后仍 6 行（seed 不强制覆盖）
- **本步不处理**：不写其他表的 seed（其他表为空是正确的初始状态）
- **完成定义**：
  - [ ] TC1 / TC2 / TC3 全部通过

### Step 2.4 — 编写 db/index.ts（连接 + tx）

- **目标**：`src/db/index.ts` 导出 `init()`、`tx()`、`close()`、单例 `db`
- **前置**：2.3 完成
- **后置**：可调 `init()` 完成全部启动初始化；可调 `tx(fn)` 跑事务
- **任务**：
  1. 创建 `src/db/index.ts`
  2. 用模块级单例持有数据库连接（`let _db: any = null`）
  3. 导出 `init()`：检查单例；若无则用 `plus.sqlite.openDatabase` 打开 `bookkeeping.db`（无则创建）；调 `runMigrations()`；调 `seedIfEmpty()`
  4. 导出 `tx<T>(fn: () => T): T`：
     - 先执行 `BEGIN`
     - 调 `fn()`，捕获结果
     - 成功则 `COMMIT` 并返回结果
     - 失败则 `ROLLBACK` 并重抛
  5. 导出 `close()`：关闭连接、清单例
- **测试用例**：
  - TC1 [正常事务]：`tx(() => insertOrder(o))` 成功 → 查 DB 有该订单
  - TC2 [失败回滚]：`tx(() => { insertOrder(o); throw new Error('test') })` 抛错 → 查 DB 无该订单（**回滚生效**）
  - TC3 [嵌套防护]：在 `tx()` 内再调 `tx()` → 第二次 `BEGIN` 应被识别并跳过（不嵌套事务）
- **本步不处理**：不实现重试机制、不加连接池
- **完成定义**：
  - [ ] 3 个测试用例全通过
  - [ ] `init()` 可在 App 启动时被调用

### Step 2.5 — 在 App.vue 触发 init

- **目标**：App 冷启动自动完成 DB 初始化
- **前置**：2.4 完成
- **后置**：`pnpm dev:app-android` 启动后 DB 已建表、已 seed
- **任务**：
  1. 编辑 `src/App.vue`
  2. 在 `onLaunch` 生命周期调 `db.init()`（不需要 await，因为 plus.sqlite 是同步 API；但用 try/catch 包裹，启动失败弹 toast）
  3. 在 `onShow` 不重复调（依赖单例）
- **测试用例**：
  - TC1 [正常冷启动]：App 冷启动后无报错；用 sqlite 工具查 DB 5 张表都存在、`expense_categories` 有 5 行
  - TC2 [二次启动]：不卸载直接重启 → 仍正常工作
  - TC3 [失败降级]：把 `bookkeeping.db` 文件改成只读（模拟权限问题）→ App 启动弹"数据库初始化失败"toast，不白屏
- **本步不处理**：不做"重置数据库"功能（留给 v1.0 后期）
- **完成定义**：
  - [ ] TC1 / TC2 / TC3 全部通过

### Step 2.6 — 端到端验证：DB 落盘

- **目标**：把 v0 DB 备份存档，作为后续步骤的基线
- **前置**：2.5 完成
- **后置**：`memory-bank/bookkeeping-v0.db` 存在
- **任务**：
  1. 启动 App 一次（让 DB 落盘）
  2. 用 `adb pull` 把 `/data/data/com.bookkeeping.app/databases/bookkeeping.db` 拉到 `memory-bank/bookkeeping-v0.db`
  3. 用 sqlite 命令行工具打开 `.db` 文件，确认 5 张表 + 5 个默认分类
  4. 在 `architecture.md` 记录此备份路径
- **测试用例**：
  - TC1：sqlite 工具打开备份文件 → `.tables` 列出 5 张表；`SELECT * FROM expense_categories` 返回 5 行
- **本步不处理**：不写自动备份脚本（手动一次即可）
- **完成定义**：
  - [ ] `bookkeeping-v0.db` 存在
  - [ ] sqlite 工具能打开并显示完整结构

### **里程碑 2.6 — 数据层就绪**
- 更新 `memory-bank/architecture.md`：记录 5 张表已落地、`tx()` 工具就绪、seed 策略、v0 备份路径
- 验收：从空白 App → 启动后 5 张表 + 5 个默认分类齐备

---

## 3. 类型与工具

> 目标：所有 TS 类型定义清楚；日期和金额工具可用

### Step 3.1 — 定义 domain 类型

- **目标**：`src/types/domain.ts` 含 5 个核心 interface
- **前置**：2.6 完成
- **后置**：`Customer` / `MealCard` / `Order` / `ExpenseCategory` / `Expense` 可被 import
- **任务**：
  1. 创建 `src/types/domain.ts`
  2. 导出 5 个 interface，字段名严格匹配 schema.ts
  3. 可空字段用 `T | null`（如 `meal_card_id: number | null`、`default_lunch_price: number | null`）
  4. 枚举字段用字面量联合类型：`status: 'pending' | 'delivered' | 'cancelled'`
- **测试用例**：
  - TC1：`pnpm build` 不报 TS 错
  - TC2：从 DB 查一条 `customers` 记录，`as Customer` 不需要 `any` 断言
  - 边界 [枚举严格性]：故意赋值 `status: 'wrong'` → TS 报错
- **本步不处理**：不写 API 入参出参类型（下步）
- **完成定义**：
  - [ ] 5 个 interface 导出
  - [ ] TC1 / TC2 / 边界 全通过

### Step 3.2 — 定义 API 入参出参类型

- **目标**：`src/types/api.ts` 含 5+ 个入参 interface
- **前置**：3.1 完成
- **后置**：API 层可 `import type` 复用
- **任务**：
  1. 创建 `src/types/api.ts`
  2. 导出 `CreateOrderInput`（必填：customer_id、order_date、meal_type、quantity、payment_method；可选：unit_price、note、meal_card_id）
  3. 导出 `OpenMealCardInput`（customer_id、total_meals、amount、可选 note）
  4. 导出 `CreateCustomerInput`、`UpdateCustomerInput`、`CreateExpenseInput`
  5. 导出 `StatsSummary`（orderCount、income、expense、profit）、`DailyTrendPoint`（date、income、expense、profit）、`CategoryBreakdown`（categoryId、categoryName、amount、percentage）
- **测试用例**：
  - TC1：必填字段缺失时 TS 报错（测试时临时构造）
  - 边界：可选字段用 `?` 修饰
- **完成定义**：
  - [ ] 8+ 个类型导出
  - [ ] TS 编译通过

### Step 3.3 — 写日期工具 date.ts

- **目标**：`src/utils/date.ts` 含 5 个工具函数
- **前置**：3.1 完成
- **后置**：所有日期相关逻辑可被复用
- **任务**：
  1. 创建 `src/utils/date.ts`
  2. 装 dayjs 依赖（如未装）
  3. 导出 5 个函数：
     - `today(): string` 返回 `'YYYY-MM-DD'` 本地时区
     - `weekRange(d: string): { start: string, end: string }` 周一到周日
     - `monthRange(d: string): { start: string, end: string }` 1 号到月底
     - `formatDate(d: string | Date): string` 显示为 `MM-DD` 或 `YYYY-MM-DD`（按当年/非当年）
     - `daysBetween(a: string, b: string): number` 整数天数差
  4. **不**使用 UTC，统一本地时区
- **测试用例**：
  - TC1 [today]：运行 `today()` → 与系统日期一致
  - TC2 [weekRange]：`weekRange('2026-06-10')` → `{ start: '2026-06-08', end: '2026-06-14' }`（周一到周日）
  - TC3 [monthRange]：`monthRange('2026-02-15')` → `{ start: '2026-02-01', end: '2026-02-28' }`
  - TC4 [monthRange 闰年]：`monthRange('2024-02-15')` → end 为 `'2024-02-29'`
  - 边界 [跨年]：`formatDate('2025-12-31')` → `'12-31'`（不带年）
- **本步不处理**：不做相对时间（"3 天前"）等 v1.0 不需要的功能
- **完成定义**：
  - [ ] 5 个测试用例 + 边界全通过（用临时 debug 页验证）

### Step 3.4 — 写金额格式化 format.ts

- **目标**：`src/utils/format.ts` 含 3 个工具函数
- **前置**：3.1 完成
- **后置**：所有金额展示/输入有一致格式
- **任务**：
  1. 创建 `src/utils/format.ts`
  2. 导出 3 个函数：
     - `formatMoney(n: number): string` → `"¥1,234.50"`（千分位 + 2 位小数 + ¥ 前缀）
     - `parseMoney(s: string): number` → 接受 "30" "30.5" "30.50" "¥30" → 30 / 30.5 / 30.5 / 30
     - `formatPercent(n: number): string` → 0.85 → "85%"
  3. 处理边界：`formatMoney(0)` → "¥0.00"；`formatMoney(null)` → "¥—" 或 "¥0.00"（按团队约定）
- **测试用例**：
  - TC1：`formatMoney(1234.5)` === `"¥1,234.50"`
  - TC2：`formatMoney(0)` === `"¥0.00"`
  - TC3：`parseMoney("30.5")` === 30.5；`parseMoney("¥30.5")` === 30.5；`parseMoney("abc")` 返回 0 或抛错（按约定）
  - TC4：`formatPercent(0.856)` === `"86%"`（四舍五入）或 `"85.6%"`（按约定）
  - 边界：大数 `formatMoney(1234567.89)` === `"¥1,234,567.89"`
- **本步不处理**：不做币种切换、不做多语言
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### **里程碑 3.4 — 类型与工具就绪**
- 更新 `memory-bank/architecture.md`：列出已定义的 domain 类型和工具函数
- 验收：3 个工具文件无 TS 错，可被业务代码 `import`

---

## 4. API 层

> 目标：5 个表 + 1 个 stats 聚合 = 6 个 API 文件，全部有函数导出

### Step 4.1 — customers API（CRUD）

- **目标**：`src/api/customers.ts` 含 5 个函数
- **前置**：3.2 完成
- **后置**：可对 customers 表做 CRUD
- **任务**：
  1. 创建 `src/api/customers.ts`
  2. 导出：`listCustomers()`、`getCustomer(id)`、`createCustomer(input)`、`updateCustomer(id, input)`、`deleteCustomer(id)`
  3. 所有 SQL 用参数化（`?` 占位符 + 数组传参）
  4. 查询返回的 `as Customer[]` 强转
  5. `deleteCustomer` 需检查：若有 active 餐卡或未取消订单，**禁止删除**（返回 false 或抛特定错误）
- **测试用例**：
  - TC1 [create]：`createCustomer({ name: '张三', phone: '138...' })` → `listCustomers` 看到
  - TC2 [update]：改 `discount_rate` → `getCustomer` 看到新值
  - TC3 [delete 正常]：建客户 X → 删 → `getCustomer(X.id)` 返回 null
  - TC4 [delete 拦截]：建客户 X、开 1 张次卡 → 删 X → 返回 false，DB 中 X 仍在
  - 边界 [空查询]：`listCustomers` 在空库返回 `[]`
- **本步不处理**：不分页（数据量小）、不缓存
- **完成定义**：
  - [ ] 5 个函数全部存在
  - [ ] 4 个测试用例 + 边界全通过

### Step 4.2 — meal-cards API

- **目标**：`src/api/meal-cards.ts` 含 4 个函数
- **前置**：4.1 完成
- **后置**：可对 meal_cards 表做基础操作
- **任务**：
  1. 创建 `src/api/meal-cards.ts`
  2. 导出：`getActiveCard(customerId)`、`listCards(customerId)`、`openCard(input)`、`getCard(id)`
  3. `openCard` 用 `tx()` 包裹，插入 `status='active'`、`used_meals=0` 的卡
- **测试用例**：
  - TC1：`openCard({ customerId, totalMeals: 20, amount: 300 })` → DB 查到新卡、status='active'
  - TC2：`getActiveCard(customerId)` 返回当前 active 卡（同一客户只能有 1 张 active）
  - TC3：`listCards(customerId)` 返回该客户所有卡（含 depleted）
  - 边界：客户无卡时 `getActiveCard` 返回 null
- **本步不处理**：不在 `openCard` 内做"已存在 active 卡时拒绝"（这层校验留给 UI/Store）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 4.3 — orders API（基础 CRUD）

- **目标**：`src/api/orders.ts` 含 4 个基础函数
- **前置**：4.1 完成
- **后置**：可对 orders 表做基础 CRUD
- **任务**：
  1. 创建 `src/api/orders.ts`
  2. 导出：`listOrders({ startDate, endDate, status? })`、`getOrder(id)`、`createOrder(input)`、`updateOrderStatus(id, status)`
  3. `createOrder` 用 `tx()` 包裹
  4. **`createOrder` 不扣 meal_cards 次**（A1 决策）
  5. `updateOrderStatus` 内部用 `tx()`
- **测试用例**：
  - TC1 [create pending]：`createOrder({...status 未指定})` → DB 中 status='pending'
  - TC2 [list by date]：建 3 单（不同日期）→ `listOrders({ startDate, endDate })` 只返回范围内的
  - TC3 [list by status]：建 2 pending + 1 delivered → `listOrders({ status: 'pending' })` 只返回 2 条
  - 边界 [空日期范围]：`listOrders` 未来日期 → `[]`
- **本步不处理**：不实现 `markDelivered`（下一步）、`cancelOrder`（下下一步）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 4.4 — orders API（markDelivered 流程）

- **目标**：在 `orders.ts` 加 `markDelivered(orderId)`，含次卡扣次 + 异常分支
- **前置**：4.3 完成
- **后置**：标记配送时会自动扣次卡；次数不够抛 `InsufficientCardError`
- **任务**：
  1. 定义异常类 `InsufficientCardError extends Error`
  2. 在 `orders.ts` 加 `markDelivered(orderId)`：
     - `tx()` 包裹
     - UPDATE orders SET status='delivered'
     - 若 payment_method='meal_card'：
       - 查 meal_cards 当前 used_meals 和 total_meals
       - 若 `used_meals + quantity > total_meals` → 抛 `InsufficientCardError`（**不**改 orders）
       - 否则 UPDATE meal_cards SET used_meals = used_meals + quantity
       - 若新 used_meals >= total_meals → 置 status='depleted'
  3. **关键**：`tx()` 在异常分支会回滚，所以即使 status 已改也会回滚
- **测试用例**：
  - TC1 [正常扣次]：建 1 张 20 次卡 → 录 1 单次卡 → markDelivered → meal_cards.used_meals = 1、orders.status = delivered
  - TC2 [满次自动 depleted]：建 19/20 次卡 → 录 1 单次卡 qty=2 → markDelivered → used_meals = 20、status = depleted、orders.status = delivered
  - TC3 [次数不够抛错]：建 19/20 次卡 → 录 1 单次卡 qty=2 → markDelivered → **抛 InsufficientCardError**；查 DB orders.status 仍为 pending、meal_cards.used_meals 仍为 19（**回滚生效**）
  - 边界 [非次卡订单]：录 1 单 wechat → markDelivered → 不查 meal_cards，正常改 status
- **本步不处理**：不处理"次卡已 depleted 但 order 还要 delivered"的情况（异常分支留给 UI 引导改 wechat）
- **完成定义**：
  - [ ] 4 个测试用例全通过

### Step 4.5 — orders API（cancelOrder）

- **目标**：在 `orders.ts` 加 `cancelOrder(orderId)`
- **前置**：4.4 完成
- **后置**：取消订单不返还次卡次（A1 + 简化次卡）
- **任务**：
  1. 在 `src/api/errors.ts` 定义 `AlreadyDeliveredError extends Error`（与 Step 4.4 的 `InsufficientCardError` 对称）
  2. 在 `orders.ts` 加 `cancelOrder(orderId)`：
     - `tx()` 包裹
     - 查订单当前 status：若 'delivered' → 抛 `AlreadyDeliveredError('订单已配送，不能取消')`
     - UPDATE orders SET status='cancelled', cancelled_at=now
     - **不**碰 meal_cards（因 A1 次卡未扣过）
  3. 重复取消（status='cancelled'）走幂等：直接返回，不抛错（用户重复点取消不报错）
- **测试用例**：
  - TC1 [pending → cancelled]：录 1 单 pending → cancelOrder → status='cancelled'、cancelled_at 有值
  - TC2 [不影响次卡]：建 20 次卡 → 录 1 单次卡 → **不** markDelivered → cancelOrder → meal_cards.used_meals 仍为 0
  - TC3 [delivered 不能取消]：建 1 单 → markDelivered → cancelOrder → **抛 `AlreadyDeliveredError`**
  - 边界 [已 cancelled 重复取消]：再 cancel 一次 → 不抛错，状态不变（幂等）
- **完成定义**：
  - [ ] 3 个测试用例 + 边界全通过
  - [ ] `AlreadyDeliveredError` 类定义在 `src/api/errors.ts`

### Step 4.6 — expense-categories API

- **目标**：`src/api/expense-categories.ts` 含 2 个函数
- **前置**：3.1 完成
- **后置**：可读分类
- **任务**：
  1. 创建 `src/api/expense-categories.ts`
  2. 导出：`listCategories()`（按 sort_order 排）、`getCategory(id)`
  3. v1.0 不暴露 add/edit/delete（分类是固定的 5 个）
- **测试用例**：
  - TC1：`listCategories` 返回 5 行，按 sort_order 1-5
  - 边界：空 DB 返回 `[]`（不可能，因为 seed 必跑，但代码要正确处理）
- **完成定义**：
  - [ ] TC1 + 边界全通过

### Step 4.7 — expenses API

- **目标**：`src/api/expenses.ts` 含 4 个函数
- **前置**：4.6 完成
- **后置**：可对 expenses 表 CRUD
- **任务**：
  1. 创建 `src/api/expenses.ts`
  2. 导出：`listExpenses({ startDate, endDate, categoryId? })`、`getExpense(id)`、`createExpense(input)`、`deleteExpense(id)`
  3. `createExpense` 用 `tx()` 包裹（虽然只插一行，但保持习惯）
- **测试用例**：
  - TC1：`createExpense({ expense_date, category_id, amount: 50, note: '买菜' })` → listExpenses 看到
  - TC2 [按分类过滤]：建 2 笔不同分类 → `listExpenses({ categoryId })` 返回 1 条
  - TC3 [delete]：`deleteExpense` → list 看不到
  - 边界：amount=0 是否允许（按业务约定，v1.0 拒绝）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 4.8 — stats API（聚合查询）

- **目标**：`src/api/stats.ts` 含 3 个聚合函数
- **前置**：4.4, 4.5, 4.7 完成
- **后置**：Dashboard / 统计页可调
- **任务**：
  1. 创建 `src/api/stats.ts`
  2. 导出：`getDashboardSummary(date)`、`getDailyTrend({ startDate, endDate })`、`getCategoryBreakdown({ startDate, endDate })`
  3. **收入口径**：`SUM(orders.amount WHERE status != 'cancelled' AND order_date IN range) + SUM(meal_cards.amount WHERE created_at IN range)`
  4. **支出口径**：`SUM(expenses.amount WHERE expense_date IN range)`
  5. **利润** = 收入 - 支出
  6. **订单数**：`COUNT(orders WHERE status != 'cancelled' AND order_date IN range)`
- **测试用例**：
  - TC1 [空数据]：`getDashboardSummary('2026-06-09')` 在空 DB → `{orderCount: 0, income: 0, expense: 0, profit: 0}`
  - TC2 [基本计算]：录 3 单 wechat（30+30+15=75）+ 1 笔支出 50 + 1 张次卡 ¥300 → summary = `{orderCount: 3, income: 375, expense: 50, profit: 325}`
  - TC3 [排除 cancelled]：录 2 单（1 取消 1 正常）+ 正常 30 → summary.income = 30（不计入 cancelled）
  - TC4 [分类聚合]：录 3 笔支出（菜品 50、菜品 30、耗材 20）→ breakdown = `[{菜品: 80, 67%}, {耗材: 20, 33%}]`
  - 边界 [跨日]：6/9 录 1 单 → 6/10 查 6/9 summary → 含；查 6/10 → 不含
- **本步不处理**：不做缓存、不做预聚合
- **完成定义**：
  - [ ] 4 个测试用例 + 边界全通过
  - [ ] 收入计算公式与 design doc §5.2 一致

### **里程碑 4.8 — API 层就绪**
- 更新 `memory-bank/architecture.md`：列出 6 个 API 文件的所有导出函数及签名
- 验收：从 0 数据 → 录数据 → 各 API 返回符合预期

---

## 5. Pinia Stores

> 目标：4 个 store，每个负责一种资源在当前 view 的缓存

### Step 5.1 — 安装 Pinia + 初始化

- **目标**：`main.ts` 装好 Pinia
- **前置**：1.4 完成
- **后置**：`pnpm dev` 不报错，store 概念就绪
- **任务**：
  1. 装 `pinia`
  2. 在 `src/main.ts` 创建 pinia 实例，挂到 Vue app
- **测试用例**：
  - TC1：`pnpm dev` 不报"createPinia is not a function"错
- **本步不处理**：不写具体 store（下步）
- **完成定义**：
  - [ ] Pinia 在 dev 模式下可用

### Step 5.2 — customer store

- **目标**：`src/stores/customer.ts` 含完整 customer 状态
- **前置**：5.1、4.1 完成
- **后置**：可在页面 `useCustomerStore()` 调 list、CRUD
- **任务**：
  1. 创建 `src/stores/customer.ts`
  2. state：`list: Customer[]`、`loading: boolean`
  3. getters：`byId(id)` 返回 Customer 或 null
  4. actions：`refresh()`（调 `api.listCustomers`）、`create(input)`、`update(id, input)`、`remove(id)`（后三个写后调 refresh）
- **测试用例**：
  - TC1 [refresh]：建 2 客户 → `store.refresh()` → `store.list.length === 2`
  - TC2 [create]：调 `store.create({name: 'A'})` → list 立即含 A
  - TC3 [byId]：`store.byId(A.id)` 返回 A
  - TC4 [remove]：调 `store.remove(A.id)` → list 不含 A
  - 边界 [loading]：refresh 期间 `loading=true`、完成后 `loading=false`
- **本步不处理**：不分页、不做搜索过滤（页面层做）
- **完成定义**：
  - [ ] 4 个测试用例 + 边界全通过

### Step 5.3 — order store

- **目标**：`src/stores/order.ts` 含订单状态 + 当前日期
- **前置**：5.1、4.5 完成
- **后置**：订单列表页可用
- **任务**：
  1. state：`list: Order[]`、`currentDate: string`（默认今天）、`loading: boolean`
  2. actions（**全部返回 Promise<实体>**，UI 拿新 ID 用）：
     - `setDate(date)` → void
     - `refreshForDate(date)` → Promise<void>
     - `create(input)` → Promise<Order>（返回新订单）
     - `markDelivered(id)` → Promise<Order>（返回更新后的订单，**异常时抛 `InsufficientCardError`**）
     - `cancel(id)` → Promise<void>（**异常时抛 `AlreadyDeliveredError`**）
  3. **写操作后自动 `refreshForDate(currentDate)`**（保证 UI 一致）
  4. `markDelivered` / `cancel` 不吞错误，原样抛出给 UI 层处理弹窗
- **测试用例**：
  - TC1 [refreshForDate]：建 2 单 6/9 + 1 单 6/10 → `refreshForDate('2026-06-09')` → list.length=2
  - TC2 [create]：调 `store.create({...})` → list 立即多 1 条
  - TC3 [markDelivered]：调 → 列表中对应订单 status 变 'delivered'
  - TC4 [cancel]：调 → 列表中对应订单 status 变 'cancelled'（从 list 中过滤或保留带标签按约定）
  - 边界 [异常抛出]：markDelivered 触发 InsufficientCardError → store 重新抛出（不吞）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 5.4 — expense store

- **目标**：`src/stores/expense.ts` 含支出状态
- **前置**：5.1、4.6、4.7 完成
- **后置**：可读 + 写支出
- **任务**：
  1. state：`list: Expense[]`、`categories: ExpenseCategory[]`、`currentDate: string`、`loading: boolean`
  2. actions：`refreshForDate(date)`、`refreshCategories()`、`create(input)`、`remove(id)`
- **测试用例**：
  - TC1 [refresh categories]：调 → categories 含 5 行
  - TC2 [refresh list]：建 1 笔 → refresh → list 含
  - TC3 [create]：调 create → list 多 1 条
  - 边界 [remove]：调 remove → list 少 1 条
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 5.5 — stats store

- **目标**：`src/stores/stats.ts` 含统计状态
- **前置**：5.1、4.8 完成
- **后置**：Dashboard / 统计页可调
- **任务**：
  1. state：`summary: StatsSummary | null`、`trend: DailyTrendPoint[]`、`breakdown: CategoryBreakdown[]`、`range: { start: string, end: string }`、`loading: boolean`
  2. actions：`refreshSummary(date)`、`refreshRange({ start, end })`（同时刷 summary/trend/breakdown）
- **测试用例**：
  - TC1 [refresh summary today]：录数据后 → `store.refreshSummary(today())` → `store.summary.income` 等于正确值
  - TC2 [refresh range]：调 `refreshRange({ start: '2026-06-01', end: '2026-06-30' })` → 3 个数组都填好
  - 边界 [空数据]：调 refresh → 数字字段都是 0、数组是 `[]`
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### **里程碑 5.5 — Stores 就绪**
- 更新 `memory-bank/architecture.md`：列出 4 个 store 的 state / getters / actions
- 验收：4 个 store 可被任意页面 `useXxxStore()` 调用

---

## 6. 通用 UI 组件

> 目标：3 个跨页复用组件

### Step 6.1 — StatCard.vue

- **目标**：通用数字卡片组件
- **前置**：1.8 完成
- **后置**：可在 Dashboard / 统计页用
- **任务**：
  1. 创建 `src/components/StatCard.vue`
  2. props：`label: string`、`value: string | number`、`color?: 'normal' | 'positive' | 'negative'`、`hint?: string`（副标题）
  3. 模板：上方小字 label，下方大数字 value（24-32px），可选 hint
  4. 颜色值：`positive = #07c160`（绿）、`negative = #ee0a24`（红）、`normal = 主题默认文字色`
  5. **颜色映射规则**（Dashboard / 统计页统一）：
     - 订单数 → `normal`（无正负）
     - 收入 → `normal`（不看正负）
     - 支出 → `normal`（不看正负）
     - 利润 → `>= 0` 用 `positive`、`< 0` 用 `negative`（自动判断）
- **测试用例**：
  - TC1 [渲染]：在 Dashboard 占位页放 4 个（订单数/收入/支出/利润），硬编码 label/value，肉眼验证布局正常
  - TC2 [color]：利润 240 → 绿；利润 -35 → 红；订单数 → 默认色
  - 边界 [空 hint]：不传 hint → 不渲染 hint 区域
- **本步不处理**：不做动效、不做点击交互
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### Step 6.2 — AmountInput.vue

- **目标**：金额输入框（带 ¥ 前缀 + 数字校验）
- **前置**：1.8 完成
- **后置**：订单录入 / 支出录入可用
- **任务**：
  1. 创建 `src/components/AmountInput.vue`
  2. props：`modelValue: number`、`label: string`、`placeholder?: string`
  3. 用 uni-ui 的 `input` 组件
  4. 内部维护 `displayValue: string`（让用户能输小数）
  5. `@input` 时把字符串解析为 number 回传（用 `parseMoney`）
  6. 模板：左侧 ¥ 标签 + 输入框
- **测试用例**：
  - TC1 [正常输入]：父组件绑 `:modelValue="0" @update:modelValue="..."`，输 "30" → 父组件收到 30
  - TC2 [小数]：输 "30.5" → 父组件收到 30.5
  - TC3 [非法输入]：输 "abc" → 父组件收到 0 或上次的值（按约定）
  - 边界 [清空]：清空输入框 → 父组件收到 0
- **本步不处理**：不做币种切换
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 6.3 — CustomerPicker.vue

- **目标**：客户选择器（搜索 + 选择）
- **前置**：5.2 完成
- **后置**：订单录入 / 客户管理页可用
- **任务**：
  1. 创建 `src/components/CustomerPicker.vue`
  2. props：`modelValue: Customer | null`、`showCreate?: boolean`（是否显示"新建客户"入口）
  3. 点击 input 区域 → 弹底部 action sheet
  4. action sheet 顶部搜索框（前端 filter `customer.list`）
  5. 列表每项：客户名 + （如有折扣）"9 折"角标
  6. 选中 → emit `update:modelValue`，关闭弹层
  7. 底部"+ 新建客户"按钮（若 showCreate=true）→ emit `create` 事件
- **测试用例**：
  - TC1 [打开弹层]：点击 input → 弹层可见
  - TC2 [选择]：列表点某客户 → 父组件 `v-model` 拿到该客户对象
  - TC3 [搜索]：输 "张" → 列表只剩姓张的
  - TC4 [新建]：点"+" → 父组件收到 `create` 事件
  - 边界 [空列表]：客户为空时显示"暂无客户，请先新建"
- **本步不处理**：不实现"新建客户"弹窗（emit 事件给父组件处理）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### **里程碑 6.3 — 通用组件就绪**
- 更新 `memory-bank/architecture.md`：列出 3 个组件的 props / events
- 验收：3 个组件可被任意页面 import 使用

---

## 7. 页面实现

> 目标：4 个 Tab + 关键子页可访问并能完成核心操作

### Step 7.1 — Tab 1 Dashboard 骨架（mock 数据）

- **目标**：`src/pages/index/index.vue` 显示 4 个 StatCard + 占位列表
- **前置**：6.1 完成
- **后置**：首页能看到 4 个数字 + 列表区域
- **任务**：
  1. 编辑 `src/pages/index/index.vue`
  2. 顶部：日期标题（用 `formatDate(today())`）
  3. 中部：4 个 StatCard 横排（订单数 / 收入 / 支出 / 利润）
  4. 下部：3 个分组占位（待配送 / 已配送 / 已取消），先用硬编码空数组
- **测试用例**：
  - TC1 [渲染]：App 启动 → Dashboard 显示 4 个 0
  - TC2 [日期正确]：标题显示当天日期
  - 边界 [数字格式]：所有数字用 `formatMoney` 格式化
- **本步不处理**：不接 store（下一步）
- **完成定义**：
  - [ ] 4 个数字 + 3 个分组占位可见

### Step 7.2 — Dashboard 接入真实数据

- **目标**：Dashboard 显示真实数据
- **前置**：5.3、5.5、7.1 完成
- **后置**：录数据后 Dashboard 数字更新
- **任务**：
  1. 在 `onShow` 调 `useStatsStore().refreshSummary(today())` 和 `useOrderStore().refreshForDate(today())`
  2. 4 个 StatCard 用 `store.summary` 填值
  3. 3 个分组用 `computed` 从 `store.list` 过滤
  4. 列表项显示：客户名（关联 customers 取）+ 餐次 + 份数 + 金额 + 状态标签
- **测试用例**：
  - TC1 [初始空]：首次启动 → 4 个数字都是 0
  - TC2 [录单后]：录 1 单 pending → Dashboard 待配送分组 +1、订单数 +1
  - TC3 [markDelivered 后]：标配送 → 待配送 -1、已配送 +1
  - TC4 [录支出后]：录 1 笔 50 → 支出 +50、利润 = 收入 - 50
  - 边界 [跨日]：6/10 录单 → 6/11 看 Dashboard（应是 6/11 的数据）→ 不含 6/10
- **本步不处理**：不做"对比昨日"功能（v1.0 不做）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.3 — Tab 2 订单列表页骨架

- **目标**：`src/pages/order/list.vue` 显示订单列表 + 切日期
- **前置**：5.3 完成
- **后置**：可浏览历史订单
- **任务**：
  1. 编辑 `src/pages/order/list.vue`
  2. 顶部：日期选择器（uni-ui 的 `picker` mode=date），绑定 `useOrderStore().currentDate`
  3. 中部：`store.list` 渲染为列表（按 created_at 倒序）
  4. 每项：客户名（关联 customers）+ 餐次 + 份数 + 金额 + 状态标签（pending/delivered/cancelled 配不同颜色）
  5. 点击订单 → 跳 detail
  6. 底部浮动 "+" 按钮 → 跳 new
  7. `onShow` 调 `store.refreshForDate(store.currentDate)`
- **测试用例**：
  - TC1 [切日期]：选 6/9 → 列表只显示 6/9 单
  - TC2 [空列表]：选无单的日期 → 显示"该日期暂无订单"
  - TC3 [+ 跳转]：点 + → 跳到 new 页
  - TC4 [点击跳转]：点列表项 → 跳到 detail 页
  - 边界 [loading]：refresh 期间显示 loading
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.4 — Tab 2 新建订单表单（布局 + 客户选择）

- **目标**：`src/pages/order/new.vue` 表单上半部分
- **前置**：5.2、5.3、6.3 完成
- **后置**：可选客户，UI 看起来对
- **任务**：
  1. 创建 `src/pages/order/new.vue`
  2. 顶部：导航栏 "← 新建订单" + 保存按钮
  3. 客户选择区：CustomerPicker 组件，绑定本地 state `selectedCustomer`
  4. 餐次：radio 组件（午餐 / 晚餐），绑定 `mealType`
  5. 份数：uni-ui 的 number box，绑定 `quantity`（默认 1）
  6. 保存按钮 disabled 条件：未选客户
- **测试用例**：
  - TC1 [打开空态]：从列表点 + 跳到 new → 客户未选、餐次未选
  - TC2 [选客户]：点客户区 → 弹 CustomerPicker → 选 → 回填客户名
  - TC3 [份数 stepper]：份数 1 → 点 + → 2；点 - → 1；边界：1 → 点 - → 仍 1
  - 边界 [未选客户保存]：保存按钮 disabled，无法点击
- **本步不处理**：不实现"价格 / 支付 / 备注"（下步）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.5 — 新建订单：价格计算（A6 核心）

- **目标**：选客户后自动填默认价 × 折扣率，可手动改
- **前置**：7.4 完成
- **后置**：保存时订单金额 = 实际价 × 份数
- **任务**：
  1. 在 `src/pages/order/new.vue` 加价格区
  2. 监听 `selectedCustomer` + `mealType` 变化 → 计算 `defaultPrice`（**仅当支付方式不是次卡时**，次卡走另一条规则，见 Step 7.6）
  3. `defaultPrice` = `customer.default_lunch_price × customer.discount_rate`（午餐）或用 `default_dinner_price`
  4. 模板显示"默认价 ¥X.XX × 0.9 = ¥Y.YY"提示行（次卡时不显示此行）
  5. 实际价：AmountInput，初始值 = `defaultPrice`，可改
  6. 合计：自动 = `actualPrice × quantity`，用 `computed`
  7. 副逻辑：若客户没有 `default_lunch_price` → 默认价空，提示"请手动填入单价"
- **测试用例**：
  - TC1 [自动填价]：建客户（午餐 ¥15，9 折）→ 选客户、选午餐 → 显示"¥15.00 × 0.9 = ¥13.50"，实际价自动 13.50
  - TC2 [手改价]：实际价改成 18 → 合计 = 18 × quantity
  - TC3 [切餐次]：午餐 → 晚餐 → 价用 `default_dinner_price` 重算
  - TC4 [切客户]：换客户 → 价重新计算
  - 边界 [客户无默认价]：客户 default_lunch_price 为 null → 显示"请手动填入"，实际价空
- **本步不处理**：不实现"支付方式选择"（下步）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.6 — 新建订单：支付方式 + 次卡选择

- **目标**：选支付方式，次卡时显示次卡下拉
- **前置**：7.5 完成
- **后置**：保存时 payment_method 和 meal_card_id 正确
- **任务**：
  1. 支付方式 radio：微信 / 现金 / 次卡
  2. 选次卡时显示次卡选择器（下拉显示客户当前 active 卡的"剩 X/Y"）
  3. 若客户无 active 卡 → 提示"该客户无可用次卡"，自动切回微信
  4. 备注：textarea（可选）
  5. 保存按钮 enabled 条件：客户 + 餐次 + 份数 + 实际价 + 支付方式
  6. 点击保存 → 调 `useOrderStore().create({...})` → 跳回 list
  7. **关键**（次卡订单的 unit_price 走单独规则，与 A6 脱钩）：
     - 次卡订单 `amount` 传 0（开卡时已收）
     - 次卡订单 `unit_price` = `meal_card.amount / meal_card.total_meals`（**不**乘 `customer.discount_rate`）
     - 普通订单 `unit_price` = 实际价（用户在 Step 7.5 填的）
- **测试用例**：
  - TC1 [wechat]：选微信 → 保存 → DB 中 amount = 实际价 × quantity、payment_method='wechat'、meal_card_id=null
  - TC2 [meal_card]：开 1 张 20 次 ¥300 卡 → 选次卡 → 显示"剩 20/20" → 保存 → DB 中 amount=0、payment_method='meal_card'、meal_card_id=卡的id、**unit_price=15.00**（=300/20）
  - TC3 [meal_card 不享折扣]：客户 default_lunch_price=15、discount_rate=0.9，开 20 次 ¥300 卡 → 选次卡 → **unit_price=15.00**（不乘 0.9）
  - TC4 [无可用次卡]：客户无 active 卡 → 选次卡时弹提示并自动切到微信
  - TC5 [次卡订单不扣次]：建 1 张 20 次卡 → 录 1 单次卡 → 查 DB meal_cards.used_meals 仍为 0（**A1 决策生效**）
  - 边界 [取消保存]：填一半后点导航"←" → 弹确认"放弃编辑？"
- **完成定义**：
  - [ ] TC1-TC5 + 边界全通过
  - [ ] 验证 meal_cards 不被错误扣次

### Step 7.7 — Tab 2 订单详情页（布局 + 取消）

- **目标**：`src/pages/order/detail.vue` 显示订单 + 取消按钮
- **前置**：5.3 完成
- **后置**：可看订单详情，可取消 pending 订单
- **任务**：
  1. 创建 `src/pages/order/detail.vue`
  2. 接 `onLoad` 参数 `id`
  3. 调 `api.getOrder(id)` 拿当前订单数据（**不要** refreshForDate——按 id 查单条更准，且 refreshForDate 会刷整个日期范围，浪费）
  4. 模板：显示订单所有字段（只读）+ 客户信息（关联查询 customers 表）
  5. 底部按钮：
     - pending 状态：显示 [标记已配送] 和 [取消订单]
     - delivered / cancelled：不显示任何操作按钮
  6. [取消订单]：弹确认 → 调 `store.cancel(id)`（可能抛 `AlreadyDeliveredError`——见 4.5）→ toast 提示 → 跳回 list
- **测试用例**：
  - TC1 [pending 显示按钮]：录 1 单 pending → 详情页 → 看到 2 个按钮
  - TC2 [取消成功]：点取消 → 确认 → 跳回 list → 订单状态变 cancelled
  - TC3 [delivered 不显示按钮]：markDelivered 1 单 → 详情页 → 没有按钮
  - 边界 [已取消再进]：cancelled 订单详情页 → 显示历史信息，无按钮
- **本步不处理**：不实现"标记已配送"按钮（下步专门处理 A1 流程）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.8 — 订单详情：标记已配送（含次卡异常）

- **目标**：pending 订单可标记已配送；次卡异常时引导改支付方式
- **前置**：7.7 完成
- **后置**：完整 A1 流程
- **任务**：
  1. 在详情页加 [标记已配送] 按钮
  2. 点击 → 调 `useOrderStore().markDelivered(id)`
  3. 正常：toast "已标记配送" + 跳回 list
  4. 异常：捕获 `InsufficientCardError` → 弹窗"次卡次数不够"
     - 弹窗选项：[改为微信 ¥XX] [改为现金 ¥XX] [取消]
     - 选微信/现金 → UPDATE orders payment_method、unit_price、amount → 再调 markDelivered
     - 选取消 → 不动
  5. 关键：弹窗中显示的金额用 `unit_price × quantity`（次卡时 amount=0，所以要算单价 × 份数）
- **测试用例**：
  - TC1 [正常次卡]：开 20 次卡 + 录 1 单次卡 → 详情页标配送 → 成功 → meal_cards.used_meals=1
  - TC2 [次卡异常弹窗]：开 19/20 次卡 + 录 1 单 qty=2 → 详情页标配送 → 弹"次卡次数不够"
  - TC3 [改微信成功]：TC2 状态下选"改为微信 ¥30" → orders 变 wechat、amount=30、markDelivered 成功
  - TC4 [取消不操作]：TC2 状态下选"取消" → 订单状态仍 pending、meal_cards 不变
  - TC5 [wechat 正常]：录 1 单 wechat → 标配送 → 直接成功，无弹窗
  - 边界 [depleted 状态]：开 1 张 20 次卡 → 手动 UPDATE DB used_meals=20、status=depleted → 录 1 单 → 标配送 → 弹"次卡次数不够"（即使 deplete 也是同样路径）
- **完成定义**：
  - [ ] TC1-TC5 + 边界全通过

### Step 7.9 — Tab 3 统计页骨架

- **目标**：`src/pages/stats/index.vue` 显示时间筛选 + 4 个数字
- **前置**：5.5 完成
- **后置**：可切时间段看统计
- **任务**：
  1. 创建 `src/pages/stats/index.vue`
  2. 顶部：时间段切换 segmented control（今日 / 本周 / 本月 / 自定义）
  3. 自定义时弹出日期范围选择器
  4. 4 个 StatCard：收入 / 支出 / 利润 / 订单数
  5. 客单价：附加显示 = income / orderCount（orderCount=0 时显示 "—"）
  6. 切换时间段 → 调 `useStatsStore().refreshRange(...)`
- **测试用例**：
  - TC1 [切今日]：默认选中今日 → 数字与 Dashboard 一致
  - TC2 [切本周]：选本周 → 数字聚合本周所有订单/支出
  - TC3 [切自定义]：选 6/1-6/9 → 数字聚合
  - TC4 [空数据]：选无单的日期 → 数字 0、订单数 0、客单价 "—"
  - 边界 [切换 loading]：切换期间显示 loading
- **本步不处理**：不画图表（下步）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.10 — 统计页：日趋势 + 分类占比

- **目标**：统计页加 CSS 进度条图表
- **前置**：7.9 完成
- **后置**：可视化查看
- **任务**：
  1. 日趋势区：列表式，每天一行（"MM-DD 周X" + 收入 + CSS 进度条）
     - **归一化策略**：按范围（日/周/月）内**最大值线性归一化**（不是对数）
     - 视觉诚实优先：若数据稀疏（如一天 ¥1000、一天 ¥1），小那条几乎不可见——是真实数据特征，不掩盖
  2. 分类占比区：列表式，每个分类一行（"🥬 菜品 ¥80" + 百分比 + 进度条按总和归一化）
  3. 空数据：显示"暂无数据"
- **测试用例**：
  - TC1 [有数据]：录 3 天数据 → 趋势区显示 3 行 + 进度条长度对应
  - TC2 [空数据]：未来日期 → 显示"暂无数据"
  - TC3 [分类占比正确]：3 笔菜品 + 1 笔耗材 → 菜品 75%、耗材 25%
  - TC4 [数据稀疏]：一天 ¥1000、一天 ¥1 → 大条满格、小条约 0.1%
  - 边界 [单笔数据]：1 笔 → 进度条 100%
- **本步不处理**：不做交互式图表（点击、悬浮等）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.11 — Tab 4 我的 / 客户列表

- **目标**：`src/pages/me/customers/list.vue` 列出所有客户
- **前置**：5.2 完成
- **后置**：可浏览 + 搜索 + 跳新建
- **任务**：
  1. 创建 `src/pages/me/customers/list.vue`
  2. 顶部搜索框（前端 filter）
  3. 列表：客户名 + 折扣角标（如有）
  4. 点客户 → 跳 detail
  5. 右上 / 底部 + 按钮 → 跳 new
  6. `onShow` 调 `store.refresh()`
- **测试用例**：
  - TC1 [列表渲染]：建 3 客户 → 列表显示 3 行
  - TC2 [搜索]：输"张" → 只剩姓张的
  - TC3 [点击跳转]：点客户 → 跳 detail
  - TC4 [+ 跳转]：点 + → 跳 new
  - 边界 [空列表]：无客户 → 显示"暂无客户"
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.12 — 客户新建 / 编辑页

- **目标**：`src/pages/me/customers/new.vue` 支持新建和编辑
- **前置**：7.11 完成
- **后置**：可维护客户档案
- **任务**：
  1. 创建 `src/pages/me/customers/new.vue`
  2. 字段：姓名（必填）、手机、微信、午餐默认价、晚餐默认价、折扣率（默认 1.0，slider 0-1）、备注
  3. 接 `onLoad` 参数 `id` → 有 id 是编辑（拉数据填表单）、无 id 是新建
  4. 保存按钮：调 `store.create` 或 `store.update`
- **测试用例**：
  - TC1 [新建]：填全字段 → 保存 → 跳回 list → 看到新客户
  - TC2 [编辑]：点客户 → 改折扣率 → 保存 → 回 list → 折扣角标更新
  - TC3 [必填校验]：姓名空 → 保存按钮 disabled
  - TC4 [折扣率 0]：滑到 0 → 保存 → DB 中 discount_rate=0
  - 边界 [默认价空]：午餐默认价不填 → 保存 → DB 中 default_lunch_price=null（不是 0）
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.13 — 客户详情页（基础信息 + 历史订单）

- **目标**：`src/pages/me/customers/detail.vue` 显示客户信息
- **前置**：5.2、4.1、4.3 完成
- **后置**：可看客户全部信息
- **任务**：
  1. 创建 `src/pages/me/customers/detail.vue`
  2. 接 `onLoad` 参数 `id`
  3. 顶部：客户基础信息（只读）
  4. 中部：当前 active 次卡卡片（**下步再做，先放占位**）
  5. 下部：历史订单列表（调 `api.listOrders` 不过滤日期，order by date desc）
  6. 右上 [编辑] → 跳 new（带 id）
- **测试用例**：
  - TC1 [基础信息显示]：建客户 → 详情页 → 看到所有字段
  - TC2 [历史订单]：录 3 单 → 详情页看到 3 单
  - TC3 [编辑跳转]：点编辑 → 跳 new 表单已填好
  - 边界 [无订单]：新客户 → 历史订单区域显示"暂无订单"
- **本步不处理**：不做次卡卡片（下一步）
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.14 — 客户详情：次卡卡片 + 开新卡入口

- **目标**：客户详情显示当前次卡 + "+ 开新卡"按钮
- **前置**：7.13、4.2 完成
- **后置**：可看到次卡进度
- **任务**：
  1. 在客户详情页加次卡卡片区
  2. 调 `api.meal-cards.getActiveCard(customerId)`
  3. 有 active 卡：显示"剩 X/Y" + CSS 进度条（used/total）
  4. 无 active 卡：显示"该客户暂无次卡"
  5. "+ 开新卡"按钮 → 跳独立页 `src/pages/me/customers/open-card.vue`（**不用弹层**，表单 3 字段 + 重复开卡确认弹窗，弹层放不下）
- **测试用例**：
  - TC1 [有 active 卡]：开 1 张 20 次 → 详情页看到"剩 20/20" + 0% 进度条
  - TC2 [用过 3 次]：开 1 张 20 次 + markDelivered 3 单 → 详情页"剩 17/20" + 15% 进度条
  - TC3 [depleted 卡]：开 1 张 20 次 + markDelivered 20 单 → 详情页"该客户暂无次卡"（active 为空）
  - TC4 [+ 跳转]：点"+ 开新卡"→ 跳 open-card 页
  - 边界 [无卡]：新客户 → 显示"该客户暂无次卡"
- **完成定义**：
  - [ ] TC1-TC4 + 边界全通过

### Step 7.15 — 开次卡表单（独立页 + 重复开卡确认）

- **目标**：开新次卡；若客户已有 active 卡，弹确认（不阻止）
- **前置**：7.14 完成
- **后置**：可开新次卡
- **任务**：
  1. 创建 `src/pages/me/customers/open-card.vue`（**独立页**，不是弹层）
  2. 接 `onLoad` 参数 `customerId`
  3. 入口处调 `api.meal-cards.getActiveCard(customerId)`：
     - 若有 active 卡 → 弹确认弹窗"该客户已有 active 次卡（剩 X/Y），是否继续开新卡？"，按用户选择继续 / 取消
     - 若无 active 卡 → 直接进入表单
  4. 表单字段：总次数（默认 20）、金额、备注
  5. 保存 → 调 `api.meal-cards.openCard` → toast → 跳回 detail
  6. 校验：金额 > 0、次数 > 0
- **测试用例**：
  - TC1 [无 active 卡]：直接进入表单 → 填金额 300 → 保存 → DB 中多 1 张 active 卡
  - TC2 [有 active 卡 + 继续]：已有 active 卡 → 弹"已有...是否继续" → 选继续 → 填新金额 → 保存 → DB 中**多 1 张** active 卡（旧卡保留）
  - TC3 [有 active 卡 + 取消]：已有 active 卡 → 弹确认 → 选取消 → 跳回 detail，DB 不变
  - TC4 [默认开 20 次]：总次数 20 → DB 中 total_meals=20
  - TC5 [开 30 次]：改总次数 30 → DB 中 total_meals=30
  - TC6 [金额 0 拒绝]：金额填 0 → 保存按钮 disabled
  - 边界 [开卡后立即看到]：开 1 张 → 跳回 detail → 看到新卡进度（**多张 active 卡时显示最新一张或汇总，需在 7.14 扩展**，本步只保证单张情况）
  - 边界 [开卡后立即看到]：开 1 张 → 跳回 detail → 看到新卡进度
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.16 — Tab 4 支出列表

- **目标**：`src/pages/me/expenses/list.vue` 显示支出
- **前置**：5.4 完成
- **后置**：可浏览支出
- **任务**：
  1. 创建 `src/pages/me/expenses/list.vue`
  2. 顶部日期选择（同订单列表）
  3. 列表：按日期分组，每天一组，每组下是该天所有支出
  4. 每项：分类 emoji + 分类名 + 金额 + 备注
  5. + 按钮跳 new
  6. 长按 → 弹"删除"选项
- **测试用例**：
  - TC1 [按日分组]：6/9 录 2 笔 + 6/10 录 1 笔 → 列表显示 2 个分组
  - TC2 [切日期]：选 6/9 → 只显示 6/9 的 2 笔
  - TC3 [删除]：长按某笔 → 弹确认 → 删除 → 列表少 1 笔
  - 边界 [空列表]：选无支出的日期 → "该日期暂无支出"
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.17 — 支出新建页

- **目标**：`src/pages/me/expenses/new.vue` 录支出
- **前置**：7.16 完成
- **后置**：可录支出
- **任务**：
  1. 创建 `src/pages/me/expenses/new.vue`
  2. 字段：日期（默认今天）、分类（picker，从 categories）、金额、备注
  3. 保存 → 调 `store.create` → 跳回 list
  4. 校验：分类必选、金额 > 0
- **测试用例**：
  - TC1 [录成功]：选"菜品" + 金额 50 → 保存 → 列表 +1 笔
  - TC2 [分类列表]：点分类 picker → 看到 5 个默认分类
  - TC3 [未选分类拒绝]：不选分类 → 保存 disabled
  - 边界 [备注空]：备注不填 → 允许保存
- **完成定义**：
  - [ ] TC1-TC3 + 边界全通过

### Step 7.18 — Tab 4 设置（备份/恢复）

- **目标**：`src/pages/me/settings/backup.vue` 备份恢复
- **前置**：3.x 全完成、所有 API 完成
- **后置**：可备份 / 恢复
- **任务**：
  1. 创建 `src/pages/me/settings/backup.vue`（**与 tech-stack §4 一致**，不要放 me 根目录）
  2. **导出按钮**：
     - 调全表 SELECT
     - 序列化为 JSON（含 `version`、`exported_at` 字段）
     - 用 `plus.io` 写入沙盒 `backup_YYYYMMDD_HHmmss.json`
     - 调 `plus.share` 弹系统分享面板
  3. **导入按钮**：
     - 调 `plus.io` 文件选择器
     - 解析 + 校验 version
     - 二次确认弹窗
     - 在 `tx()` 内：DELETE 5 张表所有数据 → INSERT 备份数据
     - toast + 提示重启
  4. **危险区**：清空所有数据（独立按钮，三次确认）
- **测试用例**：
  - TC1 [导出]：录 3 单 + 2 笔支出 → 导出 → 系统分享面板出现 → 选微信文件助手 → 电脑收到 JSON
  - TC2 [JSON 格式正确]：收到的 JSON 含 version、exported_at、5 个表的数组
  - TC3 [导入覆盖]：导出后删 App 重装 → 导入 → 数据完整
  - TC4 [版本不匹配]：手动改 JSON version → 导入 → 弹"备份版本不兼容"
  - TC5 [清空数据]：录数据 → 清空 → 5 张表都为空
  - 边界 [导入空文件]：选 0 字节文件 → 报错"文件无效"
- **完成定义**：
  - [ ] TC1-TC5 + 边界全通过

### **里程碑 7.18 — 所有页面就绪**
- 更新 `memory-bank/architecture.md`：列出所有页面、路由、关联 store、关联 API
- 验收：4 个 Tab 全部可访问，主要操作可完成

---

## 8. 关键流程串联

> 目标：跑通"录一笔订单 → 看统计"完整闭环 + 关键异常路径

### Step 8.1 — 端到端：录单 → 配送 → 对账

- **目标**：跑通最常见路径
- **前置**：7.x 全完成
- **后置**：每步数据状态正确
- **任务**：（手动跑，不写代码）
  1. App 启动 → Dashboard 看到 4 个 0
  2. 录 1 单 wechat ¥15 pending → Dashboard 待配送 +1、订单数 +1、收入 +15
  3. 详情页 markDelivered → 待配送 -1、已配送 +1
  4. 录 1 笔支出 ¥50 → 支出 +50、利润 = 15-50 = -35
  5. 切到统计页"今日"→ 数字与 Dashboard 完全一致
- **测试用例**：上述 5 步每步的数字断言（手算对照）
- **本步不处理**：不写自动化测试脚本
- **完成定义**：
  - [ ] 5 步每步的数字与手算一致

### Step 8.2 — 端到端：次卡完整流程

- **目标**：跑通开卡 → 多次扣次
- **前置**：8.1 完成
- **后置**：次卡进度与统计一致
- **任务**：
  1. 客户详情 → 开 1 张 20 次 ¥300 的次卡 → Dashboard 收入立即 +300
  2. 录 3 单次卡订单 pending → Dashboard 待配送 +3
  3. markDelivered 3 单 → meal_cards.used_meals = 3、客户详情剩 17/20
  4. 统计页"今日"→ 收入 = 0（次卡订单 amount=0）+ 300 = 300、订单数 = 3
- **测试用例**：上述 4 步每步断言
- **完成定义**：
  - [ ] 4 步每步的数字与手算一致

### Step 8.3 — 端到端：次卡次数不够异常

- **目标**：跑通"次卡用完 → 改微信"路径
- **前置**：8.2 完成
- **后置**：异常处理流程通
- **任务**：
  1. 建 1 张 19/20 的卡（剩 1 次）
  2. 录 1 单次卡 qty=2 → 详情页 markDelivered
  3. 弹"次卡次数不够" → 选"改为微信 ¥30"
  4. 订单 payment_method='wechat'、amount=30、status='delivered'；meal_cards 仍 19/20（**未扣**）
  5. 统计页：收入 +30、订单数 +1
- **测试用例**：上述 5 步每步断言
- **完成定义**：
  - [ ] 5 步每步的数字与手算一致

### Step 8.4 — 端到端：取消订单

- **目标**：验证取消不影响统计
- **前置**：8.1 完成
- **后置**：取消的订单不计入
- **任务**：
  1. 录 1 单 pending ¥30
  2. 详情页取消 → status='cancelled'
  3. Dashboard 订单数仍 0、收入仍 0（cancelled 不计）
  4. 统计页"今日"→ 同样不计
- **测试用例**：上述 4 步断言
- **完成定义**：
  - [ ] 4 步每步断言通过

### Step 8.5 — 端到端：折扣 + 临时涨价

- **目标**：验证 A6 行为
- **前置**：7.12 完成
- **后置**：默认价 + 折扣 + 临时改价都正确
- **任务**：
  1. 建客户 discount_rate=0.9、default_lunch_price=15
  2. 录 1 单午餐 → 默认价 ¥15.00 × 0.9 = ¥13.50、自动填入
  3. 改实际价为 18（临时涨价）→ 合计 18 × 1 = 18
  4. 保存 → 订单 amount=18
  5. 再录 1 单同客户 → 默认价仍 13.50（不影响其他订单）
- **测试用例**：上述 5 步断言
- **完成定义**：
  - [ ] 5 步每步断言通过

### Step 8.6 — 端到端：备份恢复

- **目标**：验证数据可完整恢复
- **前置**：7.18 完成
- **后置**：导入后数据 100% 还原
- **任务**：
  1. 录 10 单 + 5 笔支出 + 2 张次卡
  2. 导出 JSON → 通过微信传电脑
  3. 卸载 App → 重装 → 启动（DB 空）
  4. 设置 → 导入 → 选电脑上的 JSON → 二次确认 → 导入
  5. 重启 App → 数据完整：订单 ID、客户 ID、次卡 ID 与导出前一致
  6. 统计页"本月"→ 数字与导出前一致
- **测试用例**：上述 6 步断言
- **完成定义**：
  - [ ] 6 步每步断言通过
  - [ ] 客户/订单/次卡 ID 保持一致（说明不是按 id 重新生成）

### **里程碑 8.6 — 核心流程全部通过**
- 更新 `memory-bank/architecture.md`：把每条流程的"已验证场景"列出来
- 拉一份当前 DB 备份到 `memory-bank/bookkeeping-v1.db` 备查
- 验收：6 条端到端流程全部通过

---

## 9. 收尾与发布

> 目标：v1.0 可发布

### Step 9.1 — 空状态 + Loading 防重复

- **目标**：所有列表页有空态文案；所有写操作按钮有 loading
- **前置**：7.x 全完成
- **后置**：用户体验完整
- **任务**：
  1. 检查所有 `<view v-if="list.length === 0">` 占位，加友好文案
  2. 所有提交按钮加 `:loading="store.loading"` 防止快速点击
  3. 关键 async 操作加 try/catch + toast
- **测试用例**：
  - TC1 [空态]：删完所有订单 → 订单列表显示"还没有订单，点 + 开始记录"
  - TC2 [防重]：长按保存按钮 → 只触发 1 次（不是 5 次）
  - 边界 [错误提示]：手动 mock 一个 API 失败 → 用户看到友好 toast
- **本步不处理**：不做更精细的 UX（如骨架屏）
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### Step 9.2 — 错误处理兜底

- **目标**：DB 错误不白屏
- **前置**：9.1 完成
- **后置**：异常路径都有兜底
- **任务**：
  1. App.vue 的 `onError` 钩子捕全局错误 → toast
  2. 关键页面加 try/catch
  3. DB 损坏检测：启动时跑 `PRAGMA integrity_check`，失败则提示用户用备份恢复
- **测试用例**：
  - TC1 [DB 损坏]：手动破坏 DB 文件 → 启动 App → 提示"数据库损坏，请用备份恢复"
  - TC2 [API 失败]：mock api 抛错 → 页面不白屏，弹 toast
  - 边界 [网络错误]：暂不适用（无网络）
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### Step 9.3 — 真机性能 smoke test

- **目标**：真机上 50 单操作无明显卡顿
- **前置**：9.2 完成
- **后置**：性能基线
- **任务**：
  1. 在真机上录 50 单（手工或脚本批量 INSERT）
  2. 操作 Dashboard / 统计页 / 客户详情，观察是否卡顿
  3. 记录任何超过 1 秒的等待
- **测试用例**：
  - TC1 [Dashboard]：50 单数据下，4 个数字加载 < 500ms
  - TC2 [统计页]：50 单数据下，日趋势加载 < 500ms
  - 边界 [100 单]：继续录到 100 单，仍流畅
- **本步不处理**：不做性能深度优化
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### Step 9.4 — build Release APK + 侧载试装

- **目标**：生成可侧载的 Release APK
- **前置**：9.3 完成
- **后置**：手机上能跑 Release 版
- **任务**：
  1. 按 `memory-bank/tech-stack.md §8.3` 生成自签名 keystore（一次性）
  2. `manifest.json` 填入证书信息
  3. 运行 build release 命令
  4. APK 传手机 → 装 → 跑一遍 8.1-8.6
- **测试用例**：
  - TC1 [功能一致]：Release 版与 dev 版功能完全一致
  - TC2 [冷启动]：杀进程后冷启动 < 3 秒
  - 边界 [权限弹窗]：首次启动无权限弹窗（不需要任何危险权限）
- **完成定义**：
  - [ ] TC1-TC2 + 边界全通过

### Step 9.5 — 写 CHANGELOG + v1.0 发布

- **目标**：v1.0 文档齐备
- **前置**：9.4 完成
- **后置**：`memory-bank/CHANGELOG.md` 存在
- **任务**：
  1. 创建 `memory-bank/CHANGELOG.md`
  2. 写 v1.0 节：列已实现功能（按 PRD §4 的 F1-F6）、已知限制、TBD 留待 v1.1
  3. 在 `memory-bank/architecture.md` 标记 v1.0 完成
  4. 备份 DB 标记为基线
- **测试用例**：
  - TC1：CHANGELOG.md 存在且含 4 个小节
- **完成定义**：
  - [ ] CHANGELOG.md 完整
  - [ ] architecture.md 标记 v1.0 完成

### **里程碑 9.5 — v1.0 发布**
- 更新 `memory-bank/architecture.md`：标记 v1.0 完成
- 备份 `bookkeeping-v1.db` 标记为基线

---

## 附录 A — 跨步骤参考

### A.1 SQLite 错误排查 5 步法
1. 复制 SQL 到 sqlite 命令行工具跑一遍
2. 用 `console.log` 打印 `executeSql` 的 result 完整结构
3. 检查表名 / 字段名大小写
4. 检查 FOREIGN KEY 是否需要 `PRAGMA foreign_keys = ON`
5. 用 `PRAGMA integrity_check` 查表损坏

### A.2 uni-app 调试 3 件套
- **真机日志**：`adb logcat | grep -i dcloud`
- **vConsole**：manifest.json 配 `"debugger": "vConsole"`（仅 dev）
- **DB 文件查看**：`adb pull /data/data/com.bookkeeping.app/databases/bookkeeping.db .`

### A.3 常见踩坑
- **plus.sqlite 在不同 Android 版本行为略不同**：低端机先在真机验证
- **uni-ui 组件需单独 import**：用 `easycom` 自动按需加载
- **pages.json 改了要重启 dev server**
- **H5 跑 plus.sqlite 不工作**：必须用真机或 Android 模拟器
- **TS 路径别名**：tsconfig + vite.config 都要配
- **manifest.json 改了 native 字段**（如 appid）需重新 build，否则无效
- **跨日测试**：手动改系统时间后需重启 App（store 缓存的 today 不会自动更新）

### A.4 何时回退到上一步
- 任何一步的测试用例失败 → 不要继续，先回退到上一步（或上一步的里程碑）
- 涉及 schema 的步骤（如 2.x）失败 → 卸载 App 重装来重置 DB
- 涉及多表事务的步骤失败 → 查 `PRAGMA user_version` 和实际表状态确认是 schema 问题还是事务问题

### A.5 v1.0 范围外的实施任务

> 2026-06-10 记录

- **D. 生成自签名 keystore**：Step 9.4 提到"按 `memory-bank/tech-stack.md §8.3` 生成自签名 keystore（一次性）"——这是开发者环境设置，**不算代码任务**。**当前决定：放进 README 的"开发环境"小节，不进 implementation plan**。如未来要纳入：新增 Step 0.0（在 Phase 1 之前），写"准备 keystore + 配置环境变量"。

> 注：design-doc §8.4 同时记录了 A/B/C 三项 v1.0 明确不做的设计功能（支出分类管理 / 关于页 / 清空数据），与本节 D 互不重叠。

---

## 附录 B — 完整步骤索引

| Phase | 步骤 | 估时 |
|---|---|---|
| 1 脚手架 | 1.1-1.8 | ~0.5 天 |
| 2 数据层 | 2.1-2.6 | ~1 天 |
| 3 类型/工具 | 3.1-3.4 | ~0.5 天 |
| 4 API 层 | 4.1-4.8 | ~2 天 |
| 5 Stores | 5.1-5.5 | ~1 天 |
| 6 通用组件 | 6.1-6.3 | ~1 天 |
| 7 页面 | 7.1-7.18 | ~5 天 |
| 8 流程串联 | 8.1-8.6 | ~2 天 |
| 9 收尾 | 9.1-9.5 | ~1 天 |
| **合计** | **63 步** | **~14 天** |

---

## 附录 C — 何时回头读哪些文档

| 时刻 | 必读 |
|---|---|
| 写 schema 字段 | `memory-bank/design-document.md §2.1` |
| 写业务流程 | `memory-bank/design-document.md §4` |
| 加新依赖 | `memory-bank/tech-stack.md §3`（反选清单） |
| 改次卡逻辑 | `memory-bank/design-document.md §3.2 §4.3 §4.5` |
| 改价格 / 折扣 | `memory-bank/design-document.md §4.1` A6 决策 |
| 写 commit message | 引用对应的 A / D 决策编号 |
| AI 跑偏时 | 重读 `CLAUDE.md` 第 36-46 行"关键设计约束" |
