# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：**v1.0 已发布**（Phase 1-9 全部完成；9.3 / 9.4 按用户决策跳过，用 HBuilderX 标准基座 debug APK 侧载；CHANGELOG.md v1.0 节已写好）
- **已建文件**：`docs/archive/PRD-v1.0.md`、`CLAUDE.md`、`AGENTS.md`、`CONTEXT.md`、`memory-bank/` 活文档、uni-app Vue 3 + Vite + TS 模板、11 张表 DDL + 迁移 + seed + integrity_check + tx() 工具、domain/api 类型、日期/金额/菜单模板/月卡模板/页面/备份工具、完整 API 层、4 个 Pinia store、3 个通用 UI 组件、uni-ui 表单组件、4 个 Tab 与关键子页、App.vue 全局 onError 兜底
- **DB 状态**：v0 基线（`memory-bank/bookkeeping-v0.db`，CLI sqlite smoke-test 生成）；v1 阶段基线（`memory-bank/bookkeeping-v1.db`，Phase 8 真机 E2E 通过后归档，`user_version=1`）；当前 schema 版本为 7，新增每日菜单、文案模板、月卡文案模板和两类模板版本历史，v5 → v7 真机迁移待回归
- **UI 基线**：v1.13 新增 `docs/design.md` 与 `$hej-*` 语义 token，并由样式预处理检查保护；订单空态、新建 / 编辑确认区和统计对账趋势已按该基线改造；Issue #2 已将今日页切换到暖纸张 token、自定义安全区头部、紧凑指标和真实订单状态摘要，HBuilderX Android 模拟器视觉回归待执行
- **最后更新**：2026-08-30

---

## 编译工具链（重要 — 2026-06-10 调整）

> **CLI 模式（`pnpm dev:app-android`）不能编译 SQLite 原生模块**。`plus.sqlite` 的 JS 表面存在但底层是空壳，openDatabase 同步返回 undefined 且 callback 静默不触发。
> **必须用 HBuilderX 编译**才能把 SQLite 原生模块链进 APK。

| 任务 | 用什么 |
|---|---|
| 写代码 / TS 类型检查 / lint | CLI：`pnpm type-check` / `pnpm lint` |
| 跑 h5 编译验证 | CLI：`pnpm build:h5` / `pnpm dev:h5`；**Phase 5 起若坚持使用 HBuilderX 内置 Pinia 且不手动安装 npm `pinia`，CLI H5 构建会找不到 `pinia/dist/pinia.mjs`，本阶段以 type-check / lint + HBuilderX 真机验证为准** |
| **真机调试 Android** | **HBuilderX**："运行 → 运行到 Android App 基座" |
| Release APK | HBuilderX："发行 → 原生 App-云打包"或"本地打包" |

**HBuilderX 关键配置**（第一次必做）：
- `src/manifest.json` 可视化编辑 → 「App 原生插件配置」 → 勾选 **「SQLite(数据库)」** 模块
- `工具 → 设置 → 运行配置 → Android 证书` → 生成自签名调试证书

**为什么 plan 反对 HBuilderX 但又必须用？**
- plan §3 反选清单里"不引 HBuilderX"指的是不用 HBuilderX 替代 VSCode 做 IDE（写代码仍用 VSCode）
- 但编译侧链 + 原生模块勾选 **只有 HBuilderX 能做**（uni-app 官方不发布 npm 版的 sqlite 模块）
- 解法：VSCode 写代码 + HBuilderX 编译验证，各取所长

---

## 顶层文件

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `CLAUDE.md` | Claude Code 入口；项目概述 + 关键设计约束 + 写代码约定 | 极少更新（约束类） |
| `docs/archive/PRD-v1.0.md` | v1.0 产品需求基线（已定稿，不修改；存于 archive/ 留作历史参考） | 永不更新 |
| `docs/` | `archive/` 保留历史基线；`superpowers/specs/` 保留已批准的增量功能设计；根目录放当前 UI 规范与 AI 选型索引 | 新增/归档设计或协作指引时 |
| `docs/design.md` | 盒记项目级 UI 设计规范：语义 token、按钮 / 状态 / 空态规则与页面验收清单；视觉改动前先读。 | 改动跨页面视觉语言、token 或 UI 验收标准时 |
| `docs/ui-image-generation-prompts.md` | 盒记 23 个现有页面的 UI 概念图生成提示词：Claude-inspired warm paper 方向、母提示词、负面提示词、逐页内容和通用状态；仅用于视觉探索，不代表已实现。 | 页面范围、概念视觉方向或生图工作流变化时 |
| `docs/ui-reference/` | 已审核的 23 张 375×812 UI 重构参考图及页面、路由、版本映射；`README.md` 是图片索引。图片只作为重构参考，现行实现规范仍以 `docs/design.md` 为准。 | 审核参考图、页面映射或推荐版本变化时 |
| `docs/uni-modules-ai-index.md` | 本地 `src/uni_modules` 的 AI 选型索引：45 个包的版本、场景、状态、边界、本地 README 与项目内用例；新增 / 重做 UI 先查。 | 增删 / 升级本地组件，或形成新的项目内用例时 |
| `docs/adr/0001-in-memory-page-return-snapshots.md` | 页面返回现场采用页面实例级像素快照与共享 composable、拒绝全局缓存和持久化的架构决策。 | 返回现场的状态归属、生命周期或持久化边界变化时 |
| `docs/adr/0002-meal-card-message-templates-are-independent.md` | 月卡文案模板使用独立数据表、版本历史、默认状态和维护页面；只复用交互模式，不与菜单模板共享数据。 | 月卡模板数据边界、语法或维护入口变化时 |
| `docs/superpowers/specs/2026-07-14-meal-card-recharge-records-design.md` | 次卡充值记录入口与总次数校正的已批准设计、数据边界和验收标准 | 该功能设计变更时 |
| `docs/superpowers/specs/2026-07-14-customer-picker-pinyin-sort-design.md` | CustomerPicker 按客户姓名拼音分组并支持右侧索引跳转的已批准设计与验收标准 | 该分组索引行为变更时 |
| `docs/superpowers/specs/2026-07-22-customer-picker-form-label-design.md` | CustomerPicker 的字段标签归属、调用页统一表单标签与验收标准 | 该标签归属或调用方式变更时 |
| `docs/superpowers/specs/2026-07-14-customer-card-avatar-label-design.md` | 客户列表头像按当前可用次卡显示“次 / 普”的已批准设计与验收标准 | 该身份判定或展示变更时 |
| `docs/superpowers/specs/2026-07-22-combined-payment-single-order-design.md` | 一餐一单、组合支付、次卡预占、合并改单价确认、schema v5 与备份兼容的已批准设计 | 该订单支付 / 合并规则变更时 |
| `docs/superpowers/specs/2026-07-28-daily-menu-message-template-design.md` | 每日菜单、条件模板语法、版本历史、默认模板、备份与验收的已批准设计 | 菜单或社群文案工作流变更时 |
| `docs/superpowers/specs/2026-08-09-page-return-snapshot-design.md` | 页面返回现场、像素滚动恢复、数据刷新、状态生命周期与验收边界的已批准设计。 | 返回现场的产品范围、交互规则或验收标准变化时 |
| `.gitignore` | git 忽略规则（node_modules、dist、IDE 文件等） | 加新忽略项时 |
| `index.html` | Vite H5 入口 HTML；`<script type="module" src="/src/main.ts">` | 几乎不改 |
| `package.json` | 项目元数据 + scripts（dev / build / test / lint / format / type-check） | 加新脚本/依赖时 |
| `tests/db-transaction.test.cjs` | Node 内置测试：验证单一 SQLite 连接上的并发顶层事务必须串行，防止双击建单 / 配送交错写入 | `tx()` 并发边界变化时 |
| `tests/meal-card-delete.test.cjs` | Node 内置回归测试：验证未扣次充值记录删除、pending 订单 FIFO 改绑、预占冲突回滚与 usage / delivered 历史保护 | 次卡记录删除边界变化时 |
| `tests/order-rules.test.cjs` | Node 内置测试：覆盖次卡不足、纯 / 组合支付金额、非法次卡次数、备注去重、支付冲突和合并改单价预览 | 订单规则变化时 |
| `tests/schema-v6.test.cjs` | SQLite CLI 冒烟测试：保留 v5 订单字段回归，并验证 fresh schema v7 的菜单 / 月卡模板约束和 v7 迁移追加 | schema / migration 变化时 |
| `tests/menu-template.test.cjs` | Node 纯函数测试：模板条件区块、缺餐删除、日期格式、多行 / `$` 字符保真、空行整理和语法错误 | 模板语法或复制文案变化时 |
| `tests/meal-card-template.test.cjs` | Node 纯函数与页面契约测试：月卡模板默认正文、次数占位符替换、未知 / 缺失 / 未闭合占位符校验，以及复制时使用实际剩余次数 | 月卡模板语法或复制文案变化时 |
| `tests/backup-v6.test.cjs` | Node 备份兼容测试：v5 无菜单数组仍可解析，v6 / v7 必须显式携带对应模板和版本数组（含空数组状态） | schema 或备份格式变化时 |
| `tests/stats-timezone.test.cjs` | Node 内置回归测试：在 `Asia/Shanghai` 时区下验证 UTC 凌晨时间戳按设备本地日期计入首页次卡收入与日趋势 | 统计时区或次卡收入口径变化时 |
| `tests/ui-style-preprocess.test.cjs` | Node 静态测试：扫描业务 Vue 样式块，使用 `$hej-*` token 时必须声明 `lang="scss"`，避免 token 原样输出使 App 回退默认样式 | token 样式页面变化时 |
| `tests/page-return.test.cjs` | Node 纯函数回归：从生产 TypeScript 载入返回目标解析器，覆盖内容变化时仍恢复像素、空列表回顶部和负数像素归零。 | 页面返回现场的滚动恢复规则变化时 |
| `tests/order-new-contract.test.cjs` | Node 静态契约测试：确保新建订单页与 CustomerPicker 连接真实 store / API、保留组合支付与合并/阻断状态机、不含 demo 硬编码，并使用暖纸张语义 token。 | 新建订单页面视觉契约或真实数据链路变化时 |
| `tests/today-page-contract.test.cjs` | Node 静态契约测试：确保今日页连接真实 store / API、保留加载 / 空 / 失败状态、菜单入口与根路由，并使用暖纸张语义 token。 | 今日页面视觉契约或真实数据链路变化时 |
| `tests/me-page-contract.test.cjs` | Node 静态契约测试：确保「我的」业务入口页保留 6 个真实业务入口与路由、反未存在功能幻觉（无头像/账户/银行卡/云同步）、使用暖纸张与象牙白卡语义 token、自定义状态栏与返回现场接入。 | 「我的」页面视觉契约或业务入口变化时 |
| `tests/order-page-contract.test.cjs` | Node 静态契约测试：确保订单列表连接真实 store / API、保留三态状态标签、空/载/错状态卡片、自定义导航与暖纸张语义 token，不含 demo 硬编码。 | 订单列表页面视觉契约或真实数据链路变化时 |
| `tests/customer-pages-contract.test.cjs` | Node 静态契约测试：确保客户列表、新建客户档案与客户详情连接真实 store / API、保留拼音首字母检索、80px 标签列、次卡身份徽标与删除依赖保护，并使用暖纸张语义 token。 | 客户页面视觉契约或真实数据链路变化时 |
| `pnpm-lock.yaml` | pnpm 锁定文件（**不要**手动编辑） | pnpm install 后自动 |
| `tsconfig.json` | TypeScript 配置；extends `@vue/tsconfig`，加 3 个 strict 选项；排除 `src/uni_modules` 第三方 uni-ui 源码 | 调整严格度时 |
| `vite.config.ts` | Vite 配置；只注册 `uni()` 插件 | 加 Vite 插件时 |
| `.eslintrc.cjs` | ESLint 配置：vue3 + ts + prettier；`src/pages/**` 关闭多字命名；忽略 `src/uni_modules/**` 第三方源码 | 改 lint 规则时 |
| `.prettierrc` | Prettier 配置：无分号 / 单引号 / 宽度 100 | 改格式时 |
| `node_modules/` | 依赖安装目录（git 忽略） | pnpm install 后 |

