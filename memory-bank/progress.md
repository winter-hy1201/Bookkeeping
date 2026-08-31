# 盒记 — 实施进度

> v1.0 已发布（2026-06-11）。9 阶段 **61/63** 步完成，2 步按用户决策跳过（9.3 真机性能 / 9.4 Release APK 打包），用 HBuilderX 标准基座 debug APK 侧载替代。
> 下一步：一并完成 v1.12–v1.21 真机回归（组合支付、预占、v4 → v8、备份往返、订单 UI、菜单 / 月卡模板 / 剪贴板，以及像素返回现场与午餐折叠状态）。
> 完整步骤与里程碑详见 `memory-bank/implementation-plan.md`（已通过 9 阶段实施基线）。

---

## 当前增量（暖纸张主题细化与 Lucide 图标统一，2026-08-31）

| Step | 内容 | 状态 |
|---|---|---|
| UI.1 | 新增 `$hej-color-control` / disabled / strong-border 语义 token，并通过 `App.vue` CSS 变量桥接到 `uni-easyinput`、`uni-data-checkbox`、`uni-data-select`、`uni-datetime-picker`、`uni-number-box`、`uni-collapse-item`；输入内容区、选择弹层、日期面板与数字步进器不再使用刺眼纯白默认底色。 | ✅ PASS（源码与 H5 编译） |
| UI.2 | 引入固定版本 `@lucide/vue@1.38.0`，新增 `HejiIcon` 与静态图形注册表；业务页面和本轮可见的本地 uni-ui 组件统一使用 Lucide 原始导出名（如 `CalendarDays`、`Plus`、`CircleCheck`），允许直接维护 `src/uni_modules`；app-plus 使用 CSS mask 输出同一份 Lucide 图形节点。 | ✅ 2026-08-31 |
| UI.3 | 支出分类数据库与 `src/db/seed.ts` 统一保存 Lucide 原始名称：`菜品/工具/耗材/配送/其他` 对应 `Utensils/Wrench/Package/Bike/Wallet`；schema v8 会把已有库中的五个系统分类 emoji 迁移为这些名称，旧备份导入也会归一化；内容模板中的 emoji 继续保留。 | ✅ 2026-08-31 |
| UI.4 | `node_modules/.bin/eslint --ext .ts,.vue src/`、`node_modules/.bin/vue-tsc --noEmit`、`node_modules/.bin/uni build`、`git diff --check` 均通过；H5 只有既有 Sass 弃用警告。业务表单的 `label-width` 与关联标签列缩进已统一为 `100px`，相关定向契约测试 33/33 通过；全量 `node --test tests/*.test.cjs` 实际 115/116，唯一失败为既有订单列表契约与当前模板结构漂移。新增 `tests/icon-rendering-contract.test.cjs` 已通过。 | 🔄 BLOCKED（既有订单列表契约漂移） |
| UI.5 | HBuilderX Android app-plus 图标绘制回归：内联 SVG 在 `emulator-5554` 上复现为不绘制，改为 CSS mask 后日期、按钮和支出分类图标均实际显示；物理真机视觉、触摸回归仍待执行。 | ✅ PASS（Android 模拟器）；物理真机 NOT_RUN |

## 当前增量（Issue #15：[UI 重构 14/14] 23 页集成验收与文档收口）

| Step | 内容 | 状态 |
|---|---|---|
| 15.1 | 23 个现有路由在 HBuilderX Android 模拟器（`emulator-5554` / Xiaomi 23046PNC9C，1440×2560 @ 480dpi，逻辑视口宽 480dp）逐一实际进入并截图对照参考图：结构、层级、密度、色彩、导航与主动作全部按参考图核对；设备画面按比例归一化后对照 375×812，纵横比差异（0.5625 vs 0.4618）不改变单列流式布局结构，与 #3–#14 既有验收基线一致。 | ✅ 2026-08-31；截图存证于仓库外 `/tmp/heji-issue15-screens/` |
| 15.2 | 真实数据链路：客户 UI15Test（含默认价）经表单落库、¥478 次卡开卡、今日组合支付订单（次卡 1 次 + 微信 ¥15.00）与现金订单、¥120 退差 ¥20 支出全部来自 SQLite 并在各页正确展示；今日页收入 ¥508 / 支出 ¥100 / 利润 ¥408、统计页同口径、有效订单 2单·3份、平均每单 ¥254 均与业务不变量一致；参考 PNG 未作为运行时资产（`src/static/` 仅 logo 与 app icon）。 | ✅ PASS（HBuilderX Android 模拟器） |
| 15.3 | 业务回归：订单拖拽重排持久化（含备份恢复后仍保持）、午餐展开/折叠与返回现场像素恢复、组合支付展开与摘要、次卡 pending 预占提示、配送扣次 20→19、已配送订单复制月卡信息 toast、模板改名生成历史版本并恢复（名称与默认状态正确回滚）、根 Tab 四栏与子页原生返回、系统返回键与手势返回（临时切手势导航验证后已还原设置）。 | ✅ PASS（HBuilderX Android 模拟器） |
| 15.4 | 备份破坏性闭环：导出 `backup_20260831_123715.json`（5202 字节，adb 核对存在且 schema v7）→ 危险清空连续三次确认执行 → 结果状态「已清空业务数据，并恢复内置模板与 5 个默认支出分类」→ 从已保存备份载入待导入区（4530 字符、明确未覆盖状态）→ 导入覆盖确认 → 重启 App 后今日/订单/客户/统计各页数据与清空前完全一致（含拖拽排序与模板版本历史）。仅针对模拟器执行。 | ✅ PASS（HBuilderX Android 模拟器）；补齐 14.3 待确认的破坏性闭环 |
| 15.5 | CLI 全量：`node --test tests/*.test.cjs` 113/113、`vue-tsc --noEmit`、`eslint`、`uni build`（H5）、`git diff --check` 全部通过；本次集成验收零代码变更，最终 diff 仅含权威文档同步。 | ✅ PASS（CLI） |
| 15.6 | 已知环境限制：模拟器截图为 1440×2560（非 375×812 物理尺寸，按比例归一化对照）；MuMu 搜狗 IME 经 adb 自动化不渲染软键盘（输入落点与字段可见性已验证，键盘遮挡形态以 #4 等既往真机/模拟器验收为准）；Android 12 剪贴板系统服务限制导致 adb 无法直读复制内容（以页面 toast 为准）；人为错误态注入未在设备上触发（加载/失败态由页面代码与契约测试覆盖）。 | 🔄 记录在案；物理真机回归待执行 |

轻微观察（既有基线行为，未改动）：客户档案表单价格为空时占位符与下方帮助文案同文案并存（填写后即与参考一致）；新建支出底部小结「1项支出」为静态说明（本次创建一笔）。

## 历史增量（Issue #14：[UI 重构 13/14] 备份恢复与危险清空）

