# 盒记全页面 UI 图生成提示词

> 为下一轮全页面视觉重设计生成 Android 高保真概念图。本文只用于视觉探索，不代表当前代码已经实现；业务流程、字段和页面范围仍以现有代码与产品文档为准。

## 1. 视觉方向

主方向采用 **Claude-inspired warm paper operations**：借鉴 Claude 的暖纸张底色、象牙白表面、墨黑正文、克制陶土色与编辑感衬线标题，结合 Android 高频经营工具所需的信息密度与操作效率；不复制 Claude / Anthropic 的品牌、Logo、文案或网页端布局。

盒记是盒饭档口经营者的高频操作工具，不是银行、SaaS 后台或生活方式 App。视觉目标是：一眼看清今天有多少单、多少份、哪些还没送；单手快速连续录单；晚上快速核对收入、支出和利润。

| 角色 | 颜色 | 用途 |
|---|---|---|
| 页面画布 | #F5F4ED | 暖纸张底色 |
| 主表面 | #FAF9F5 | 卡片、列表、详情 |
| 高对比输入面 | #FFFFFF | 输入框、编辑器 |
| 主文字 | #141413 | 标题、金额、核心数字 |
| 次文字 | #5E5D59 | 说明、时间、辅助信息 |
| 三级文字 | #87867F | 弱提示、占位信息 |
| 边界 | #E8E6DC | 1px 暖灰边界、分隔线 |
| 深色表面 | #30302E | 极少量高对比控件 |
| 陶土主色 | #C96442 | 唯一主 CTA、小面积选中态 |
| 暖沙浅面 | #E8E6DC | 次动作、轻提示、选中底色 |
| 待配送 | #657789 / #EEF1F3 | 克制的待处理状态 |
| 已配送 | #64745B / #EEF0E8 | 克制的完成状态 |
| 已取消 / 提醒 | #8A6843 / #F3EADC | 取消与提醒 |
| 危险 | #8D4545 / #F6EAEA | 删除、不可逆动作 |

页面标题和重要区块标题可使用 Noto Serif SC，字重 500–600；所有功能文字、数字、表单、按钮和底部导航使用 Noto Sans SC、HarmonyOS Sans SC 或 Android 系统无衬线体。页面标题 24–28sp、500–600；核心金额 30–36sp、700；区块标题 17–19sp、600–700；正文 14–16sp、400–500。使用 8dp 网格、16dp 页面边距、52–56dp 行高、至少 48dp 触摸目标；控件圆角 10–12dp，卡片 10–14dp，按钮避免夸张胶囊形。卡片只用暖灰细边界或近乎不可见的轻阴影。

## 2. 使用方法

每次只生成一个页面，依次拼接：**母提示词 + 对应页面提示词 + 负面提示词**。

先生成「今日、订单列表、新建订单、订单详情、统计、我的」6 张基准图，确认色板、字体、密度、按钮与导航后，再生成其他页面，避免 23 张图风格漂移。

## 3. 母提示词

