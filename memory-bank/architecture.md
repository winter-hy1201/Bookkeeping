# 盒记 — 架构基线

> 每个文件的作用说明。新建文件时**必须**在本文件登记；删除文件时同步删登记。
> AI 在写代码前应**完整阅读**本文件，了解当前代码库的全貌。

---

## 当前状态

- **项目阶段**：**v1.0 已发布**；当前处于功能维护与 Android 回归阶段。功能变更、验证和未验证项只记录在 `memory-bank/CHANGELOG.md`。
- **当前实现**：uni-app Vue 3 + Vite + TypeScript、11 张表 DDL + 迁移 + seed + integrity_check + `tx()` 工具、domain/api 类型、日期 / 金额 / 菜单模板 / 月卡模板 / 页面 / 备份工具、完整 API 层、4 个 Pinia store、跨页组件与 4 个根 Tab。
- **DB 状态**：当前 schema 版本为 8，包含每日菜单、两类文案模板及版本历史，并把系统支出分类图标统一为 Lucide 名称。仓库不再保留二进制 DB 基线；schema、迁移和 seed 以 `src/db/` 为准，Android 实际验证见 `memory-bank/CHANGELOG.md`。
- **UI 基线**：`docs/design.md` 与 `$hej-*` 语义 token 是当前视觉规范；暖纸张表单、备份恢复风险阶梯、23 页模拟器集成验收、Lucide 图标和原生 TabBar 已落地。物理真机视觉与触摸状态以 CHANGELOG 最近验证记录为准。
- **最后更新**：2026-09-01

---

## 编译工具链（重要 — 2026-06-10 调整）

> **CLI H5 模式（`pnpm dev:h5` / `pnpm build:h5`）不能编译 SQLite 原生模块**。`plus.sqlite` 的 JS 表面存在但底层是空壳，openDatabase 同步返回 undefined 且 callback 静默不触发。
> **必须用 HBuilderX 编译**才能把 SQLite 原生模块链进 APK。

| 任务 | 用什么 |
|---|---|
| 写代码 / TS 类型检查 / lint | CLI：`pnpm type-check` / `pnpm lint` |
| 跑 H5 编译验证 | CLI：`pnpm build:h5` / `pnpm dev:h5`；当前 `package.json` 已声明 `pinia`，H5 构建可作为 CLI 验证 |
| **真机调试 Android** | **HBuilderX**："运行 → 运行到 Android App 基座" |
| Release APK | HBuilderX："发行 → 原生 App-云打包"或"本地打包" |

**HBuilderX 关键配置**（第一次必做）：
- `src/manifest.json` 可视化编辑 → 「App 原生插件配置」 → 勾选 **「SQLite(数据库)」** 模块
- `工具 → 设置 → 运行配置 → Android 证书` → 生成自签名调试证书

**工具边界**：VSCode / CLI 用于编辑、类型检查、lint 和 H5 构建；HBuilderX 只用于把 SQLite 原生模块链入 Android 基座并进行 Android 验证。

---