| Step | 内容 | 状态 |
|---|---|---|
| 14.1 | `src/pages/me/settings/backup.vue` 暖纸张风险阶梯重构：保留真实 SQLite 全量导出；粘贴、已保存备份、本地文件三入口统一只载入待导入区；补齐操作中、无文件、读取 / 导入失败、成功结果与下一步；危险清空保持三次确认、精确范围和默认数据恢复说明。`src/utils/backup.ts` 在导入事务提交前增加 SQLite 完整性与外键检查，失败整笔回滚；未改 schema、迁移、备份格式或业务口径。 | ✅ 2026-08-31 |
| 14.2 | 备份页契约测试（`tests/backup-page-contract.test.cjs`）、113/113 Node 测试、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 113/113 PASS；CLI 门禁通过，H5 仅有既有 Sass 弃用警告 |
| 14.3 | HBuilderX Android 模拟器（`emulator-5554` / Xiaomi 23046PNC9C）：当前工作区编译安装、SQLite 初始化、真实导出与文件存在检查、已保存备份只暂存、Android 本地文件选择器、导入覆盖确认、滚动可达和危险区视觉已验证；实际覆盖恢复与三次清空已在 Issue #15 验收中补齐（导出 → 三次确认清空 → 导入恢复 → 重启核对，见 15.4）。 | ✅ 2026-08-31 全部完成 |

## 当前增量（Issue #13：[UI 重构 12/14] 月卡文案模板与配送后复制）

| Step | 内容 | 状态 |
|---|---|---|
| 13.1 | 月卡文案模板列表（`src/pages/me/meal-card-templates/list.vue`）、新建/编辑模板（`src/pages/me/meal-card-templates/edit.vue`）与历史版本（`src/pages/me/meal-card-templates/history.vue`）暖纸张视觉重构：列表页落地顶部“月卡文案模板”标题、副标题与“+ 新建模板”陶土色主动作、Warm Sand 次数替换提示横幅、占位符语法提示栏、真实模板卡片（含默认标签、更新时间、等宽正文预览、底部 4 按钮操作行支持“设为默认”、“编辑”、“历史”、“删除”），以及删除默认模板时要求选择接替模板与硬删除二次确认；编辑页采用 `<uni-forms>` + 80px 统一标签列与字数统计（名称 0/20、正文 0/1000）、快捷插入胶囊 Chip 按钮（`本次使用份数 ＋`、`当前可用份数 ＋`、`内置正文 ＋`）、“月卡文案预览”纸条（3px 陶土色左边线、右上角“示例：本次1份 · 当前14份”标签）、实时语法校验与浅红告警卡片阻断、以及底部固定操作栏；历史版本页展示按时间倒序版本卡片列表、📄 图标、名称、历史版本徽标、时间戳、等宽正文、右下角“↻ 恢复此版本”、底部说明统计与快照当前版本确认弹窗；接入 `usePageReturnSnapshot` 保持现场；`order/detail.vue` 保持从默认模板读取并拼接真实可用余额。 | ✅ 2026-08-31 |
| 13.2 | 月卡文案模板页面契约测试（`tests/meal-card-template-pages-contract.test.cjs`）、107/107 Node 测试全量、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 107/107 PASS；全部 CLI 检查通过 |
| 13.3 | HBuilderX Android 模拟器（`emulator-5554`）：默认「月卡信息」列表查看、新建「UI验收-温馨月卡」插入内置正文与示例次数预览、格式语法校验（未知占位符浅红卡片错误阻断与正确提示）、保存新模板、设为默认模板（默认徽章切换）、编辑模板修改正文并保存触发生成历史版本快照、进入「历史」列表查看旧版本快照与时间戳、恢复历史版本（快照当前内容并恢复为原正文且保留默认状态）、删除默认模板弹出 ActionSheet 选择接替模板并完成二次确认硬删除全链路闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #12：[UI 重构 11/14] 社群文案模板与版本历史）

| Step | 内容 | 状态 |
|---|---|---|
| 12.1 | 文案模板列表（`src/pages/me/menu-templates/list.vue`）、新建/编辑模板（`src/pages/me/menu-templates/edit.vue`）与历史版本（`src/pages/me/menu-templates/history.vue`）暖纸张视觉重构：列表页落地顶部“文案模板”标题、副标题与“+ 新建模板”陶土色主动作、Warm Sand 占位符语法说明横幅、模板卡片（含默认标签、更新时间、等宽正文预览、底部 4 按钮操作行支持“设为默认”、“编辑”、“历史”、“删除”），以及删除默认模板时要求选择接替模板与硬删除二次确认；编辑页采用 `<uni-forms>` + 80px 统一标签列与字数统计（名称 0/20、正文 0/1000）、快捷插入胶囊 Chip 按钮（`日期 ＋`、`午餐区块 ＋`、`晚餐区块 ＋`、`内置正文 ＋`）、“社群文案预览”纸条（3px 陶土色左边线、右上角“使用示例菜品”标签）、实时语法校验与浅红告警卡片阻断、以及底部固定操作栏；历史版本页展示按时间倒序版本卡片列表、📄 图标、名称、历史版本徽标、时间戳、等宽正文、右下角“↻ 恢复此版本”、底部总结统计卡与快照当前版本确认弹窗；接入 `usePageReturnSnapshot` 保持现场。 | ✅ 2026-08-31 |
| 12.2 | 文案模板页面契约测试（`tests/menu-template-pages-contract.test.cjs`）、100/100 Node 测试全量、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 100/100 PASS；全部 CLI 检查通过 |
| 12.3 | HBuilderX Android 模拟器（`emulator-5554`）：默认「日常午晚餐」列表查看、新建「UI验收-特选套餐」插入内置正文与示例菜品预览、格式语法校验（错误阻断与正确提示）、保存新模板、设为默认模板（默认徽章切换）、编辑模板修改名称为「UI验收-特选改版」并保存触发生成历史版本快照、进入「历史版本」列表查看旧版本快照与时间戳、恢复历史版本（快照当前内容并恢复为原名称正文且保留默认状态）、删除默认模板弹出 ActionSheet 选择接替模板并完成二次确认硬删除与清理全链路闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #11：[UI 重构 10/14] 每日菜单维护闭环）

| Step | 内容 | 状态 |
|---|---|---|
| 11.1 | 每日菜单列表（`src/pages/me/menus/list.vue`）与每日菜单编辑（`src/pages/me/menus/edit.vue`）暖纸张视觉重构：列表页落地顶部“每日菜单”标题、副标题与“+ 新建菜单”陶土色主动作、“当前/历史”分段选项卡、“文案模板”快捷入口卡、每日菜单卡（☀️ 午餐 / 🌙 晚餐徽章及多行菜品展示，底部 3 按钮操作区支持“📋 复制文案”、“✏️ 编辑”、“🗑️ 删除”），以及加载骨架与暖纸张空态；编辑页落地顶部说明卡（含编辑态快捷复制文案按钮）、80px 统一标签列与单行日期及多行菜品文本框、居中浅红危险删除入口（含确认弹窗）、以及底部固定确认栏（左侧图标/状态/日期，右侧“保存并继续下一天”与“保存菜单/保存修改”）；接入 `usePageReturnSnapshot` 保持现场。 | ✅ 2026-08-31 |
| 11.2 | 每日菜单页面契约测试（`tests/menu-pages-contract.test.cjs`）、94/94 Node 测试全量、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 94/94 PASS；全部 CLI 检查通过 |
| 11.3 | HBuilderX Android 模拟器（`emulator-5554`）：空态展示、新建菜单、午晚餐多行输入、“保存并继续下一天”自动递增日期清空输入、“保存菜单”成功返回、双菜单卡片展示、“📋 复制文案”剪贴板复制、进入“✏️ 编辑”载入既有记录、删除二次确认与硬删除、以及“当前/历史”切换与子页面返回快照恢复闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #10：[UI 重构 09/14] 支出记录闭环）