> Design one production-ready, high-fidelity Android mobile app UI screen for “盒记 HeJi”, a Chinese offline bookkeeping app for a small boxed-meal stall. The operator uses it for taking orders, delivering meals, and reconciling income and expenses. Use an exact logical design canvas of 375×812 px, portrait, edge-to-edge app screenshot, no phone mockup, no marketing poster. Treat 375 px as the standard mobile design width while retaining native Android status, navigation, safe-area, and component conventions; do not introduce iPhone-only UI.
>
> Use a Claude-inspired warm-paper editorial visual language adapted for a fast Android operational tool: warm paper canvas #F5F4ED, ivory surfaces #FAF9F5, white #FFFFFF only for high-contrast inputs, near-black text #141413, secondary text #5E5D59, tertiary text #87867F, warm-gray borders #E8E6DC, and restrained terracotta #C96442 only for the single primary action and small selected accents. Use Warm Sand #E8E6DC for subtle selected or secondary surfaces. Use Noto Serif SC only for the main page title or major section headings at weight 500–600; use Noto Sans SC, HarmonyOS Sans SC, or Android system sans for all functional text, numbers, tabs, labels, and buttons. Keep highly legible numbers, medium-high information density, an 8dp grid, 16dp gutters, 10–14dp card radius, 10–12dp control radius, restrained rounded rectangles, 1px warm ring borders, and whisper-light shadows.
>
> Keep business status colors muted and separate from the terracotta action color: pending delivery slate #657789 on #EEF1F3, delivered olive-gray #64745B on #EEF0E8, cancelled or warning brown #8A6843 on #F3EADC, destructive red #8D4545 on #F6EAEA. Never use color as the only signal; pair each state with exact Chinese text or a simple outline icon.
>
> The UI must feel made for a real Chinese food-stall owner: quick to scan, one-handed, calm, trustworthy, practical, friendly. Show realistic Chinese content and amounts. Preserve one clear primary action per screen. Use thin outlined icons with rounded ends, not emoji except existing expense category emoji. Use a native Android status bar and restrained app navigation bar. Root screens have the four-tab bottom navigation “今日 / 订单 / 统计 / 我的”; child screens have a back arrow and no bottom tabs.
>
> All visible Chinese text must be sharp, correctly spelled, and exactly match requested labels. Build a real application interface, not a concept poster. Respect Android safe areas. Do not invent login, cloud account, bank card, subscription, social feed, AI assistant, or e-commerce features.

## 4. 负面提示词

> No Claude or Anthropic logo, no copied Claude branding or product copy, no bright lime, vivid green, saturated blue brand accents, colorful icon tiles, cool-gray main canvas, English navigation, gibberish Chinese, dark mode, glassmorphism, neon glow, gradient background, skeuomorphism, heavy shadows, floating-card overload, excessive empty space, oversized website hero typography, dashboard sidebar, desktop layout, iPhone-only components, tiny touch targets, low-contrast gray text, decorative stock illustration, pie chart, 3D chart, fake bank balance, credit card, cloud-sync status, user avatar profile, bottom tabs on child pages, more than one dominant CTA, truncated amounts, extra business fields, or any unrequested quick action.

## 5. 核心闭环

### 01 今日 — pages/index/index

> Header “今日”, date “8月29日 周六”, subtitle “订单、收支和配送状态”. Add a slim Warm Sand shortcut “社群菜单 / 维护每日菜单并复制文案”. Show a compact 2×2 grid: “订单 12单 · 18份”, “收入 ¥468.00”, “支出 ¥126.50”, “利润 ¥341.50”. Below show “今日订餐 / 12单”, status summaries “待配送 4单 / 6份”, “已配送 7单 / 11份”, “已取消 1单 / 1份”, then grouped rows such as “王阿姨 / 午餐 × 2 / ¥30.00” and “李师傅 / 午餐 × 1 / 次卡”. Bottom tabs highlight 今日. Do not add a “记一笔” or any other unrequested action.

### 02 订单列表 — pages/order/index

> Top toolbar: date selector “2026年8月30日” and one compact terracotta rounded-rectangle button “＋ 新建订单”. Show expandable “午餐 8单 · 11份” and “晚餐 4单 · 7份”. Each dense row has a drag handle, customer, textual state chip and a wrapping subtitle with full facts: “午餐 · 2份 · 次卡1次 + 微信1份 · ¥15.00 · 不要葱，送到前台”. Use muted slate 待配送, muted olive-gray 已配送, muted brown 已取消. Do not place a separate amount block at far right. Bottom tabs highlight 订单.

### 03 新建订单 — pages/order/new

