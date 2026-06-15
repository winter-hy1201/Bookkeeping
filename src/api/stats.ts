import dayjs from 'dayjs'
import { select, type PlusSqliteRow } from '../db'
import type { CategoryBreakdown, DailyTrendPoint, DateRangeInput, StatsSummary } from '../types/api'
import { addMoney, subtractMoney } from '../utils/format'

interface SummaryRow extends PlusSqliteRow {
  orderCount: number | null
  orderQuantity: number | null
  orderIncome: number | null
  cardIncome: number | null
  expense: number | null
}

interface DailyOrderRow extends PlusSqliteRow {
  date: string
  orderCount: number | null
  income: number | null
}

interface DailyCardRow extends PlusSqliteRow {
  date: string
  income: number | null
}

interface DailyExpenseRow extends PlusSqliteRow {
  date: string
  expense: number | null
}

interface CategoryBreakdownRow extends PlusSqliteRow {
  categoryId: number
  categoryName: string
  amount: number | null
}

function num(value: number | null | undefined): number {
  return value ?? 0
}

function dayList(startDate: string, endDate: string): string[] {
  const days: string[] = []
  let current = dayjs(startDate)
  const end = dayjs(endDate)
  if (!current.isValid() || !end.isValid()) {
    throw new Error('[stats] invalid date range')
  }
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    days.push(current.format('YYYY-MM-DD'))
    current = current.add(1, 'day')
  }
  return days
}

export async function getDashboardSummary(date: string): Promise<StatsSummary> {
  return getRangeSummary({ startDate: date, endDate: date })
}

export async function getRangeSummary(input: DateRangeInput): Promise<StatsSummary> {
  const rows = await select<SummaryRow>(
    `SELECT
      (
        SELECT COUNT(*)
        FROM orders
        WHERE status != 'cancelled'
          AND order_date >= ?
          AND order_date <= ?
      ) AS orderCount,
      (
        SELECT SUM(quantity)
        FROM orders
        WHERE status != 'cancelled'
          AND order_date >= ?
          AND order_date <= ?
      ) AS orderQuantity,
      (
        SELECT SUM(amount)
        FROM orders
        WHERE status != 'cancelled'
          AND order_date >= ?
          AND order_date <= ?
      ) AS orderIncome,
      (
        SELECT SUM(amount)
        FROM meal_cards
        WHERE substr(created_at, 1, 10) >= ?
          AND substr(created_at, 1, 10) <= ?
      ) AS cardIncome,
      (
        SELECT SUM(amount - refund_amount)
        FROM expenses
        WHERE expense_date >= ?
          AND expense_date <= ?
      ) AS expense`,
    [
      input.startDate,
      input.endDate,
      input.startDate,
      input.endDate,
      input.startDate,
      input.endDate,
      input.startDate,
      input.endDate,
      input.startDate,
      input.endDate,
    ],
  )

  const row = rows[0]
  const income = addMoney(num(row?.orderIncome), num(row?.cardIncome))
  const expense = num(row?.expense)
  return {
    orderCount: num(row?.orderCount),
    orderQuantity: num(row?.orderQuantity),
    income,
    expense,
    profit: subtractMoney(income, expense),
  }
}

export async function getDailyTrend(input: DateRangeInput): Promise<DailyTrendPoint[]> {
  const orderRows = await select<DailyOrderRow>(
    `SELECT
      order_date AS date,
      COUNT(*) AS orderCount,
      SUM(amount) AS income
    FROM orders
    WHERE status != 'cancelled'
      AND order_date >= ?
      AND order_date <= ?
    GROUP BY order_date`,
    [input.startDate, input.endDate],
  )
  const cardRows = await select<DailyCardRow>(
    `SELECT
      substr(created_at, 1, 10) AS date,
      SUM(amount) AS income
    FROM meal_cards
    WHERE substr(created_at, 1, 10) >= ?
      AND substr(created_at, 1, 10) <= ?
    GROUP BY substr(created_at, 1, 10)`,
    [input.startDate, input.endDate],
  )
  const expenseRows = await select<DailyExpenseRow>(
    `SELECT
      expense_date AS date,
      SUM(amount - refund_amount) AS expense
    FROM expenses
    WHERE expense_date >= ?
      AND expense_date <= ?
    GROUP BY expense_date`,
    [input.startDate, input.endDate],
  )

  const byDate = new Map<string, DailyTrendPoint>()
  for (const date of dayList(input.startDate, input.endDate)) {
    byDate.set(date, { date, income: 0, expense: 0, profit: 0 })
  }

  for (const row of orderRows) {
    const point = byDate.get(row.date)
    if (!point) continue
    point.income = addMoney(point.income, num(row.income))
  }
  for (const row of cardRows) {
    const point = byDate.get(row.date)
    if (!point) continue
    point.income = addMoney(point.income, num(row.income))
  }
  for (const row of expenseRows) {
    const point = byDate.get(row.date)
    if (!point) continue
    point.expense = addMoney(point.expense, num(row.expense))
  }

  return [...byDate.values()].map((point) => ({
    ...point,
    profit: subtractMoney(point.income, point.expense),
  }))
}

export async function getCategoryBreakdown(input: DateRangeInput): Promise<CategoryBreakdown[]> {
  const rows = await select<CategoryBreakdownRow>(
    `SELECT
      c.id AS categoryId,
      c.name AS categoryName,
      SUM(e.amount - e.refund_amount) AS amount
    FROM expenses e
    INNER JOIN expense_categories c ON c.id = e.category_id
    WHERE e.expense_date >= ?
      AND e.expense_date <= ?
    GROUP BY c.id, c.name
    ORDER BY amount DESC, c.sort_order ASC, c.id ASC`,
    [input.startDate, input.endDate],
  )
  const total = rows.reduce((sum, row) => addMoney(sum, num(row.amount)), 0)

  return rows.map((row) => ({
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    amount: num(row.amount),
    percentage: total > 0 ? Math.round((num(row.amount) / total) * 100) : 0,
  }))
}