## 顶层文件

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `CLAUDE.md` | Claude Code 入口；通过 `@AGENTS.md` 复用仓库运行规则，不单独维护第二份约束 | 极少更新（仅路由变化时） |
| `README.md` | 仓库入口说明：项目定位、当前功能、技术栈、运行 / 验证方式与平台边界 | 项目定位、主要功能、启动方式或目标平台变化时 |
| `docs/` | 当前 UI 规范、ADR、参考图、第三方许可与本地组件选型索引 | 新增或调整对应规范 / 参考资产时 |
| `docs/design.md` | 盒记项目级 UI 设计规范：语义 token、按钮 / 状态 / 空态规则与页面验收清单；视觉改动前先读。 | 改动跨页面视觉语言、token 或 UI 验收标准时 |
| `docs/ui-image-generation-prompts.md` | 盒记 23 个现有页面的 UI 概念图生成提示词：Claude-inspired warm paper 方向、母提示词、负面提示词、逐页内容和通用状态；仅用于视觉探索，不代表已实现。 | 页面范围、概念视觉方向或生图工作流变化时 |
| `docs/ui-reference/` | 已审核的 23 张 375×812 UI 重构参考图及页面、路由、版本映射；`README.md` 是图片索引，`icon-map.md` 登记逐页 Lucide 图标与原生 TabBar 资源映射。图片只作为重构参考，现行实现规范仍以 `docs/design.md` 为准。 | 审核参考图、页面映射、图标映射或推荐版本变化时 |
| `docs/uni-modules-ai-index.md` | 本地 `src/uni_modules` 的 AI 选型索引：45 个包的版本、场景、状态、边界、本地 README 与项目内用例；新增 / 重做 UI 先查。 | 增删 / 升级本地组件，或形成新的项目内用例时 |
| `docs/adr/0001-in-memory-page-return-snapshots.md` | 页面返回现场采用页面实例级像素快照与共享 composable、拒绝全局缓存和持久化的架构决策。 | 返回现场的状态归属、生命周期或持久化边界变化时 |
| `docs/adr/0002-meal-card-message-templates-are-independent.md` | 月卡文案模板使用独立数据表、版本历史、默认状态和维护页面；只复用交互模式，不与菜单模板共享数据。 | 月卡模板数据边界、语法或维护入口变化时 |
| `docs/adr/0003-heji-theme-and-lucide-icons.md` | 盒记暖纸张主题、Lucide 图标统一入口与本地 uni-ui 源码维护边界；当前数据库分类统一保存 Lucide 原始名称，schema v8 / 旧备份导入负责归一化历史 emoji。 | 跨页面主题、图标依赖或本地组件维护策略变化时 |
| `docs/third-party-licenses.md` | `@lucide/vue` 固定版本与 ISC 许可证，以及本地 uni-ui 源码补丁边界。 | 第三方依赖或本地组件来源变化时 |
| `.gitignore` | git 忽略规则（node_modules、dist、IDE 文件等） | 加新忽略项时 |
| `index.html` | Vite H5 入口 HTML；`<script type="module" src="/src/main.ts">` | 几乎不改 |
| `package.json` | 项目元数据 + scripts（dev / build / test / lint / format / type-check） | 加新脚本/依赖时 |
| `tests/db-transaction.test.cjs` | Node 内置测试：验证单一 SQLite 连接上的并发顶层事务必须串行，防止双击建单 / 配送交错写入 | `tx()` 并发边界变化时 |
| `tests/meal-card-delete.test.cjs` | Node 内置回归测试：验证未扣次充值记录删除、pending 订单 FIFO 改绑、预占冲突回滚与 usage / delivered 历史保护 | 次卡记录删除边界变化时 |
| `tests/order-rules.test.cjs` | Node 内置测试：覆盖次卡不足、纯 / 组合支付金额、非法次卡次数、备注去重、支付冲突和合并改单价预览 | 订单规则变化时 |
| `tests/schema-v6.test.cjs` | SQLite CLI 冒烟测试：保留 v5 订单字段回归，并验证菜单 / 月卡模板约束和 v5 → v8 迁移追加 | schema / migration 变化时 |
| `tests/menu-template.test.cjs` | Node 纯函数测试：模板条件区块、缺餐删除、日期格式、多行 / `$` 字符保真、空行整理和语法错误 | 模板语法或复制文案变化时 |
| `tests/meal-card-template.test.cjs` | Node 纯函数与页面契约测试：月卡模板默认正文、次数占位符替换、未知 / 缺失 / 未闭合占位符校验，以及复制时使用实际剩余次数 | 月卡模板语法或复制文案变化时 |
| `tests/backup-v6.test.cjs` | Node 备份兼容测试：v5 无菜单数组仍可解析，v6 / v7 必须显式携带对应模板和版本数组（含空数组状态） | schema 或备份格式变化时 |
| `tests/backup-page-contract.test.cjs` | Issue #14 备份页契约测试：三种恢复入口只暂存、覆盖与危险清空文案、暖纸张层级、原生子页导航，以及导入提交前 SQLite 完整性检查 | 备份页、恢复入口或导入事务边界变化时 |
| `tests/stats-timezone.test.cjs` | Node 内置回归测试：在 `Asia/Shanghai` 时区下验证 UTC 凌晨时间戳按设备本地日期计入首页次卡收入与日趋势 | 统计时区或次卡收入口径变化时 |
| `tests/ui-style-preprocess.test.cjs` | Node 静态测试：扫描业务 Vue 样式块，使用 `$hej-*` token 时必须声明 `lang="scss"`，避免 token 原样输出使 App 回退默认样式 | token 样式页面变化时 |
| `tests/page-return.test.cjs` | Node 纯函数回归：从生产 TypeScript 载入返回目标解析器，覆盖内容变化时仍恢复像素、空列表回顶部和负数像素归零。 | 页面返回现场的滚动恢复规则变化时 |
| `tests/order-new-contract.test.cjs` | Node 静态契约测试：确保新建订单页与 CustomerPicker 连接真实 store / API、保留组合支付与合并/阻断状态机、不含 demo 硬编码，并使用暖纸张语义 token。 | 新建订单页面视觉契约或真实数据链路变化时 |
| `tests/today-page-contract.test.cjs` | Node 静态契约测试：确保今日页连接真实 store / API、保留加载 / 空 / 失败状态、菜单入口与根路由，并使用暖纸张语义 token。 | 今日页面视觉契约或真实数据链路变化时 |
| `tests/me-page-contract.test.cjs` | Node 静态契约测试：确保「我的」业务入口页保留 6 个真实业务入口与路由、反未存在功能幻觉（无头像/账户/银行卡/云同步）、使用暖纸张与象牙白卡语义 token、自定义状态栏与返回现场接入。 | 「我的」页面视觉契约或业务入口变化时 |
| `tests/order-page-contract.test.cjs` | Node 静态契约测试：确保订单列表连接真实 store / API、保留三态状态标签、空/载/错状态卡片、自定义导航与暖纸张语义 token，不含 demo 硬编码。 | 订单列表页面视觉契约或真实数据链路变化时 |
| `tests/customer-pages-contract.test.cjs` | Node 静态契约测试：确保客户列表、新建客户档案与客户详情连接真实 store / API、保留拼音首字母检索、100px 标签列、次卡身份徽标与删除依赖保护，并使用暖纸张语义 token。 | 客户页面视觉契约或真实数据链路变化时 |
| `tests/expense-pages-contract.test.cjs` | Node 静态契约测试：确保支出列表、新建支出与支出详情连接真实 store / API、保留 100px 标签列、净支出实时公式与删除保护，并使用暖纸张语义 token。 | 支出页面视觉契约或真实数据链路变化时 |
| `tests/meal-card-pages-contract.test.cjs` | Node 静态契约测试：确保次卡开卡/充值修改与充值记录页连接真实 store / API、保留已扣次记录删除禁用与收入影响提示，并使用暖纸张语义 token。 | 次卡页面视觉契约或真实数据链路变化时 |
| `tests/menu-pages-contract.test.cjs` | Node 静态契约测试：确保每日菜单列表与编辑页连接真实 store / API、100px 标签列、多行菜品录入与返回快照，并使用暖纸张语义 token。 | 每日菜单页面视觉契约变化时 |
| `tests/menu-template-pages-contract.test.cjs` | Node 静态契约测试：确保文案模板列表、编辑与历史版本页连接真实 API、100px 标签列、快捷插入按钮、示例文案预览与版本恢复，并使用暖纸张语义 token。 | 文案模板页面视觉契约变化时 |
| `tests/meal-card-template-pages-contract.test.cjs` | Node 静态契约测试：确保月卡文案模板列表、编辑与历史版本页连接真实 API、100px 标签列、两个次数占位符校验与示例文案预览，并使用暖纸张语义 token。 | 月卡文案模板页面视觉契约变化时 |
| `pnpm-lock.yaml` | pnpm 锁定文件（**不要**手动编辑） | pnpm install 后自动 |
| `tsconfig.json` | TypeScript 配置；extends `@vue/tsconfig`，加 3 个 strict 选项；排除 `src/uni_modules` 本地 uni-ui 源码 | 调整严格度时 |
| `vite.config.ts` | Vite 配置；只注册 `uni()` 插件 | 加 Vite 插件时 |
| `.eslintrc.cjs` | ESLint 配置：vue3 + ts + prettier；`src/pages/**` 关闭多字命名；忽略 `src/uni_modules/**` 本地源码 | 改 lint 规则时 |
| `.prettierrc` | Prettier 配置：无分号 / 单引号 / 宽度 100 | 改格式时 |
| `node_modules/` | 依赖安装目录（git 忽略） | pnpm install 后 |

