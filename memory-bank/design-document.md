# 盒记 — 产品设计文档

> 基于 PRD v1.0 持续维护；最近更新：2026-07-22 组合支付 / 一餐一单 / 次卡预占

---

## 0. 修订说明

### 0.1 已确认决策（用户回复）

| # | 决策 | 选项 |
|---|---|---|
| D1 | 订单模型 | **同一客户 + 日期 + 餐次 = 1 张有效订单**；重复新增按增量合入 pending 订单 |
| D2 | 次卡范围 | **包午餐 + 晚餐**（一次扣次） |
| D3 | 次卡不足 | **同单组合支付**：次卡次数由用户填写，剩余份数只允许微信或现金一种渠道 |
| D4 | 配送费 | **不收，统一价** |

### 0.2 设计中采用的默认假设（请用户确认，见 §8）

| # | 假设 | 一句话描述 |
|---|---|---|
| A1 | 次卡扣次时机 | ✅ **配送完成时扣次**（创建订单时不扣；次卡状态变化统一在配送节点） |
| ~~A2~~ | ~~取消订单次卡返还~~ | 🗑️ **已废除**：A1 改为"配送完成才扣"后，取消 pending 订单时次卡从未被扣过，无需返还 |
| A3 | 备份导入策略 | 全量覆盖（不做增量合并） |
| A4 | 统计口径 | 自然周（周一-周日）+ 自然月（1 号-月底） |
| A5 | 客户身份 | 1 客户 = 1 微信身份（不支持家庭复合账户） |
| A6 | 客户默认单价 + 折扣 | ✅ 客户表维护 `default_lunch_price` / `default_dinner_price` 和 `discount_rate`；订单录入时自动填入 `默认价 × 折扣率`，用户可手动覆盖 |
| A7 | 期初投资 | 不做（假设从今天开始记账） |
| A8 | 删除策略 | ✅ **硬删除 + 回滚已产生副作用**；例如已配送次卡订单删除时同步扣回次卡 `used_meals`，客户有订单 / 次卡依赖时拒绝删除 |

---

## 1. 信息架构

### 1.1 页面 / 导航

```
[Tab 1] 今日 Dashboard（默认首页）
   ├─ 今日概览（订单数/收入/支出/利润）
   ├─ 今日订餐明细（待配送 / 已配送 / 已取消 分组）
   └─ 即将用完的次卡提醒（remaining <= 3）

[Tab 2] 订单
   ├─ 订单列表（默认筛选"今天"，可切日期；午餐/晚餐内可在拖拽把手上滑动 ≥10px 触发同餐次内排序）
   ├─ 空态可直接新建当前所选日期的首单
   ├─ [+] 新建订单 → 按“对象 → 份数与支付 → 金额 → 备注”分区的录入表单
   └─ 点击订单 → 订单详情（编辑 / 标记已配送 / 取消）

[Tab 3] 统计
   ├─ 时间筛选（今日 / 本周 / 本月 / 自定义）
   ├─ 关键数字（入账收入 / 支出 / 利润 / 有效订单 / 平均每单收入）
   ├─ 收支 / 利润趋势（每个日期同时展示入账、支出、利润）
   └─ 支出分类占比（条形图）

[Tab 4] 我的
   ├─ 客户管理
   │   ├─ 客户列表
   │   ├─ [+] 新建客户
   │   └─ 客户详情 → 编辑 / 开次卡 / 充值记录 / 历史订单
   ├─ 支出管理
   │   ├─ 支出列表
   │   ├─ [+] 新建支出
   │   └─ 支出分类管理
   └─ 设置
       ├─ 备份 / 恢复
       ├─ 关于
       └─ 危险区：清空数据
```

### 1.2 导航原则

- **Tab 1 Dashboard**：用户最高频（"今天赚/亏了多少"），一屏看完
- **Tab 2 订单**：第二高频（每晚集中录单 + 次日配送标记）
- **Tab 3 统计**：周/月复盘用，非每日必看
- **Tab 4 我的**：客户 / 支出 / 设置是低频操作

---

## 2. 数据模型

### 2.1 表结构

