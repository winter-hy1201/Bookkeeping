import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { CreateExpenseInput, ExpenseResult, ListExpensesInput } from '../types/api'
import type { Expense } from '../types/domain'

type ExpenseRow = Expense & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

function nowText(): string {
  return new Date().toISOString()
}

async function getLastInsertId(): Promise<number> {
  const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
  const id = rows[0]?.id
  if (typeof id !== 'number') {
    throw new Error('[expenses] failed to read inserted expense id')
  }
  return id
}

function validateCreateExpenseInput(input: CreateExpenseInput): void {
  if (input.category_id <= 0) {
    throw new Error('[expenses] category_id is required')
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('[expenses] amount must be greater than 0')
  }
}

export async function listExpenses(input: ListExpensesInput): Promise<ExpenseResult[]> {
  const where = ['expense_date >= ?', 'expense_date <= ?']
  const args: Array<number | string | null> = [input.startDate, input.endDate]

  if (input.categoryId !== undefined) {
    where.push('category_id = ?')
    args.push(input.categoryId)
  }

  const rows = await select<ExpenseRow>(
    `SELECT
      id,
      expense_date,
      category_id,
      amount,
      note,
      created_at
    FROM expenses
    WHERE ${where.join(' AND ')}
    ORDER BY expense_date DESC, created_at DESC, id DESC`,
    args,
  )
  return rows as ExpenseResult[]
}

export async function getExpense(id: number): Promise<ExpenseResult | null> {
  const rows = await select<ExpenseRow>(
    `SELECT
      id,
      expense_date,
      category_id,
      amount,
      note,
      created_at
    FROM expenses
    WHERE id = ?`,
    [id],
  )
  return (rows[0] as ExpenseResult | undefined) ?? null
}

export async function createExpense(input: CreateExpenseInput): Promise<ExpenseResult> {
  return tx(async () => {
    validateCreateExpenseInput(input)
    await exec(
      `INSERT INTO expenses (
        expense_date,
        category_id,
        amount,
        note,
        created_at
      ) VALUES (?, ?, ?, ?, ?)`,
      [input.expense_date, input.category_id, input.amount, input.note ?? null, nowText()],
    )

    const id = await getLastInsertId()
    const expense = await getExpense(id)
    if (!expense) {
      throw new Error('[expenses] inserted expense was not found')
    }
    return expense
  })
}

export async function deleteExpense(id: number): Promise<boolean> {
  return tx(async () => {
    const existing = await getExpense(id)
    if (!existing) {
      return false
    }
    await exec('DELETE FROM expenses WHERE id = ?', [id])
    return true
  })
}
