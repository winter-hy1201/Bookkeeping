# 本地 uni_modules — AI 选型索引

> 快照：2026-07-22；覆盖 `src/uni_modules/*/package.json` 中的 **45 个**本地包。源码与本地 README 是唯一 API 事实源，本文件只解决“先用哪个”。

## 使用规则

1. 仅在**新增或重做 UI 交互**时查本索引；纯 CSS 微调、业务逻辑和数据层改动不触发。
2. 本地组件同时满足交互匹配、Android App 可用、符合 `docs/design.md` 和业务表单规则、且不会带来多余行为时，优先复用。
3. 选中后先读本地 README，再参考“项目内用例”；`已安装待验证` 的首次使用还要完成对应 HBuilderX Android 回归。
4. 业务表单必须在 `<uni-forms>` + `<uni-forms-item>` 内使用输入 / 选择组件。没有合格本地项时，先做最小自定义；新增外部依赖须先说明并获准。
5. 不因本索引追溯替换已有页面。增删本地包、升级版本或形成新项目用例时，同步更新本文件。

## 状态含义

| 状态 | 含义 |
|---|---|
| 已验证 | 当前业务页面模板已有用例；仍须按本次改动验证。 |
| 已安装待验证 | 本地源码存在，但当前项目没有直接模板用例；先读 README，再做首次 Android 回归。 |
| 按明确需求使用 | 本地存在但带有特定业务语义，或是基础支持包；不能作为默认替代品。 |

## 表单、选择与输入

| 本地包 / 可用标签 | 状态 | 可优先考虑的场景 | 关键边界 | 项目内用例 |
|---|---|---|---|---|
| [uni-forms](../src/uni_modules/uni-forms/readme.md) v1.4.13<br>`uni-forms`、`uni-forms-item` | 已验证 | 所有业务表单的容器、校验与提交 | 输入控件必须放入 item；字段 `name`、form key、rules 一一对应 | `src/pages/order/new.vue` |
| [uni-easyinput](../src/uni_modules/uni-easyinput/readme.md) v1.1.22<br>`uni-easyinput` | 已验证 | 文本、数字、金额、备注输入 | 业务表单中须套 forms；`@input` 返回字符串，金额走现有解析 helper | `src/components/AmountInput.vue` |
| [uni-data-checkbox](../src/uni_modules/uni-data-checkbox/readme.md) v1.0.6<br>`uni-data-checkbox` | 已验证 | 固定选项的单选 / 多选 | 业务表单中须套 forms；确认单选/多选与数据模型一致 | `src/pages/order/new.vue` |
| [uni-data-select](../src/uni_modules/uni-data-select/readme.md) v1.1.0<br>`uni-data-select` | 已验证 | 扁平选项下拉选择 | 业务表单中须套 forms；复杂级联改查 data-picker | `src/pages/me/expenses/new.vue` |
| [uni-datetime-picker](../src/uni_modules/uni-datetime-picker/readme.md) v2.2.42<br>`uni-datetime-picker` | 已验证 | 日期、时间、日期范围 | 业务表单中须套 forms；确认返回格式与 `src/utils/date.ts` 一致 | `src/pages/order/new.vue` |
| [uni-number-box](../src/uni_modules/uni-number-box/readme.md) v1.2.8<br>`uni-number-box` | 已验证 | 小范围整数 / 小数步进 | 业务表单中须套 forms；金额不能绕过 big.js 计算规则 | `src/pages/order/new.vue` |
| [uni-combox](../src/uni_modules/uni-combox/readme.md) v1.0.2<br>`uni-combox` | 已安装待验证 | 可输入也可从候选项选择 | 业务表单中须套 forms；先确认 Android 键盘与候选交互 | 暂无项目内用例 |
| [uni-data-picker](../src/uni_modules/uni-data-picker/readme.md) v2.0.2<br>`uni-data-picker`、`uni-data-pickerview` | 已安装待验证 | 多列或级联数据选择 | 业务表单中须套 forms；扁平选项优先 data-select | 暂无项目内用例 |
| [uni-calendar](../src/uni_modules/uni-calendar/readme.md) v1.4.12<br>`uni-calendar`、`uni-calendar-item` | 已安装待验证 | 独立日历、日历范围展示 | 普通表单日期优先 datetime-picker；先验证 App 端范围选择 | 暂无项目内用例 |
| [uni-file-picker](../src/uni_modules/uni-file-picker/readme.md) v1.1.3<br>`uni-file-picker` | 按明确需求使用 | 有明确本地选文件 / 上传需求时 | 当前 App 无网络上传；不能替代既有 Android 备份 Intent 流程 | 暂无项目内用例 |
| [uni-rate](../src/uni_modules/uni-rate/readme.md) v1.3.2<br>`uni-rate` | 已安装待验证 | 星级评分 | 当前业务没有评分模型；不要为装饰而引入 | 暂无项目内用例 |

## 列表、数据展示与布局

