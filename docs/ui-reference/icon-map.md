# 盒记 UI 参考图标映射

本文记录 23 张参考图与当前页面实现之间的图标对应关系，作为 `HejiIcon` 注册表和逐页视觉复核的索引。图标名称均使用 `@lucide/vue@1.38.0` 的原始导出名；业务页面通过 `src/components/HejiIcon.vue` 渲染，原生 TabBar 使用由同一组 Lucide 节点生成的静态 PNG。

## 统一边界

- 图标只辅助文字、状态或对象识别；纯图标动作仍保留可读 label。
- 支出分类继续读取 SQLite 中的 Lucide 原始名称并通过 `resolveLucideIconName()` 动态渲染，不把参考图中的内容 emoji 写回数据库。
- 参考图出现但当前领域模型没有的字段（例如地址、送达备注或支付渠道）不凭图新增；订单详情和客户详情只补充已有微信、手机、备注等字段的图标。
- 模板正文、社群文案和用户输入中的 emoji 属于内容，继续保留。
- 参考图中没有对应真实行为的装饰性入口不新增点击处理；支出列表的“按时间”仅作为当前列表排序口径的静态指示。

## 逐页映射

| ID / 页面 | 当前图标映射 | 处理边界 |
|---|---|---|
| 01 今日 | 社群菜单 `ClipboardList`；订单 `ClipboardList`；收入 `WalletCards`；支出 `ShoppingBag`；利润 `ChartNoAxesCombined`；待配送 `Clock3`；已配送 `CircleCheck`；已取消 `CircleAlert` | 保留真实统计和订单状态链路；空态沿用 `ClipboardList` |
| 02 订单列表 | 日期 `CalendarDays`；新建 `Plus`；折叠 `ChevronDown` / `ChevronRight`；拖拽 `GripVertical`；空态 `ClipboardList`；刷新 / 错误 `RefreshCw` / `CircleX` | 拖拽事件、折叠状态和排序持久化不变；状态标签继续使用文字 |
| 03 新建订单 | 午餐 `CookingPot`；晚餐 `Moon`；微信 `MessageCircle`；现金 `Banknote`；次卡 `Ticket`；组合支付 `Wallet`；步进 `Minus` / `Plus` | 日期、客户和数字步进器继续由现有本地组件承载；不改变支付规则 |
| 04 订单详情 | 状态 `Clock3` / `CircleCheck` / `CircleAlert`；编辑 `SquarePen`；微信 / 手机 `MessageCircle` / `Phone`；配送 `Bike`；复制 `Copy`；取消 / 删除 `Trash2` | 只为现有联系人和动作补图标；参考图中的地址等未建模字段不新增 |
| 05 统计 | 收入 `WalletCards`；支出 `ShoppingBag`；利润 `ChartNoAxesCombined`；有效订单 `ClipboardList`；刷新 / 错误 `RefreshCw` / `CircleX` | 支出分类仍使用数据库中的动态 Lucide 名称；日期控件沿用 `CalendarDays` |
| 06 我的 | 菜单管理 `CookingPot`；文案模板 `FileText`；月卡文案模板 `Ticket`；客户管理 `UsersRound`；支出管理 `WalletCards`；备份 / 恢复 `DatabaseBackup`；入口箭头 `ChevronRight` | 6 个入口的路由和返回现场不变 |
| 07 客户管理 | 搜索 `Search`；新增 `Plus`；列表进入 `ChevronRight` | 客户头像继续显示真实的“次 / 普”身份文字，不用图标替代业务状态 |
| 08 客户档案 | 页面继续使用表单标签和控件自身的清除图标 `X` | 参考图没有需要新增的页面专属业务图标；字段和校验不变 |
| 09 客户详情 | 编辑 `SquarePen`；手机 / 微信 `Phone` / `MessageCircle`；午餐价 / 晚餐价 `CookingPot` / `Moon`；折扣 `Tag`；备注 `StickyNote`；充值记录 `FileText`；开新卡 `Plus`；订单状态 `Clock3` / `CircleCheck` / `CircleAlert`；删除 `Trash2` | 只覆盖现有客户、次卡和订单字段；地址、送达备注等参考字段不新增 |
| 10 开次卡 | 次数步进 `Minus` / `Plus`；余额提示 `Info`；底部次数 / 入账 `Ticket` / `WalletCards` | 开卡、修改总次数和金额规则不变 |
| 11 充值记录 | 空态 / 卡片 `Ticket`；日期 `CalendarDays`；记录 `FileText`；进入修改 `ChevronRight`；不可删除 `Ban`；删除 `Trash2` | 参考图中的支付渠道仅在领域模型有字段时展示；当前不虚构支付方式 |
| 12 支出管理 | 日期 `CalendarDays`；新建 `Plus`；分类图标动态读取数据库；排序指示 `ArrowDownUp` / `ChevronDown` | “按时间”是当前列表口径的非交互指示，不新增未实现的排序切换行为 |
| 13 新建支出 | 分类图标动态读取数据库；金额 `CircleDollarSign` + `¥`；退差帮助 `CircleHelp` 与金额 `CircleDollarSign`；控件清除 `X` | 只增加识别辅助图标；金额、退差校验和保存流程不变 |
| 14 支出详情 | Hero 分类图标动态读取数据库；金额 / 退差 `CircleDollarSign`；退差帮助 `CircleHelp`；删除 `Trash2`；危险区箭头 `ChevronRight` | 支出净额计算、编辑和删除边界不变 |
| 15 每日菜单 | 模板入口 `FileText`；日期 `CalendarDays`；午 / 晚餐 `Sun` / `Moon`；复制 / 编辑 / 删除 `ClipboardCopy` / `Pencil` / `Trash2`；新建 `Plus` | 菜单正文中的 emoji 仍按内容原样保留 |
| 16 新建或编辑菜单 | 说明 `NotebookPen`；复制 `ClipboardCopy`；保存状态 `FileCheck2`；日期和返回使用现有控件 | 保存、复制、删除和日期冲突行为不变 |
| 17 文案模板列表 | 新建 `Plus`；提示 `Info`；进入 `ChevronRight`；默认 `Star`；编辑 / 历史 / 删除 `Pencil` / `History` / `Trash2` | 参考图中的更多操作若无对应行为不新增空点击入口 |
| 18 文案模板编辑 | 插入 `Plus`；校验告警 `CircleAlert` / `CircleX`；校验成功 `CircleCheck` | 模板语法和版本快照不变 |
| 19 模板历史 | 文档 `FileText`；历史 `History`；恢复 `RefreshCw`；提示 `Lightbulb` | 恢复确认与默认状态边界不变 |
| 20 月卡文案模板列表 | 新建 `Plus`；提示 `Info`；进入 `ChevronRight`；默认 `Star`；编辑 / 历史 / 删除 `Pencil` / `History` / `Trash2`；说明 `Lightbulb` | 独立月卡模板数据边界不变 |
| 21 月卡文案模板编辑 | 插入 `Plus`；校验告警 `CircleAlert` / `CircleX`；校验成功 `CircleCheck` | 月卡占位符校验和预览不变 |
| 22 月卡模板历史 | 文档 `FileText`；历史 `History`；恢复 `RefreshCw`；提示 `Lightbulb` | 恢复确认和版本快照不变 |
| 23 备份与恢复 | 导出 `Upload`；恢复 `Download`；已保存备份 `List`；本地文件 `FolderPlus`；危险区 `TriangleAlert`；检查项 `ShieldCheck`；清空 `Trash2` | 三入口暂存、导入覆盖确认、三次清空确认和事务边界不变 |

## 原生 TabBar

`src/pages.json` 的四栏保持原生 TabBar，图标文件位于 `src/static/tabbar/`：

| Tab | Lucide 来源 | 普通态 / 选中态 |
|---|---|---|
| 今日 | `House` | `today.png` / `today-active.png` |
| 订单 | `ClipboardList` | `orders.png` / `orders-active.png` |
| 统计 | `ChartNoAxesCombined` | `stats.png` / `stats-active.png` |
| 我的 | `UserRound` | `me.png` / `me-active.png` |

PNG 使用透明背景、普通态 `#87867F`、选中态 `#C96442`；子页面不显示 TabBar，继续使用系统返回导航。
