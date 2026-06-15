/**
 * 数据库 schema — 5 张表 DDL 字符串
 *
 * 数据来源：memory-bank/design-document.md §2.1
 * 字段、类型、NOT NULL、DEFAULT、CHECK 约束、索引必须严格对齐设计文档。
 *
 * 注意：meal_cards 表**不**含 end_date 字段，按 "次" 计费，无有效期（§3.2）。
 */

export const SCHEMA_CUSTOMERS = `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  wechat TEXT,
  default_lunch_price REAL,
  default_dinner_price REAL,
  discount_rate REAL NOT NULL DEFAULT 1.0,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
`

export const SCHEMA_MEAL_CARDS = `
CREATE TABLE IF NOT EXISTS meal_cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  total_meals INTEGER NOT NULL,
  used_meals INTEGER NOT NULL DEFAULT 0,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'depleted')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX IF NOT EXISTS idx_cards_customer ON meal_cards(customer_id);
CREATE INDEX IF NOT EXISTS idx_cards_status ON meal_cards(status);
`

export const SCHEMA_ORDERS = `
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  order_date TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('lunch', 'dinner')),
  quantity INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('wechat', 'cash', 'meal_card')),
  meal_card_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'cancelled')),
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  cancelled_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (meal_card_id) REFERENCES meal_cards(id)
);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_card ON orders(meal_card_id);
CREATE INDEX IF NOT EXISTS idx_orders_date_status ON orders(order_date, status);
CREATE INDEX IF NOT EXISTS idx_orders_date_meal_sort ON orders(order_date, meal_type, sort_order);
`

export const SCHEMA_EXPENSE_CATEGORIES = `
CREATE TABLE IF NOT EXISTS expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default INTEGER NOT NULL DEFAULT 0
);
`

export const SCHEMA_EXPENSES = `
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  refund_amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES expense_categories(id)
);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
`

/**
 * 当前 schema 版本。migrations.ts 用此值与 PRAGMA user_version 对比。
 * 每次新增 DDL 段（加表 / 加字段）必须：
 *   1. 在 MIGRATIONS 数组末尾追加新的一段 SQL
 *   2. CURRENT_SCHEMA_VERSION += 1
 */
export const CURRENT_SCHEMA_VERSION = 3