---

## memory-bank/ — 活文档区（AI 协作）

| 文件 | 作用 | 何时更新 |
|---|---|---|
| `memory-bank/design-document.md` | 当前产品设计：数据模型、状态机、关键流程、UI 草图与范围边界 | 当前业务规则变化时 |
| `memory-bank/architecture.md` | **本文件**：每个代码文件的作用说明 | 每个文件新建/删除/职责变化时 |
| `memory-bank/CHANGELOG.md` | 唯一功能变更记录：新增、修复、验证、未验证项、阻塞、已知限制与后续候选 | 每次功能或验证状态变化时 |

---

## src/ — 应用代码

### 入口与配置

| 文件 | 作用 |
|---|---|
| `src/main.ts` | App 入口；导出 `createApp()`（Vue 3 SSR 工厂）装载 `App.vue`；按 uni-app Pinia 文档 `import * as Pinia from 'pinia'`，`app.use(Pinia.createPinia())`，并从 `createApp()` 返回 `Pinia`。运行时依赖来自 `package.json` 的 `pinia`。 |
| `src/App.vue` | 根组件；处理 uni-app 全局生命周期 `onLaunch` / `onShow` / `onHide` / `onError`；`onLaunch` 调 `db.init()` 并在失败时 toast 提示；`onError` 全局兜底未捕获错误（含 DB 损坏），DB 损坏时提示"数据库损坏，请用备份恢复" |
| `src/env.d.ts` | Vite 客户端类型（`/// <reference types="vite/client" />`）|
| `src/manifest.json` | uni-app App 元数据：`name=盒记` / `appid=__UNI__040649E` / `versionName=3.0.2` / `versionCode=302` / Android `minSdkVersion=21` `targetSdkVersion=30`；发布包名以 HBuilderX 生成配置为准 |
| `src/pages.json` | uni-app 路由 + 全局样式 + `tabBar`（4 个 Tab：今日 / 订单 / 统计 / 我的） |
| `src/uni.scss` | uni-app 全局 SCSS 变量，并定义盒记 `$hej-*` 语义 token（画布 / 表面 / 文字 / 状态 / 间距 / 圆角 / 阴影 / 字级）供订单和统计页使用；既有 `$uni-color-*` 主状态色保留原值，避免影响今日页基线样式。 |
| `src/shime-uni.d.ts` | 扩展 Vue `ComponentCustomOptions` 加上 uni-app 的 App/Page 实例类型（**注：文件名是模板的拼写，保留不修**） |
| `src/static/` | 静态资源（`logo.png`、`app-icon-1024.png` 与 `tabbar/` 下的原生 TabBar PNG）|
| `src/uni_modules/` | 随项目维护的 uni-ui easycom 组件源码目录；业务表单统一使用其中的表单组件，盒记允许直接维护可见主题与图标边界；`uni-easyinput`、`uni-data-checkbox`、`uni-data-select`、`uni-datetime-picker`、`uni-number-box` 与 `uni-collapse-item` 含本地补丁，选型入口见 `docs/uni-modules-ai-index.md`。 |

