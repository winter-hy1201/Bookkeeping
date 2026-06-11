# 盒记 — 产品设计文档

> 基于 PRD v1.0 + 4 项关键决策确认 · 2026-06-09 · 待用户 review

---

## 0. 修订说明

### 0.1 已确认决策（用户回复）

| # | 决策 | 选项 |
|---|---|---|
| D1 | 订单模型 | **1 订单 = 1 餐，可含多份**（加 quantity 字段） |
| D2 | 次卡范围 | **包午餐 + 晚餐**（一次扣次） |
| D3 | 次卡用完 | **超出部分按单点价另开单** |
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

---

## 1. 信息架构

### 1.1 页面 / 导航

```
[Tab 1] 今日 Dashboard（默认首页）
   ├─ 今日概览（订单数/收入/支出/利润）
   ├─ 今日订餐明细（待配送 / 已配送 / 已取消 分组）
   └─ 即将用完的次卡提醒（remaining <= 3）

[Tab 2] 订单
   ├─ 订单列表（默认筛选"今天"，可切日期）
   ├─ [+] 新建订单 → 订单录入表单
   └─ 点击订单 → 订单详情（编辑 / 标记已配送 / 取消）

[Tab 3] 统计
   ├─ 时间筛选（今日 / 本周 / 本月 / 自定义）
   ├─ 关键数字（收入 / 支出 / 利润 / 订单数 / 客单价）
   ├─ 收入趋势（按日条形图）
   └─ 支出分类占比（条形图）

[Tab 4] 我的
   ├─ 客户管理
   │   ├─ 客户列表
   │   ├─ [+] 新建客户
   │   └─ 客户详情 → 编辑 / 开次卡 / 历史订单
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

-- 订单
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,               -- 'YYYY-MM-DD'
  meal_type TEXT NOT NULL,                -- 'lunch' | 'dinner'
  quantity INTEGER NOT NULL DEFAULT 1,    -- 份数
  unit_price REAL NOT NULL,               -- 单价（按订单记，避免菜单变价影响历史）
  amount REAL NOT NULL,                   -- 总价 = quantity × unit_price
  payment_method TEXT NOT NULL,           -- 'wechat' | 'cash' | 'meal_card'
  meal_card_id INTEGER,                -- payment_method='meal_card' 时必填
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
  amount REAL NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
```

### 2.2 设计点说明

**orders 表**：
- `quantity × unit_price = amount` 存冗余（查询时不用每次计算）
- `unit_price` 记在订单上 → 菜单调价不影响历史订单
- `meal_card_id` + `payment_method='meal_card'` 配对 → 次卡订单可追溯
- `cancelled_at` 独立字段 → 用于审计 / 排查（不再用于次卡返还，因 A1 后次卡扣次移到配送节点）

**customers 表**（A6 调整后）：
- `default_lunch_price` / `default_dinner_price`：分别记录客户的午餐/晚餐默认单价（可空，空则录入时手动填）
- `discount_rate`：折扣率，1.0=无折扣，0.9=9 折，0=免单（用于给指定客户折扣价）
- 订单录入时的单价优先级：**用户手动输入** > 客户默认价 × 折扣率 > 留空让用户填

**次卡订单的 unit_price 计算（与 A6 脱钩）**：
- 次卡订单的 `unit_price` = `meal_card.amount / meal_card.total_meals`（即次卡内含的"次均单价"）
- 例：20 次卡 ¥300 → 次均 ¥15/份
- **不享受 customer.discount_rate**（次卡已是预付价，再打折会亏损）
- 普通订单和次卡订单的 `unit_price` 走两条独立计算路径

**meal_cards 表**：
- `total_meals` 典型 20，亦可 30 / 50；按"次"计费，无有效期
- `used_meals` 实时维护：**配送完成时** +quantity（A1 调整后，创建订单不扣次；pending 取消不返还）
- `status` 状态机：active → depleted（次数用完）
- 不存"剩余金额" → 次卡是固定次数模型，不是储值卡