| Step | 内容 | 状态 |
|---|---|---|
| 10.1 | 支出管理列表（`src/pages/me/expenses/list.vue`）、新建支出（`src/pages/me/expenses/new.vue`）与支出详情（`src/pages/me/expenses/detail.vue`）暖纸张视觉重构：列表页顶部日期筛选与操作条、3 列核心指标卡（今日支出/支出笔数/退差金额）、圆形分类图标徽标、无备注/退差明细展示、长按删除及返回现场快照；新建页采用 `<uni-forms>` + 80px 统一标签列、实时净支出计算框、底部固定小结与陶土色保存栏、退差不能大于支出金额的严格实时校验与按钮禁用；详情页展示 Hero 净支出卡片、连续表单、保存修改按钮以及独立浅红危险删除区（带永久删除提示与确认弹窗）。 | ✅ 2026-08-31 |
| 10.2 | 支出管理契约测试（`tests/expense-pages-contract.test.cjs`）、89/89 Node 测试全量、类型检查、ESLint、git diff 检查 | ✅ 89/89 PASS；全部 CLI 检查通过 |
| 10.3 | HBuilderX Android 模拟器（`emulator-5554`）：空列表查看、新建支出输入分类/金额/退差/备注并实时计算净支出（金额 ¥100 - 退差 ¥13.50 = ¥86.50）、退差超额校验提示（退差 > 金额时禁用保存）、保存后实时同步今日统计与列表指标、进入详情页修改金额为 ¥120 并保存生效、危险区域永久删除支出确认弹窗、长按列表项底部 ActionSheet 删除全链路真实数据闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #9：[UI 重构 08/14] 次卡开卡校正与充值记录）

| Step | 内容 | 状态 |
|---|---|---|
| 9.1 | 次卡开卡与修改总次数（`src/pages/me/customers/open-card.vue`）及充值记录（`src/pages/me/customers/card-records.vue`）暖纸张视觉重构：开卡页从真实客户和 active 次卡读取名称/余额池/卡数，采用顶部标签面板对齐设计规范；金额面板集成 ¥ 前缀无缝数值输入与当前次卡池提醒；修改充值记录模式支持调整总次数、实时展示金额/日期/已用次数/状态/修改后剩余；充值记录页展示 3 列核心指标（总次数/已用/剩余）、日期与记录编号、状态标签；已扣次记录删除按钮禁用（`已有扣次，不能删除`），未扣次记录删除前弹窗提示收入和余额扣减影响；接入 `usePageReturnSnapshot` 保持现场。 | ✅ 2026-08-31 |
| 9.2 | 次卡页面契约测试（`tests/meal-card-pages-contract.test.cjs`）、82/82 Node 测试、类型检查、ESLint、git diff 检查 | ✅ 82/82 PASS；全部 CLI 检查通过 |
| 9.3 | HBuilderX Android 模拟器（`emulator-5554`）：真实客户开卡 21 次 ¥300 实时计入今日收入、充值记录查看、修改总次数至 25 次落库、次卡下单并标记已配送触发扣次（已用 1 / 剩余 24）、删除按钮置灰禁用保护、删除已配送订单精准回滚已用次数至 0、弹窗确认删除充值记录并同步扣减客户余额和今日收入全链路闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #7：[UI 重构 06/14] 我的业务入口页）

| Step | 内容 | 状态 |
|---|---|---|
| 7.1 | 「我的」业务入口页（`src/pages/me/index.vue`）暖纸张视觉重构：`src/pages.json` 配置 `navigationStyle: "custom"`，自动适配原生 Android 状态栏安全区（`statusBarHeight`）；Hero 头部衬线大字标「我的」与副标题「菜单、客户、支出和数据备份」；单张象牙白卡片表面（`$hej-color-surface`、`$hej-radius-panel`、`$hej-shadow-panel`、`$hej-color-border`）；6 个业务入口（菜单管理、文案模板、月卡文案模板、客户管理、支出管理、备份 / 恢复）采用克制线性图标（`bars`、`compose`、`vip`、`staff`、`wallet`、`loop`）与 `$hej-color-surface-subtle` 圆角方块容器，右侧浅色箭头；接入 `usePageReturnSnapshot({ mode: 'scroll-view' })` 返回现场保持；严格遵循反幻觉约束（无用户头像、无个人账户、无银行卡、无云同步等未存在能力）。 | ✅ 2026-08-31 |
| 7.2 | 「我的」页面契约测试（`tests/me-page-contract.test.cjs`）、Node 测试全量、类型检查、ESLint、git diff 检查 | ✅ 71/71 PASS；全部 CLI 检查通过 |
| 7.3 | HBuilderX Android 模拟器（`emulator-5554`）：375×812 标准设计基线像素级对齐验证；6 个业务入口逐一真实点击跳转（每日菜单、文案模板、月卡文案模板、客户管理、支出管理、备份恢复）并返回「我的」现场，全链路闭环验收通过 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #8：[UI 重构 07/14] 客户管理与客户档案闭环）

| Step | 内容 | 状态 |
|---|---|---|
| 8.1 | 客户管理（`pages/me/customers/list.vue`）、新建客户档案（`pages/me/customers/new.vue`）与客户详情（`pages/me/customers/detail.vue`）暖纸张视觉重构：按真实拼音首字母分组、A–Z 索引条、实时拼音/微信/手机搜索、圆形次卡身份角标、`<uni-forms>` + 80px 标签列、午晚餐默认价留空机制、陶土色主按钮、Hero 头部、档案卡片、次卡余额池汇总、历史订单列表、浅红危险删除区与依赖拦截保护。 | ✅ 2026-08-31 |
| 8.2 | 客户管理契约测试（`tests/customer-pages-contract.test.cjs`）、77/77 Node 测试、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 77/77 PASS；全部 CLI 检查通过 |
| 8.3 | HBuilderX Android 模拟器：客户列表拼音首字母分组与索引条、实时拼音/微信/手机搜索、档案表单 80px 标签对齐与唯一性校验、新建测试客户落库、进入详情查看真实档案/次卡/订单、已有订单客户删除保护阻断、无依赖客户删除弹窗确认与回退列表、返回现场快照恢复全链路验收 | ✅ PASS（HBuilderX Android 模拟器截图存证） |

---

## 历史增量（Issue #4：[UI 重构 03/14] 新建订单高频录单界面）

