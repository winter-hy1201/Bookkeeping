# 盒记（HeJi）

> 面向盒饭档口的本地经营记账 App：把客户、菜单、订单、配送、次卡、支出和收支对账放在同一个 Android 应用里，数据保存在设备本地 SQLite，不依赖后端服务。

```text
维护客户 / 菜单 → 录入订单 → 配送时扣次 → 记录支出 → 按日/周/月对账 → JSON 备份
```

盒记不是泛用财务软件，也不是在线点餐平台。它服务的是单人或小型盒饭档口的日常经营闭环：每天快速录单，配送完成后准确扣次，月底能对上收入、支出和利润。

## 当前基线

| 项目          | 当前状态                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| 目标运行端    | Android App（uni-app `app-plus`，侧载使用）                                                                       |
| App 版本      | `3.0.2`（`src/manifest.json`）                                                                                    |
| SQLite schema | v8（`src/db/schema.ts`）                                                                                          |
| 数据位置      | 设备本地 SQLite；Pinia 只做页面缓存                                                                               |
| 页面范围      | 4 个根 Tab、23 个现有路由                                                                                         |
| 验收记录      | 23 个页面和主要业务链路已在 HBuilderX Android 模拟器完成集成验收；物理真机回归仍以 `memory-bank/progress.md` 为准 |

## 能做什么

| 模块     | 能力                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 今日     | 查看今日订单数与份数、收入、支出、利润，以及待配送 / 已配送 / 已取消明细；快捷进入每日菜单           |
| 订单     | 按日期查看午餐 / 晚餐订单；新建、编辑、取消、标记已配送、删除和同餐次拖拽排序                        |
| 客户     | 维护客户档案、午餐 / 晚餐默认价、折扣率、联系方式和历史订单；支持中文姓名拼音分组与检索              |
| 次卡     | 为客户开卡、修改总次数、查看充值记录；配送时按旧卡优先扣次，支持一单跨多张卡                         |
| 支出     | 记录分类、金额、退差 / 退款和备注；详情修改与删除，并实时显示实际支出                                |
| 统计     | 查看今日、本周、本月或自定义日期范围的收入、支出、利润、有效订单数、有效份数、平均每单和支出分类占比 |
| 每日菜单 | 按日期维护午餐 / 晚餐菜品，复制为社群文案                                                            |
| 文案模板 | 维护菜单社群文案模板，支持默认模板、占位符校验、编辑前版本快照和历史恢复                             |
| 月卡文案 | 维护次卡对客文案模板；已配送的次卡订单可复制本次使用份数和配送后的实际剩余份数                       |
| 备份恢复 | 导出完整 JSON 备份，从粘贴文本、已保存备份或本地文件导入；支持三次确认清空并恢复内置模板和默认分类   |

## 几条决定产品行为的规则

- 同一客户、日期和餐次只保留一张有效逻辑订单。待配送订单会合并本次增量；已配送订单阻止继续追加；已取消订单只作为历史记录，不计入统计。
- 支付支持纯微信、纯现金、纯次卡，以及“次卡 + 一种货币渠道”的组合支付。订单金额只记录货币部分，纯次卡订单金额为 0。
- 待配送订单只形成次卡次数预占，不提前扣真实余额；标记已配送时才从客户所有 active 次卡中按旧卡优先扣次。余额不足时整笔事务回滚，不自动改支付方式，也不做部分扣次。
- “月卡”是客户侧称呼，系统底层按次数计费、无有效期；每张卡都是独立充值记录。
- 统计排除已取消订单；收入包含有效订单货币金额和开卡金额，支出按“原始金额 - 退差 / 退款”计算，利润为收入减支出。
- 关键多表写入都在 SQLite 事务中完成；删除已配送次卡订单时会按实际扣次明细精确回滚，存在业务依赖的客户或充值记录不会被直接删除。

## 技术路线