### pages/ — 页面（uni-app 自动路由；Phase 7 已实现）

所有通过 `navigateTo` 打开下级页面的可滚动父页面统一使用页面实例级返回快照：页面栈内返回时保留筛选 / 草稿 / 折叠并恢复像素滚动，不记录业务数据条目；内部 `scroll-view` 与原生页面滚动分别适配。架构取舍见 `docs/adr/0001-in-memory-page-return-snapshots.md`，实现以 `src/composables/usePageReturnSnapshot.ts` 为准。

| 文件 | 作用 |
|---|---|
| `src/pages/index/index.vue` | Tab 1「今日」Dashboard：使用暖纸张画布、自定义安全区标题、社群菜单快捷入口、2×2 收支指标、三态摘要和真实今日订单列表；onShow 仍刷新 stats / order / customer store，不改变配送流程。 |
| `src/pages/order/index.vue` | Tab 2「订单」列表：采用暖纸张画布（`$hej-color-canvas`）、自定义状态栏、顶部日期选择与陶土色「+ 新建订单」操作区；按日期筛选并用 `uni-collapse` 分成午餐 / 晚餐折叠卡片（`$hej-color-surface` 暖白表面、`$hej-color-border` 浅边框与阴影）；折叠标题展示左侧箭头、餐次与有效单数份数（`X单 · Y份`）；列表项展示 Lucide `GripVertical` 拖拽把手、加粗客户名、3 态标签（待配送板岩蓝/灰、已配送橄榄绿、已取消暖棕），副标题完整组合餐次、份数、支付方式、单价/金额与备注并自然换行；空态、加载与错误反馈使用标准卡片承载；拖拽保持动态 `:scroll-y` 开关 + 10px 阈值 + 64px 边缘自动滚屏 + `sort_order` 持久化，返回现场继续由 `usePageReturnSnapshot` 像素级恢复。 |
| `src/pages/order/new.vue` | `<uni-forms>` 新建订单表单：高频录单把日期、餐次直接放在连续录单卡的白色表面内，各占一条普通表单行，不再使用独立“配送安排”色块；全部字段共享 100px 标签列，标签与右侧控件垂直居中，控件从同一左边界开始。每次打开均以 `tomorrow()` 初始化配送日期，不接收订单列表筛选日期，用户仍可手动修改。份数表示“本次增量”，客户仍走现有搜索 / 拼音选择；客户上下文提示的重新检查 / 查看订单按钮保留固定触摸高度、最小宽度与水平留白。微信 / 现金 / 次卡为一级选择，份数大于 1 才出现组合支付入口；用户主动进入组合支付时，次卡次数预填 1 次并可用步进器在合法范围调整，补款与金额自动计算，展开面板与主表单使用同一白色表面，“改为纯支付”按钮保持完整触摸宽度与横向留白。实际单价直接显示输入框，选定客户后带入默认 / 已有订单单价；备注保持一行常显。次卡正常时紧凑提示，有预占或不足才展开明细。后台查询同键有效订单，pending 紧凑提示合并、delivered 阻断，改单价仍二次确认。固定确认区展示金额 / 支付摘要和当前缺失项；保存后由原生二次弹窗选择“继续下一单”（清空客户、份数、单价、备注，保留日期 / 餐次 / 支付）或“结束录单”（返回对应日期列表）。订单、金额、预占和 SQLite 写入规则不变。 |
| `src/pages/order/detail.vue` | 订单详情与 `<uni-forms>` 编辑：只读态分别展示总份数、支付摘要、次卡次数、货币份数、实际单价与实际金额；编辑态同步新建页的连续白色表面、100px 标签列和单行字段顺序，日期、餐次、客户、总份数、支付、实际单价与备注之间用统一分隔线组织，标签与控件垂直居中，提示与辅助按钮沿用同一控件起点和触摸尺寸。详情页保留微信 / 现金 / 次卡 / 组合支付四种既有选项，窄屏下使用两列布局避免文字拥挤；本次实际金额、取消编辑与保存修改固定在底部。份数表示整单总量，支持组合支付、预占校验以及改变客户 / 日期 / 餐次后的目标订单合并确认。配送余额不足时整笔回滚并提示“去编辑支付”，不再自动整单改微信 / 现金；配送成功只更新当前详情状态不返回上一页，已配送次卡订单可按默认月卡模板复制最新月卡信息，复制文案使用配送后 active 次卡实际剩余次数而不扣待配送预占；保留复制、整单配送 / 取消 / 删除能力。 |
| `src/pages/stats/index.vue` | Tab 3「统计」：今日/本周/本月/自定义区间切换，自定义日期用 `uni-datetime-picker`；展示入账收入、支出、利润、有效订单和平均每单收入。日趋势改为“收支 / 利润趋势”，按日期同时呈现入账、支出和正 / 负利润的 CSS 进度条；统计 API 公式不变。 |
| `src/pages/me/index.vue` | Tab 4「我的」入口：采用暖纸张画布（`$hej-color-canvas`）、原生状态栏安全区、Hero 衬线标题、单张象牙白卡片表面（`$hej-color-surface`）与 6 个克制线性图标条目（菜单管理、文案模板、月卡文案模板、客户管理、支出管理、备份恢复）；接入 `usePageReturnSnapshot` 保留返回现场；无头像、无个人账户、无银行卡、无云同步等未存在产品能力。 |
| `src/pages/me/customers/list.vue` | 客户列表：`onShow` 并行刷新 customer store 与当前有剩余次数的 active 次卡客户 ID，头像区按身份显示“次 / 普”；前端用 `uni-easyinput` 按姓名/微信/手机号/姓名拼音/拼音首字母搜索；按 `src/utils/pinyin.ts` 生成拼音首字母分组、右侧索引和滚动定位；展示折扣角标，支持新建和详情跳转。 |
| `src/pages/me/customers/new.vue` | 客户新建/编辑共用页：用 uni-ui 表单组件维护姓名、手机、微信、午餐/晚餐默认价、折扣率、备注；默认价未触碰时保存为 null；保存时捕获客户姓名重复错误并提示不可重复。 |
| `src/pages/me/customers/detail.vue` | 客户详情：展示基础信息、active 次卡汇总进度、历史订单；支持编辑、删除、开次卡和进入充值记录。删除走 `customerStore.remove()`，客户存在订单或次卡依赖时保持数据并提示不可删除。次卡区通过 `listCards(customerId)` 汇总所有 active 卡的剩余 / 总次数，避免新开卡后只显示最新一张而像是覆盖旧卡。历史订单通过 `listOrders({ customerId })` 查询。 |
| `src/pages/me/customers/card-records.vue` | 客户次卡充值记录列表：按时间倒序展示所有 `meal_cards` 的充值日期、金额、总/已用/剩余次数和状态；点击记录进入总次数修改。每条记录底部独立展示删除操作，已扣次时禁用；删除前展示收入 / 次数影响，执行期间用页面级锁防止编辑或重复删除。 |
| `src/pages/me/customers/open-card.vue` | 次卡开卡/充值记录修改共用页：用 `<uni-forms>` + `<uni-forms-item>` 统一承载校验；开卡模式默认 20 次且金额允许为 0，已有 active 次卡时先汇总确认；带 `cardId` 时只允许修改该记录总次数，下限为已用次数。 |
| `src/pages/me/expenses/list.vue` | 支出列表：暖纸张视觉重构，顶部日期选择器与「+ 新建支出」操作区、3 列汇总指标卡（今日支出/支出笔数/退差金额）、圆形分类图标徽标、实际净支出金额、无备注/退差明细展示与时间戳；点击进入支出详情，长按支持 ActionSheet 快捷删除；接入 `usePageReturnSnapshot` 保持现场。 |
| `src/pages/me/expenses/new.vue` | 新建支出页：暖纸张连续象牙白卡片表面，使用 `<uni-forms>` + `<uni-forms-item>` 承载日期、分类、支出金额、退差金额、备注；统一 100px 标签列，输入控件前置 ¥ 前缀；实时净支出计算框（`amount - refund_amount`）与公式明细；底部固定小结与陶土色「保存支出」栏；金额 > 0、分类已选、退差金额不超过支出金额才可保存。 |
| `src/pages/me/expenses/detail.vue` | 支出详情：暖纸张视觉重构，顶部 Hero 净支出卡片（金额 + 分类/日期），象牙白连续表单卡（100px 统一标签列）、实时净支出计算行、陶土色「保存修改」主按钮；独立浅红危险删除区（带永久删除提示与确认弹窗）；保存或删除后同步刷新支出与今日统计。 |
| `src/pages/me/menus/list.vue` | 每日菜单列表：当前 / 未来与历史分栏，按日期排序；每条支持默认模板复制、编辑和硬删除，并可进入模板管理。 |
| `src/pages/me/menus/edit.vue` | 每日菜单新增 / 编辑表单：默认当天，午晚餐至少一项且支持多行；日期冲突进入已有记录，支持保存并新增下一天、复制已保存内容和硬删除。 |
| `src/pages/me/menu-templates/list.vue` | 文案模板列表：显示唯一默认模板，支持新建、编辑、设为默认、历史和硬删除；删除默认模板时要求选择接替项。 |
| `src/pages/me/menu-templates/edit.vue` | 模板新增 / 编辑表单：插入日期 / 餐次区块，实时校验语法并以示例菜品渲染社群文案预览；实际修改由 API 留存编辑前快照。 |
| `src/pages/me/menu-templates/history.vue` | 模板版本历史：按时间倒序展示完整名称 / 正文，可确认恢复；恢复前先快照当前内容，默认状态不回滚。 |
| `src/pages/me/meal-card-templates/list.vue` | 月卡文案模板列表：独立维护月卡模板的默认状态、新建、编辑、历史和硬删除；套餐描述直接写在可编辑正文中，仅允许两个次数占位符。 |
| `src/pages/me/meal-card-templates/edit.vue` | 月卡模板新增 / 编辑表单：插入两个次数占位符，实时校验并用配送示例预览复制结果；实际修改由 API 留存编辑前快照。 |
| `src/pages/me/meal-card-templates/history.vue` | 月卡模板版本历史：按时间倒序展示完整名称 / 正文，可确认恢复；恢复前先快照当前内容，默认状态不回滚。 |
| `src/pages/me/settings/backup.vue` | 备份恢复页：以暖纸张“备份 → 恢复 → 危险清空”风险阶梯展示真实操作状态；导出 JSON 到 `_doc/backup_YYYYMMDD_HHmmss.json` 并复制到 `_downloads/`；粘贴、已保存备份和本地文件三入口都只载入待导入区，点击“导入覆盖”并确认后才替换数据；危险区三次确认后清空业务数据，并恢复内置两类文案模板与 5 个默认支出分类。 |