| Step | 内容 | 状态 |
|---|---|---|
| 4.1 | 新建订单高频录单暖纸张视觉重构：连续象牙白卡（`$hej-color-surface`）、80px 共享标签列、陶土色单选芯片按钮（隐藏单选圆圈）、组合支付展开与步进器、板岩蓝待配送合并提示与阻断红已配送提示、底部固定实际金额与陶土色保存栏、CustomerPicker 暖纸张 token 与拼音字母索引 | ✅ 2026-08-30 |
| 4.2 | 新建订单页契约测试（`tests/order-new-contract.test.cjs`）、62/62 Node 测试、类型检查、ESLint、H5 构建、git diff 检查 | ✅ 62/62 PASS；全部 CLI 检查通过 |
| 4.3 | HBuilderX Android 模拟器：默认表单（明天/午餐/微信）、客户选择与拼音检索、组合支付与不足校验、待配送合并与保存、已配送阻断、键盘输入、保存后“继续下一单”/“结束录单”、查看已有订单详情导航闭环验收 | ✅ PASS（HBuilderX Android 模拟器截图存证） |
| 4.4 | Code-Review 评审修复：CustomerPicker 补齐 `getCustomerPinyinKey`/`getCustomerPinyinInitials` 全拼与首字母检索、复用 `src/utils/ui.ts` 的 `discountLabel`、提示/退出辅助按钮尺寸对齐 `docs/design.md §4.4`（`min-width: 200rpx`, `height: 64rpx`, `padding: 0 $hej-space-5`）、更新契约测试，77/77 测试全量通过并在 Android 模拟器实测拼音搜索通过 | ✅ 77/77 PASS；Android 模拟器验证通过 |

---

## 历史增量（Issue #3：[UI 重构 02/14] 订单列表视觉重构）

| Step | 内容 | 状态 |
|---|---|---|
| 3.1 | 订单列表暖纸张视觉重构：自定义状态栏、日期选择与陶土色操作按钮、午晚餐折叠卡片、6 点拖拽把手、3 态标签、自然换行副标题、空/载/错卡片；保留动态 scroll-y、边缘滚屏与返回快照 | ✅ 2026-08-30 |
| 3.2 | 订单页契约测试（`tests/order-page-contract.test.cjs`）、59/59 Node 测试、类型检查、ESLint、git diff 检查 | ✅ 59/59 PASS；全部 CLI 检查通过 |
| 3.3 | HBuilderX Android 模拟器：空态、新建订单、午晚餐分组、三态标签、拖拽重排持久化与返回快照恢复闭环验收 | ✅ PASS（Android 模拟器截图存证） |

---

## 当前增量（Issue #2：暖纸张设计契约与今日首个切片）

| Step | 内容 | 状态 |
|---|---|---|
| 2.1 | 暖纸张 token、系统字体栈、今日页自定义安全区 / 2×2 指标 / 三态摘要 / 真实订单列表；不改 schema、API 或业务状态机 | ✅ 2026-08-30 |
| 2.2 | 今日页契约测试、全量 Node 测试、类型、lint、H5 和 diff 检查 | ✅ 56/56；其余 CLI 检查通过 |
| 2.3 | HBuilderX Android 模拟器：确认当前工作区、安装最新代码、375×812 纯设备截图和交互回归 | BLOCKED：computer-use trusted Node 内核连续异常退出；adb 仅确认 emulator-5554 在线（1440×2560、密度 640、Android 14），未完成 HBuilderX 基座启动与截图 |

## 当前增量（统计页有效订单份数）

| Step | 内容 | 状态 |
|---|---|---|
| 18.1 | “有效订单”卡片追加非取消订单总份数，显示为“单 / 份”；无订单显示 `0单 / 0份`，不改统计 API、类型、组件或数据库 | ✅ 2026-08-26 |
| 18.2 | test / type-check / lint / H5 build / diff-check；HBuilderX Android 真机视觉回归 | ✅ Node 测试 53/53、直接 `vue-tsc`、ESLint、H5 build、diff-check 通过；pnpm 入口因无 TTY 安装器清理保护未进入测试；真机待验证 |

---

## 当前增量（月卡信息复制与独立文案模板）

| Step | 内容 | 状态 |
|---|---|---|
| 17.1 | 月卡 / 次卡领域词汇、Q1–Q9 决策记录与独立模板 ADR | ✅ 2026-08-12 |
| 17.2 | schema v7、迁移、初始化、备份恢复与危险清空兼容 | ✅ 2026-08-12 |
| 17.3 | 月卡模板独立 CRUD、默认切换、历史版本、维护页和“我的”入口 | ✅ 2026-08-12 |
| 17.4 | 订单详情复制月卡信息；配送成功留在当前页并刷新最新状态；修正文案余额不扣待配送预占 | ✅ 2026-08-14 |
| 17.5 | 自动化 / CLI / H5 / HBuilderX 真机回归与文档收尾 | 🔄 自动化与 CLI 待最终执行；HBuilderX Android 真机待验证 |

设计基线：`CONTEXT.md`、`docs/adr/0002-meal-card-message-templates-are-independent.md`、`memory-bank/design-document.md §2.2 §4.3`

---

## 当前增量（页面返回现场）

| Step | 内容 | 状态 |
|---|---|---|
| 16.1 | 返回现场规格、实例级内存快照 ADR 与测试接缝 | ✅ 2026-08-09 |
| 16.2 | 返回目标解析器与共享 composable | ✅ 2026-08-09 |
| 16.3 | 现有可滚动父页面接入与特殊滚动兼容 | ✅ 2026-08-09 |
| 16.4 | 返回现场契约修订：仅恢复像素，不再记录条目定位 | ✅ 2026-08-12；新增内容变化 / 空列表 / 负数像素回归，迁移所有页面调用点 |
| 16.5 | 今日午餐自动折叠状态转移与回归 | ✅ 2026-08-12；覆盖首次完成、完成跃迁、手动覆盖、自动收起后新增待配送订单 |
| 16.6 | 自动化 / CLI / HBuilderX 真机回归 | 🔄 `node --test tests/*.test.cjs` 47/47、直接 `vue-tsc`、ESLint、H5 build 与 diff-check 通过；pnpm 被 Node 版本阻断；HBuilderX Android 真机待验证 |

设计基线：`docs/superpowers/specs/2026-08-09-page-return-snapshot-design.md`

---

## 当前增量（每日菜单与社群文案模板）

| Step | 内容 | 状态 |
|---|---|---|
| 15.1 | schema v6、每日菜单 / 模板 / 版本类型与事务 API | ✅ 2026-07-28 |
| 15.2 | 条件区块渲染、内置默认模板与纯函数回归 | ✅ 2026-07-28 |
| 15.3 | 当前 / 历史菜单、连续录入、复制、模板 CRUD 与版本恢复页面 | ✅ 2026-07-28 |
| 15.4 | 今日 / 我的入口、备份恢复、危险清空与长期文档 | ✅ 2026-07-28 |
| 15.5 | 自动化 / CLI / HBuilderX 真机回归 | 🔄 39 条自动化、CLI、H5 build 与 390 × 844 模板页视觉检查通过；Android 原生回归待执行 |

设计基线：`docs/superpowers/specs/2026-07-28-daily-menu-message-template-design.md`

---

## 当前增量（次卡开卡记录删除）