---

## memory-bank/ — 活文档区（AI 协作）

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `memory-bank/design-document.md` | 产品设计文档：数据模型、状态机、关键流程、UI 草图、TBD 清单 | 决策变更时（如 A1→A2） |
| `memory-bank/tech-stack.md` | 技术选型 + 明确不引入项 + 演进路径 | 选型变更时 |
| `memory-bank/implementation-plan.md` | 分步实施计划（63 步，9 阶段） | 计划调整时（极少） |
| `memory-bank/progress.md` | 实施进度（按 implementation-plan.md 步骤打勾） | 每完成一步 |
| `memory-bank/architecture.md` | **本文件**：每个代码文件的作用说明 | 每个文件新建/删除/职责变化时 |
| `memory-bank/CHANGELOG.md` | 版本变更日志：每版记录新增功能 / 行为变更 / 修复 / 已知限制 / TBD；v1.0 起每个里程碑追加新章节，不修改已发布版本 | 每个里程碑完成时 |
| `debug-docs/DEBUG-HANDOFF.md` | 调试交接文档（sqlite 在 HBuilderX 标准版基座下不工作） | 阶段性快照 / 跨 AI 交接时 |
| `memory-bank/*.db` | DB 备份（v0 基线、v1 发布版等） | 阶段性快照 |

---

## src/ — 应用代码

### 入口与配置

| 文件 | 作用 |
|---|---|
| `src/main.ts` | App 入口；导出 `createApp()`（Vue 3 SSR 工厂）装载 `App.vue`；按 uni-app Pinia 文档 `import * as Pinia from 'pinia'`，`app.use(Pinia.createPinia())`，并从 `createApp()` 返回 `Pinia`。Pinia 由 HBuilderX / uni-app 内置提供，不在 `package.json` 手动安装。 |
| `src/App.vue` | 根组件；处理 uni-app 全局生命周期 `onLaunch` / `onShow` / `onHide` / `onError`；`onLaunch` 调 `db.init()` 并在失败时 toast 提示；`onError` 全局兜底未捕获错误（含 DB 损坏），DB 损坏时提示"数据库损坏，请用备份恢复" |
| `src/env.d.ts` | Vite 客户端类型（`/// <reference types="vite/client" />`）|
| `src/manifest.json` | uni-app App 元数据：`name=盒记` / `appid=com.bookkeeping.app` / Android `minSdkVersion=21` `targetSdkVersion=30` |
| `src/pages.json` | uni-app 路由 + 全局样式 + `tabBar`（4 个 Tab：今日 / 订单 / 统计 / 我的） |
| `src/uni.scss` | uni-app 全局 SCSS 变量，并定义盒记 `$hej-*` 语义 token（画布 / 表面 / 文字 / 状态 / 间距 / 圆角 / 阴影 / 字级）供订单和统计页使用；既有 `$uni-color-*` 主状态色保留原值，避免影响今日页基线样式。 |
| `src/shime-uni.d.ts` | 扩展 Vue `ComponentCustomOptions` 加上 uni-app 的 App/Page 实例类型（**注：文件名是模板的拼写，保留不修**） |
| `src/static/` | 静态资源（默认有 `logo.png`）|
| `src/uni_modules/` | uni-ui easycom 组件源码目录；业务表单统一使用其中的表单组件，质量检查不 lint/type-check 该第三方源码；选型入口见 `docs/uni-modules-ai-index.md`。 |

### pages/ — 页面（uni-app 自动路由；Phase 7 已实现）

所有通过 `navigateTo` 打开下级页面的可滚动父页面统一使用页面实例级返回快照：页面栈内返回时保留筛选 / 草稿 / 折叠并恢复像素滚动，不记录业务数据条目；内部 `scroll-view` 与原生页面滚动分别适配。产品与生命周期边界见 `docs/superpowers/specs/2026-08-09-page-return-snapshot-design.md`。

