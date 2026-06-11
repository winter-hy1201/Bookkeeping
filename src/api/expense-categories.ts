import { select, type PlusSqliteRow } from '../db'
import type { ExpenseCategoryResult } from '../types/api'
import type { ExpenseCategory } from '../types/domain'

type ExpenseCategoryRow = ExpenseCategory & PlusSqliteRow

export async function listCategories(): Promise<ExpenseCategoryResult[]> {
  const rows = await select<ExpenseCategoryRow>(
    `SELECT
      id,
      name,
      icon,
      sort_order,
      is_default
    FROM expense_categories
    ORDER BY sort_order ASC, id ASC`,
  )
  return rows as ExpenseCategoryResult[]
}

export async function getCategory(id: number): Promise<ExpenseCategoryResult | null> {
  const rows = await select<ExpenseCategoryRow>(
    `SELECT
      id,
      name,
      icon,
      sort_order,
      is_default
    FROM expense_categories
    WHERE id = ?`,
    [id],
  )
  return (rows[0] as ExpenseCategoryResult | undefined) ?? null
}