| Step | 内容 | 状态 |
|---|---|---|
| 14.1 | 未扣次记录原子删除、pending 预占保护与引用改绑 | ✅ 2026-07-24 |
| 14.2 | 充值记录页危险按钮、确认摘要、禁用态与操作锁 | ✅ 2026-07-24 |
| 14.3 | 删除分支回归、长期文档、CLI / H5 / HBuilderX 回归 | 🔄 30 条自动化、CLI 与 H5 已通过，真机待验证 |

---

## 当前增量（次卡收入本地日期）

| Step | 内容 | 状态 |
|---|---|---|
| 13.1 | 首页次卡收入与日趋势改为按设备本地日期统计 | ✅ 2026-07-24 |
| 13.2 | 凌晨 UTC 时间戳回归、test / type-check / lint / H5 build / HBuilderX 回归 | 🔄 自动化、CLI 与 H5 已通过，真机待验证 |

---

## 当前增量（订单与对账 UI 基线）

| Step | 内容 | 状态 |
|---|---|---|
| 12.1 | 项目级设计规范与 `$hej-*` token | ✅ 2026-07-22 |
| 12.2 | 订单空态与今日页回滚 | ✅ 2026-07-22 |
| 12.3 | 新建 / 编辑订单层级与固定确认区 | ✅ 2026-07-22 |
| 12.4 | 对账指标与收支 / 利润趋势 | ✅ 2026-07-22 |
| 12.5 | 订单表单层级、支付摘要、顶部操作区与样式编译 | ✅ 2026-07-22 |
| 12.6 | test / type-check / lint / H5 build / HBuilderX 回归 | 🔄 自动化、CLI 与 H5 已通过，真机待验证 |
| 12.7 | 新建订单高频录单收敛 | 🔄 静态、H5 与 390 × 844 浏览器结构检查通过，真机待验证 |
| 12.8 | 新建订单单行表单、统一白色表面与辅助按钮尺寸 | 🔄 390 × 844 H5 默认 / 组合支付检查通过，真机待验证 |
| 12.9 | 新建订单日期固定默认明天，不继承列表日期 | 🔄 自动化与 H5 build 已通过，真机待验证 |
| 12.10 | 订单详情编辑态同步新建页表单样式 | 🔄 自动化与 H5 build 已通过，真机待验证 |

设计基线：`docs/design.md`

---

## 当前增量（组合支付、次卡预占与一餐一单）

| Step | 内容 | 状态 |
|---|---|---|
| 11.1 | 领域规则与缺陷红灯用例 | ✅ 2026-07-22 |
| 11.2 | schema v5、类型与备份兼容 | ✅ 2026-07-22 |
| 11.3 | 订单 API 与次卡预占 | ✅ 2026-07-22 |
| 11.4 | 新增 / 编辑组合支付表单 | ✅ 2026-07-22 |
| 11.5 | 订单列表与详情展示 | ✅ 2026-07-22 |
| 11.6 | 长期文档同步 | ✅ 2026-07-22 |
| 11.7 | 自动化 / CLI / HBuilderX 真机回归 | 🔄 自动化与 CLI 已通过，真机待验证 |

设计基线：`docs/superpowers/specs/2026-07-22-combined-payment-single-order-design.md`

---

## 当前增量（次卡充值记录）

| Step | 内容 | 状态 |
|---|---|---|
| 10.1 | 总次数修改类型、业务错误与 API | ✅ 2026-07-14 |
| 10.2 | 客户详情入口、充值记录列表与路由 | ✅ 2026-07-14 |
| 10.3 | 开卡页 uni-forms 重构与编辑模式 | ✅ 2026-07-14 |
| 10.4 | 设计/架构/进度/变更文档同步 | ✅ 2026-07-14 |
| 10.5 | type-check / lint / H5 build / HBuilderX 真机回归 | 🔄 CLI 三项已通过，真机待验证 |

---

## 阶段完成度（v1.0 终态）

| Phase | 内容 | 步数 | 状态 |
|---|---|---|---|
| 1 | 项目脚手架 | 8/8 | ✅ 2026-06-10 |
| 2 | 数据层（SQLite） | 6/6 | ✅ 2026-06-11 |
| 3 | 类型与工具 | 4/4 | ✅ 2026-06-11 |
| 4 | API 层 | 8/8 | ✅ 2026-06-11 |
| 5 | Pinia Stores | 5/5 | ✅ 2026-06-11 |
| 6 | 通用 UI 组件 | 3/3 | ✅ 2026-06-11 |
| 7 | 页面实现 | 18/18 | ✅ 2026-06-11 |
| 8 | 关键流程串联（E2E） | 6/6 | ✅ 2026-06-11（HBuilderX 真机手测全过） |
| 9 | 收尾与发布 | 3/5 | ✅ 2026-06-11（9.3 / 9.4 跳过） |

---

## 跳过的 2 步 + 原因

- **9.3 真机性能 smoke test**：v1.0 内使用规模小（个人档口日订单 < 50），SQLite 单表 < 1 万行；Phase 8 真机手测已覆盖 6 条 E2E 流程，UX 与功能无卡顿。性能压测在 v1.1+ 数据增长后再做。
- **9.4 build Release APK + 侧载试装**：用 HBuilderX「运行 → 运行到 Android App 基座」生成的 debug APK 即可侧载，v1.0 阶段无需正式 Release 签名打包；待 v1.1 真实数据验证后再上 Release。

---

## 更新日志

> 每条与 `memory-bank/architecture.md §更新日志` 同源，**改两边**。

- 2026-08-30：[UI 重构 03/14] 新建订单高频录单界面（Issue #4）——落地暖纸张画布（`$hej-color-canvas`）、象牙白连续录单卡（`$hej-color-surface`）、陶土色主动作（`$hej-color-accent`）；日期/餐次直接放在连续卡内并共享 80px 标签列，组合支付作为次级入口展开并使用步进器调整；客户选择器使用 `$hej-*` token 与拼音字母索引及全拼/首字母检索；同日同餐次待配送订单展示板岩蓝合并卡并支持“合并并保存”，已配送订单展示阻断提示并禁用提交；保存后提供“继续下一单”与“结束录单”弹窗；辅助操作按钮对齐 200rpx/64rpx 规范；新增 `tests/order-new-contract.test.cjs` 验证数据链与视觉契约；HBuilderX Android 模拟器验证默认表单、客户选择、组合支付、不足提示、待配送合并、已配送阻断、键盘输入、拼音检索、保存后继续录单与查看已有订单导航闭环。

- 2026-08-30：迁入已审核的全页面 UI 重构参考——`docs/ui-image-generation-prompts.md` 更新为 Claude-inspired warm paper 方案三，新增 `docs/ui-reference/`，收录 23 张 375×812 参考图和页面 / 路由 / 版本索引；不迁入 ImageGen source 原图，不改应用代码、业务行为或现行 `docs/design.md` 实现规范。

- 2026-08-29：新增全页面 UI 概念图提示词——基于现有 23 个页面与业务闭环，采用适配 Android 高频操作的 Wise-inspired 友好金融方向，提供统一母提示词、负面提示词、逐页提示词和空态 / 校验 / 危险确认状态；本次只新增设计探索文档，不改应用 UI、业务行为或现行 `docs/design.md` 基线。