```sql
-- 客户
CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,                     -- 姓名/微信昵称
  phone TEXT,                             -- 可空
  wechat TEXT,                            -- 可空，建议填
  default_lunch_price REAL,               -- 默认午餐单价（可空：空则录入时手动填）
  default_dinner_price REAL,              -- 默认晚餐单价（可空）
  discount_rate REAL NOT NULL DEFAULT 1.0,-- 折扣率，1.0=原价，0.9=9 折，0=免单
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_customers_name ON customers(name);

-- 次卡（典型 20 次，按"次"计费，无有效期）
CREATE TABLE meal_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  total_meals INTEGER NOT NULL,           -- 总次数（典型 20）
  used_meals INTEGER NOT NULL DEFAULT 0,  -- 已用次数
  amount REAL NOT NULL,                   -- 开卡金额（记为收入）
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'depleted'
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX idx_cards_customer ON meal_cards(customer_id);
CREATE INDEX idx_cards_status ON meal_cards(status);

-- 次卡扣次明细（保留每笔配送实际扣了哪些卡，便于删除回滚）
CREATE TABLE meal_card_usages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  meal_card_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (meal_card_id) REFERENCES meal_cards(id)
);
CREATE INDEX idx_card_usages_order ON meal_card_usages(order_id);
CREATE INDEX idx_card_usages_card ON meal_card_usages(meal_card_id);

-- 订单
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,               -- 'YYYY-MM-DD'
  meal_type TEXT NOT NULL,                -- 'lunch' | 'dinner'
  quantity INTEGER NOT NULL DEFAULT 1,    -- 份数
  sort_order INTEGER NOT NULL DEFAULT 0,  -- 当天同餐次内拖拽排序号，0=未手动排序
  unit_price REAL NOT NULL,               -- 单价（按订单记，避免菜单变价影响历史）
  amount REAL NOT NULL,                   -- 仅货币部分金额 = (quantity - meal_card_quantity) × unit_price
  payment_method TEXT NOT NULL,           -- 'wechat' | 'cash' | 'meal_card'
  meal_card_id INTEGER,                   -- 参考卡 / 配送时首张实际扣次卡
  meal_card_quantity INTEGER NOT NULL DEFAULT 0 CHECK (meal_card_quantity >= 0),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'delivered' | 'cancelled'
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  cancelled_at TEXT,                      -- 取消时间（用于审计 / 排查）
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (meal_card_id) REFERENCES meal_cards(id)
);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_card ON orders(meal_card_id);
CREATE INDEX idx_orders_date_status ON orders(order_date, status);
CREATE INDEX idx_orders_date_meal_sort ON orders(order_date, meal_type, sort_order);

-- 支出分类
CREATE TABLE expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,              -- '菜品' '工具' '耗材' '配送' '其他'
  icon TEXT,                              -- emoji 或图标名
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0   -- 1=默认分类（不可删）
);

-- 支出
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,                    -- 原始支出金额
  refund_amount REAL NOT NULL DEFAULT 0,   -- 退差金额，统计时冲减支出
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

### 2.2 设计点说明

**orders 表**：
- 同一 `customer_id + order_date + meal_type` 只允许一张非 cancelled 有效订单；新写入由事务内查询维护，历史异常数据不加唯一索引强行覆盖
- `meal_card_quantity` 表示本单承诺使用的次卡次数；货币份数 = `quantity - meal_card_quantity`
- `amount = 货币份数 × unit_price` 存冗余（查询时不用每次计算）；纯次卡订单为 0
- `unit_price` 记在订单上 → 菜单调价不影响历史订单
- `sort_order` 只用于订单列表拖拽排序；按 `order_date + meal_type` 分组生效，不参与金额、统计或状态流转
- `payment_method='meal_card'` 仅表示纯次卡；组合支付时为唯一的 `wechat` / `cash` 补款渠道
- `meal_card_id` 记录参考卡 / 本单首张实际扣次卡；精确扣次以 `meal_card_usages` 为准
- `cancelled_at` 独立字段 → 用于审计 / 排查（不再用于次卡返还，因 A1 后次卡扣次移到配送节点）

**customers 表**（A6 调整后）：
- `name`：应用层按 `trim()` 后精确判重，重复姓名不可新增；编辑时允许保持当前客户原姓名。
- `default_lunch_price` / `default_dinner_price`：分别记录客户的午餐/晚餐默认单价（可空，空则录入时手动填）
- `discount_rate`：折扣率，1.0=无折扣，0.9=9 折，0=免单（用于给指定客户折扣价）
- 订单录入时的单价优先级：**用户手动输入** > 客户默认价 × 折扣率 > 留空让用户填

**订单的 unit_price 计算**：
- 一张订单只保留一个实际单价；有货币部分时，全部货币份数共用该单价
- 默认取客户餐次默认价 × 折扣率，可由用户手动覆盖
- 纯次卡且客户未配置默认价时，才以最早可用次卡的 `amount / total_meals` 作为参考单价；其 `amount` 仍为 0
- 重复新增合并时若新旧单价不同，必须二次确认并展示旧单价、新单价、受影响货币份数和重算金额

**meal_cards 表**：
- `total_meals` 典型 20，亦可 30 / 50；按"次"计费，无有效期
- `used_meals` 实时维护：**配送完成时** 按客户所有 active 次卡余额池扣 `orders.meal_card_quantity`（创建订单不实扣；pending 取消不返还）
- `status` 状态机：active → depleted（次数用完）
- 不存"剩余金额" → 次卡是固定次数模型，不是储值卡
- 每条 `meal_cards` 都是一笔独立充值记录；允许校正 `total_meals`，但新值不得小于 `used_meals`，且修改后的客户余额池不得小于全部 pending 订单预占；不回溯修改 `amount` / `created_at` / `meal_card_usages`

**meal_card_usages 表**：
- 每条记录表示某个已配送订单从某张次卡扣了多少次，包括组合支付中的次卡部分。
- 支持一单跨多张卡扣次（例如旧卡剩 1 次、新卡剩 18 次、订单 quantity=2 → 两条 usage）。
- 删除已配送且 `meal_card_quantity > 0` 的订单时按 usage 精确回滚；旧备份 / 旧库迁移会按历史 `orders.meal_card_id + quantity` 自动补一条 usage。

**expense_categories 表**：
- `is_default=1` 的分类初始化时插入，运行时不可删（防误操作）
- `icon` 字段 v1 用 emoji（🥬 菜品 / 🔧 工具 / 📦 耗材 / 🛵 配送 / 💰 其他），v1.1 换图标库

**expenses 表**：
- `amount` 记录原始支出金额，必须大于 0。
- `refund_amount` 记录退差 / 退款金额，默认 0，允许等于 `amount`，但不可大于 `amount`。
- 统计口径统一使用 `amount - refund_amount` 作为实际支出；列表和详情页也展示实际支出，避免与统计页对不上。

### 2.3 初始化数据（首次启动 seed）

```sql
INSERT INTO expense_categories (name, icon, sort_order, is_default) VALUES
  ('菜品', '🥬', 1, 1),
  ('工具', '🔧', 2, 1),
  ('耗材', '📦', 3, 1),
  ('配送', '🛵', 4, 1),
  ('其他', '💰', 5, 1);