| 本地包 / 可用标签 | 状态 | 可优先考虑的场景 | 关键边界 | 项目内用例 |
|---|---|---|---|---|
| [uni-collapse](../src/uni_modules/uni-collapse/readme.md) v1.4.8<br>`uni-collapse`、`uni-collapse-item` | 已验证 | 可折叠的分组内容 | `model-value` 受控时确认默认展开逻辑 | `src/pages/order/index.vue` |
| [uni-list](../src/uni_modules/uni-list/readme.md) v1.2.17<br>`uni-list`、`uni-list-item`、`uni-list-chat`、`uni-list-ad`、`uni-refresh` | 已安装待验证 | 结构化移动端列表 | 先确认现有自定义列表样式是否更贴合设计基线 | 暂无项目内用例 |
| [uni-indexed-list](../src/uni_modules/uni-indexed-list/readme.md) v1.2.2<br>`uni-indexed-list`、`uni-indexed-list-item` | 已安装待验证 | 大量按字母分组的可索引列表 | CustomerPicker 已有定制拼音索引；不要无理由替换 | 暂无项目内用例 |
| [uni-pagination](../src/uni_modules/uni-pagination/readme.md) v1.2.4<br>`uni-pagination` | 已安装待验证 | 显式页码分页 | 当前本地小数据量列表未采用分页 | 暂无项目内用例 |
| [uni-load-more](../src/uni_modules/uni-load-more/readme.md) v1.3.7<br>`uni-load-more` | 已安装待验证 | 列表加载更多 / 结束状态 | 需有真实分页或分段加载，不用于静态空态 | 暂无项目内用例 |
| [uni-table](../src/uni_modules/uni-table/readme.md) v1.2.9<br>`uni-table`、`uni-thead`、`uni-tbody`、`uni-tr`、`uni-th`、`uni-td` | 已安装待验证 | 稠密、横向可读的表格数据 | 小屏 App 可读性优先；先检查是否应使用卡片 / 列表 | 暂无项目内用例 |
| [uni-swipe-action](../src/uni_modules/uni-swipe-action/readme.md) v1.3.17<br>`uni-swipe-action`、`uni-swipe-action-item` | 已安装待验证 | 列表项侧滑操作 | 删除等危险动作仍需明确确认；先验证与 scroll-view 手势共存 | 暂无项目内用例 |
| [uni-card](../src/uni_modules/uni-card/readme.md) v1.3.1<br>`uni-card` | 已安装待验证 | 通用内容卡片 | 必须匹配 `docs/design.md` 的间距、表面和圆角 | 暂无项目内用例 |
| [uni-group](../src/uni_modules/uni-group/readme.md) v1.2.2<br>`uni-group` | 已安装待验证 | 内容分区 / 组块 | 不替代有明确业务语义的表单分区 | 暂无项目内用例 |
| [uni-section](../src/uni_modules/uni-section/readme.md) v0.0.1<br>`uni-section` | 已安装待验证 | 区块标题 | 先确认样式是否符合设计 token，避免默认样式突兀 | 暂无项目内用例 |
| [uni-title](../src/uni_modules/uni-title/readme.md) v1.1.1<br>`uni-title` | 已安装待验证 | 页面 / 章节标题 | 与自定义标题层级和统计需求一致时才用 | 暂无项目内用例 |
| [uni-grid](../src/uni_modules/uni-grid/readme.md) v1.4.0<br>`uni-grid`、`uni-grid-item` | 已安装待验证 | 宫格入口或规则网格 | 不用于需要精确响应式比例的复杂布局 | 暂无项目内用例 |
| [uni-row](../src/uni_modules/uni-row/readme.md) v1.0.0<br>`uni-row`、`uni-col` | 已安装待验证 | 24 栅格布局 | App 页面优先简单 CSS 布局；避免为单次布局增加层级 | 暂无项目内用例 |
| [uni-tag](../src/uni_modules/uni-tag/readme.md) v2.1.2<br>`uni-tag` | 已安装待验证 | 状态、分类、轻量标签 | 状态色遵守 `docs/design.md`；不要把重要操作做成 tag | 暂无项目内用例 |
| [uni-badge](../src/uni_modules/uni-badge/readme.md) v1.2.2<br>`uni-badge` | 已安装待验证 | 数量角标、轻量提醒 | 不替代完整状态说明或错误提示 | 暂无项目内用例 |

## 导航、反馈与浮层

