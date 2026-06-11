import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { MealCardResult, OpenMealCardInput } from '../types/api'
import type { MealCard } from '../types/domain'

type MealCardRow = MealCard & PlusSqliteRow

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
    throw new Error('[meal-cards] failed to read inserted card id')
  }
  return id
}

function validateOpenCardInput(input: OpenMealCardInput): void {
  if (input.customer_id <= 0) {
    throw new Error('[meal-cards] customer_id is required')
  }
  if (!Number.isInteger(input.total_meals) || input.total_meals <= 0) {
    throw new Error('[meal-cards] total_meals must be a positive integer')
  }
  if (!Number.isFinite(input.amount) || input.amount < 0) {
    throw new Error('[meal-cards] amount must be a non-negative number')
  }
}

export async function getActiveCard(customerId: number): Promise<MealCardResult | null> {
  const rows = await select<MealCardRow>(
    `SELECT
      id,
      customer_id,
      total_meals,
      used_meals,
      amount,
      status,
      created_at
    FROM meal_cards
    WHERE customer_id = ? AND status = 'active'
    ORDER BY created_at DESC, id DESC
    LIMIT 1`,
    [customerId],
  )
  return (rows[0] as MealCardResult | undefined) ?? null
}

export async function listCards(customerId: number): Promise<MealCardResult[]> {
  const rows = await select<MealCardRow>(
    `SELECT
      id,
      customer_id,
      total_meals,
      used_meals,
      amount,
      status,
      created_at
    FROM meal_cards
    WHERE customer_id = ?
    ORDER BY created_at DESC, id DESC`,
    [customerId],
  )
  return rows as MealCardResult[]
}

export async function openCard(input: OpenMealCardInput): Promise<MealCardResult> {
  return tx(async () => {
    validateOpenCardInput(input)
    await exec(
      `INSERT INTO meal_cards (
        customer_id,
        total_meals,
        used_meals,
        amount,
        status,
        created_at
      ) VALUES (?, ?, 0, ?, 'active', ?)`,
      [input.customer_id, input.total_meals, input.amount, nowText()],
    )

    const id = await getLastInsertId()
    const card = await getCard(id)
    if (!card) {
      throw new Error('[meal-cards] inserted card was not found')
    }
    return card
  })
}

export async function getCard(id: number): Promise<MealCardResult | null> {
  const rows = await select<MealCardRow>(
    `SELECT
      id,
      customer_id,
      total_meals,
      used_meals,
      amount,
      status,
      created_at
    FROM meal_cards
    WHERE id = ?`,
    [id],
  )
  return (rows[0] as MealCardResult | undefined) ?? null
}
