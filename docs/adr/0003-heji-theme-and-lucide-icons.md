# 盒记主题与 Lucide 图标统一

**状态：已采纳**

盒记的 UI 统一使用暖纸张语义 token 和本地 Lucide 图标。页面主题继续由 `$hej-*` token 提供 Sass 值，同时暴露同源 CSS 变量给组件内联样式和本地 uni-ui 组件使用。输入框、选择项和金额控件使用独立的暖象牙色控件表面，明确区分默认、聚焦、禁用、错误和按下状态。

图标使用固定版本的 `@lucide/vue`，业务页面通过 `HejiIcon` 使用 Lucide 的原始导出名称，例如 `CalendarDays`、`Utensils` 和 `CircleCheck`。运行时可以保留静态导入解析表以保证 tree-shaking，但不再维护 `meal.lunch` 之类的业务语义图标别名。由于 Android app-plus WebView 在当前基座中不能稳定绘制内联 SVG，`HejiIcon` 会从同一份 Lucide 原始节点生成 CSS mask；图标仍通过 `currentColor` 继承页面语义色。内容正文中的 emoji 仍然保留。

本项目把 `src/uni_modules` 视为随项目维护的本地组件源码，允许直接修改 `uni-easyinput`、`uni-data-checkbox`、`uni-data-select`、`uni-datetime-picker`、`uni-number-box` 和 `uni-collapse-item`，不再以未来上游升级兼容为目标。输入框、选择器、日期面板、步进按钮和折叠箭头直接采用盒记控件主题与 Lucide 图形；`uni-data-checkbox` 提供选项内容插槽，页面可以在现有表单控件中插入 Lucide 图形。

`expense_categories.icon` 当前统一保存 Lucide 原始名称。schema v8 迁移把已存在的五个系统分类 emoji 转为对应的 Lucide 名称，旧备份导入也在写入前归一化；模板正文、社群文案和用户输入中的 emoji 仍按内容原样保留。

## Considered Options

- 继续使用 `uni-icons`：本地图标数量和视觉风格受限，不能稳定覆盖业务对象与状态。
- 运行时使用 Iconify API：引入网络、缓存和图标集许可证的不确定性，不适合本地 SQLite App。
- 每个页面直接导入 Lucide：会让图标尺寸、fallback 和可访问性逐页漂移。
- 仅用 CSS 覆盖 uni-ui：只能修复颜色，不能为无插槽的选择项提供统一图形内容。
- 固定 `@lucide/vue` + `HejiIcon`，并直接维护本地 uni-ui 源码：统一渲染入口、离线打包和主题状态，代价是本地组件补丁需要随项目维护，因此采用。

## Consequences

- 业务页面不再新增或保留直接使用 `uni-icons` 的代码；尚未被业务页带出的通用 uni-ui 组件可以继续保留兼容依赖。
- 旧数据库和备份中的五个系统分类 emoji 只作为迁移输入保留兼容，迁移 / 导入完成后这些系统分类的持久化值统一为 Lucide 名称；无法识别的自定义值不猜测改写，界面按 fallback 渲染。
- `@lucide/vue` 使用 ISC 许可证；App-plus 图标已在 HBuilderX Android 模拟器确认 CSS mask 的尺寸、颜色和实际绘制，物理真机视觉与触摸回归仍需单独执行。
- 组件源码修改可能在未来手动同步上游时产生冲突；项目索引和许可证记录必须同步维护。