| 本地包 / 可用标签 | 状态 | 可优先考虑的场景 | 关键边界 | 项目内用例 |
|---|---|---|---|---|
| [uni-icons](../src/uni_modules/uni-icons/readme.md) v2.0.12<br>`uni-icons` | 已验证 | 通用图标、拖拽把手、状态辅助 | 图标只辅助文字；危险 / 关键操作不能只靠图标 | `src/pages/order/index.vue` |
| [uni-popup](../src/uni_modules/uni-popup/readme.md) v1.9.12<br>`uni-popup`、`uni-popup-dialog`、`uni-popup-message`、`uni-popup-share` | 已安装待验证 | 非路由弹层、确认或临时信息 | 破坏性动作仍须清楚说明；先验证 Android 返回键与层级 | 暂无项目内用例 |
| [uni-drawer](../src/uni_modules/uni-drawer/readme.md) v1.2.1<br>`uni-drawer` | 已安装待验证 | 侧边抽屉 | 不替代现有 Tab / 页面导航；确认手势冲突 | 暂无项目内用例 |
| [uni-fab](../src/uni_modules/uni-fab/readme.md) v1.2.6<br>`uni-fab` | 已安装待验证 | 浮动主操作及其少量扩展动作 | 不遮挡底部固定确认区或 TabBar | 暂无项目内用例 |
| [uni-notice-bar](../src/uni_modules/uni-notice-bar/readme.md) v1.2.3<br>`uni-notice-bar` | 已安装待验证 | 非阻断公告、长提醒 | 错误和必须处理的风险不能只放滚动公告 | 暂无项目内用例 |
| [uni-tooltip](../src/uni_modules/uni-tooltip/readme.md) v0.2.4<br>`uni-tooltip` | 已安装待验证 | 短说明、图标释义 | 关键信息要直接可见，不能藏在 tooltip | 暂无项目内用例 |
| [uni-transition](../src/uni_modules/uni-transition/readme.md) v1.3.6<br>`uni-transition` | 已安装待验证 | 简单过渡动画 | 动画不能阻塞表单、确认或加载反馈 | 暂无项目内用例 |
| [uni-link](../src/uni_modules/uni-link/readme.md) v1.0.0<br>`uni-link` | 已安装待验证 | 外部链接 | App 打开外部浏览器前确认用户预期 | 暂无项目内用例 |
| [uni-fav](../src/uni_modules/uni-fav/readme.md) v1.2.1<br>`uni-fav` | 已安装待验证 | 收藏 / 关注状态 | 当前无对应领域模型；不可只加 UI 不落数据规则 | 暂无项目内用例 |
| [uni-search-bar](../src/uni_modules/uni-search-bar/readme.md) v1.3.0<br>`uni-search-bar` | 已安装待验证 | 独立搜索条 | 现有搜索使用 easyinput；重做搜索体验时再评估 | 暂无项目内用例 |
| [uni-segmented-control](../src/uni_modules/uni-segmented-control/readme.md) v1.2.3<br>`uni-segmented-control` | 已安装待验证 | 少量互斥视图切换 | 不替代路由级 Tab；状态与可访问文案需清楚 | 暂无项目内用例 |
| [uni-nav-bar](../src/uni_modules/uni-nav-bar/readme.md) v1.3.17<br>`uni-nav-bar`、`uni-status-bar` | 已安装待验证 | 自定义页面头部 | 先确认是否与 uni-app 原生导航和安全区冲突 | 暂无项目内用例 |
| [uni-steps](../src/uni_modules/uni-steps/readme.md) v1.1.2<br>`uni-steps` | 已安装待验证 | 明确分步流程进度 | 仅在真实多步骤流程中使用 | 暂无项目内用例 |
| [uni-swiper-dot](../src/uni_modules/uni-swiper-dot/readme.md) v1.2.0<br>`uni-swiper-dot` | 已安装待验证 | 轮播指示点 | 当前业务没有轮播需求 | 暂无项目内用例 |
| [uni-countdown](../src/uni_modules/uni-countdown/readme.md) v1.2.5<br>`uni-countdown` | 已安装待验证 | 明确倒计时 | 当前业务不以倒计时驱动状态；不可伪造紧迫感 | 暂无项目内用例 |
| [uni-dateformat](../src/uni_modules/uni-dateformat/readme.md) v1.0.0<br>`uni-dateformat` | 已安装待验证 | 纯展示的相对时间 / 日期格式化 | 业务日期口径仍以 `src/utils/date.ts` 为准 | 暂无项目内用例 |

## 特定业务语义与基础支持

| 本地包 / 可用标签 | 状态 | 可优先考虑的场景 | 关键边界 | 项目内用例 |
|---|---|---|---|---|
| [uni-goods-nav](../src/uni_modules/uni-goods-nav/readme.md) v1.2.1<br>`uni-goods-nav` | 按明确需求使用 | 商品详情底部购买 / 购物车导航 | 盒记不是电商商品页；不能拿来替代订单确认区 | 暂无项目内用例 |
| [uni-scss](../src/uni_modules/uni-scss/readme.md) v1.0.3 | 按明确需求使用 | uni-ui 全局 SCSS 支持 | 不是可渲染组件；沿用现有 token 与 Sass 配置 | 暂无项目内用例 |
| [uni-ui](../src/uni_modules/uni-ui/readme.md) v1.5.12<br>`uni-ui` | 按明确需求使用 | uni-ui 聚合 / 基础包 | 不是具体交互控件；应从上方具体包选择 | 暂无项目内用例 |

## 维护检查

- 以 `src/uni_modules/*/package.json` 为清单来源；包名、版本和本地 README 必须对应真实目录。
- 新项目内用例形成后，把状态改为“已验证”并补充最贴近的路径；不要把“已安装”误写成“已验证”。
- 对每次索引更新，检查 45 个包覆盖、链接路径、`git diff --check`，以及本次真正需要的 Android 回归。