```

---

## 3. 状态机

### 3.1 订单状态

```
              创建
               ↓
          [pending]  ← 默认
            ↓     ↓
   标记已配送   取消订单
            ↓     ↓
      [delivered]  [cancelled]
      
规则：
- pending → delivered：用户点"标记已配送"（**触发次卡扣次 + 次卡状态检查**，见 §4.3）
- pending → cancelled：用户点"取消订单"（次卡订单无需返还，见 §4.2）
- delivered → cancelled：禁止（v1 不做退款流程，避免状态机爆炸）
```

### 3.2 次卡状态

```
              创建
               ↓
          [active]
              ↓
          次数用完
              ↓
          [depleted]

规则：
- active → depleted：**配送完成时**检查 `used_meals >= total_meals`
- depleted → active：买新卡（旧卡保留为历史）
- 次卡无过期概念（按"次"计费，不绑时间）

时序：次卡在订单创建时**不扣次**，仅在配送完成时扣（见 §4.3）
```

---

## 4. 关键流程

### 4.1 创建订单

```
[+] 新建订单
   ↓
┌──────────────────────────────────────┐
│ 客户  [搜索 / 新建 ▼]               │
│ 餐次  ◉ 午餐  ○ 晚餐                │
│ 本次新增份数 [2]                     │
│ 支付  ○ 微信 ○ 现金 ○ 次卡 ○ 组合    │
│ 组合  次卡次数[1] + 补款方式[微信]   │
│ 单价  [¥25.00]                       │
│ 补款  ¥25.00（自动）                 │
│ 次卡  实际剩余 / 其他预占 / 当前可用 │
│ 备注  [____________________]         │
│         [保存]                       │
└──────────────────────────────────────┘
   ↓