| 文件 | 作用 |
|---|---|
| `src/pages/index/index.vue` | Tab 1「今日」Dashboard：使用暖纸张画布、自定义安全区标题、社群菜单快捷入口、2×2 收支指标、三态摘要和真实今日订单列表；onShow 仍刷新 stats / order / customer store，不改变配送流程。 |
| `src/pages/order/index.vue` | Tab 2「订单」列表：采用暖纸张画布（`$hej-color-canvas`）、自定义状态栏、顶部日期选择与陶土色「+ 新建订单」操作区；按日期筛选并用 `uni-collapse` 分成午餐 / 晚餐折叠卡片（`$hej-color-surface` 暖白表面、`$hej-color-border` 浅边框与阴影）；折叠标题展示左侧箭头、餐次与有效单数份数（`X单 · Y份`）；列表项展示 6 点拖拽把手（`:::`）、加粗客户名、3 态标签（待配送板岩蓝/灰、已配送橄榄绿、已取消暖棕），副标题完整组合餐次、份数、支付方式、单价/金额与备注并自然换行；空态、加载与错误反馈使用标准卡片承载；拖拽保持动态 `:scroll-y` 开关 + 10px 阈值 + 64px 边缘自动滚屏 + `sort_order` 持久化，返回现场继续由 `usePageReturnSnapshot` 像素级恢复。 |
| `src/pages/order/new.vue` | `<uni-forms>` 新建订单表单：高频录单把日期、餐次直接放在连续录单卡的白色表面内，各占一条普通表单行，不再使用独立“配送安排”色块；全部字段共享 80px 标签列，标签与右侧控件垂直居中，控件从同一左边界开始。每次打开均以 `tomorrow()` 初始化配送日期，不接收订单列表筛选日期，用户仍可手动修改。份数表示“本次增量”，客户仍走现有搜索 / 拼音选择；客户上下文提示的重新检查 / 查看订单按钮保留固定触摸高度、最小宽度与水平留白。微信 / 现金 / 次卡为一级选择，份数大于 1 才出现组合支付入口；用户主动进入组合支付时，次卡次数预填 1 次并可用步进器在合法范围调整，补款与金额自动计算，展开面板与主表单使用同一白色表面，“改为纯支付”按钮保持完整触摸宽度与横向留白。实际单价直接显示输入框，选定客户后带入默认 / 已有订单单价；备注保持一行常显。次卡正常时紧凑提示，有预占或不足才展开明细。后台查询同键有效订单，pending 紧凑提示合并、delivered 阻断，改单价仍二次确认。固定确认区展示金额 / 支付摘要和当前缺失项；保存后由原生二次弹窗选择“继续下一单”（清空客户、份数、单价、备注，保留日期 / 餐次 / 支付）或“结束录单”（返回对应日期列表）。订单、金额、预占和 SQLite 写入规则不变。 |
| `src/pages/order/detail.vue` | 订单详情与 `<uni-forms>` 编辑：只读态分别展示总份数、支付摘要、次卡次数、货币份数、实际单价与实际金额；编辑态同步新建页的连续白色表面、80px 标签列和单行字段顺序，日期、餐次、客户、总份数、支付、实际单价与备注之间用统一分隔线组织，标签与控件垂直居中，提示与辅助按钮沿用同一控件起点和触摸尺寸。详情页保留微信 / 现金 / 次卡 / 组合支付四种既有选项，窄屏下使用两列布局避免文字拥挤；本次实际金额、取消编辑与保存修改固定在底部。份数表示整单总量，支持组合支付、预占校验以及改变客户 / 日期 / 餐次后的目标订单合并确认。配送余额不足时整笔回滚并提示“去编辑支付”，不再自动整单改微信 / 现金；配送成功只更新当前详情状态不返回上一页，已配送次卡订单可按默认月卡模板复制最新月卡信息，复制文案使用配送后 active 次卡实际剩余次数而不扣待配送预占；保留复制、整单配送 / 取消 / 删除能力。 |
| `src/pages/stats/index.vue` | Tab 3「统计」：今日/本周/本月/自定义区间切换，自定义日期用 `uni-datetime-picker`；展示入账收入、支出、利润、有效订单和平均每单收入。日趋势改为“收支 / 利润趋势”，按日期同时呈现入账、支出和正 / 负利润的 CSS 进度条；统计 API 公式不变。 |
| `src/pages/me/index.vue` | Tab 4「我的」入口：采用暖纸张画布（`$hej-color-canvas`）、原生状态栏安全区、Hero 衬线标题、单张象牙白卡片表面（`$hej-color-surface`）与 6 个克制线性图标条目（菜单管理、文案模板、月卡文案模板、客户管理、支出管理、备份恢复）；接入 `usePageReturnSnapshot` 保留返回现场；无头像、无个人账户、无银行卡、无云同步等未存在产品能力。 |
| `src/pages/me/customers/list.vue` | 客户列表：`onShow` 并行刷新 customer store 与当前有剩余次数的 active 次卡客户 ID，头像区按身份显示“次 / 普”；前端用 `uni-easyinput` 按姓名/微信/手机号/姓名拼音/拼音首字母搜索；按 `src/utils/pinyin.ts` 生成拼音首字母分组、右侧索引和滚动定位；展示折扣角标，支持新建和详情跳转。 |
| `src/pages/me/customers/new.vue` | 客户新建/编辑共用页：用 uni-ui 表单组件维护姓名、手机、微信、午餐/晚餐默认价、折扣率、备注；默认价未触碰时保存为 null；保存时捕获客户姓名重复错误并提示不可重复。 |
| `src/pages/me/customers/detail.vue` | 客户详情：展示基础信息、active 次卡汇总进度、历史订单；支持编辑、删除、开次卡和进入充值记录。删除走 `customerStore.remove()`，客户存在订单或次卡依赖时保持数据并提示不可删除。次卡区通过 `listCards(customerId)` 汇总所有 active 卡的剩余 / 总次数，避免新开卡后只显示最新一张而像是覆盖旧卡。历史订单通过 `listOrders({ customerId })` 查询。 |
| `src/pages/me/customers/card-records.vue` | 客户次卡充值记录列表：按时间倒序展示所有 `meal_cards` 的充值日期、金额、总/已用/剩余次数和状态；点击记录进入总次数修改。每条记录底部独立展示删除操作，已扣次时禁用；删除前展示收入 / 次数影响，执行期间用页面级锁防止编辑或重复删除。 |
| `src/pages/me/customers/open-card.vue` | 次卡开卡/充值记录修改共用页：用 `<uni-forms>` + `<uni-forms-item>` 统一承载校验；开卡模式默认 20 次且金额允许为 0，已有 active 次卡时先汇总确认；带 `cardId` 时只允许修改该记录总次数，下限为已用次数。 |
| `src/pages/me/expenses/list.vue` | 支出列表：暖纸张视觉重构，顶部日期选择器与「+ 新建支出」操作区、3 列汇总指标卡（今日支出/支出笔数/退差金额）、圆形分类图标徽标、实际净支出金额、无备注/退差明细展示与时间戳；点击进入支出详情，长按支持 ActionSheet 快捷删除；接入 `usePageReturnSnapshot` 保持现场。 |
| `src/pages/me/expenses/new.vue` | 新建支出页：暖纸张连续象牙白卡片表面，使用 `<uni-forms>` + `<uni-forms-item>` 承载日期、分类、支出金额、退差金额、备注；统一 80px 标签列，输入控件前置 ¥ 前缀；实时净支出计算框（`amount - refund_amount`）与公式明细；底部固定小结与陶土色「保存支出」栏；金额 > 0、分类已选、退差金额不超过支出金额才可保存。 |
| `src/pages/me/expenses/detail.vue` | 支出详情：暖纸张视觉重构，顶部 Hero 净支出卡片（金额 + 分类/日期），象牙白连续表单卡（80px 统一标签列）、实时净支出计算行、陶土色「保存修改」主按钮；独立浅红危险删除区（带永久删除提示与确认弹窗）；保存或删除后同步刷新支出与今日统计。 |
| `src/pages/me/menus/list.vue` | 每日菜单列表：当前 / 未来与历史分栏，按日期排序；每条支持默认模板复制、编辑和硬删除，并可进入模板管理。 |
| `src/pages/me/menus/edit.vue` | 每日菜单新增 / 编辑表单：默认当天，午晚餐至少一项且支持多行；日期冲突进入已有记录，支持保存并新增下一天、复制已保存内容和硬删除。 |
| `src/pages/me/menu-templates/list.vue` | 文案模板列表：显示唯一默认模板，支持新建、编辑、设为默认、历史和硬删除；删除默认模板时要求选择接替项。 |
| `src/pages/me/menu-templates/edit.vue` | 模板新增 / 编辑表单：插入日期 / 餐次区块，实时校验语法并以示例菜品渲染社群文案预览；实际修改由 API 留存编辑前快照。 |
| `src/pages/me/menu-templates/history.vue` | 模板版本历史：按时间倒序展示完整名称 / 正文，可确认恢复；恢复前先快照当前内容，默认状态不回滚。 |
| `src/pages/me/meal-card-templates/list.vue` | 月卡文案模板列表：独立维护月卡模板的默认状态、新建、编辑、历史和硬删除；套餐描述直接写在可编辑正文中，仅允许两个次数占位符。 |
| `src/pages/me/meal-card-templates/edit.vue` | 月卡模板新增 / 编辑表单：插入两个次数占位符，实时校验并用配送示例预览复制结果；实际修改由 API 留存编辑前快照。 |
| `src/pages/me/meal-card-templates/history.vue` | 月卡模板版本历史：按时间倒序展示完整名称 / 正文，可确认恢复；恢复前先快照当前内容，默认状态不回滚。 |
| `src/pages/me/settings/backup.vue` | 备份恢复页：导出 JSON 到 `_doc/backup_YYYYMMDD_HHmmss.json` 并复制到 `_downloads/`；恢复支持粘贴、已保存备份和本地文件；危险区清空菜单、月卡模板、客户、订单、次卡和支出，并恢复内置两类文案模板与 5 个默认支出分类。 |

### components/ — 跨页组件

| 文件 | 作用 |
|---|---|
| `src/components/.gitkeep` | 占位文件，让空目录被 git 跟踪 |
| `src/components/StatCard.vue` | 通用数字卡片；props 为 `label` / `value` / `color?: 'normal' \| 'positive' \| 'negative'` / `hint?`；上方展示 label，下方展示大号 value，可选 hint；利润 label 在未显式传 color 时按数值正负自动映射绿色/红色。 |
| `src/components/AmountInput.vue` | 金额输入组件；props 为 `modelValue: number` / `label` / `placeholder?`；事件 `update:modelValue`；内部用 `uni-easyinput` 保留字符串输入态，使用 `parseMoney()` 将输入解析为 number 回传，模板提供 `¥` 前缀。 |
| `src/components/CustomerPicker.vue` | 客户选择组件；props 为 `modelValue: Customer \| null` / `showCreate?`；事件 `update:modelValue` / `create`；字段标签由外层 `<uni-forms-item>` 负责，组件只展示已选客户或占位和选择入口；点击输入区打开底部选择弹层，内部用 `uni-easyinput` 支持按姓名、微信、手机号前端搜索；列表复用 `src/utils/pinyin.ts` 按姓名拼音排序和首字母分组，右侧 `index-bar` 可跳转到对应分组，并展示客户名和折扣角标。 |

### composables/ — 页面交互复用

| 文件 | 作用 |
|---|---|
| `src/composables/usePageReturnSnapshot.ts` | 页面实例级返回现场协调器：包装前进导航，记录内部 `scroll-view` 或原生页面滚动，返回时协调本地数据刷新、像素恢复与同值滚动脉冲；刷新失败仍恢复现场但不消费快照，状态随页面卸载自然释放，不写 Pinia、SQLite 或本地存储。 |

### stores/ — Pinia 状态

| 文件 | 作用 |
|---|---|
| `src/stores/customer.ts` | 客户 store：state 为 `list: Customer[]` / `loading`；getter `byId(id)`；actions `refresh()` / `create(input)` / `update(id, input)` / `remove(id)`。写操作走 `api/customers.ts` 后自动刷新列表，Pinia 只缓存当前视图数据。 |
| `src/stores/order.ts` | 订单 store：state 为 `list: Order[]` / `currentDate`（默认 `today()`）/ `loading`；actions `setDate(date)` / `refreshForDate(date)` / `create(input)` / `update(id, input)` / `markDelivered(id)` / `cancel(id)` / `remove(id)` / `reorder(date, mealType, orderedIds)`。写操作走 `api/orders.ts`；新建后刷新到订单日期，其他写操作刷新当前日期；`InsufficientCardError` / `AlreadyDeliveredError` 不在 store 层吞掉。 |
| `src/stores/expense.ts` | 支出 store：state 为 `list: Expense[]` / `categories: ExpenseCategory[]` / `currentDate` / `loading`；actions `refreshForDate(date)` / `refreshCategories()` / `create(input)` / `update(id, input)` / `remove(id)`。分类只读，支出写操作后刷新当前日期列表。 |
| `src/stores/stats.ts` | 统计 store：state 为 `summary: StatsSummary \| null` / `trend` / `breakdown` / `range` / `loading`；actions `refreshSummary(date)` / `refreshRange({ start, end })`。区间刷新同时调用 `getRangeSummary`、`getDailyTrend`、`getCategoryBreakdown`。 |

