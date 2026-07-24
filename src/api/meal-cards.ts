import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { MealCardResult, OpenMealCardInput, UpdateMealCardTotalInput } from '../types/api'
import type { MealCard } from '../types/domain'
import {
  MealCardAlreadyUsedError,
  MealCardDeleteIntegrityError,
  MealCardReservationConflictError,
  MealCardTotalTooSmallError,
} from './errors'

type MealCardRow = MealCard & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

interface ActiveCardCustomerRow extends PlusSqliteRow {
  customer_id: number
}

interface SumRow extends PlusSqliteRow {
  total: number | null
}

interface CountRow extends PlusSqliteRow {
  count: number
}

interface CardIdRow extends PlusSqliteRow {
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

export async function listActiveMealCardCustomerIds(): Promise<number[]> {
  const rows = await select<ActiveCardCustomerRow>(
    `SELECT DISTINCT customer_id
    FROM meal_cards
    WHERE status = 'active' AND used_meals < total_meals`,
  )
  return rows.map((row) => row.customer_id)
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

export async function updateCardTotalMeals(
  id: number,
  input: UpdateMealCardTotalInput,
): Promise<MealCardResult | null> {
  return tx(async () => {
    const card = await getCard(id)
    if (!card) return null

    if (!Number.isInteger(input.total_meals) || input.total_meals <= 0) {
      throw new Error('[meal-cards] total_meals must be a positive integer')
    }
    if (input.total_meals < card.used_meals) {
      throw new MealCardTotalTooSmallError(card.used_meals)
    }

    const otherRemainingRows = await select<SumRow>(
      `SELECT COALESCE(SUM(total_meals - used_meals), 0) AS total
      FROM meal_cards
      WHERE customer_id = ? AND id <> ?
        AND status = 'active' AND used_meals < total_meals`,
      [card.customer_id, id],
    )
    const reservationRows = await select<SumRow>(
      `SELECT COALESCE(SUM(meal_card_quantity), 0) AS total
      FROM orders
      WHERE customer_id = ? AND status = 'pending'`,
      [card.customer_id],
    )
    const remainingAfterChange =
      (otherRemainingRows[0]?.total ?? 0) + (input.total_meals - card.used_meals)
    const reservedMeals = reservationRows[0]?.total ?? 0
    if (remainingAfterChange < reservedMeals) {
      throw new MealCardReservationConflictError(reservedMeals, remainingAfterChange)
    }

    const status = input.total_meals === card.used_meals ? 'depleted' : 'active'
    await exec(
      `UPDATE meal_cards
      SET total_meals = ?, status = ?
      WHERE id = ?`,
      [input.total_meals, status, id],
    )
    return getCard(id)
  })
}

export async function deleteCard(id: number): Promise<boolean> {
  return tx(async () => {
    const card = await getCard(id)
    if (!card) return false
    if (card.used_meals > 0) {
      throw new MealCardAlreadyUsedError(card.used_meals)
    }

    const usageRows = await select<CountRow>(
      'SELECT COUNT(*) AS count FROM meal_card_usages WHERE meal_card_id = ?',
      [id],
    )
    const deliveredReferenceRows = await select<CountRow>(
      `SELECT COUNT(*) AS count
      FROM orders
      WHERE meal_card_id = ? AND status = 'delivered'`,
      [id],
    )
    if ((usageRows[0]?.count ?? 0) > 0 || (deliveredReferenceRows[0]?.count ?? 0) > 0) {
      throw new MealCardDeleteIntegrityError()
    }

    const remainingRows = await select<SumRow>(
      `SELECT COALESCE(SUM(total_meals - used_meals), 0) AS total
      FROM meal_cards
      WHERE customer_id = ? AND id <> ?
        AND status = 'active' AND used_meals < total_meals`,
      [card.customer_id, id],
    )
    const reservationRows = await select<SumRow>(
      `SELECT COALESCE(SUM(meal_card_quantity), 0) AS total
      FROM orders
      WHERE customer_id = ? AND status = 'pending'`,
      [card.customer_id],
    )
    const remainingAfterDelete = remainingRows[0]?.total ?? 0
    const reservedMeals = reservationRows[0]?.total ?? 0
    if (remainingAfterDelete < reservedMeals) {
      throw new MealCardReservationConflictError(
        reservedMeals,
        remainingAfterDelete,
        `删除后仅剩 ${remainingAfterDelete} 次，但待配送订单已预占 ${reservedMeals} 次`,
      )
    }

    const replacementRows = await select<CardIdRow>(
      `SELECT id
      FROM meal_cards
      WHERE customer_id = ? AND id <> ?
        AND status = 'active' AND used_meals < total_meals
      ORDER BY created_at ASC, id ASC
      LIMIT 1`,
      [card.customer_id, id],
    )
    const replacementId = replacementRows[0]?.id
    const now = nowText()
    if (replacementId !== undefined) {
      await exec(
        `UPDATE orders
        SET meal_card_id = ?, updated_at = ?
        WHERE meal_card_id = ? AND status = 'pending' AND meal_card_quantity > 0`,
        [replacementId, now, id],
      )
    }
    await exec(
      `UPDATE orders
      SET meal_card_id = NULL, updated_at = ?
      WHERE meal_card_id = ?
        AND (status = 'cancelled' OR (status = 'pending' AND meal_card_quantity = 0))`,
      [now, id],
    )
    await exec('DELETE FROM meal_cards WHERE id = ?', [id])
    return true
  })
}