事务（一次提交）：
  1. 查询同一 customer_id + order_date + meal_type 的非 cancelled 订单
  2. delivered 已存在 → 拒绝；pending 已存在 → 进入增量合并
  3. 校验支付形态与次卡预占：实际剩余 - 其他 pending 预占 >= 保存后所需次数
  4. 无 pending → INSERT；有 pending → 保留原 ID / sort_order，累加份数与次卡次数并合并备注
  5. 微信 / 现金渠道冲突 → 拒绝；单价变化 → 返回旧/新价格预览，用户确认后重试
  6. **不修改 meal_cards.used_meals**，只由 pending 订单字段形成逻辑预占
  7. COMMIT
   ↓
提示"保存成功"或"已合并到原订单"，回到订单列表
```

**支付与预占不变量**：
- 纯微信 / 现金：`meal_card_quantity=0`，`amount=unit_price × quantity`
- 纯次卡：`meal_card_quantity=quantity`，`payment_method='meal_card'`，`amount=0`
- 组合支付：`0 < meal_card_quantity < quantity`，`payment_method` 只允许 `wechat` / `cash`
- 用户主动选择组合支付时，次卡次数预填 1 次，仍可在合法范围内调整；系统不按次卡余额自动进入组合支付，也不自动切换支付方式
- 页面先给行内提示，API 仍在事务内重新校验，避免并发 / 缓存绕过

### 4.2 取消订单

```
订单详情 → [取消订单]
   ↓
确认弹窗：
  "确认取消该订单？取消后不计入收入/订单数。"
  [确认] [再想想]
   ↓
事务：
  1. UPDATE orders SET status='cancelled', cancelled_at=now
  2. **无需次卡返还**（A1 调整后，配送前未扣次，见 §4.3）
  3. COMMIT
```

注：v1.0 取消订单不影响次卡（次卡在配送完成时才扣次，pending 取消时未扣过）。

### 4.3 标记已配送

```
订单列表 / 订单详情 → [标记已配送]
   ↓
事务：
  1. UPDATE orders SET status='delivered', updated_at=now
  2. UPDATE orders SET sort_order = 同日同餐次最大 sort_order + 1
  3. 若 meal_card_quantity > 0：
     - 汇总客户所有 active 次卡剩余次数（余额池）
     - 若总剩余 < meal_card_quantity → 整个事务回滚
     - 按 created_at ASC / id ASC 旧卡优先扣次，允许跨卡扣同一单
     - 每张被扣的卡写入 meal_card_usages(order_id, meal_card_id, quantity)
     - UPDATE meal_cards SET used_meals = used_meals + 扣次
     - 单张卡用完时自动置 status='depleted'
  4. COMMIT
   ↓