**expense_categories 表**：
- `is_default=1` 的分类初始化时插入，运行时不可删（防误操作）
- `icon` 字段 v1 用 emoji（🥬 菜品 / 🔧 工具 / 📦 耗材 / 🛵 配送 / 💰 其他），v1.1 换图标库

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
│ 份数  [2]                            │
│ 单价  [¥15.00]                       │
│ 合计  ¥30.00（自动）                 │
│ 支付  ○ 微信  ○ 现金  ◉ 次卡         │
│ 次卡  [次卡 #3 剩余 20/20 ▼]         │
│ 备注  [____________________]         │
│         [保存]                       │
└──────────────────────────────────────┘
   ↓
事务（一次提交）：
  1. INSERT INTO orders（payment_method='meal_card' 时填入 meal_card_id）
  2. **不扣次卡次、不检查次卡余额**（A1 调整后，移到配送完成时，见 §4.3）
  3. COMMIT
   ↓
提示"保存成功"，回到订单列表
```

**次卡余额检查时机**（D3：超出按单点价另开单）：
- 创建订单时**不检查**次卡余额（避免阻塞下单）
- 次卡余额检查统一移到"标记已配送"时（见 §4.3），若次卡不足再引导用户改支付方式或取消

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
  2. 若 payment_method='meal_card'：
     - 校验 `used_meals + quantity <= total_meals`（不够则走异常分支）
     - UPDATE meal_cards SET used_meals = used_meals + quantity
     - 若 used_meals >= total_meals → 自动置 status='depleted'
  3. COMMIT
   ↓
提示"已标记配送"，订单从"待配送"列表移除
```

**异常分支（次卡次数不够）**：
- 弹窗"次卡已用完（或本次份数超剩余），请选择支付方式"
- 选项：[改为微信 ¥XX] / [改为现金 ¥XX] / [取消标记]
  - XX = customers.default_lunch_price（或 default_dinner_price）× discount_rate，按订单当前餐次
- 用户选择后：UPDATE orders SET payment_method=?, unit_price=?, amount=?
- 然后再次走"标记已配送"流程（按新支付方式走，不再扣次）

### 4.4 备份 / 恢复

**导出**：
```
设置 → 备份 → 导出
   ↓
   1. 全表查询 → 序列化为 JSON：
      {
        "version": "1.0",
        "exported_at": "2026-06-09T22:00:00Z",
        "schema_version": 1,
        "customers": [...],
        "meal_cards": [...],
        "orders": [...],
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
      - 从本地 JSON 文件选择器读取
   2. 解析 JSON + 校验 schema_version（不匹配则报错"备份文件版本不兼容"）
   3. 二次确认："导入将覆盖所有现有数据，无法恢复。是否继续？"
   4. 事务：
      DELETE FROM orders / expenses / meal_cards / customers / expense_categories
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
| **支出** | Σ(expenses.amount) WHERE expense_date IN range |
| **利润** | 收入 - 支出 |
| **次卡使用率** | meal_cards.used_meals / meal_cards.total_meals（按卡） |
| **某客户消费** | Σ(orders.amount) WHERE customer_id=X AND status != 'cancelled' AND order_date IN range |

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

```
┌────────────────────────────────────┐
│  ← 新建订单                        │
├────────────────────────────────────┤
│  客户  [🔍 搜索或新建 ▼ 张三 (9折)]│
│  餐次  ◉ 午餐  ○ 晚餐              │
│  份数  [− 2 +]                      │
│  默认价 ¥15.00 × 0.9 = ¥13.50      │
│  实际价 [¥13.50]                    │
│  ─────────────────────              │
│  合计  ¥27.00                      │
│  ─────────────────────              │
│  支付  ○ 微信  ○ 现金  ◉ 次卡      │
│  次卡  [#5 剩 25/30 ▼]             │
│  备注  [____________________]       │
│                                    │
│         [保存]                      │
└────────────────────────────────────┘
```

### 6.3 统计页（Tab 3）

```
┌────────────────────────────────────┐
│  ← 统计                            │
│  周期: [本周] [本月] [自定义]      │
├────────────────────────────────────┤
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │
│  │收入│ │支出│ │利润│ │订单│       │
│  │¥2.8k│¥1.2k│+1.6k│ 186 │       │
│  └────┘ └────┘ └────┘ └────┘       │
│  客单价 ¥15.05                     │
├────────────────────────────────────┤
│  收入趋势（按日）                  │
│  ¥ │      ▄▄                       │
│  4 │  ▄▄  ██                       │
│  2 │  ██  ██   ▄▄                  │
│  0 └──────────────                 │
│     一 二 三 四 五 六 日            │
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
| 配送时次卡次数不足 | 弹窗让用户改支付方式，事务回滚已扣次（若部分成功） |

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