> Child screen “新建订单”. Use one continuous ivory form surface with an 80dp aligned label column: 日期 “2026-08-30”, 餐次 “午餐 / 晚餐”, 客户 “王阿姨”, 新增份数 stepper 2, 支付 “微信 / 现金 / 次卡”, secondary entry “组合支付 / 次卡 + 微信或现金”, 实际单价 “¥ 15.00”, one-line 备注 “不要葱、送到前台”. Show a compact restrained slate notice “将合并到已有待配送订单 #128” with “查看已有订单”. Fixed bottom bar: “本次实际金额 ¥30.00 / 微信支付 · 新增2份” and one terracotta “保存订单”.

### 04 订单详情 — pages/order/detail

> Read-only pending order. Hero “王阿姨”, contact “微信：wangayi”, muted slate “待配送”, outline “编辑”. Panel “订单详情 / 配送与收款记录” with 日期、餐次、支付、次卡次数、微信支付份数、实际单价、实际金额、备注. Second panel “客户联系 / 仅用于配送沟通”. Make “标记已配送” the only terracotta primary button; “复制信息” and “取消订单” are secondary; “删除订单” is isolated in a red danger zone.
>
> Variant: edit state uses the same continuous form as 新建订单, label “总份数”, four payment choices “微信 / 现金 / 次卡 / 组合支付”, and a fixed bar with “取消编辑” plus “保存修改”.

### 05 统计 — pages/stats/index

> Header eyebrow “经营对账”, title “收支与利润”, subtitle “按选定日期核对入账、支出和当天利润”. Pill tabs “今日 / 本周 / 本月 / 自定义”, 本月 selected. 2×2 metrics: 入账收入 ¥8,420.00, 支出 ¥2,368.50, 利润 ¥6,051.50, 有效订单 “226单 · 318份”; the 有效订单 card must show both order count and meal-portion count with the exact units “单” and “份”. Add row “平均每单收入 ¥37.26”. “收支 / 利润趋势” uses simple horizontal bars for 入账、支出、利润 with exact right-aligned amounts. “支出分类” uses bars such as “食材 ¥1,286.00 · 54%”. No pie chart. Bottom tabs highlight 统计.

### 06 我的 — pages/me/index

> No profile avatar. Header “我的”, subtitle “菜单、客户、支出和数据备份”. Use grouped list rows with line icons, title, one-line description, chevron: 菜单管理、文案模板、月卡文案模板、客户管理、支出管理、备份 / 恢复. Use subtle icon surfaces, not colorful large tiles. Bottom tabs highlight 我的.

## 6. 客户与次卡

### 07 客户管理 — pages/me/customers/list

> Search field “搜索姓名、微信、手机或拼音” plus a compact terracotta add button. Alphabetical groups A、L、W with slim right-side A–Z index. Each row has a neutral circular identity label “次” or “普”, name, contact, optional badge “9折”, chevron. Examples: 阿珍 / azhen88 / 9折, 李师傅 / 138****2186, 王阿姨 / wangayi. Dense ivory list with separators.

### 08 客户档案 — pages/me/customers/new

> Continuous form with 80dp labels: 姓名 “周老师”, 手机 “138 0000 2468”, 微信 “zhoulaoshi”, 午餐价 “¥ 15.00”, 晚餐价 “¥ 18.00”, 折扣 “90%”, 备注 “周一到周五配送”. Helper under prices “留空则录单时手动输入”. One terracotta bottom action “新建客户”; edit variant uses “保存修改”.

### 09 客户详情 — pages/me/customers/detail

> Hero “王阿姨”, secondary “wangayi”, outline 编辑. First panel lists 手机、微信、午餐价、晚餐价、折扣、备注. “次卡” panel has “充值记录” and “＋ 开新卡”, summary “剩余14 / 总计40次”, “2张使用中”, progress bar. “历史订单（12单）” shows date, meal, quantity, state, amount. Isolate 删除客户 in a danger zone.

### 10 开次卡 — pages/me/customers/open-card