提示"已标记配送"，订单从"待配送"列表移除
```

注：配送完成后会自动排到订单列表中同日同餐次的最后一位；该行为复用 `orders.sort_order`，不影响金额、统计或次卡扣次口径。

**异常分支（配送时余额意外不足）**：
- 订单状态、排序、已写 usage 与任何部分扣次全部随事务回滚
- 弹窗展示“订单需要 N 次，当前可用 M 次”，提供“去编辑支付”入口
- 不自动把整单改为微信 / 现金，不做部分扣次；用户在编辑页重新分配后再次配送

### 4.4 备份 / 恢复

**导出**：
```
设置 → 备份 → 导出
   ↓
   1. 全表查询 → 序列化为 JSON：
      {
        "version": "1.0",
        "exported_at": "2026-06-09T22:00:00Z",
        "schema_version": 5,
        "customers": [...],
        "meal_cards": [...],
        "orders": [...],
        "meal_card_usages": [...],
        "expense_categories": [...],
        "expenses": [...]
      }
   2. plus.io 写入应用沙盒：`_doc/backup_YYYYMMDD_HHmmss.json`
   3. 复制一份到 `_downloads/backup_YYYYMMDD_HHmmss.json`
   4. toast 提示保存路径，用户可在文件管理里直接找到备份文件
```

**导入**（A3：全量覆盖）：
```
设置 → 备份 → 导入
   ↓
   1. 三种入口任选其一：
      - 粘贴 JSON 文本
      - 从 `_doc/backup_*.json` 已保存备份列表选择
      - 从本地 JSON 文件选择器读取（Android App 端用系统 Intent；其他端 fallback 到 `uni.chooseFile`）
   2. 解析 JSON + 校验 schema_version：当前 v5 直接导入；v1-v4 补齐缺失字段并按 v5 规则升级；无效或高于当前版本时报错"备份文件版本不兼容"
   3. 二次确认："导入将覆盖所有现有数据，无法恢复。是否继续？"
   4. 事务：
      DELETE FROM meal_card_usages / orders / expenses / meal_cards / customers / expense_categories
      INSERT 新数据
   5. 提示"导入成功，请重启 App 刷新缓存"
```

**清空数据**：
```
设置 → 危险区 → 清空所有数据
   ↓
   1. 三次确认
   2. 事务：
      DELETE orders / expenses / meal_cards / customers / expense_categories
      重新 seed 5 个默认支出分类
   3. 提示"已清空"
```

注：默认支出分类是系统参考数据。清空后要恢复 5 个默认分类，保证下一次进入"新增支出"仍可直接选择分类。

### 4.5 开次卡

```
客户详情 → [开次卡]
   ↓
表单：
  - 总次数 [20]   ← 默认 20
  - 金额 [¥300]   ← 按总次数算
  - 备注 [____________________]
   ↓
事务：
  1. INSERT INTO meal_cards（status='active'）
  2. 计入"次卡收入"，直接按 amount 累加到当日"收入"统计
   ↓
提示"开卡成功"，客户详情显示次卡进度
```

> 注：次卡收入在开卡时一次性记入，"当日利润"中的"收入" = 当日 orders 金额 + 当日新开次卡金额。

### 4.6 删除与副作用回滚

```
详情页 → [删除]
   ↓
确认弹窗："删除后无法恢复"
   ↓
事务：
  1. 读取当前记录
  2. 若记录已产生业务副作用，先回滚副作用
     - 已配送次卡订单：按 meal_card_usages 逐张回滚 used_meals，并按剩余次数恢复 active/depleted
     - 微信 / 现金订单：删除订单本身即可，统计通过查询自然少算该笔收入
     - 支出：删除支出本身即可，统计通过查询自然少算该笔支出
  3. DELETE 当前记录
  4. COMMIT
```

**客户删除保护**：
- 客户被 `orders` 或 `meal_cards` 引用时拒绝删除，避免破坏历史订单、次卡与外键完整性。
- 无依赖客户才允许硬删除。

**统一原则**：后续所有删除功能默认采用"硬删除 + 回滚已产生副作用"；如果某类数据无法安全回滚，删除入口必须拒绝并给出可读提示。

### 4.7 查看充值记录与校正总次数

```
客户详情 → [充值记录]
   ↓
按 created_at DESC / id DESC 展示该客户全部 meal_cards
   ↓
点击某笔充值记录 → 修改 total_meals
   ↓
事务：
  1. 读取原次卡
  2. 校验新 total_meals 为正整数且 >= used_meals
  3. 计算修改后的客户总剩余，并校验 >= 该客户全部 pending 订单的 meal_card_quantity 预占
  4. total_meals = used_meals 时 status='depleted'，否则 status='active'
  5. 只更新 total_meals + status
  6. COMMIT