### db/ — SQLite 数据层

| 文件 | 作用 |
|---|---|
| `src/db/schema.ts` | 11 张表 DDL 字符串 + `CURRENT_SCHEMA_VERSION=7`。v6 新增每日菜单 / 菜单模板 / 版本表，v7 新增独立月卡模板 / 版本表及各自名称 / 单默认约束；既有订单、次卡和支出结构不变。 |
| `src/db/migrations.ts` | 迁移引擎与 v2-v7 追加迁移。v6 / v7 均只在数组末尾追加对应表，并在迁移时插入一次内置默认模板；用户后续删除全部模板不会在启动时被重新生成。既有 v5 数据修复保持不变。 |
| `src/db/seed.ts` | `seedIfEmpty()` 仅恢复 5 个默认支出分类；两个 `seedDefault*MessageTemplate()` 只供旧备份升级与危险清空显式恢复各自内置模板，不作为每次启动兜底。 |
| `src/db/index.ts` | 数据层入口：`init()` 启动序列（openDatabase → PRAGMA foreign_keys=ON → runMigrations → seedIfEmpty → PRAGMA integrity_check(1)，逐步 await；integrity_check 失败抛错让 `App.vue` 提示用备份恢复）/ `close()` / `tx<T>(fn)`（用 5+ `transaction` 的 begin/commit/rollback 包裹，并用 Promise 队列串行单连接上的顶层事务；`fn` 内不嵌套 `tx()`）/ `exec()` / `select()`。5+ 官方 `executeSql` 不支持 args 数组，参数在本文件统一转义；`pify()` 动态调用 SQLite 方法时必须用 `fn.call(sqlite, options)` 保留 `this`；callback 静默不返回时 8 秒超时报错，便于识别 native bridge 缺失。**所有多表写入**（建单 / 取消 / 配送 / 开次卡）必须走 `tx()`。 |

### api/ — 数据访问

| 文件 | 作用 |
|---|---|
| `src/api/customers.ts` | customers 表 CRUD：`listCustomers()` / `getCustomer(id)` / `createCustomer(input)` / `updateCustomer(id, input)` / `deleteCustomer(id)`。`createCustomer` 与 `updateCustomer` 返回最新客户记录；创建/改名时按 trim 后姓名判重；`deleteCustomer` 在客户存在次卡或订单依赖时返回 `false` 并保留数据，避免外键失败。 |
| `src/api/meal-cards.ts` | meal_cards 表基础 API。`updateCardTotalMeals()` 除校验新总次数不小于已用次数外，还校验修改后客户余额池足以覆盖全部 pending `meal_card_quantity` 预占，再同步 `active/depleted`。`deleteCard()` 只删除未扣次且无 usage / delivered 引用的记录，事务内校验删除后的 pending 预占，把引用改绑到最早可用卡或清空后再硬删除。 |
| `src/api/orders.ts` | orders 表与订单流程 API：新增 `findEffectiveOrder()` / `getMealCardAvailability()`；`createOrder()` 在事务内维护“一客户一日期一餐次一张有效订单”，重复新增按增量合入原 pending ID / 排序；`updateOrder()` 支持目标 pending 合并确认；两者统一校验支付形态、货币渠道、改单价确认和 pending 次卡预占。`markDelivered()` 仅 FIFO 扣 `meal_card_quantity` 并写 usage，不足时整笔回滚；取消自然释放预占，删除 delivered 组合订单按 usage 精确回滚。 |
| `src/api/errors.ts` | API 层可辨识业务异常：次卡所需 / 可用次数、已配送同键冲突、支付渠道冲突、合并改单价确认、编辑目标合并确认、充值记录侵占预占次数、未扣次记录删除的已使用 / 历史引用冲突、历史重复单诊断，以及既有取消 / 重名 / 总次数下限错误。 |
| `src/api/expense-categories.ts` | expense_categories 只读 API：`listCategories(): Promise<ExpenseCategoryResult[]>` / `getCategory(id): Promise<ExpenseCategoryResult \| null>`。v1.0 不暴露分类增删改。 |
| `src/api/expenses.ts` | expenses 表 CRUD：`listExpenses(input: ListExpensesInput): Promise<ExpenseResult[]>` / `getExpense(id): Promise<ExpenseResult \| null>` / `createExpense(input: CreateExpenseInput): Promise<ExpenseResult>` / `updateExpense(id, input): Promise<ExpenseResult \| null>` / `deleteExpense(id): Promise<boolean>`。`createExpense` / `updateExpense` 用 `tx()` 包裹，`amount <= 0` 拒绝，`refund_amount` 默认为 0 且不可为负或超过 `amount`；`deleteExpense` 硬删除支出。 |
| `src/api/daily-menus.ts` | 每日菜单 CRUD 与当前 / 历史列表查询；API 统一 trim 并校验日期和至少一个餐次，日期冲突抛出携带已有 ID 的可辨识错误，删除为硬删除。 |
| `src/api/message-templates.ts` | 模板 CRUD、默认切换、删除接替、版本查询和恢复；名称 / 正文实际变化前在同一事务写快照，恢复前同样快照当前内容。 |
| `src/api/meal-card-templates.ts` | 独立月卡模板 CRUD、默认切换、删除接替、版本查询和恢复；只允许两个次数占位符，名称 / 正文实际变化前在同一事务写快照。 |
| `src/api/stats.ts` | 统计聚合 API：`getDashboardSummary(date): Promise<StatsSummary>` / `getRangeSummary(input: DateRangeInput): Promise<StatsSummary>` / `getDailyTrend(input: DateRangeInput): Promise<DailyTrendPoint[]>` / `getCategoryBreakdown(input: DateRangeInput): Promise<CategoryBreakdown[]>`。收入口径 = 非 cancelled 订单金额 + 开次卡金额；次卡 UTC `created_at` 通过 SQLite `date(created_at, 'localtime')` 按设备本地日期筛选和分组；支出口径 = `expenses.amount - expenses.refund_amount`；利润 = 收入 - 支出。 |

### utils/ — 工具函数

| 文件 | 作用 |
|---|---|
| `src/utils/date.ts` | dayjs 本地时区日期工具：`today()` / `tomorrow()` 返回 `YYYY-MM-DD`；`weekRange()` 返回自然周周一到周日；`monthRange()` 返回自然月；`formatDate()` 按当前年份显示日期；`formatTodayLabel()` 输出今日页标题日期与星期；`formatTime()` 输出订单时间；`daysBetween()` 返回自然日整数差。 |
| `src/utils/format.ts` | 金额/百分比格式化与精确计算工具（基于 big.js，全局 `Big.RM = roundHalfUp`，所有 helper 输出强制 `toFixed(2)` 保证 2 位小数）：`formatMoney(n)` 输出 `¥1,234.50`（空值/非法值为 `¥—`）；`parseMoney(s)` 接受普通数字、`¥`、`￥`、千分位并解析为 number（非法为 0）；`formatPercent(n)` 四舍五入输出整数百分比；`roundMoney/addMoney/subtractMoney/multiplyMoney/divideMoney` 提供按分精确运算，所有金额计算（订单单价、份数、统计累加/差值、次卡均摊）必须走这些 helper，禁止原生 `+ - * /` |
| `src/utils/order-rules.ts` | 订单纯规则模块：支付拆分、次卡可用判断、备注合并去重、支付兼容与合并改单价预览，以及今日午餐自动折叠状态转移；API 与 Node 测试共享，金额计算只走 big.js helper。 |
| `src/utils/menu-template.ts` | 社群菜单模板纯函数：内置默认正文、语法校验、条件餐次区块删除、`M月D日` 替换、多行 / 特殊字符保真和多余空行整理。 |
| `src/utils/ui.ts` | 页面层小工具：toast / confirm / actionSheet、数值与状态文案、客户默认价提示，以及组合支付摘要和列表副标题拼接。 |
| `src/utils/backup.ts` | JSON 全量备份恢复；v6 / v7 导入导出菜单、月卡模板与两类版本历史，v1-v6 旧备份升级时补对应内置模板；v6 / v7 的空模板状态原样恢复，危险清空显式恢复内置模板。 |
| `src/utils/meal-card-template.ts` | 月卡模板内置正文、两个次数占位符校验、示例 / 实际复制文案渲染和空行规范化。 |
| `src/utils/pinyin.ts` | 客户姓名拼音工具：基于纯 JS `pinyin-pro`，使用姓氏优先模式把中文姓名转为无声调拼音 key、拼音首字母串和 A-Z / `#` 分组字母，并提供客户姓名排序函数；用于 Android App 端客户列表分组、索引和拼音搜索。 |
| `src/utils/page-return.ts` | 页面返回现场的纯滚动规则：记录离开前像素；返回后有内容时恢复该像素，内容为空时回到顶部，不记录业务数据身份。 |

### types/ — TS 类型

