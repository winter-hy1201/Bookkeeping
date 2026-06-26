/**
 * 数据库迁移：按版本顺序执行 DDL。
 *
 * 启动时序（§6.1）：
 *   1. 读 PRAGMA user_version（当前 schema 版本）
 *   2. 对比 MIGRATIONS.length
 *   3. 若 user_version < length：从 user_version 起顺序执行每一项
 *   4. 每执行完一项 setVersion(i + 1)
 *
 * 加新迁移：在 MIGRATIONS 末尾追加一段 SQL；不需要改 CURRENT_SCHEMA_VERSION（schema.ts 自动维护）。
 *
 * ⚠️ 重要：迁移**不能**用 `IF NOT EXISTS` + 改字段语义；如果未来需要改字段，**写新的一段 ALTER**，
 * 永远不要在原段上改。
 *
 * 注意：5+ API 的 executeSql 是 async callback，**不支持多条 SQL 用 ; 分隔一次执行**。
 * 必须把每段 SQL 拆成单条 statement，逐条 exec。
 */

import {
  SCHEMA_CUSTOMERS,
  SCHEMA_MEAL_CARDS,
  SCHEMA_MEAL_CARD_USAGES,
  SCHEMA_ORDERS,
  SCHEMA_EXPENSE_CATEGORIES,
  SCHEMA_EXPENSES,
  CURRENT_SCHEMA_VERSION,
} from './schema'
import { exec, select } from './index'
import type { PlusSqliteRow } from './index'

interface TableInfoRow extends PlusSqliteRow {
  name: string
}

/**
 * 每项是一段**可独立执行**的 SQL（可包含多条 statement，用 `;\n` 分隔）。
 * 第 0 项 = 初次建表（5 段 schema 拼接）。
 */
export const MIGRATIONS: string[] = [
  [
    SCHEMA_CUSTOMERS,
    SCHEMA_MEAL_CARDS,
    SCHEMA_ORDERS,
    SCHEMA_MEAL_CARD_USAGES,
    SCHEMA_EXPENSE_CATEGORIES,
    SCHEMA_EXPENSES,
  ].join('\n'),
  'ALTER TABLE expenses ADD COLUMN refund_amount REAL NOT NULL DEFAULT 0;',
  [
    'ALTER TABLE orders ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0',
    'CREATE INDEX IF NOT EXISTS idx_orders_date_meal_sort ON orders(order_date, meal_type, sort_order)',
  ].join(';\n'),
  [
    SCHEMA_MEAL_CARD_USAGES,
    `INSERT INTO meal_card_usages (order_id, meal_card_id, quantity, created_at)
      SELECT id, meal_card_id, quantity, updated_at
      FROM orders
      WHERE status = 'delivered'
        AND payment_method = 'meal_card'
        AND meal_card_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM meal_card_usages WHERE meal_card_usages.order_id = orders.id
        )`,
  ].join(';\n'),
  // 未来迁移示例（不要启用）：
  // "ALTER TABLE customers ADD COLUMN wechat_openid TEXT;",
]

async function shouldSkipStatement(stmt: string): Promise<boolean> {
  const match = stmt.match(/^ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i)
  if (!match) return false

  const [, tableName, columnName] = match
  const rows = await select<TableInfoRow>(`PRAGMA table_info(${tableName});`)
  return rows.some((row) => row.name === columnName)
}

/** 读 PRAGMA user_version */
export async function getCurrentVersion(): Promise<number> {
  const rows = await select<{ user_version: number }>('PRAGMA user_version;')
  return rows[0]?.user_version ?? 0
}

/** 写 PRAGMA user_version = v */
export async function setVersion(v: number): Promise<void> {
  await exec(`PRAGMA user_version = ${v};`)
}

/** 顺序执行从 current 到 MIGRATIONS.length 的所有迁移 */
export async function runMigrations(): Promise<void> {
  const current = await getCurrentVersion()
  const target = Math.min(MIGRATIONS.length, CURRENT_SCHEMA_VERSION)
  for (let i = current; i < target; i++) {
    const sql = MIGRATIONS[i]
    if (!sql) continue
    // 拆分 `;\n` 分隔的多条 statement，逐条执行
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    for (const stmt of statements) {
      if (await shouldSkipStatement(stmt)) continue
      await exec(stmt)
    }
    await setVersion(i + 1)
  }
}