```

修改总次数是对原充值记录的数据校正：不新建充值收入，不修改已用次数和历史扣次明细，不重算历史订单。调大已用完次卡的总次数时，该卡恢复为 active 并重新进入客户余额池。

---

## 5. 统计与计算口径

### 5.1 时间口径

| 维度 | 范围 |
|---|---|
| 今日 | order_date / expense_date = 今天（按设备本地时区） |
| 本周 | 周一 00:00 ~ 周日 23:59（自然周） |
| 本月 | 1 号 00:00 ~ 月底 23:59（自然月） |
| 自定义 | 用户选起止日期（YYYY-MM-DD） |

### 5.2 关键指标公式

| 指标 | 公式 |
|---|---|
| **收入** | Σ(orders.amount) WHERE status != 'cancelled' AND order_date IN range  **+**  Σ(meal_cards.amount) WHERE created_at IN range |
| **订单数** | COUNT(orders) WHERE status != 'cancelled' AND order_date IN range |
| **客单价** | 收入 / 订单数 |
| **份数** | Σ(orders.quantity) WHERE status != 'cancelled' AND order_date IN range |
| **支出** | Σ(expenses.amount - expenses.refund_amount) WHERE expense_date IN range |
| **利润** | 收入 - 支出 |
| **次卡使用率** | meal_cards.used_meals / meal_cards.total_meals（按卡） |
| **某客户消费** | Σ(orders.amount) WHERE customer_id=X AND status != 'cancelled' AND order_date IN range |

组合支付不改变统计公式：`orders.amount` 已只包含微信 / 现金部分，次卡收入仍在开卡时通过 `meal_cards.amount` 一次性计入，不能在配送时重复计收。

### 5.3 金额精度保证

- 上述所有 Σ / 减法 / 乘除运算**禁止 JS 原生 `+ - * /`**；必须走 `src/utils/format.ts` 的 `addMoney / subtractMoney / multiplyMoney / divideMoney / roundMoney`（内部基于 big.js，输出强制 `toFixed(2)`，避免 IEEE 754 浮点尾数污染对账）。
- SQLite 字段类型仍为 `REAL`（存浮点），但所有 JS 侧读出后立即过 helper，落到 UI / 写入前都已是干净的 2 位小数 number。
- 该规则由 `AGENTS.md §10 禁止清单` 强约束；具体精度自测与背景见 `memory-bank/CHANGELOG.md v1.5`。

### 5.3 取消订单处理

- 不计入收入、订单数、份数
- 仍在订单列表显示（带"已取消"标签 + 灰显）
- **不影响次卡次**（次卡扣次在配送完成时，取消时未扣过）

---

## 6. UI 草图（文字版）

### 6.1 Dashboard（首页 Tab 1）

```
┌────────────────────────────────────┐
│  今日 · 6/9 周二                   │
├────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐        │
│  │订单│ │收入│ │支出│ │利润│        │
│  │ 28 │ │¥420│ │¥180│ │+240│        │
│  └────┘ └────┘ └────┘ └────┘        │
├────────────────────────────────────┤
│  今日订餐（28 单）                  │
│  ⏳ 待配送 12  ✅ 已配送 14  ❌ 2   │
├────────────────────────────────────┤
│  • 张三    午餐×2   ¥30   ⏳        │
│  • 李四    晚餐×1   ¥18   ⏳        │
│  • 王五    午餐×1   次卡  ⏳        │
│  ...                               │
├────────────────────────────────────┤
│  ⚠️ 次卡即将用完                    │
│  • 赵六（剩 2 次）                   │
└────────────────────────────────────┘
```

### 6.2 订单录入表单（Tab 2 新建）

- 新建页以高频录单为主：紧凑“配送安排”始终显示日期和餐次，随后是一张连续录单卡；客户、份数、支付、金额、备注按决策顺序排列。原有 `<uni-forms>` 校验、合并确认和次卡可用次数校验不变。
- 微信 / 现金 / 次卡是一级选择；份数大于 1 才出现组合支付入口。用户主动进入组合支付时，次卡次数预填 1 次，并可用步进器调整；剩余份数、补款渠道和金额随之计算，系统不自动改为次卡。
- 有货币部分时，实际单价直接显示输入框；选定客户后带入默认或已有订单单价，用户可立即覆盖。备注是一行常显输入，不折叠。
- 页面后台预检同键订单和次卡余额；pending 显示将合并的紧凑提示，delivered 阻断新增，单价变化才二次确认。底部固定确认区展示金额 / 支付摘要和当前缺失项；保存成功后弹窗选择继续下一单（只清本次字段）或结束录单（回到当前日期列表）。

```
┌────────────────────────────────────┐
│  ← 新建订单                        │
├────────────────────────────────────┤
│  配送安排 [2026-07-22] [午餐 / 晚餐]│
│  客户  [🔍 搜索或新建 ▼ 张三 (9折)]│
│  本次新增份数 [− 2 +]               │
│  支付  ○ 微信 ○ 现金 ○ 次卡          │
│        [组合支付：次卡 + 微信/现金] │
│  组合  次卡次数[− 1 +]               │
│        补款方式 [微信 / 现金]       │
│  次卡  可用 2 次 · 本次要用 1 次    │
│  实际单价 [¥ 13.50____________]     │
│  备注  [不要葱、送到前台________]   │
├────────────────────────────────────┤
│  本次实际金额 ¥13.50                │
│  次卡 1 次 · 1 份微信支付 [保存订单]│
└────────────────────────────────────┘
```

### 6.3 统计页（Tab 3）

```
┌────────────────────────────────────┐
│  经营对账 · 收支与利润              │
│  周期: [本周] [本月] [自定义]      │
├────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │入账│ │支出│ │利润│ │有效订单│   │
│  │¥2.8k│¥1.2k│+1.6k│ 186 │       │
│  └────┘ └────┘ └────┘ └────┘       │
│  平均每单收入 ¥15.05                │
├────────────────────────────────────┤
│  收支 / 利润趋势（按日）            │
│  周一  入账 █████  ¥420             │
│        支出 ███    ¥180             │
│        利润 ███    +¥240            │
├────────────────────────────────────┤
│  支出分类                          │
│  菜品  ████████  ¥800 (67%)        │
│  耗材  ███       ¥300 (25%)        │
│  配送  █         ¥100  (8%)        │
└────────────────────────────────────┘
```

### 6.4 客户详情（Tab 4 → 客户 → 点击某客户）

```
┌────────────────────────────────────┐
│  ← 张三                  [编辑]    │
├────────────────────────────────────┤
│  📱 微信 zhangsan                  │
│  📞 138-0000-0000                  │
│  💰 午餐 ¥15 / 晚餐 ¥18 / 9 折     │
│  📝 不吃辣                         │
├────────────────────────────────────┤
│  次卡                                │
│  ┌──────────────────────────────┐  │
│  │ #3  剩 5/20                  │  │
│  │ 进度 ████░░░░░░  25%        │  │
│  └──────────────────────────────┘  │
│  [+ 开新卡]                         │
├────────────────────────────────────┤
│  历史订单（28 单）                  │
│  • 6/9  午餐×2   ¥30   ✅          │
│  • 6/8  午餐×1   次卡  ✅          │
│  ...                               │
└────────────────────────────────────┘
```

---

## 7. 扩展点（v1.x / v2.0 预留）

### 7.1 v1.0 内预留字段
- `orders.note`：备注字段，v1 简单文本，v1.1 可做模板
- `expense_categories.icon`：v1 emoji 即可，v1.1 换图标库
- `customers.phone`：可空，v1.1 加"一键拨号"按钮

### 7.2 v1.1 候选
- CSV 单表导出（按 orders / expenses）
- 支出分类自定义图标
- 订单备注模板（"加辣"/"不要葱"等）
- 今日菜单默认单价预填

### 7.3 v1.2 候选
- 局域网 HTTP 同步（同一 WiFi 下两台设备互推）

---

## 8. 待确认事项（TBD 清单）

### 8.1 设计中已采用的默认假设

| 编号 | 假设 | 状态 |
|---|---|---|
| **A1** | 次卡扣次时机 = **配送完成时扣** | ✅ 已确认 |
| ~~A2~~ | ~~订单取消自动返还次卡次~~ | 🗑️ 已废除（配送前未扣次，无需返还） |
| **A3** | 备份导入 = 全量覆盖 | 待确认 |
| **A4** | 统计 = 自然周/月 | 待确认 |
| **A5** | 1 客户 = 1 微信身份 | 待确认 |
| **A6** | 客户默认单价 + 折扣率 | ✅ 已确认 |
| **A7** | 无期初投资功能 | 待确认 |
| **A8** | 删除策略 = **硬删除 + 回滚已产生副作用** | ✅ 已确认 |

### 8.2 产品决策待确认

- [ ] 仪表盘"今日利润"是否对比"昨日"百分比？
- [ ] 客户列表是否需要搜索 / 拼音首字母排序？
- [ ] 订单列表默认按"今天"还是"全部"？
- [ ] 仪表盘"次卡即将用完"提醒阈值是几次？（建议 remaining <= 3）
- [ ] 取消订单是否区分"配餐前取消"和"配餐后取消"（v1.1）？
- [ ] 订单导出 CSV 时是否需要包含客户名（关联查询）？
- [ ] 客户有 `default_lunch_price` 但今天临时涨价时，用户在订单录入表单的"实际价"字段直接覆盖即可，需要在 UI 上加提示吗？
- [ ] 折扣率只支持单一数字（如 0.9），还是支持"满 X 减 Y"等更复杂规则？（v1.0 用简单折扣率即可）

### 8.3 已知技术风险

| 风险 | 缓解措施 |
|---|---|
| plus.sqlite 在低端 Android 设备不稳定 | 关键写入加事务 + 异常重试提示 |
| 大量订单时统计慢 | 复合索引 (order_date, status) + 量 >10K 时切离线缓存 |
| 备份 JSON 文件不可见 | 导出同时写 `_doc/` 和 `_downloads/`，toast 展示保存路径；不走系统分享 |
| App 卸载后数据丢失 | 建议每周导出，v1.1 加定时提醒 |
| 创建 / 编辑时次卡被其他 pending 订单占用 | 页面展示预占明细，API 在事务内按“实际剩余 - 其他预占”二次校验 |
| 配送时次卡次数意外不足 | 整个事务回滚，弹窗展示所需 / 可用次数并引导去编辑支付，不自动改单 |

### 8.4 v1.0 明确不做（已记录，留待后续决定）

> 2026-06-10 记录：以下功能 design 提到但 plan 暂未做。不算 bug，是范围决策的占位。

| # | 功能 | 当前位置 | 当前决定 | 未来若要做 |
|---|---|---|---|---|
| **A** | 支出分类管理（增删改自定义分类）| `§1.1 我的 → 支出 → 支出分类管理`；Step 4.6 明确"v1.0 不暴露 add/edit/delete" | **不纳入 v1.0**（5 个默认分类够用）| 新增 Step 7.19（CRUD 分类页）+ plan 头部调整 |
| **B** | "关于"页（版本号、版权、联系方式）| `§1.1 我的 → 设置 → 关于` | **不纳入 v1.0** | 新增 Step 7.20（约 30 分钟工作）|
| **C** | "清空数据"危险区独立页 | `§1.1 我的 → 设置 → 危险区：清空数据` | **保持塞在 Step 7.18 backup 页**作为子按钮 | 新增 Step 7.21（独立危险区页）|

---

## 9. 文件位置

```
docs/
└── PRD.md                    # 产品需求（已定稿，不改动）

memory-bank/                  # 活文档区（AI 协作）
├── design-document.md        # 本文件
├── tech-stack.md
├── implementation-plan.md
├── progress.md               # 实施进度
├── architecture.md           # 架构基线
└── CHANGELOG.md              # 决策变更记录（v1.0 完成时新建）
```