- **框架**：uni-app + Vue 3 + Vite
- **语言**：TypeScript
- **状态**：Pinia；仅缓存当前页面所需数据
- **持久化**：`plus.sqlite`；schema、迁移、种子数据分别位于 `src/db/`
- **UI**：本地维护的 uni-ui 组件、`@lucide/vue` 和 `src/components/HejiIcon.vue`
- **工具**：dayjs 处理日期，big.js 统一处理金额精度，pnpm 管理依赖
- **设计**：暖纸张视觉基线、统一表单和状态语义，详见 [`docs/design.md`](docs/design.md)

## 开始开发

### 1. 安装依赖

需要 Node.js、pnpm；如果要运行真实 Android 数据链路，还需要 HBuilderX 和 Android 设备或模拟器。

```bash
pnpm install
```

### 2. H5 预览与构建

```bash
pnpm dev:h5
pnpm build:h5
```

H5 适合检查页面结构、样式和编译结果。当前项目的 `plus.sqlite` 在 H5 中没有真实原生数据库能力，因此 H5 运行结果不能当作 Android SQLite 验收证据。

### 3. Android 运行

1. 用 HBuilderX 打开本仓库。
2. 确认 `src/manifest.json` 的 `app-plus.modules.SQLite` 已启用。
3. 选择“运行 → 运行到 Android App 基座”，在设备或模拟器中启动。
4. 需要 Release APK 时，使用 HBuilderX 的“发行”流程；仓库当前没有对应的 npm 打包脚本。

SQLite、原生文件选择器、剪贴板和 Android 触摸行为的调试边界，见 [`debug-docs/DEBUG-HANDOFF.md`](debug-docs/DEBUG-HANDOFF.md)。

## 验证命令

```bash
pnpm test
pnpm type-check
pnpm lint
pnpm build:h5
git diff --check
```

这些命令分别覆盖 Node 回归测试、TypeScript、ESLint、H5 构建和 diff 空白检查。修改 SQLite、原生桥、触摸或视觉时，还要按 HBuilderX Android 流程做对应平台验证；CLI 通过不等于真机通过。

## 仓库结构

```text
.
├── src/
│   ├── pages/              # 今日、订单、统计、我的及其业务子页
│   ├── api/                # 数据访问和业务写入；多表流程在这里使用 tx()
│   ├── db/                 # SQLite 连接、schema、迁移和 seed
│   ├── stores/             # Pinia 页面缓存与刷新编排
│   ├── components/         # AmountInput、CustomerPicker、StatCard、HejiIcon 等
│   ├── utils/              # 日期、金额、订单规则、模板、备份等工具
│   ├── types/              # domain / API 类型
│   └── manifest.json        # App 元数据、Android 配置和 SQLite 模块
├── tests/                  # Node 回归测试、SQLite 冒烟测试和页面契约测试
├── docs/                   # UI 规范、已批准设计、参考图和第三方许可
├── memory-bank/            # 产品设计、架构、进度、变更日志和 DB 基线
├── debug-docs/             # Android / plus.sqlite 调试交接记录
└── package.json            # 开发、构建、测试和检查脚本
```

## 从哪里继续读

- [`AGENTS.md`](AGENTS.md)：仓库运行规则、业务不变量、改动边界和证据要求
- [`CONTEXT.md`](CONTEXT.md)：次卡、月卡、模板和 UI 术语定义
- [`memory-bank/design-document.md`](memory-bank/design-document.md)：产品数据模型、状态机、关键流程和统计口径
- [`memory-bank/architecture.md`](memory-bank/architecture.md)：代码库文件职责和架构基线
- [`memory-bank/progress.md`](memory-bank/progress.md)：当前进度、已验证项和待验证项
- [`memory-bank/CHANGELOG.md`](memory-bank/CHANGELOG.md)：按版本记录的功能、修复和已知限制
- [`docs/ui-reference/README.md`](docs/ui-reference/README.md)：23 个页面的 UI 参考图与路由索引
- [`docs/third-party-licenses.md`](docs/third-party-licenses.md)：Lucide 和本地 uni-ui 组件的许可边界

## 当前不包含

盒记当前是本地单用户工具，不提供账号体系、云同步、多设备数据合并、在线点餐、支付网关或远程后台。卸载 App 可能导致设备内数据丢失，请通过“备份恢复”主动导出 JSON 并妥善保存。