### components/ — 跨页组件

| 文件 | 作用 |
|---|---|
| `src/components/.gitkeep` | 占位文件，让空目录被 git 跟踪 |
| `src/components/StatCard.vue` | 通用数字卡片；props 为 `label` / `value` / `color?: 'normal' \| 'positive' \| 'negative'` / `hint?`；上方展示 label，下方展示大号 value，可选 hint；利润 label 在未显式传 color 时按数值正负自动映射绿色/红色。 |
| `src/components/AmountInput.vue` | 金额输入组件；props 为 `modelValue: number` / `label` / `placeholder?`；事件 `update:modelValue`；内部用 `uni-easyinput` 保留字符串输入态，使用 `parseMoney()` 将输入解析为 number 回传，模板提供 `¥` 前缀。 |
| `src/components/CustomerPicker.vue` | 客户选择组件；props 为 `modelValue: Customer \| null` / `showCreate?`；事件 `update:modelValue` / `create`；字段标签由外层 `<uni-forms-item>` 负责，组件只展示已选客户或占位和选择入口；点击输入区打开底部选择弹层，内部用 `uni-easyinput` 支持按姓名、微信、手机号前端搜索；列表复用 `src/utils/pinyin.ts` 按姓名拼音排序和首字母分组，右侧 `index-bar` 可跳转到对应分组，并展示客户名和折扣角标。 |
| `src/components/HejiIcon.vue` | Lucide 图标统一入口；props 为 `name`（Lucide 原始导出名）、`size?`、`strokeWidth?`、`label?` 与 `decorative?`；从 `icon-registry.ts` 的 Lucide 原始节点生成 app-plus 安全的 CSS mask，负责静态图形、fallback 和可访问性属性，不承接业务动作；图标依赖固定为 `@lucide/vue@1.37.0`。 |
| `src/components/InfoBanner.vue` | 通用说明提示条；接收 `icon?` / `text?` 并支持默认插槽，使用暖纸张警示语义和 `HejiIcon`，只承接展示，不写业务状态。 |
| `src/components/icon-registry.ts` | 静态登记业务实际使用的 Lucide 原始图形节点，供 `HejiIcon` 生成 app-plus 安全的 CSS mask；不承载业务图标别名。 |

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
| `src/db/schema.ts` | 11 张表 DDL 字符串 + `CURRENT_SCHEMA_VERSION=8`。v6 新增每日菜单 / 菜单模板 / 版本表，v7 新增独立月卡模板 / 版本表及各自名称 / 单默认约束，v8 归一化系统支出分类的 Lucide 图标值；既有订单、次卡和支出表结构不变。 |
| `src/db/migrations.ts` | 迁移引擎与 v2-v8 追加迁移。v6 / v7 追加模板表并插入一次内置默认模板，v8 将五个系统支出分类的历史 emoji 转为 Lucide 原始名称；用户后续删除全部模板不会在启动时被重新生成。既有 v5 数据修复保持不变。 |
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
| `src/utils/backup.ts` | JSON 全量备份恢复；v6 / v7 导入导出菜单、月卡模板与两类版本历史，v1-v7 旧备份升级时补对应内置模板并归一化已知分类 emoji；导入在同一事务中写入并于提交前执行 `PRAGMA integrity_check(1)` / `foreign_key_check`，失败整笔回滚；v6 / v7 的空模板状态原样恢复，危险清空显式恢复内置模板。 |
| `src/utils/meal-card-template.ts` | 月卡模板内置正文、两个次数占位符校验、示例 / 实际复制文案渲染和空行规范化。 |
| `src/utils/pinyin.ts` | 客户姓名拼音工具：基于纯 JS `pinyin-pro`，使用姓氏优先模式把中文姓名转为无声调拼音 key、拼音首字母串和 A-Z / `#` 分组字母，并提供客户姓名排序函数；用于 Android App 端客户列表分组、索引和拼音搜索。 |
| `src/utils/page-return.ts` | 页面返回现场的纯滚动规则：记录离开前像素；返回后有内容时恢复该像素，内容为空时回到顶部，不记录业务数据身份。 |
| `src/utils/icon.ts` | 图标值兼容解析：识别直接使用的 Lucide 原始名称，并将旧备份 / 外部输入中的已知 expense category emoji 归一化为对应名称；未知值保留给数据层处理，界面渲染回退，不定义业务语义图标 key。 |