| 文件 | 作用 |
|---|---|
| `src/types/domain.ts` | 与 schema snake_case 字段严格对齐的领域类型；含 `DailyMenu`、`MessageTemplate`、`TemplateVersion`、`MealCardMessageTemplate` 和 `MealCardTemplateVersion`。 |
| `src/types/api.ts` | API 入参 / 出参契约；含每日菜单、菜单文案和月卡文案模板保存输入。 |
| `src/types/pinia.d.ts` | 本地类型声明：在不手动安装 npm `pinia` 的前提下，让 `vue-tsc` 能识别 uni-app/HBuilderX 内置 Pinia 的 `createPinia` / `defineStore`。仅提供类型，不提供运行时代码。 |

---

## 关键架构决策

| 决策 | 位置 | 影响范围 |
|---|---|---|
| 11 张表结构（当前 schema v7） | `memory-bank/design-document.md §2.1` | 所有 db / api / store |
| 次卡扣次 = 配送完成（A1），按客户余额池旧卡优先扣次 | `memory-bank/design-document.md §3.2 §4.3` | orders API、UI 流程 |
| 客户默认价 + 折扣率（A6） | `memory-bank/design-document.md §2.1 §4.1` | customers API、订单录入 UI |
| 1 订单 = 1 餐 + 多份（D1） | `memory-bank/design-document.md §2.1` | orders schema |
| 不收配送费（D4） | `memory-bank/design-document.md §2.1` | 不存在 delivery_fee 字段 |
| 次卡按"次"无有效期 | `memory-bank/design-document.md §2.1 §3.2` | meal_cards 无 end_date / expired 状态 |
| SQLite 是唯一数据源 | `memory-bank/tech-stack.md §7` | 不引 pinia 持久化插件 |
| 多表写入必走 tx() | `memory-bank/design-document.md §4` | db/index.ts 提供 tx() 工具 |
| 删除 = 硬删除 + 回滚已产生副作用 | `memory-bank/design-document.md §4.6` | orders / expenses / customers API 与详情页删除入口 |
| PRAGMA foreign_keys = ON | db/index.ts init() | 维护 customer_id / meal_card_id / category_id 外键完整性 |
| `user_version` 驱动迁移 | db/migrations.ts | 首次建表=v1，当前=v7；未来加字段 / 表在 MIGRATIONS 末尾追加 |
| 菜单复制只读当前默认模板 | `docs/superpowers/specs/2026-07-28-daily-menu-message-template-design.md` | 菜单、模板、剪贴板与版本历史 |
| 月卡复制只读独立的当前默认模板；文案余额使用配送后实际剩余，不扣待配送预占 | `docs/adr/0002-meal-card-message-templates-are-independent.md` / `src/pages/order/detail.vue` | 订单详情、月卡模板维护、月卡版本历史与备份 |
| 客户姓名应用层判重 | `src/api/customers.ts` / `src/pages/me/customers/new.vue` | 重复姓名不可新增；编辑时允许保持原姓名 |
| 表单控件统一使用 uni-ui | `src/uni_modules` + 各表单页 | 业务页面不直接使用原生 `input` / `textarea` / `picker` / `radio-group` / `slider`，改用 easycom 的 uni-ui 表单组件 |

## DB 备份

| 文件 | 来源 | 用途 |
|---|---|---|
| `memory-bank/bookkeeping-v0.db` | 2026-06-10 Phase 2.6；用 `sqlite3` CLI 跑 schema DDL + seed 生成的"等价基线"（**非**真机 DB） | 后续步骤的 DB 形状参照；真机 adb pull 后**应覆盖**此文件 |
| `memory-bank/bookkeeping-real.db` | 2026-06-11 Step 2.6；HBuilderX / Android 真机启动后从 `_doc/bookkeeping.db` 拉取 | 真实运行环境基线；已验证 5 张业务表、5 个默认分类、`user_version=1` |
| `memory-bank/bookkeeping-v1.db` | 2026-06-11 Phase 8.6 通过后；`cp bookkeeping-real.db bookkeeping-v1.db` | v1.0 阶段基线（含 6 条 E2E 流程跑通后的真机数据形态）；v1.1 起按相同节奏归档 `bookkeeping-v1.1.db` 等 |

---

## 外部依赖（package.json 当前）

| 依赖 | 用途 | 版本 |
|---|---|---|
| `@dcloudio/uni-app` 等 uni-* | uni-app 框架 | `3.0.0-4080420251103001` |
| `vue` | Vue 3 | `^3.4.21`（实际 3.5.x） |
| `vue-i18n` | 模板自带；v1.0 不用 | `^9.1.9` |
| `dayjs` | 日期工具；用于自然日/自然周/自然月计算 | `^1.11.21` |
| `pinyin-pro` | 纯 JS 拼音转换；用于 Android App 端客户姓名拼音排序、分组索引和拼音搜索 | `^3.28.1` |
| `sass` | uni-ui 组件 `lang="scss"` 编译依赖 | `^1.100.0` |
| `@dcloudio/vite-plugin-uni` | uni-app Vite 插件 | `3.0.0-4080420251103001` |
| `vite` | 构建工具 | `5.2.8` |
| `typescript` | TS 编译器 | `^4.9.4`（实际 4.9.5） |
| `vue-tsc` | Vue + TS 类型检查 | `^1.0.24`（实际 1.8.27） |
| `@vue/tsconfig` | Vue 3 推荐的 tsconfig 基线 | `^0.1.3` |
| `@dcloudio/types` | uni-app 全局类型 | `^3.4.8` |
| `eslint` | JS/TS lint | `^8.57.1` |
| `eslint-plugin-vue` | Vue 文件 lint | `^9.33.0` |
| `@vue/eslint-config-typescript` | TS + Vue 组合规则 | `^13.0.0` |
| `prettier` | 代码格式化 | `^3.8.4` |
| `eslint-config-prettier` | 关掉与 prettier 冲突的 lint 规则 | `^9.1.2` |

> uni-ui 通过 `src/uni_modules` easycom 方式随项目携带，不通过 npm 安装 `@dcloudio/uni-ui`；`sass` 是这些组件参与 H5/Vite 构建所需的 devDependency。

---

## 工具脚本（pnpm scripts）

| 命令 | 作用 |
|---|---|
| `pnpm dev:app-android` | Android 真机/模拟器开发（热更新）；模板自带 |
| `pnpm dev:h5` | H5 开发；用于无 Android 环境时验证编译 |
| `pnpm build:h5` | H5 构建；Phase 1 验证用 |
| `pnpm type-check` | `vue-tsc --noEmit` 类型检查（无产物） |
| `pnpm lint` | `eslint --ext .ts,.vue src/` |
| `pnpm format` | `prettier --write` 自动格式化 |

---

## 更新日志

- 2026-08-30：[UI 重构 03/14] 新建订单高频录单界面（Issue #4）——落地暖纸张画布（`$hej-color-canvas`）、象牙白连续录单卡（`$hej-color-surface`）、陶土色主动作（`$hej-color-accent`）；日期/餐次直接放在连续卡内并共享 80px 标签列，组合支付作为次级入口展开并使用步进器调整；客户选择器使用 `$hej-*` token 与拼音字母索引及全拼/首字母检索；同日同餐次待配送订单展示板岩蓝合并卡并支持“合并并保存”，已配送订单展示阻断提示并禁用提交；保存后提供“继续下一单”与“结束录单”弹窗；辅助操作按钮对齐 200rpx/64rpx 规范；新增 `tests/order-new-contract.test.cjs` 验证数据链与视觉契约；HBuilderX Android 模拟器验证默认表单、客户选择、组合支付、不足提示、待配送合并、已配送阻断、键盘输入、拼音检索、保存后继续录单与查看已有订单导航闭环。

- 2026-08-30：[UI 重构 02/14] 订单列表视觉重构（Issue #3）——落地暖纸张画布（`$hej-color-canvas`）、自定义状态栏、顶部日期选择与陶土色操作按钮；午晚餐折叠面板采用暖白表面卡片，标题展示左侧展开指示、餐次与有效单数份数（`X单 · Y份`）；列表项采用 6 点拖拽把手、加粗客户名、3 态标签（待配送板岩蓝/灰、已配送橄榄绿、已取消暖棕），副标题完整组合餐次、份数、支付方式、单价/金额与备注并自然换行；空态、加载与错误反馈使用标准卡片承载；新增 `tests/order-page-contract.test.cjs` 验证数据链与视觉契约；HBuilderX Android 模拟器验证空态、录单、三态标签、拖拽重排持久化与返回快照恢复闭环。

- 2026-08-30：迁入已审核的全页面 UI 重构参考——`docs/ui-image-generation-prompts.md` 更新为 Claude-inspired warm paper 方案三，新增 `docs/ui-reference/`，收录 23 张 375×812 参考图和页面 / 路由 / 版本索引；不迁入 ImageGen source 原图，不改应用代码、业务行为或现行 `docs/design.md` 实现规范。

- 2026-08-29：新增全页面 UI 概念图提示词——基于现有 23 个页面与业务闭环，采用适配 Android 高频操作的 Wise-inspired 友好金融方向，提供统一母提示词、负面提示词、逐页提示词和空态 / 校验 / 危险确认状态；本次只新增设计探索文档，不改应用 UI、业务行为或现行 `docs/design.md` 基线。