> Customer “王阿姨”. Continuous form: 总次数 stepper 20, 金额 “¥300.00”. Warm Sand note “当前可用14次，开卡后余额将合并统计”. Bottom summary “本次增加20次 / 入账¥300.00”, terracotta “确认开卡”.
>
> Edit variant title “修改充值记录”; compact summary for 充值金额、充值日期、已用次数、当前状态、修改后剩余; only 总次数 editable with “最少6次”; action “保存修改”.

### 11 充值记录 — pages/me/customers/card-records

> Header “次卡充值记录”, “王阿姨 · 共3笔”. Record cards show amount, date, textual state “使用中 / 已用完”, equal metrics “总次数20 / 已用6 / 剩余14”, footer “记录 #36 / 修改总次数 ›”. Deletion is separated: used record shows disabled “已有扣次，不能删除”; unused record shows red outline “删除这笔记录”.

## 7. 支出

### 12 支出管理 — pages/me/expenses/list

> Date selector “2026年8月29日” plus one compact terracotta “＋ 新建支出”. Date heading “8月29日 周六”. Compact rows use existing category emoji in neutral circles, category, note, optional refund explanation and net amount: “🥬 食材 / 今日蔬菜 / ¥86.50”, “📦 耗材 / 打包盒200个 / ¥120.00”, “🛵 交通 / 原支出¥36.00 · 退差¥6.00 / ¥30.00”. No charts or invented budget.

### 13 新建支出 — pages/me/expenses/new

> Continuous aligned form: 日期 “2026-08-29”, 分类 “🥬 食材”, 金额 “¥100.00”, 退差 “¥13.50”, 备注 “今日蔬菜”. Compact calculation row “实际支出 ¥86.50”. Fixed bottom summary and one terracotta “保存支出”.

### 14 支出详情 — pages/me/expenses/detail

> Restrained amount hero “¥86.50”, meta “🥬 食材 · 2026年8月29日”. Same editable form as 新建支出. One terracotta “保存修改”. Put “删除支出” in a separate red danger zone with explanatory text, not beside the primary action.

## 8. 每日菜单

### 15 每日菜单 — pages/me/menus/list

> Header “每日菜单”, subtitle “按日期维护，套用默认模板后复制到社群”, one compact terracotta “新建菜单”. Rounded-rectangle switch “当前 / 历史”, 当前 selected with Warm Sand surface. Linked row “文案模板 / 管理默认模板与历史版本 ›”. Date cards show 午餐 and 晚餐 multiline dishes, actions “复制文案 / 编辑 / 删除”. Keep dates and food content stronger than actions.

### 16 新建 / 编辑菜单 — pages/me/menus/edit

> Intro “安排一天的菜单”, explanation “午餐、晚餐至少填写一项；支持换行补充主食、汤品或临时说明。” Continuous form: 日期、午餐 multiline、晚餐 multiline with realistic dishes. Fixed bar says “菜单可以保存 / 2026-08-30”, with secondary “保存并继续下一天” and one terracotta “保存菜单”. Edit variant can show “复制文案”; deletion remains isolated.

## 9. 社群文案模板

### 17 文案模板列表 — pages/me/menu-templates/list

> Header “文案模板”, subtitle “默认模板会直接用于每日菜单复制”, one compact terracotta “新建模板”. Warm Sand syntax note explains only date and available meal sections are replaced. Template cards show name “日常午晚餐”, Warm Sand “默认”, update time, readable body preview, actions “设为默认 / 编辑 / 历史 / 删除”. Raw syntax should not resemble an IDE.

### 18 新建 / 编辑社群文案 — pages/me/menu-templates/edit

> Intro “新建社群文案”. Continuous form: 名称 “日常午晚餐”, large 正文 editor. “插入模板内容” panel has compact chips “日期 / 午餐区块 / 晚餐区块 / 内置正文”. Signature preview is an ivory paper surface with a 3px terracotta left border, title “社群文案预览”, meta “使用示例菜品”, fully rendered Chinese message. Fixed bar “模板格式正确 / 保存编辑后，旧内容会进入历史版本”, one terracotta “保存模板”.