### types/ — TS 类型

| 文件 | 作用 |
|---|---|
| `src/types/domain.ts` | 与 schema snake_case 字段严格对齐的领域类型；含 `DailyMenu`、`MessageTemplate`、`TemplateVersion`、`MealCardMessageTemplate` 和 `MealCardTemplateVersion`。 |
| `src/types/api.ts` | API 入参 / 出参契约；含每日菜单、菜单文案和月卡文案模板保存输入。 |

---

## 关键架构决策

| 决策 | 位置 | 影响范围 |
|---|---|---|
| 11 张表结构（当前 schema v8） | `memory-bank/design-document.md §2.1` | 所有 db / api / store |
| 次卡扣次 = 配送完成（A1），按客户余额池旧卡优先扣次 | `memory-bank/design-document.md §3.2 §4.3` | orders API、UI 流程 |
| 客户默认价 + 折扣率（A6） | `memory-bank/design-document.md §2.1 §4.1` | customers API、订单录入 UI |
| 1 订单 = 1 餐 + 多份（D1） | `memory-bank/design-document.md §2.1` | orders schema |
| 不收配送费（D4） | `memory-bank/design-document.md §2.1` | 不存在 delivery_fee 字段 |
| 次卡按"次"无有效期 | `memory-bank/design-document.md §2.1 §3.2` | meal_cards 无 end_date / expired 状态 |
| SQLite 是唯一数据源 | `src/db/index.ts` / `src/stores/` | Pinia 只缓存当前视图，不做持久化 |
| 多表写入必走 tx() | `memory-bank/design-document.md §4` | db/index.ts 提供 tx() 工具 |
| 删除 = 硬删除 + 回滚已产生副作用 | `memory-bank/design-document.md §4.6` | orders / expenses / customers API 与详情页删除入口 |
| PRAGMA foreign_keys = ON | db/index.ts init() | 维护 customer_id / meal_card_id / category_id 外键完整性 |
| `user_version` 驱动迁移 | db/migrations.ts | 首次建表=v1，当前=v8；未来加字段 / 表或数据修正迁移在 MIGRATIONS 末尾追加 |
| 菜单复制只读当前默认模板 | `memory-bank/design-document.md §2.2` / `src/utils/menu-template.ts` | 菜单、模板、剪贴板与版本历史 |
| 月卡复制只读独立的当前默认模板；文案余额使用配送后实际剩余，不扣待配送预占 | `docs/adr/0002-meal-card-message-templates-are-independent.md` / `src/pages/order/detail.vue` | 订单详情、月卡模板维护、月卡版本历史与备份 |
| 客户姓名应用层判重 | `src/api/customers.ts` / `src/pages/me/customers/new.vue` | 重复姓名不可新增；编辑时允许保持原姓名 |
| 表单控件统一使用 uni-ui | `src/uni_modules` + 各表单页 | 业务页面不直接使用原生 `input` / `textarea` / `picker` / `radio-group` / `slider`，改用 easycom 的 uni-ui 表单组件 |

## 数据库快照

仓库不保留二进制 DB 基线。数据库结构、迁移、种子数据和完整性检查以 `src/db/` 为准；Android 实际运行和回归证据只记录在 `memory-bank/CHANGELOG.md`。

---

## 依赖与命令事实源

依赖版本、脚本和构建目标以 `package.json`、`pnpm-lock.yaml`、`src/manifest.json` 与实际 CLI 输出为准。本文件不复制会随安装或配置变化的版本表和命令表；常用运行与验证方式见 `README.md`。

`src/uni_modules` 通过 easycom 随项目维护，不通过 npm 安装 `@dcloudio/uni-ui`；本地组件的 API 和补丁边界见 `docs/uni-modules-ai-index.md`。

---

## 记录边界

功能变更、验证、未验证项、阻塞和后续候选只记录在 `memory-bank/CHANGELOG.md`。本文件仅在文件职责、架构边界或当前代码目录发生变化时更新；依赖和脚本不在这里复制。
