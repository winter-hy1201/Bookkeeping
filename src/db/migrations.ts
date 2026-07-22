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
import { exec, select, tx } from './index'
import type { PlusSqliteRow } from './index'
import type { OrderStatus, PaymentMethod } from '../types/domain'
import { roundMoney } from '../utils/format'
import {
  mergeOrderNotes,
  mergePaymentBreakdowns,
  selectPendingOrdersForReconciliation,
} from '../utils/order-rules'

interface TableInfoRow extends PlusSqliteRow {
  name: string
}

interface ReconciliationOrderRow extends PlusSqliteRow {
  id: number
  customer_id: number
  order_date: string
  meal_type: string
  quantity: number
  sort_order: number
  unit_price: number
  amount: number
  payment_method: PaymentMethod
  meal_card_id: number | null
  meal_card_quantity: number
  status: OrderStatus
  note: string | null
  created_at: string
  updated_at: string
}

/**
 * 每项是一段**可独立执行**的 SQL（可包含多条 statement，用 `;\n` 分隔）。
 * 第 0 项 = 初次建表（6 段 schema 拼接）。
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
  [
    'ALTER TABLE orders ADD COLUMN meal_card_quantity INTEGER NOT NULL DEFAULT 0 CHECK (meal_card_quantity >= 0)',
    `UPDATE orders
      SET meal_card_quantity = quantity
      WHERE payment_method = 'meal_card'`,
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

function monetaryMethod(order: ReconciliationOrderRow): 'wechat' | 'cash' | null {
  if (order.quantity === order.meal_card_quantity || order.payment_method === 'meal_card') {
    return null
  }
  return order.payment_method
}

/**
 * v5 数据修复：只合并单价和货币渠道都兼容的 pending 重复单。
 * 无法无损合并的数据保留，后续写入 API 会给出可读的历史冲突错误。
 */
export async function reconcileCompatiblePendingOrders(): Promise<void> {
  const rows = await select<ReconciliationOrderRow>(
    `SELECT
      id, customer_id, order_date, meal_type, quantity, sort_order, unit_price, amount,
      payment_method, meal_card_id, meal_card_quantity, status, note, created_at, updated_at
    FROM orders
    WHERE status IN ('pending', 'delivered', 'cancelled')
    ORDER BY customer_id ASC, order_date ASC, meal_type ASC, id ASC`,
  )
  const groups = new Map<string, ReconciliationOrderRow[]>()
  for (const order of rows) {
    const key = `${order.customer_id}\u0000${order.order_date}\u0000${order.meal_type}`
    const group = groups.get(key) ?? []
    group.push(order)
    groups.set(key, group)
  }

  for (const historicalGroup of groups.values()) {
    const group = selectPendingOrdersForReconciliation(historicalGroup)
    const preservedHistory = historicalGroup.filter((order) => order.status !== 'pending')
    if (preservedHistory.length > 1) {
      console.warn(
        `[migrations] kept delivered/cancelled duplicate history ${preservedHistory
          .map((order) => order.id)
          .join(',')}`,
      )
    }
    if (
      group.length === 0 &&
      historicalGroup.some((order) => order.status === 'pending') &&
      historicalGroup.some((order) => order.status === 'delivered')
    ) {
      console.warn(
        `[migrations] kept mixed pending/delivered order group ${historicalGroup
          .map((order) => order.id)
          .join(',')}`,
      )
      continue
    }
    if (group.length < 2) continue
    const first = group[0]
    if (!first) continue
    let target = { ...first }

    for (const candidate of group.slice(1)) {
      const validCardCounts =
        Number.isInteger(target.meal_card_quantity) &&
        target.meal_card_quantity >= 0 &&
        target.meal_card_quantity <= target.quantity &&
        Number.isInteger(candidate.meal_card_quantity) &&
        candidate.meal_card_quantity >= 0 &&
        candidate.meal_card_quantity <= candidate.quantity
      const targetMoneyMethod = monetaryMethod(target)
      const candidateMoneyMethod = monetaryMethod(candidate)
      const compatiblePrice =
        targetMoneyMethod == null ||
        candidateMoneyMethod == null ||
        roundMoney(target.unit_price) === roundMoney(candidate.unit_price)
      const compatibleMethod =
        targetMoneyMethod == null ||
        candidateMoneyMethod == null ||
        targetMoneyMethod === candidateMoneyMethod

      if (!validCardCounts || !compatiblePrice || !compatibleMethod) {
        console.warn(
          `[migrations] kept incompatible pending duplicate orders ${target.id} and ${candidate.id}`,
        )
        continue
      }

      const merged = mergePaymentBreakdowns(
        {
          paymentMethod: target.payment_method,
          mealCardQuantity: target.meal_card_quantity,
          moneyQuantity: target.quantity - target.meal_card_quantity,
          unitPrice: target.unit_price,
          amount: target.amount,
        },
        {
          paymentMethod: candidate.payment_method,
          mealCardQuantity: candidate.meal_card_quantity,
          moneyQuantity: candidate.quantity - candidate.meal_card_quantity,
          unitPrice: candidate.unit_price,
          amount: candidate.amount,
        },
      )
      const quantity = target.quantity + candidate.quantity
      const mealCardId =
        merged.mealCardQuantity > 0 ? (target.meal_card_id ?? candidate.meal_card_id) : null
      const note = mergeOrderNotes(target.note, candidate.note) || null
      const updatedAt =
        target.updated_at >= candidate.updated_at ? target.updated_at : candidate.updated_at
      await exec(
        `UPDATE orders
        SET quantity = ?, unit_price = ?, amount = ?, payment_method = ?,
          meal_card_id = ?, meal_card_quantity = ?, note = ?, updated_at = ?
        WHERE id = ?`,
        [
          quantity,
          merged.unitPrice,
          merged.amount,
          merged.paymentMethod,
          mealCardId,
          merged.mealCardQuantity,
          note,
          updatedAt,
          target.id,
        ],
      )
      await exec('DELETE FROM meal_card_usages WHERE order_id = ?', [candidate.id])
      await exec('DELETE FROM orders WHERE id = ?', [candidate.id])
      target = {
        ...target,
        quantity,
        unit_price: merged.unitPrice,
        amount: merged.amount,
        payment_method: merged.paymentMethod,
        meal_card_id: mealCardId,
        meal_card_quantity: merged.mealCardQuantity,
        note,
        updated_at: updatedAt,
      }
    }
  }
}

/** 顺序执行从 current 到 MIGRATIONS.length 的所有迁移 */
export async function runMigrations(): Promise<void> {
  const current = await getCurrentVersion()
  const target = Math.min(MIGRATIONS.length, CURRENT_SCHEMA_VERSION)
  for (let i = current; i < target; i++) {
    const sql = MIGRATIONS[i]
    if (!sql) continue
    await tx(async () => {
      // 拆分 `;\n` 分隔的多条 statement，逐条执行
      const statements = sql
        .split(/;\s*\n/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
      for (const stmt of statements) {
        if (await shouldSkipStatement(stmt)) continue
        await exec(stmt)
      }
      if (i + 1 === 5) {
        await reconcileCompatiblePendingOrders()
      }
      await setVersion(i + 1)
    })
  }
}
