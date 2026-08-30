# 盒记 UI 重构接力交接

## 接力目标

在新的 Codex 工作区中打开代码仓库 `D:\07_Code\Bookkeeping`，接替已审核 UI 参考图的生产代码重构。当前阶段的重点不是继续生图，而是把已确认的 Claude-inspired warm paper / 低饱和陶土色视觉方向转译为可维护的 uni-app Android UI，同时保持现有业务行为不变。

## 当前状态

- 代码仓库分支：`main`
- 当前 HEAD：`591a5eb`
- 23 个页面的审核版参考图已经迁入 `docs/ui-reference/images/`，每张均为精确 `375×812` PNG。
- 仓库中没有迁入 `*-source.png`；这些原始生图文件不是 UI 实施所需资产。
- 页面、路由、选定版本和图片文件的完整对应关系见 `docs/ui-reference/README.md`。
- 已确认视觉方向的完整提示词事实源见 `docs/ui-image-generation-prompts.md`。它用于解释视觉意图，不替代代码、业务文档或组件规范。
- 尚未修改任何业务页面代码，也没有提交或推送。

接手时工作树并非干净状态，先检查 diff，不要重置或覆盖：

- `M memory-bank/architecture.md`
- `M memory-bank/progress.md`
- `?? docs/ui-image-generation-prompts.md`
- `?? docs/ui-reference/`
- `?? .claude/settings.local.json`（原有未跟踪文件，本次迁移未修改）

## 必读顺序与事实源

1. `AGENTS.md`：仓库规则、业务边界、验证方式。
2. `memory-bank/architecture.md`：架构与长期约束。
3. `docs/design.md`：当前代码实现所遵循的设计规范。
4. `docs/ui-reference/README.md`：23 页参考图、路由和版本映射。
5. 当前要改页面对应的 `docs/ui-reference/images/*.png`。
6. `docs/ui-image-generation-prompts.md`：已审核视觉方向及各页的画面意图。
7. `docs/uni-modules-ai-index.md`：新增或重做交互前检查可复用模块。
8. 目标页面源码、相关共享组件及本地 uni-ui 文档。

不要在交接文档中复制上述长文档内容；实施时直接以仓库中的最新版本为准。

## 首要设计冲突

审核版参考图采用温暖纸张底色、低饱和陶土橙、克制阴影和编辑感排版；现有 `docs/design.md` 与 `src/uni.scss` 仍主要描述当前蓝色强调色和既有组件基线。开始批量改页面前，必须先明确如何把审核方向落实为代码级设计契约，并同步必要的 token、共享壳层和 `docs/design.md`。

不要悄悄混用两套视觉语言，也不要把参考图当作可逐像素照抄的实现规范。发生冲突时，优先级为：现有业务行为和字段 > 仓库规则与业务文档 > 可维护的组件结构 > 参考图视觉表达。

## 建议实施路线

### 1. 现场审计与最小方案

- 检查 `src/uni.scss`、全局页面壳层、底部导航、表单、按钮、卡片、状态标签等复用点。
- 对照 23 页映射，确认哪些视觉变化可由共享 token/组件覆盖，哪些必须留在页面局部。
- 先给出小范围、可验证的设计契约更新，不直接一次性重写 23 页。

### 2. 第一个可验证切片

- 先实现共享颜色、间距、圆角、边框/阴影、排版和页面背景等基础 token。
- 先覆盖 01–06 基线页面：今日、订单、新建订单、订单详情、统计、我的。
- 重点验证根页面 Tab、子页面无 Tab、表单连续白色表面、单一最强主动作，以及 05 统计页“有效订单”同时显示订单数、份数和单位。
- 基线切片通过后，再沉淀必要的共享组件；不要为尚未出现的需求预建抽象层。

### 3. 后续页面族

- 07–11：客户与客户详情相关页面。
- 12–14：支出页面族。
- 15–22：菜单、菜品和模板页面族。
- 23：备份管理。

每个页面族完成后立即做视觉和行为验证，避免在全量修改后才集中发现布局偏差。

## 不可改变的边界

- 不新增登录、云同步、银行卡、订阅、AI 助手或其他不存在的产品能力。
- 不因视觉重构改变数据库、业务字段、计算口径、路由语义或返回行为。
- 业务表单继续使用 `<uni-forms>` 与 `<uni-forms-item>`；不要改回散落的原生输入控件。
- 只有根页面显示四栏 Tab，子页面不得出现底部 Tab。
- 状态颜色必须同时有文字；不能只用颜色表达状态。
- 每屏只保留一个视觉上最强的主动作。
- 参考 PNG 只用于设计对照，不作为 App 运行时图片资产。
- 保留用户已有未提交改动；除非用户明确要求，不提交、不推送、不重写历史。

## 验证与验收

- 在 `375×812` 视口逐页对照参考图，检查布局密度、文字层级、金额、份数、单位、支付方式、状态、导航和主动作。
- 检查长中文、空状态、错误状态、键盘弹出、滚动和返回行为，不能只验证静态首屏。
- 按改动范围运行仓库现有检查：`pnpm test`、`pnpm type-check`、`pnpm lint`、`pnpm build:h5`。
- H5 检查不能替代 Android 验证；重要切片需通过 HBuilderX 在 Android 端检查视觉、触控和系统返回。
- 实施改变设计契约、架构或进度后，同步更新 `docs/design.md`、`memory-bank/architecture.md` 和 `memory-bank/progress.md` 中确实受影响的部分。
- 最终复查 diff，确认没有无关格式化、临时文件、敏感信息或误改业务逻辑。

## 建议使用的 Skills

- `frontend-design`：把审核版视觉方向转译为有辨识度、可维护的生产 UI。
- `awesome-design-md`：仅在需要进一步核对 Claude 风格原则或收敛 token 时使用；现有参考图和提示词已是本项目已确认方向。
- `browser:control-in-app-browser`：运行 H5 后，以 `375×812` 视口检查页面和交互。
- `code-review`：每个切片完成后，按仓库规范与视觉目标双轴复核变更。
- `neat-freak`：全部实施完成后，收口设计文档、规则、进度记录和工作区残留。
- `handoff`：若重构跨会话继续，生成下一份短交接，避免重复扫描和上下文丢失。

除非用户要求重新调整参考图，否则不需要调用 `imagegen`。

## 新工作区首条建议指令

> 在 `D:\07_Code\Bookkeeping` 工作区接手已审核的 UI 重构。先完整读取 `AGENTS.md`、`memory-bank/architecture.md`、`docs/design.md`、`docs/ui-reference/README.md` 和 `docs/ui-image-generation-prompts.md`，检查当前 dirty worktree，并对照 `src/uni.scss` 说明 Claude warm paper 参考方向与现有实现规范的差异。提出最小分阶段实施方案，不要直接批量修改 23 页；先完成共享 token/页面壳层与 01–06 基线页的首个可验证切片。保持现有业务行为和未提交改动，不提交或推送，并按仓库规则运行相关检查。