- 2026-06-10：初始创建（仅文档阶段，src/ 全空）
- 2026-06-10：Phase 1 脚手架 8/8 完成 — 补全所有顶层文件、src/ 入口、4 个 Tab 占位、版本快照、文件级作用说明
- 2026-06-10：Phase 2 数据层 5/6 代码就位 — `src/db/{schema,migrations,seed,index}.ts` + `App.vue` 触发 `dbInit()`；v0 DB 基线存 `memory-bank/bookkeeping-v0.db`（SQL smoke-test 通过：5 表 / 5 分类 / 10 索引 / user_version=1）；Step 2.6 真机落盘验证未完成
- 2026-06-11：Phase 2 Step 2.6 调试修正 — 按官方 5+ SQLite API 修复 `db/index.ts`：补齐 `await runMigrations()` / `await seedIfEmpty()`，`tx()` 改为 begin/commit/rollback，移除官方不支持的 args 透传并集中转义，增加 callback 超时诊断；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；当时等待真机落盘验证，后续已通过
- 2026-06-11：按用户提供的掘金 SQLite 封装文章对照，修复 `pify()` 动态方法调用丢失 `this` 的问题（改用 `fn.call(sqlite, options)`），该问题与 `this.getCallbackIDByFunction is not a function` 报错吻合；本地三项验证通过，后续真机复测通过
- 2026-06-11：Step 2.6 真机落盘验证通过 — `memory-bank/bookkeeping-real.db` 已生成并可被 sqlite3 打开，业务表齐全、默认分类 5 行、`user_version=1`；Phase 2 数据层完成
- 2026-06-11：Phase 3 类型与工具完成 — 新增 `src/types/domain.ts` / `src/types/api.ts` / `src/utils/date.ts` / `src/utils/format.ts`，安装 `dayjs`；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过；按用户要求，等待验证后再进入 Phase 4
- 2026-06-11：Phase 4 Step 4.1 customers API 完成 — 新增 `src/api/customers.ts`，实现客户 CRUD；删除客户时检查次卡和订单依赖，命中则返回 `false`；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock smoke test 通过
- 2026-06-11：Phase 4 Step 4.2-4.8 API 层完成 — 新增 `src/api/meal-cards.ts` / `src/api/orders.ts` / `src/api/errors.ts` / `src/api/expense-categories.ts` / `src/api/expenses.ts` / `src/api/stats.ts`；实现次卡、订单配送扣次、订单取消、支出分类读取、支出 CRUD 和统计聚合；本地 `pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，临时 SQLite mock 端到端 smoke test 通过；等待用户验证后再进入 Phase 5
- 2026-06-11：Phase 5 Pinia Stores 完成 — 按 uni-app 官方文档使用内置 Pinia，清除手动安装的 `pinia` / `@vue/devtools-*` 依赖；`src/main.ts` 使用 `Pinia.createPinia()` 并返回 `Pinia`；新增 `src/types/pinia.d.ts` 供本地 TS 检查；新增 `src/stores/customer.ts` / `src/stores/order.ts` / `src/stores/expense.ts` / `src/stores/stats.ts`，store 只做视图缓存和 action 编排，写入仍走 API 层；`src/api/stats.ts` 导出 `getRangeSummary` 供 stats store 复用。`pnpm type-check` / `pnpm lint` 通过；零手动 Pinia 依赖下 CLI H5 构建失败，需用 HBuilderX 内置 Pinia 验证。
- 2026-06-11：Phase 6 通用 UI 组件完成 — 新增 `src/components/StatCard.vue` / `src/components/AmountInput.vue` / `src/components/CustomerPicker.vue`；组件只提供跨页 UI 能力和事件上抛，不承接 Phase 7 页面业务实现。
- 2026-06-11：Phase 7 页面实现完成 — 新增订单、统计、客户、次卡、支出和备份恢复子页，更新 `pages.json` 路由；新增 `src/utils/ui.ts` 与 `src/utils/backup.ts`；扩展 `listOrders` 支持按客户查历史订单；页面层接入既有 store/API，保持次卡创建不扣次、配送完成扣次、次卡不足整单改微信/现金的核心约束。`pnpm type-check` / `pnpm lint` 通过；未进入 Phase 8 端到端流程串联。
- 2026-06-11：Phase 8 预检进行中 — 用户确认 Phase 7 真机验证通过后进入关键流程串联；修补次卡次数不足异常分支的改支付金额（按客户默认价 × 折扣率，不再沿用次卡次均价）和备份导入 `schema_version` 校验；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过，等待真机逐条跑 8.1-8.6。
- 2026-06-11：表单组件统一改造 — 业务页面原生 `input` / `textarea` / `picker` / `radio-group` / `slider` 已替换为 uni-ui easycom 组件（`uni-easyinput` / `uni-data-checkbox` / `uni-data-select` / `uni-datetime-picker` / `uni-number-box`）；`tsconfig.json` 与 `.eslintrc.cjs` 排除 `src/uni_modules` 第三方源码；新增 `sass` 供 uni-ui SCSS 编译；`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过（H5 build 仅有 uni-ui 内部 Sass deprecation warning）。
- 2026-06-11：订单列表按餐次折叠分组 — `src/pages/order/index.vue` 改为使用 uni-ui `uni-collapse` 固定展示午餐 / 晚餐两个面板，标题汇总有效订单数、份数和金额，取消订单继续展示但不计入标题统计。
- 2026-06-11：次卡展示修正 — `src/pages/me/customers/detail.vue`、`open-card.vue` 与 `src/pages/order/new.vue` 改为汇总所有 active 次卡的剩余 / 总次数；新开卡后客户详情和订单录入页都显示为次数叠加，不再只显示最新卡导致看起来覆盖旧卡。
- 2026-06-11：订单详情编辑能力 — `src/pages/order/detail.vue` 新增 pending 订单编辑态，可修改客户、日期、餐次、份数、价格、支付方式与备注；`src/api/orders.ts` 新增 `updateOrder`，限制只编辑 pending 订单，次卡编辑仍不扣次，扣次继续发生在配送完成时。
- 2026-06-11：订单列表备注展示 — `src/pages/order/index.vue` 的订单元信息行在单价后追加非空备注，空备注不显示，便于配送前快速查看口味 / 临时要求。
- 2026-06-11：开次卡金额校验调整 — `src/pages/me/customers/open-card.vue` 保存条件放开 0 元次卡，仍要求客户有效、总次数大于 0、金额为非负有效数字；`src/api/meal-cards.ts` 原本已允许 `amount >= 0`。
- 2026-06-11：危险清空默认分类恢复 — `src/utils/backup.ts` 的 `clearAllData()` 清空业务数据后在同一事务内重新执行 `seedIfEmpty()`，`src/pages/me/settings/backup.vue` 同步文案，修复清空后新增支出页分类无选项的问题。
- 2026-06-11：首页状态色展示 — `src/pages/index/index.vue` 将今日订餐的待配送 / 已配送 / 已取消计数和列表分组改为主题色展示，分别使用 `$uni-color-primary` / `$uni-color-success` / `$uni-color-warning`。
- 2026-06-11：Phase 8 关键流程串联完成 — 用户在 HBuilderX 真机逐条跑通 8.1-8.6（录单配送对账 / 次卡完整 / 次卡不足异常 / 取消订单 / 折扣临时涨价 / 备份恢复）；6 条流程全部断言通过，`memory-bank/bookkeeping-real.db` 备份为 `memory-bank/bookkeeping-v1.db` 作为 v1 阶段基线。
- 2026-06-11：Phase 9.1 空状态 + Loading 防重复验收 — 13 个页面 / 组件现状全部就位：列表页全有 `v-if="loading"` + 友好空态文案（Dashboard / 订单列表 / 客户列表 / 客户详情 / 支出列表 / 统计页 / 订单详情 / CustomerPicker），全部保存按钮 `:disabled="!canSave"` 且 canSave 含 `saving.value` 防重（订单新建 / 订单详情编辑 / 客户新建编辑 / 开次卡 / 支出新建 / 备份页），关键 async 操作均 try/catch + `showToast` 兜底。本步骤不需新增代码，已在 progress.md 标记完成。
- 2026-06-11：Phase 9.2 错误处理兜底 — `src/App.vue` 新增 `onError` 全局钩子，DB 损坏时识别 `integrity_check` 关键字并提示"数据库损坏，请用备份恢复"；`src/db/index.ts` `init()` 末尾跑 `PRAGMA integrity_check(1)`，失败抛 `[db] integrity_check failed: ...` 错误让 `onError` 捕获。`pnpm type-check` / `pnpm lint` 通过。
- 2026-06-11：Phase 9.5 CHANGELOG 落地 — 新增 `memory-bank/CHANGELOG.md` 写 v1.0 节：已实现 F1-F6 功能 + 关键行为决策（A1/A3/A4/A5/A6/A7）+ 收尾质量门 + 已知限制（含"未做 50 单压测"和"未打 Release APK"两条）+ v1.1 TBD 候选。
- 2026-06-11：**v1.0 发布**（按用户决策）— Step 9.3 真机性能 smoke test 和 Step 9.4 Release APK 打包侧载**跳过**（个人内用 v1.0 用 HBuilderX 标准基座的 debug APK 侧载，省掉自签名 keystore / 云打包）；`memory-bank/CHANGELOG.md` 已知限制节同步标注这两条；`progress.md` Phase 9 标记为 3/5 完成、里程碑 9.5 勾选。
- 2026-06-11：订单列表折叠面板样式微调 — `src/pages/order/index.vue` 的午餐 / 晚餐面板标题使用 `$uni-color-primary` 并加粗，面板内订单列表项之间增加分割线。
- 2026-06-11：备份恢复 v1.1 小修 — `src/utils/backup.ts` 移除系统分享路径，导出后复制到 `_downloads/` 并返回 `ExportResult`；新增 `listBackupFiles()` / `readBackupFile()` / `pickLocalBackupText()`；`src/pages/me/settings/backup.vue` 保留粘贴 JSON 导入，并新增从已保存备份选择、本地 JSON 文件选择两个入口；本地文件选择在 Android App 端使用系统 Intent，不再依赖 WebView `<input type="file">`。`pnpm type-check` / `pnpm lint` 通过；真机文件路径待 HBuilderX 验证。
- 2026-06-12：新建订单日期可选 — `src/pages/order/new.vue` 新增日期字段，默认 `tomorrow()` 且可手动修改；`src/stores/order.ts` 新建订单后刷新到该订单日期，避免返回列表仍停在旧日期；`src/utils/date.ts` 新增 `tomorrow()`。
- 2026-06-13：备份恢复本地文件选择修正 — Android 客户端不支持 WebView `<input type="file">`，`src/pages/me/settings/backup.vue` 移除隐藏 input；`src/utils/backup.ts` 新增 `pickLocalBackupText()`，Android App 端通过系统 Intent 选择 JSON 并用 `ContentResolver.openInputStream()` 读取，其他端 fallback 到 `uni.chooseFile`。
- 2026-06-15：删除能力补齐 — 订单详情新增硬删除，已配送次卡订单删除时回滚已扣次数；支出列表点击进入新增的支出详情页，详情页支持修改和删除；客户详情新增删除入口，存在订单或次卡依赖时拒绝删除；`design-document.md` 明确后续删除统一采用"硬删除 + 回滚已产生副作用"。
- 2026-06-15：客户姓名判重 — `src/api/customers.ts` 在创建/改名时按 trim 后姓名检查重复并抛 `DuplicateCustomerNameError`；`src/pages/me/customers/new.vue` 捕获后提示重复姓名不可保存。
- 2026-06-15：支出退差金额上线 — schema 升级到 v2，`expenses` 新增 `refund_amount` 字段；新建 / 修改支出页补退差金额输入与实际支出预览；统计页支出口径、日趋势和分类占比统一按 `amount - refund_amount` 计算；备份恢复允许 v1 备份导入到 v2 时为旧支出补 0。
- 2026-06-15：订单列表拖拽排序 — schema 升级到 v3，`orders` 新增 `sort_order` 字段与同日同餐次排序索引；`src/api/orders.ts` 新增 `reorderOrders()`，新订单自动追加到同日同餐次末尾；`src/pages/order/index.vue` 支持长按左侧 `uni-icons bars` 把手在午餐 / 晚餐分组内拖拽排序；备份恢复允许 v1/v2 备份导入到 v3 时为旧订单补 `sort_order=0`。
- 2026-06-15：客户列表拼音索引 — 新增纯 JS 依赖 `pinyin-pro` 与 `src/utils/pinyin.ts`；`src/pages/me/customers/list.vue` 按中文客户名拼音首字母分组排序，支持右侧字母索引跳转，并把搜索扩展到姓名拼音和拼音首字母。
- 2026-06-15：金额精确计算统一接入 big.js — 新增 `big.js@7.0.1` 与 `@types/big.js` 依赖；`src/utils/format.ts` 新增 `roundMoney / addMoney / subtractMoney / multiplyMoney / divideMoney` 五个 helper（全局 `Big.RM = roundHalfUp`，所有结果强制 `toFixed(2)` 保证输出干净）；`src/api/stats.ts` 三处累加/差值（getRangeSummary / getDailyTrend / getCategoryBreakdown）、`src/api/orders.ts` 三处订单金额计算（次卡均摊单价、默认价 × 折扣率、单价 × 份数）、`src/utils/ui.ts` 两处客户默认价提示全部改走 helper。修复首页利润显示 `0.0000000004` 的 JS 浮点尾数问题。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（首页 8.1 流程 + 8.5 折扣临时涨价重点复测）。
- 2026-06-16：订单列表拖拽滚动冲突修复（v1.6 重做）—— 原 v1.4（longpress 激活 + `@touchmove` 绑整个 order-item）与 scroll-view 并发滚动导致抖动；曾尝试 v1.6（`@touchstart.stop` + 阈值 + JS 层 `preventDefault`）但 AGENTS.md §11 自己承认 preventDefault 在 Android 标准基座不生效，bug 依旧。本次改用**方案 B：动态 `:scroll-y` 开关 + 边缘自动滚屏**绕开冲突：`src/pages/order/index.vue` 的 `<scroll-view>` 改 `:scroll-y="listScrollable"` `:scroll-top="listScrollTop"` `@scroll="onListScroll"`；触摸事件下沉到 drag-handle（`@touchstart.stop`→dragIntent、`@touchmove.stop`→跨阈值 10px 后 `lockScroll()` 关闭滚动能力 + clone 列表）；激活后手指拖到顶/底 64px 内用 `setTimeout(16)` 驱动 `:scroll-top` 程序化滚屏（app-plus 逻辑层无 `requestAnimationFrame`），并反向修正 `dragState.startY`（scrollTop 增大→内容上移→目标 index 应增大→startY 需减小）让 targetIndex 跟随不错位。新增 `DragIntent` 接口 + `dragIntent` ref + `listScrollable` / `listScrollTop` ref + `lockScroll / unlockScroll / onListScroll / stopEdgeAutoScroll / applyReorder / runEdgeAutoScroll / onHandleTouchStart / onHandleTouchMove / onHandleTouchEnd` 九个函数；删除 `startDrag` / `handleTouchMove`。`DragState` / `dragOrders` / `dragState` / `dragSaving` / `dragClickBlockedUntil` 与 `finishDrag` / `dragItemHeightPx` 等保留。`CHANGELOG.md` v1.6 节改写为方案 B、`progress.md` 同步、`AGENTS.md §11` 最后一行更新为方案 B。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（CHANGELOG v1.6 节验证清单 10 条）。
- 2026-06-16：统计 SUM 出口精度收口 —— `src/api/stats.ts` 三处 SQL `SUM` 出口的 number 之前在 `getRangeSummary` 的 `expense = num(row?.expense)` 与 `getCategoryBreakdown` 的 `amount: num(row.amount)` 两条路径**完全没**经过 `roundMoney`（income / 利润走 `addMoney` / `subtractMoney` 隐式 `.toFixed(2)` 才保住精度）；本次把 `getRangeSummary` 的 `orderIncome` / `cardIncome` / `expense`、`getDailyTrend` 三组 `income` / `expense`、`getCategoryBreakdown` 的 `amount` / `total` 全部显式 `roundMoney()` 后再相加相减；首页 Dashboard `summary.expense` 与统计页支出分类两个浮点尾数源头修复。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（首页 8.1 流程 + 统计页 8.5 重点复测）。
- 2026-06-22：订单详情复制信息 — `src/pages/order/detail.vue` 只读态新增「复制信息」按钮，通过 `uni.setClipboardData` 写入客户名、订单份数和备注；空备注不写入复制内容，复制成功 / 失败沿用现有 toast 提示。
- 2026-06-22：配送完成后自动沉底 — `src/api/orders.ts` 的 `markDelivered()` 成功配送时同步把订单 `sort_order` 更新为同日同餐次最大值 + 1；从订单详情触发配送后，`src/pages/order/index.vue` 重新读取列表即可把该订单排到对应餐次最后。
- 2026-06-22：今日午餐完成后自动折叠 — `src/pages/order/index.vue` 的默认展开面板改为 `:model-value` 控制；筛选日期为今天且午餐分组所有订单均为 `delivered` 时，午餐面板从默认展开列表中移除。
- 2026-06-26：次卡余额池扣次 — schema 升级到 v4，新增 `meal_card_usages` 记录已配送次卡订单的实际扣次明细；`markDelivered()` 改为按客户所有 active 次卡旧卡优先扣次，支持一单跨多张卡，只有总剩余不足才弹改微信 / 现金；`deleteOrder()` 按 usage 明细精确回滚；新建 / 编辑订单页优先选择能覆盖本单份数的 active 卡作为参考 `meal_card_id`，展示上弱化单张卡编号；备份恢复支持 v1-v3 旧备份自动补 usage 明细。
- 2026-07-14：次卡充值记录与总次数校正 — 客户详情增加充值记录入口，新增 `card-records.vue` 展示全部历史卡；`open-card.vue` 重构为 uni-forms 并兼容编辑模式；`updateCardTotalMeals()` 禁止总次数小于已用次数，并自动切换 `active/depleted`；不改 schema、充值金额或历史扣次明细。
- 2026-07-14：客户选择器拼音分组索引 — `CustomerPicker.vue` 复用 `compareCustomerName()` / `getCustomerInitial()` 按客户姓名拼音排序和分组，右侧 `index-bar` 点击后通过 `scroll-into-view` 跳转；新建订单与订单详情编辑同时生效。
- 2026-07-14：客户列表次卡身份头像 — `src/api/meal-cards.ts` 新增单次批量查询当前有剩余次数的 active 次卡客户 ID；`src/pages/me/customers/list.vue` 头像区将这类客户显示为“次”，其他客户显示为“普”，不改 schema 和其他页面。
- 2026-07-22：一餐一单与组合支付（v1.12）—— schema 升至 v5，`orders` 新增 `meal_card_quantity`；新增 `src/utils/order-rules.ts` 与三组 Node / SQLite CLI 测试。订单 API 在事务内合并同客户 / 日期 / 餐次 pending 增量、校验次卡预占、支付渠道和改单价确认，配送 / 删除只处理次卡分配部分；`tx()` 串行顶层事务，详情状态操作增加 in-flight 锁，防止双击 / 多页并发重复扣次或建单；新增 / 编辑页重构为 uni-forms，列表改为完整组合支付副标题；备份与充值记录校正同步 v5 口径。静态门禁与 H5 构建结果见 `CHANGELOG.md v1.12`，HBuilderX 真机回归待执行。
- 2026-07-22：客户表单标签统一 — 新建订单与订单详情编辑均由 `<uni-forms-item label="客户">` 提供字段标签；`CustomerPicker` 移除内部重复标签，保留选择、搜索和拼音分组交互。
- 2026-07-22：订单与对账 UI 基线（v1.13）—— 新增 `docs/design.md` 和 `src/uni.scss` 的 `$hej-*` 语义 token；订单列表空态可新建所选日期首单，新建 / 编辑订单按统一层级并使用固定确认区，统计页改为“收支 / 利润趋势”逐日并列展示入账、支出和利润。首页按用户反馈恢复既有概览与分组布局；本轮自定义按钮统一采用固定高度与等值行高，保证 App 端文字垂直居中。订单页顶部日期 / 新建区增加内边距并使用蓝色主动作；修复漏写 `lang="scss"` 导致 `$hej-*` token 原样输出、App 回退默认样式的问题，新增静态回归测试；新建订单的合并、配送冲突、次卡、加载 / 失败和字段占位提示改为说明原因与下一步。未改订单、金额或 SQLite 业务规则；`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过，H5 仅输出既有 uni-ui / Dart Sass deprecation warnings，HBuilderX 真机视觉 / 交互回归待执行。
- 2026-07-22：订单金额展示文案—— 新建 / 编辑确认区和订单详情将“货币金额”改为“实际金额”；仅改用户可见名称，不改 `orders.amount`、支付拆分或金额计算。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过。
- 2026-07-22：AI 协作入口收敛——新增 `docs/uni-modules-ai-index.md`，按场景完整登记 45 个本地 uni-ui 包的版本、验证状态、使用边界、README 与项目内用例；`AGENTS.md` 改为任务路由、硬约束、验证与平台陷阱的短运行时规则，详细业务、历史与 API 信息回归各自权威文档。本次不改应用代码或业务行为。
- 2026-07-22：订单支付摘要与表单层级——新建 / 编辑订单将金额收进“配送与支付”卡内作为分隔小节；固定确认区、合并改单价提示和详情份数均明确显示微信 / 现金渠道，不再对用户显示“货币支付 / 货币份数”。不改 `orders.amount`、支付拆分或金额计算。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过。
- 2026-07-22：新建订单高频录单重构（v1.14）——`src/pages/order/new.vue` 收敛为配送安排条 + 一张连续录单卡：默认日期 / 餐次 / 微信保留，组合支付降为份数大于 1 时的次级入口，用户主动进入后预填 1 次并可步进调整；实际单价直接显示输入框、备注改为一行常显，底部主操作直接说明当前缺失项。保存成功后弹出“继续下一单 / 结束录单”，继续时只清空本次字段。未改 schema、API、金额计算或订单状态机；静态门禁与 H5 构建通过，HBuilderX 真机回归待执行。
- 2026-07-23：新建订单单行表单与统一表面（v1.15）——`src/pages/order/new.vue` 的日期、餐次及各业务字段均由独立 `uni-forms-item` 承载并共享 80px 标签列；移除独立“配送安排”色块，日期 / 餐次和组合支付展开区均与主表单使用同一白色表面。标签与控件垂直居中，控件左边界一致；次卡次数和补款方式沿用同一对齐线。客户状态提示按钮与“改为纯支付”按钮补足最小宽度、64rpx 触摸高度和水平内边距，避免操作文案拥挤。未改订单事务、次卡预占、金额或 schema。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过；390 × 844 H5 默认与组合支付布局检查通过，HBuilderX 真机待验证。
- 2026-07-23：订单详情编辑样式同步（v1.15）——`src/pages/order/detail.vue` 编辑态以当前新建订单页为视觉基准，改为连续白色表面、80px 标签列、单行字段与统一分隔线；客户状态操作、实际单价提示、组合支付面板及底部确认区同步间距和触摸尺寸。详情页既有四种支付方式按两列展示，避免窄屏文字拥挤；总份数语义、编辑校验、目标订单合并、配送 / 取消 / 删除均未改变。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过，HBuilderX 真机待验证。
- 2026-07-23：业务表单视觉规范分层固化——`docs/design.md §4` 以当前 `src/pages/order/new.vue` 为唯一视觉实现基准，集中维护连续白色表面、80px 标签列、单行字段、统一分隔线、选择控件、提示按钮和底部确认区规范；根目录 `AGENTS.md §6` 只保留读取路由、组件和验证硬约束，避免复制视觉参数。规范只复用视觉契约，不扩散订单字段或业务逻辑。
- 2026-07-23：新建订单日期固定默认明天——`src/pages/order/index.vue` 跳转新建页时不再携带列表筛选日期，`src/pages/order/new.vue` 删除查询参数覆盖逻辑，每次打开均以 `tomorrow()` 初始化日期；表单内仍可手动修改。未改订单保存、合并或列表刷新规则。
- 2026-07-23：新建支出表单对齐——`src/pages/me/expenses/new.vue` 将标签列显式统一为 88px，表单标签与右侧控件垂直居中，页面背景改用 `$hej-color-canvas`；未改表单数据、校验或保存逻辑。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，H5 仅输出既有 uni-ui / Dart Sass 弃用警告；HBuilderX 真机视觉待验证。
- 2026-07-23：表单标签占位规则——根目录 `AGENTS.md` 新增项目级约束：同一业务表单在 `<uni-forms>` 层统一设置带单位的 `label-width`，禁止无单位字符串与字段级分散宽度，并保持右侧控件左边界一致、标签与控件垂直对齐。
- 2026-07-23：订单页顶部操作区视觉居中修复——`src/pages/order/index.vue` 将日期组件根节点改为纵向 flex 并居中内部固定 35px 高的可见输入框，消除其与 80rpx 新建按钮的可见中心偏移；未改日期选择、新建跳转或订单数据逻辑。375 × 812 H5 测量中两个可见控件中心偏差与日期控件宽度差均为 0px；`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，HBuilderX 真机视觉待验证。
- 2026-07-23：表单页面背景规则——根目录 `AGENTS.md` 的表单约束补充：表单页面背景统一使用 `$hej-color-canvas`，引用该 token 的 Vue 样式块必须声明 `lang="scss"`。
- 2026-07-24：次卡收入本地日期修复（v1.16）—— `src/api/stats.ts` 用 SQLite `date(created_at, 'localtime')` 将 UTC 开卡时间按设备本地日期过滤和分组，避免凌晨开卡收入误归前一日；新增 `tests/stats-timezone.test.cjs` 保护首页收入 / 利润和日趋势。`pnpm test`（24 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，Android 真机待验证。
- 2026-07-24：次卡开卡记录删除（v1.17）——只允许删除从未扣次的记录；`deleteCard()` 在同一事务内保护 usage / delivered 历史、pending 预占和外键引用，必要时把 pending 订单改绑到最早可用卡。充值记录页新增带明确影响确认的危险按钮，已扣次记录禁用。`pnpm test`（30 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，Android 真机待验证。
- 2026-07-28：每日菜单与社群文案模板（v1.18）—— schema v6 新增每日菜单、唯一默认文案模板与编辑前版本历史；支持连续新增下一天、当前 / 历史菜单、缺餐条件区块渲染、默认模板复制、版本恢复和硬删除。今日 / 我的增加入口，备份与危险清空同步三张新表；自动化与 CLI 结果见 `CHANGELOG.md v1.18`，HBuilderX 真机待验证。
- 2026-08-09：页面返回现场（v1.19）——新增页面实例级内存快照 composable 与纯定位规则，所有现有 `navigateTo` 父页面统一保留筛选 / 草稿 / 折叠和滚动；列表变化时按原条目、下一项、上一项兜底，订单拖拽复用既有受控滚动，客户字母索引在恢复前清空目标。新增 7 条定位回归，`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 与 `git diff --check` 通过；全量测试 45/46，既有 schema 测试在 Windows 下因 sqlite3 CRLF 与 LF 期望不一致失败，Android 真机待验证。
- 2026-08-09：v1.19 代码审查修复——订单新建 / 编辑表单返回后只刷新已有订单、目标订单和次卡可用量等辅助数据；刷新失败仍恢复滚动但保留快照，并回滚多 Store 的部分成功结果；订单相邻项按午餐 → 晚餐实际渲染顺序记录，客户次卡身份不在刷新前清空。定位测试 7/7、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过；全量测试仍为 45/46，唯一失败是既有 Windows sqlite3 CRLF 断言，Android 真机待验证。
- 2026-08-12：页面返回与订单午餐折叠修订（v1.20）——返回快照仅保存离开时的滚动像素，数据重排、编辑、配送或删除不再按订单身份定位；列表刷新为空时回到顶部。订单页今日午餐在非空且全部已配送时自动折叠，新增待配送午餐时仅对系统自动折叠状态重新展开，取消或清空不强制展开，用户手动开关优先。未改订单状态流、排序、API 或数据库结构。
- 2026-08-12：月卡信息复制与独立文案模板（v1.21）——schema v7 新增独立月卡模板 / 版本表、备份数组和维护页；模板只允许 `{{本次使用份数}}` / `{{当前可用份数}}`，套餐描述直接编辑正文。已配送且实际使用次卡的订单详情新增复制月卡信息按钮；标记配送成功后只更新当前详情状态并保留页面，复制时按配送后余额与其他 pending 预占生成最新文案。新增 `CONTEXT.md` 与 ADR 0002 固化“月卡”为外部称呼、实际领域仍为无有效期次卡。CLI / H5 / Android 回归待最终执行。
- 2026-08-14：月卡信息复制余额口径修正——`src/pages/order/detail.vue` 复制文案改用 `getMealCardAvailability()` 的 `actual_remaining`，待配送订单的次卡预占只继续用于订单可用性校验，不再从客户月卡文案的当前剩余份数中扣除；新增页面字段映射回归测试。