- 2026-06-10：初始创建（与 `implementation-plan.md` v2 同步）。
- 2026-06-10：Phase 1 脚手架 8/8 完成，里程碑 1.8 达成。
- 2026-06-10：发现 CLI 模式编译不带 SQLite 原生模块；切到 HBuilderX 编译；`architecture.md` 新增「编译工具链」章节。
- 2026-06-10：5+ sqlite API 重写（callback 嵌 options、name 引用、async executeSql），type-check / lint 通过；HBuilderX "最新正式版" 标准基座下仍报 `getCallbackIDByFunction is not a function`。
- 2026-06-11：用户决定换 AI 接手，详细调试交接见 `debug-docs/DEBUG-HANDOFF.md`。
- 2026-06-11：接手后修复 `init()` 未 await / `transaction.operation` 误用函数 / SQL args 不被官方 API 支持 / callback 静默无超时等问题；3 项验证通过。
- 2026-06-11：发现动态取出 `plus.sqlite[method]` 后裸调用丢失 `this`；改 `fn.call(sqlite, options)` 保留 `this`，本地三项验证通过。
- 2026-06-11：用户真机落盘验证；`bookkeeping-real.db`（后并入 v1.db）确认业务表齐全、5 行默认分类、`user_version=1`；Phase 2 里程碑完成。
- 2026-06-11：Phase 3 类型与工具 4/4 完成；按用户要求验证前不进入 Phase 4。
- 2026-06-11：Phase 4 API 层 8/8 完成（customers / meal-cards / orders + errors / expense-categories / expenses / stats）；按用户要求验证前不进入 Phase 5。
- 2026-06-11：Phase 5 Stores 5/5 完成；按 uni-app 官方文档改用内置 Pinia，CLI `pnpm build:h5` 会因找不到 `pinia/dist/pinia.mjs` 失败，需走 HBuilderX 内置 Pinia 验证。
- 2026-06-11：Phase 6 通用组件 3/3 完成（StatCard / AmountInput / CustomerPicker）。
- 2026-06-11：用户确认 Phase 6 通过，进入 Phase 7；Step 7.1-7.18 完成（13 个页面 + `utils/ui.ts` / `utils/backup.ts`）；设置页导出走 `plus.io` + 系统分享。
- 2026-06-11：用户确认 Phase 7 真机验证通过，进入 Phase 8；预检修补两处核心流程：次卡次数不足改微信/现金时按客户默认价 × 折扣率重算；备份导入补齐 `schema_version` 校验。
- 2026-06-11：订单列表改用 `uni-collapse` 按午餐/晚餐折叠面板。
- 2026-06-11：次卡展示改为按所有 active 次卡汇总剩余 / 总次数（避免新开卡后只显示最新卡造成覆盖感）。
- 2026-06-11：订单详情新增 pending 订单编辑态；`api/orders.ts` 新增 `updateOrder`，限制只编辑 pending 订单。
- 2026-06-11：订单列表备注展示补齐；开次卡金额放开 0 元校验；`utils/backup.ts` 危险清空后重新 seed 5 个默认分类。
- 2026-06-11：首页状态色展示（待配送/已配送/已取消 → primary/success/warning）；订单折叠面板标题加粗 + 列表项加分割线。
- 2026-06-11：备份恢复 v1.1 小修：导出写 `_doc/backup_*.json` + 复制 `_downloads/`，恢复新增从已保存备份列表 / 本地 JSON 文件选择；真机文件路径待 HBuilderX 验证。
- 2026-06-12：新建订单日期字段补齐：`pages/order/new.vue` 新增可编辑日期，默认明天；`stores/order.ts` 新建后刷新到订单日期。
- 2026-06-13：备份恢复本地文件选择修正：安卓客户端不支持 WebView `<input type="file">`，`src/pages/me/settings/backup.vue` 移除隐藏 input；`src/utils/backup.ts` 新增 `pickLocalBackupText()`，Android App 端通过系统 Intent 选择 JSON 并用 `ContentResolver.openInputStream()` 读取，其他端 fallback 到 `uni.chooseFile`。
- 2026-06-15：删除能力补齐：订单详情新增硬删除，已配送次卡订单删除时事务内回滚已扣次数；支出列表卡片点击进入新支出详情页，详情页支持修改和删除；客户详情新增删除入口，有订单或次卡依赖时拒绝删除；`design-document.md` 追加 A8 / §4.6，明确后续删除统一采用"硬删除 + 回滚已产生副作用"。
- 2026-06-15：客户姓名判重：`src/api/customers.ts` 创建/改名时按 trim 后姓名查重并抛业务错误；`src/pages/me/customers/new.vue` 捕获后提示重复姓名不可保存；`design-document.md` 记录客户姓名应用层唯一规则。
- 2026-06-15：支出退差金额上线：schema 升级到 v2，`expenses` 新增 `refund_amount` 字段；新建 / 修改支出页补退差金额输入与实际支出预览；统计页支出口径、日趋势和分类占比统一按 `amount - refund_amount` 计算；备份恢复允许 v1 备份导入到 v2 时为旧支出补 0。
- 2026-06-15：订单列表拖拽排序：schema 升级到 v3，`orders` 新增 `sort_order` 字段；订单列表支持长按左侧 `uni-icons bars` 把手后在当天同餐次内拖拽排序，松手后通过 `reorderOrders()` 写回；新订单默认追加到同日同餐次末尾；备份恢复允许 v1/v2 备份导入到 v3 时为旧订单补 0。
- 2026-06-15：客户列表拼音索引：新增纯 JS 依赖 `pinyin-pro` 与 `src/utils/pinyin.ts`；`src/pages/me/customers/list.vue` 按中文客户名拼音首字母分组排序，支持右侧字母索引跳转，并把搜索扩展到姓名拼音和拼音首字母。
- 2026-06-15：金额精确计算统一接入 big.js（v1.5）：新增 `big.js@7.0.1` 与 `@types/big.js` 依赖；`src/utils/format.ts` 新增 `roundMoney / addMoney / subtractMoney / multiplyMoney / divideMoney` 五个 helper（全局 `Big.RM = roundHalfUp`，所有结果强制 `toFixed(2)` 保证输出干净）；`src/api/stats.ts` 三处累加/差值（getRangeSummary / getDailyTrend / getCategoryBreakdown）、`src/api/orders.ts` 三处订单金额计算（次卡均摊、默认价 × 折扣率、单价 × 份数）、`src/utils/ui.ts` 两处客户默认价提示全部改走 helper；`AGENTS.md §10` 禁止清单新增「业务金额禁止原生 `+ - * /`」一条规则，`§11` 错误速查表新增精度尾数自检一条。修复首页利润显示 `0.0000000004` 的 JS 浮点尾数问题。
- 2026-06-16：拖拽滚动冲突修复重做（v1.6）：原 v1.4（longpress + `@touchmove` 绑整个 order-item）与 scroll-view 并发滚动抖动；上一版 v1.6（`@touchstart.stop` + 阈值 + JS 层 `preventDefault`）因标准基座下 preventDefault 不生效而无效，bug 依旧。本次改用**方案 B：动态 `:scroll-y` 开关 + 边缘自动滚屏**绕开冲突。`src/pages/order/index.vue`：`<scroll-view>` 改 `:scroll-y="listScrollable"` `:scroll-top="listScrollTop"` `@scroll="onListScroll"`；触摸事件下沉到 drag-handle、`@touchstart.stop`→dragIntent、`@touchmove.stop` 跨阈值 10px 激活后 `lockScroll()`（`listScrollable=false` 关闭滚动能力）+ clone 列表；激活后手指拖到顶/底 64px 内用 `setTimeout(16)` 驱动 `:scroll-top` 滚屏（app-plus 逻辑层无 `requestAnimationFrame`，必须 setTimeout）并反向修正 `dragState.startY` 让 targetIndex 跟随不错位。新增 `DragIntent` 接口 + 9 个函数，删除 `startDrag` / `handleTouchMove`。`CHANGELOG.md` v1.6 节改写为方案 B；`architecture.md` 同步；`AGENTS.md §11` 最后一行更新为方案 B 并保留「JS 层 preventDefault 不生效」记录。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证。
- 2026-06-16：统计 SUM 出口精度收口：`src/api/stats.ts` 三处 SQL `SUM` 出口的 number（`getRangeSummary` 的 `orderIncome` / `cardIncome` / `expense`、`getDailyTrend` 三组 `income` / `expense`、`getCategoryBreakdown` 的 `amount` / `total`）全部先过 `roundMoney()` 再相加/相减；首页 Dashboard `summary.expense` 之前完全没经过精度处理，顺手把 `summary.income` 也显式 `roundMoney`，与 `addMoney` 配合后两端口径一致。`pnpm type-check` / `pnpm lint` 通过；真机回归待 HBuilderX 验证（首页 8.1 流程 + 统计页 8.5 重点复测）。
- 2026-06-22：订单详情复制信息：`src/pages/order/detail.vue` 只读态新增「复制信息」按钮，点击后将客户名、订单份数和备注写入系统剪贴板；空备注不写入复制内容，复制成功 / 失败沿用现有 toast 提示。
- 2026-06-22：配送完成后自动沉底：`src/api/orders.ts` 的 `markDelivered()` 成功配送时同步把订单 `sort_order` 改为同日同餐次最大值 + 1；从订单详情触发配送后，订单列表刷新即可把已配送订单挪到对应餐次最后一位。
- 2026-06-22：今日午餐全部已配送后自动折叠：`src/pages/order/index.vue` 的午餐 / 晚餐折叠面板改用 `:model-value` 受控；当筛选日期为今天且午餐订单非空并全部为 `delivered` 时，午餐面板默认折叠，晚餐和其他日期保持原展开逻辑。
- 2026-06-26：次卡余额池扣次：schema 升级到 v4，新增 `meal_card_usages` 扣次明细；配送次卡订单时按客户所有 active 次卡旧卡优先扣次，支持跨卡扣同一单，只有总剩余不足才进入改微信 / 现金异常分支；删除已配送次卡订单按 usage 明细精确回滚；新建 / 编辑订单页优先选择能覆盖本单份数的 active 卡作为参考卡；备份恢复支持 v1-v3 旧备份自动生成 usage。
- 2026-07-14：次卡充值记录与总次数校正：客户详情增加充值记录入口，新增全部历史卡列表；开卡页重构为 uni-forms 并支持修改指定记录总次数；API 禁止新总次数小于已用次数，且按新余额自动切换 `active/depleted`；未改 schema、充值金额或扣次明细。`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过（H5 仅有既有 uni-ui Sass 弃用警告），HBuilderX 真机回归待用户执行。
- 2026-07-14：客户选择器拼音分组索引：`CustomerPicker.vue` 按姓名拼音 A-Z / `#` 分组，右侧 `index-bar` 点击后跳转到对应分组；搜索后索引随匹配分组更新，新建订单与订单详情编辑同时生效。
- 2026-07-14：客户列表次卡身份头像：`src/api/meal-cards.ts` 新增单次批量查询当前有剩余次数的 active 次卡客户 ID；`src/pages/me/customers/list.vue` 头像区将这类客户显示为“次”，其他客户显示为“普”，不改 schema 和其他页面。`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 通过（H5 仅有既有 uni-ui Sass 弃用警告），HBuilderX 真机待验证。
- 2026-07-22：一餐一单与组合支付（v1.12）：schema v5 新增 `orders.meal_card_quantity`；订单创建 / 编辑在事务内维护同键唯一有效订单、次卡 pending 预占、支付冲突和改单价 / 目标合并确认，配送 / 删除只处理次卡分配部分；顶层 SQLite 事务改为队列串行，页面状态操作增加 in-flight 锁；新增 / 编辑页改为 uni-forms，列表改为完整支付副标题；备份与充值记录校正同步。`pnpm test` 21 条、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，HBuilderX 真机待回归。
- 2026-07-22：客户表单标签统一：新建订单与订单详情编辑均由 `<uni-forms-item label="客户">` 提供字段标签；`CustomerPicker` 移除内部重复标签，保留选择、搜索和拼音分组交互。`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过；H5 仅输出既有 uni-ui Sass 弃用警告。
- 2026-07-22：订单与对账 UI 基线（v1.13）—— 新增 `docs/design.md` 和 `src/uni.scss` 的 `$hej-*` 语义 token；订单列表空态可新建所选日期首单，新建 / 编辑订单按统一层级并使用固定确认区，统计页改为“收支 / 利润趋势”逐日并列展示入账、支出和利润。首页按用户反馈恢复既有概览与分组布局；本轮自定义按钮统一采用固定高度与等值行高，保证 App 端文字垂直居中。订单页顶部日期 / 新建区增加内边距并使用蓝色主动作；修复漏写 `lang="scss"` 导致 `$hej-*` token 原样输出、App 回退默认样式的问题，新增静态回归测试；新建订单的合并、配送冲突、次卡、加载 / 失败和字段占位提示改为说明原因与下一步。未改订单、金额或 SQLite 业务规则；`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过，H5 仅输出既有 uni-ui / Dart Sass deprecation warnings，HBuilderX 真机视觉 / 交互回归待执行。
- 2026-07-22：订单金额展示文案—— 新建 / 编辑确认区和订单详情将“货币金额”改为“实际金额”；仅改用户可见名称，不改 `orders.amount`、支付拆分或金额计算。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过。
- 2026-07-22：AI 协作入口收敛——新增本地 `uni_modules` 选型索引，完整登记 45 个包并规定新增 / 重做 UI 先查本地、满足边界才优先复用；`AGENTS.md` 收敛为任务路由、硬约束、验证与平台陷阱，重复的产品细节、历史复盘和 API 说明回归各自权威文档。本次不改应用代码或业务行为。
- 2026-07-22：订单支付摘要与表单层级——新建 / 编辑订单将金额收进“配送与支付”卡内作为分隔小节；固定确认区、合并改单价提示和详情份数均明确显示微信 / 现金渠道，不再对用户显示“货币支付 / 货币份数”。不改 `orders.amount`、支付拆分或金额计算。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过。
- 2026-07-22：新建订单高频录单（v1.14）——`src/pages/order/new.vue` 改为紧凑配送安排 + 连续单卡，默认明天 / 午餐 / 微信不变；组合支付降为份数大于 1 时的次级入口，用户主动进入后预填 1 次并用步进器调整，实际单价直接显示输入框、备注一行常显。固定确认区直接说明缺失项；保存后由二次弹窗选择继续下一单（安全清空本次字段）或结束录单。未改订单事务、次卡预占、金额或 schema。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过；390 × 844 H5 浏览器结构检查通过，HBuilderX 真机待验证。
- 2026-07-23：新建订单单行表单与统一表面（v1.15）——`src/pages/order/new.vue` 的日期、餐次及各业务字段均由独立 `uni-forms-item` 承载并共享 80px 标签列；移除独立“配送安排”色块，日期 / 餐次和组合支付展开区均与主表单使用同一白色表面。标签与控件垂直居中，控件左边界一致；次卡次数和补款方式沿用同一对齐线。客户状态提示按钮与“改为纯支付”按钮补足最小宽度、64rpx 触摸高度和水平内边距，避免操作文案拥挤。未改订单事务、次卡预占、金额或 schema。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过；390 × 844 H5 默认与组合支付布局检查通过，HBuilderX 真机待验证。
- 2026-07-23：订单详情编辑样式同步（v1.15）——`src/pages/order/detail.vue` 编辑态以当前新建订单页为视觉基准，改为连续白色表面、80px 标签列、单行字段与统一分隔线；客户状态操作、实际单价提示、组合支付面板及底部确认区同步间距和触摸尺寸。详情页既有四种支付方式按两列展示，避免窄屏文字拥挤；总份数语义、编辑校验、目标订单合并、配送 / 取消 / 删除均未改变。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 与 `git diff --check` 通过，HBuilderX 真机待验证。
- 2026-07-23：业务表单视觉规范分层固化——`docs/design.md §4` 以当前 `src/pages/order/new.vue` 为唯一视觉实现基准，集中维护连续白色表面、80px 标签列、单行字段、统一分隔线、选择控件、提示按钮和底部确认区规范；根目录 `AGENTS.md §6` 只保留读取路由、组件和验证硬约束，避免复制视觉参数。规范只复用视觉契约，不扩散订单字段或业务逻辑。
- 2026-07-23：新建订单日期固定默认明天——`src/pages/order/index.vue` 跳转新建页时不再携带列表筛选日期，`src/pages/order/new.vue` 删除查询参数覆盖逻辑，每次打开均以 `tomorrow()` 初始化日期；表单内仍可手动修改。未改订单保存、合并或列表刷新规则。
- 2026-07-23：新建支出页表单标签列显式统一为 88px，并与右侧控件垂直居中；页面背景改用 `$hej-color-canvas`。未改支出数据、金额计算、校验或保存流程。`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，H5 仅输出既有 uni-ui / Dart Sass 弃用警告；HBuilderX 真机视觉待验证。
- 2026-07-23：根目录 `AGENTS.md` 新增表单标签占位规则：同一业务表单统一在 `<uni-forms>` 设置带单位的 `label-width`，右侧控件左对齐，标签与控件垂直对齐；不改任何应用代码或业务行为。
- 2026-07-23：订单页顶部操作区视觉居中修复——`src/pages/order/index.vue` 将日期组件根节点改为纵向 flex 并居中内部固定 35px 高的可见输入框，消除其与 80rpx 新建按钮的可见中心偏移；未改日期选择、新建跳转或订单数据逻辑。375 × 812 H5 测量中两个可见控件中心偏差与日期控件宽度差均为 0px；`pnpm test`（22 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，HBuilderX 真机视觉待验证。
- 2026-07-23：根目录 `AGENTS.md` 的表单规则补充页面背景约束：统一使用 `$hej-color-canvas`，并为引用该 token 的样式块声明 `lang="scss"`；不改任何应用代码或业务行为。
- 2026-07-24：次卡收入本地日期修复（v1.16）—— `src/api/stats.ts` 不再直接截取 UTC `created_at`，改用 SQLite `date(created_at, 'localtime')` 按设备本地日期过滤和分组，修复凌晨 00:00–07:59 开卡金额误归前一日的问题；新增 `tests/stats-timezone.test.cjs` 覆盖首页与日趋势。`pnpm test`（24 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，Android 原生 SQLite 本地时区待 HBuilderX 真机验证。
- 2026-07-24：次卡开卡记录删除（v1.17）——只允许删除从未扣次的记录；删除前保护 usage / delivered 历史和 pending 预占，引用该卡的 pending 订单按 FIFO 改绑，cancelled 订单清空引用，全部写入在同一事务内完成。充值记录页新增危险操作区、收入 / 次数影响确认、已扣次禁用态和页面级操作锁。`pnpm test`（30 条）、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过，Android 真机待验证。
- 2026-07-28：每日菜单与社群文案模板（v1.18）—— schema v6 新增每日菜单、唯一默认文案模板与编辑前版本历史；支持连续新增下一天、当前 / 历史菜单、缺餐条件区块渲染、默认模板复制、版本恢复和硬删除。今日 / 我的增加入口，备份与危险清空同步三张新表；自动化与 CLI 结果见 `CHANGELOG.md v1.18`，HBuilderX 真机待验证。
- 2026-08-09：页面返回现场（v1.19）——新增页面实例级内存快照 composable 与纯定位规则，所有现有 `navigateTo` 父页面统一保留筛选 / 草稿 / 折叠和滚动；列表变化时按原条目、下一项、上一项兜底，订单拖拽复用既有受控滚动，客户字母索引在恢复前清空目标。新增 7 条定位回归，`pnpm type-check` / `pnpm lint` / `pnpm build:h5` 与 `git diff --check` 通过；全量测试 45/46，既有 schema 测试在 Windows 下因 sqlite3 CRLF 与 LF 期望不一致失败，Android 真机待验证。
- 2026-08-09：v1.19 代码审查修复——表单返回时刷新辅助订单 / 次卡上下文但保留草稿；刷新失败恢复原滚动并保留快照，多 Store 部分成功会回滚；订单相邻项改按午餐 → 晚餐实际渲染顺序，客户次卡身份不再预先清空。定位测试 7/7、`pnpm type-check`、`pnpm lint`、`pnpm build:h5` 通过；全量测试仍为 45/46，唯一失败是既有 Windows sqlite3 CRLF 断言，Android 真机待验证。
- 2026-08-27：按 `writing-for-agents` 重整根目录 `AGENTS.md`——移除过期版本快照与脚本 / 基座缓存，补充现场优先、分支取证、证据分级和收口标准；不改应用代码或业务行为。
- 2026-08-31：次卡开卡校正与充值记录重构（Issue #9）——`open-card.vue` 与 `card-records.vue` 暖纸张视觉重构；开卡页从真实客户和 active 次卡读取余额池与卡数，步进器与金额联动，底部操作栏明确为“确认开卡”与“保存修改”；充值记录页展示 3 列核心指标、状态标签与记录编号，已扣次记录禁用删除，未扣次记录说明收入和余额影响；契约测试 5/5、全量测试 82/82、类型、lint 与 Android 模拟器全链路业务闭环验收通过。