### 19 模板历史 — pages/me/menu-templates/history

> Header “历史版本” and explanation that restoring creates a new current version without erasing history. Chronological cards show template name, timestamp, badge “历史3”, multiline body and secondary “恢复此版本”. Newest first; no danger red.

## 10. 月卡文案模板

### 20 月卡文案模板列表 — pages/me/meal-card-templates/list

> Header “月卡文案模板”, subtitle “默认模板会用于订单详情的月卡信息复制”, one compact terracotta “新建模板”. Note “套餐说明直接写在正文中，只替换配送后的次数信息”; show required chips “本次使用份数” and “当前可用份数”. Template cards use the same grammar as 社群模板 but clearly remain an independent system.

### 21 新建 / 编辑月卡模板 — pages/me/meal-card-templates/edit

> Intro explains both count placeholders are mandatory. Continuous form: 名称 “标准月卡通知”, large 正文 editor. Insert compact chips “本次使用份数 / 当前可用份数 / 内置正文”. Signature preview with a terracotta left border: “月卡文案预览”, “示例：本次1份 · 当前14份”, rendered message. Fixed bar “模板格式正确”, one terracotta “保存模板”. Error variant replaces preview with “模板还不能保存” and a precise missing-placeholder reason.

### 22 月卡模板历史 — pages/me/meal-card-templates/history

> Same visual grammar as 模板历史, but month-card wording. Cards show name, timestamp, badge “历史2”, multiline body and “恢复此版本”. Placeholder text remains readable Chinese with only a subtle Warm Sand inline highlight.

## 11. 数据安全

### 23 备份 / 恢复 — pages/me/settings/backup

> Three sections with progressively stronger risk. “备份” explains export to JSON and has one terracotta “导出备份”. “恢复” explains full replacement, provides “从已保存备份选择”, “从本地文件选择”, JSON paste area “粘贴 backup_*.json 内容”, and disabled-until-ready “导入覆盖”. Muted pale-red “危险区” explains three confirmations and built-in defaults, with red outline “清空所有数据”. Do not imply cloud backup.

## 12. 通用状态追加词

空态：

> Render the empty state instead of populated content. It must say what is empty, what that means, and the next action. Example: “这一天还没有订单 / 新建后会按午餐、晚餐分组显示 / 新建第一单”. Use a simple outline icon, no decorative illustration, never only “暂无数据”.

加载 / 失败：

> Render loading or recoverable error inside the existing content area without changing layout. Use object-specific text such as “正在读取订单…”. Error offers “重新加载”. Never show empty-state wording while loading.

表单校验：

> Show one realistic validation error directly below its field. Retain user input, disable the primary action, and explain the exact missing or conflicting item in the bottom summary. No generic toast-only error.

危险确认：

> Show a native-feeling Android confirmation dialog with dimmed backdrop. Title names the object, body states concrete impact and recoverability, “取消” is neutral, and the red action uses an exact label such as “删除订单” or “清空所有数据”.

## 13. 一致性检查

- 仍是盒记现有 23 个页面之一，没有新增业务入口。
- 根页面才有四栏 Tab，子页面只有返回导航。
- 只有一个视觉上最强的主动作。
- 陶土色只用于唯一主动作与小面积选中态，没有铺满大面积背景；暖纸张画布、象牙白表面、暖灰边界贯穿所有页面。
- 待配送、已配送、取消、危险都有文字，不只靠颜色。
- 金额、份数、次卡次数、支付渠道完整且不矛盾。
- 表单字段处于连续表面，标签与控件从统一基线开始。
- 删除与常规操作分区，备份 / 恢复没有暗示云同步。
- 中文可读、无乱码、无英文占位，触摸目标至少 48dp。
- 画面像真实 Android App 截图，不是手机模型、落地页或设计海报。
