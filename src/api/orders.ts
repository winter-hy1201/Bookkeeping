import { exec, select, tx, type PlusSqliteRow } from '../db'
import type {
  CreateOrderInput,
  ListOrdersInput,
  MealCardAvailabilityResult,
  OrderResult,
  ReorderOrdersInput,
  UpdateOrderInput,
} from '../types/api'
import type { Customer, MealCard, MealCardUsage, MealType, Order } from '../types/domain'
import { divideMoney, multiplyMoney } from '../utils/format'
import {
  calculatePaymentBreakdown,
  evaluateMealCardAvailability,
  mergeOrderNotes,
  mergePaymentBreakdowns,
  type PaymentBreakdown,
} from '../utils/order-rules'
import {
  AlreadyDeliveredError,
  DeliveredOrderConflictError,
  InsufficientCardError,
  LegacyOrderConflictError,
  OrderMergeConfirmationError,
  OrderPaymentConflictError,
  OrderPriceConfirmationError,
} from './errors'

type OrderRow = Order & PlusSqliteRow
type CustomerRow = Customer & PlusSqliteRow
type MealCardRow = MealCard & PlusSqliteRow
type MealCardUsageRow = MealCardUsage & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

interface MaxSortOrderRow extends PlusSqliteRow {
  max_sort_order: number | null
}

interface SumRow extends PlusSqliteRow {
  total: number | null
}

interface NormalizedOrderInput {
  breakdown: PaymentBreakdown
  mealCardId: number | null
}

const ORDER_COLUMNS = `
  id,
  customer_id,
  order_date,
  meal_type,
  quantity,
  sort_order,
  unit_price,
  amount,
  payment_method,
  meal_card_id,
  meal_card_quantity,
  status,
  note,
  created_at,
  updated_at,
  cancelled_at
`

function nowText(): string {
  return new Date().toISOString()
}

async function getLastInsertId(): Promise<number> {
  const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
  const id = rows[0]?.id
  if (typeof id !== 'number') {
    throw new Error('[orders] failed to read inserted order id')
  }
  return id
}

async function getNextSortOrder(orderDate: string, mealType: MealType): Promise<number> {
  const rows = await select<MaxSortOrderRow>(
    `SELECT MAX(sort_order) AS max_sort_order
    FROM orders
    WHERE order_date = ? AND meal_type = ?`,
    [orderDate, mealType],
  )
  return (rows[0]?.max_sort_order ?? 0) + 1
}

function assertPositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error('[orders] quantity must be a positive integer')
  }
}

function assertNonNegativeAmount(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`[orders] ${field} must be a non-negative number`)
  }
}

async function getCustomer(customerId: number): Promise<Customer | null> {
  const rows = await select<CustomerRow>(
    `SELECT
      id,
      name,
      phone,
      wechat,
      default_lunch_price,
      default_dinner_price,
      discount_rate,
      note,
      created_at,
      updated_at
    FROM customers
    WHERE id = ?`,
    [customerId],
  )
  return (rows[0] as Customer | undefined) ?? null
}

async function getMealCard(cardId: number): Promise<MealCard | null> {
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
    [cardId],
  )
  return (rows[0] as MealCard | undefined) ?? null
}

async function listUsableMealCards(customerId: number): Promise<MealCard[]> {
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
    WHERE customer_id = ? AND status = 'active' AND used_meals < total_meals
    ORDER BY created_at ASC, id ASC`,
    [customerId],
  )
  return rows as MealCard[]
}

async function listMealCardUsages(orderId: number): Promise<MealCardUsage[]> {
  const rows = await select<MealCardUsageRow>(
    `SELECT
      id,
      order_id,
      meal_card_id,
      quantity,
      created_at
    FROM meal_card_usages
    WHERE order_id = ?
    ORDER BY id ASC`,
    [orderId],
  )
  return rows as MealCardUsage[]
}

async function listEffectiveOrdersForKey(
  customerId: number,
  orderDate: string,
  mealType: MealType,
  excludedIds: number[] = [],
): Promise<Order[]> {
  const args: Array<number | string | null> = [customerId, orderDate, mealType]
  const excludedClause =
    excludedIds.length === 0 ? '' : `AND id NOT IN (${excludedIds.map(() => '?').join(', ')})`
  args.push(...excludedIds)
  const rows = await select<OrderRow>(
    `SELECT ${ORDER_COLUMNS}
    FROM orders
    WHERE customer_id = ?
      AND order_date = ?
      AND meal_type = ?
      AND status <> 'cancelled'
      ${excludedClause}
    ORDER BY created_at ASC, id ASC`,
    args,
  )
  return rows as Order[]
}

function singlePendingOrThrow(rows: Order[]): Order | null {
  const delivered = rows.find((order) => order.status === 'delivered')
  if (delivered) {
    throw new DeliveredOrderConflictError(delivered.id)
  }
  const pending = rows.filter((order) => order.status === 'pending')
  if (pending.length > 1) {
    throw new LegacyOrderConflictError(pending.map((order) => order.id))
  }
  return pending[0] ?? null
}

export async function findEffectiveOrder(
  customerId: number,
  orderDate: string,
  mealType: MealType,
  excludedIds: number[] = [],
): Promise<OrderResult | null> {
  const rows = await listEffectiveOrdersForKey(customerId, orderDate, mealType, excludedIds)
  const delivered = rows.find((order) => order.status === 'delivered')
  return (delivered ??
    rows.find((order) => order.status === 'pending') ??
    null) as OrderResult | null
}

export async function getMealCardAvailability(
  customerId: number,
  excludeOrderIds: number[] = [],
): Promise<MealCardAvailabilityResult> {
  const actualRows = await select<SumRow>(
    `SELECT COALESCE(SUM(total_meals - used_meals), 0) AS total
    FROM meal_cards
    WHERE customer_id = ? AND status = 'active' AND used_meals < total_meals`,
    [customerId],
  )

  const reservationArgs: Array<number | string | null> = [customerId]
  const excludedClause =
    excludeOrderIds.length === 0
      ? ''
      : `AND id NOT IN (${excludeOrderIds.map(() => '?').join(', ')})`
  reservationArgs.push(...excludeOrderIds)
  const reservationRows = await select<SumRow>(
    `SELECT COALESCE(SUM(meal_card_quantity), 0) AS total
    FROM orders
    WHERE customer_id = ?
      AND status = 'pending'
      ${excludedClause}`,
    reservationArgs,
  )

  const evaluated = evaluateMealCardAvailability({
    actualRemaining: actualRows[0]?.total ?? 0,
    reservedByOthers: reservationRows[0]?.total ?? 0,
    required: 0,
  })
  return {
    actual_remaining: evaluated.actualRemaining,
    reserved_by_others: evaluated.reservedByOthers,
    available: evaluated.available,
  }
}

async function assertMealCardAvailability(
  customerId: number,
  requiredMeals: number,
  excludeOrderIds: number[],
): Promise<void> {
  if (requiredMeals === 0) return
  const availability = await getMealCardAvailability(customerId, excludeOrderIds)
  if (requiredMeals > availability.available) {
    throw new InsufficientCardError(requiredMeals, availability.available)
  }
}

function breakdownFromOrder(order: Order): PaymentBreakdown {
  if (
    !Number.isInteger(order.meal_card_quantity) ||
    order.meal_card_quantity < 0 ||
    order.meal_card_quantity > order.quantity
  ) {
    throw new LegacyOrderConflictError([order.id], '历史订单的次卡次数异常，请先编辑该订单')
  }
  return {
    paymentMethod: order.payment_method,
    mealCardQuantity: order.meal_card_quantity,
    moneyQuantity: order.quantity - order.meal_card_quantity,
    unitPrice: order.unit_price,
    amount: order.amount,
  }
}

function moneyMethodOf(breakdown: PaymentBreakdown): 'wechat' | 'cash' | null {
  if (breakdown.moneyQuantity === 0 || breakdown.paymentMethod === 'meal_card') return null
  return breakdown.paymentMethod
}

function mergeOrderPaymentOrThrow(
  existingOrder: Order,
  incoming: PaymentBreakdown,
): ReturnType<typeof mergePaymentBreakdowns> {
  const existing = breakdownFromOrder(existingOrder)
  const existingMethod = moneyMethodOf(existing)
  const incomingMethod = moneyMethodOf(incoming)
  if (existingMethod != null && incomingMethod != null && existingMethod !== incomingMethod) {
    throw new OrderPaymentConflictError(existingOrder.id, existingMethod, incomingMethod)
  }
  return mergePaymentBreakdowns(existing, incoming)
}

async function normalizeOrderInput(input: CreateOrderInput): Promise<NormalizedOrderInput> {
  assertPositiveQuantity(input.quantity)
  const customer = await getCustomer(input.customer_id)
  if (!customer) {
    throw new Error('[orders] customer was not found')
  }

  const mealCardQuantity =
    input.meal_card_quantity ?? (input.payment_method === 'meal_card' ? input.quantity : 0)
  if (!Number.isInteger(mealCardQuantity) || mealCardQuantity < 0) {
    throw new Error('[orders] meal_card_quantity must be a non-negative integer')
  }
  if (mealCardQuantity > input.quantity) {
    throw new Error('[orders] meal_card_quantity cannot exceed quantity')
  }
  if (input.payment_method === 'meal_card' && mealCardQuantity !== input.quantity) {
    throw new Error('[orders] pure meal-card orders must allocate every portion to the card')
  }
  if (input.payment_method !== 'meal_card' && mealCardQuantity === input.quantity) {
    throw new Error('[orders] money orders must keep at least one monetary portion')
  }

  const cards = mealCardQuantity > 0 ? await listUsableMealCards(input.customer_id) : []
  const selectedCard = cards.find((card) => card.id === input.meal_card_id) ?? cards[0] ?? null
  const defaultPrice =
    input.meal_type === 'lunch' ? customer.default_lunch_price : customer.default_dinner_price
  const isPureMealCard = input.payment_method === 'meal_card' && mealCardQuantity === input.quantity
  const unitPrice =
    input.unit_price ??
    (defaultPrice == null ? null : multiplyMoney(defaultPrice, customer.discount_rate)) ??
    (isPureMealCard && selectedCard != null
      ? divideMoney(selectedCard.amount, selectedCard.total_meals)
      : null)
  if (unitPrice == null) {
    throw new Error('[orders] unit_price is required when customer default price is empty')
  }
  assertNonNegativeAmount(unitPrice, 'unit_price')

  const breakdown = calculatePaymentBreakdown({
    mode:
      input.payment_method === 'meal_card'
        ? 'meal_card'
        : mealCardQuantity > 0
          ? 'mixed'
          : input.payment_method,
    quantity: input.quantity,
    mealCardQuantity,
    moneyMethod: input.payment_method === 'meal_card' ? null : input.payment_method,
    unitPrice,
  })

  return {
    breakdown,
    mealCardId: breakdown.mealCardQuantity > 0 ? (selectedCard?.id ?? null) : null,
  }
}

function assertPriceChangeConfirmed(
  orderId: number,
  merged: ReturnType<typeof mergePaymentBreakdowns>,
  confirmed: boolean | undefined,
): void {
  if (!merged.priceChanged || confirmed) return
  throw new OrderPriceConfirmationError(
    orderId,
    merged.oldUnitPrice,
    merged.unitPrice,
    merged.moneyQuantity,
    merged.oldAmount,
    merged.amount,
  )
}

async function consumeMealCards(order: Order, now: string): Promise<void> {
  const requiredMeals = order.meal_card_quantity
  if (requiredMeals === 0) return

  const cards = await listUsableMealCards(order.customer_id)
  const availableMeals = cards.reduce((sum, card) => sum + (card.total_meals - card.used_meals), 0)
  if (requiredMeals > availableMeals) {
    throw new InsufficientCardError(requiredMeals, availableMeals)
  }

  let remainingQuantity = requiredMeals
  let firstCardId: number | null = null
  for (const card of cards) {
    if (remainingQuantity <= 0) break
    const available = card.total_meals - card.used_meals
    if (available <= 0) continue
    const quantity = Math.min(available, remainingQuantity)
    const usedMeals = card.used_meals + quantity
    const status = usedMeals >= card.total_meals ? 'depleted' : 'active'

    if (firstCardId == null) firstCardId = card.id
    await exec(
      `UPDATE meal_cards
      SET used_meals = ?, status = ?
      WHERE id = ?`,
      [usedMeals, status, card.id],
    )
    await exec(
      `INSERT INTO meal_card_usages (order_id, meal_card_id, quantity, created_at)
      VALUES (?, ?, ?, ?)`,
      [order.id, card.id, quantity, now],
    )
    remainingQuantity -= quantity
  }

  if (remainingQuantity > 0 || firstCardId == null) {
    throw new InsufficientCardError(requiredMeals, availableMeals)
  }
  if (order.meal_card_id !== firstCardId) {
    await exec(
      `UPDATE orders
      SET meal_card_id = ?, updated_at = ?
      WHERE id = ?`,
      [firstCardId, now, order.id],
    )
  }
}

async function rollbackMealCardUsages(order: Order): Promise<void> {
  const usages = await listMealCardUsages(order.id)
  if (usages.length === 0) {
    if (order.meal_card_quantity === 0) return
    if (order.meal_card_id == null) {
      throw new Error('[orders] meal_card_id is required for delivered card allocations')
    }
    const card = await getMealCard(order.meal_card_id)
    if (!card) {
      throw new Error('[orders] meal card was not found')
    }
    const usedMeals = Math.max(0, card.used_meals - order.meal_card_quantity)
    const status = usedMeals >= card.total_meals ? 'depleted' : 'active'
    await exec(
      `UPDATE meal_cards
      SET used_meals = ?, status = ?
      WHERE id = ?`,
      [usedMeals, status, card.id],
    )
    return
  }

  for (const usage of usages) {
    const card = await getMealCard(usage.meal_card_id)
    if (!card) {
      throw new Error('[orders] meal card usage card was not found')
    }
    const usedMeals = Math.max(0, card.used_meals - usage.quantity)
    const status = usedMeals >= card.total_meals ? 'depleted' : 'active'
    await exec(
      `UPDATE meal_cards
      SET used_meals = ?, status = ?
      WHERE id = ?`,
      [usedMeals, status, card.id],
    )
  }
  await exec('DELETE FROM meal_card_usages WHERE order_id = ?', [order.id])
}

export async function listOrders(input: ListOrdersInput): Promise<OrderResult[]> {
  const where: string[] = []
  const args: Array<number | string | null> = []
  if (input.startDate !== undefined) {
    where.push('order_date >= ?')
    args.push(input.startDate)
  }
  if (input.endDate !== undefined) {
    where.push('order_date <= ?')
    args.push(input.endDate)
  }
  if (input.status !== undefined) {
    where.push('status = ?')
    args.push(input.status)
  }
  if (input.customerId !== undefined) {
    where.push('customer_id = ?')
    args.push(input.customerId)
  }

  const rows = await select<OrderRow>(
    `SELECT ${ORDER_COLUMNS}
    FROM orders
    ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY
      order_date DESC,
      meal_type ASC,
      sort_order ASC,
      created_at DESC,
      id DESC`,
    args,
  )
  return rows as OrderResult[]
}

export async function getOrder(id: number): Promise<OrderResult | null> {
  const rows = await select<OrderRow>(
    `SELECT ${ORDER_COLUMNS}
    FROM orders
    WHERE id = ?`,
    [id],
  )
  return (rows[0] as OrderResult | undefined) ?? null
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  return tx(async () => {
    const normalized = await normalizeOrderInput(input)
    const matches = await listEffectiveOrdersForKey(
      input.customer_id,
      input.order_date,
      input.meal_type,
    )
    const existing = singlePendingOrThrow(matches)

    if (existing) {
      const merged = mergeOrderPaymentOrThrow(existing, normalized.breakdown)
      await assertMealCardAvailability(input.customer_id, merged.mealCardQuantity, [existing.id])
      assertPriceChangeConfirmed(existing.id, merged, input.confirm_price_change)
      const now = nowText()
      await exec(
        `UPDATE orders
        SET quantity = ?,
          unit_price = ?,
          amount = ?,
          payment_method = ?,
          meal_card_id = ?,
          meal_card_quantity = ?,
          note = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          existing.quantity + input.quantity,
          merged.unitPrice,
          merged.amount,
          merged.paymentMethod,
          merged.mealCardQuantity > 0 ? (normalized.mealCardId ?? existing.meal_card_id) : null,
          merged.mealCardQuantity,
          mergeOrderNotes(existing.note, input.note) || null,
          now,
          existing.id,
        ],
      )
      const updated = await getOrder(existing.id)
      if (!updated) throw new Error('[orders] merged order was not found')
      return updated
    }

    await assertMealCardAvailability(input.customer_id, normalized.breakdown.mealCardQuantity, [])
    const sortOrder = await getNextSortOrder(input.order_date, input.meal_type)
    const now = nowText()
    await exec(
      `INSERT INTO orders (
        customer_id,
        order_date,
        meal_type,
        quantity,
        sort_order,
        unit_price,
        amount,
        payment_method,
        meal_card_id,
        meal_card_quantity,
        status,
        note,
        created_at,
        updated_at,
        cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL)`,
      [
        input.customer_id,
        input.order_date,
        input.meal_type,
        input.quantity,
        sortOrder,
        normalized.breakdown.unitPrice,
        normalized.breakdown.amount,
        normalized.breakdown.paymentMethod,
        normalized.mealCardId,
        normalized.breakdown.mealCardQuantity,
        input.note?.trim() || null,
        now,
        now,
      ],
    )

    const id = await getLastInsertId()
    const order = await getOrder(id)
    if (!order) throw new Error('[orders] inserted order was not found')
    return order
  })
}

export async function updateOrder(id: number, input: UpdateOrderInput): Promise<OrderResult> {
  return tx(async () => {
    const current = await getOrder(id)
    if (!current) throw new Error('[orders] order was not found')
    if (current.status !== 'pending') {
      throw new Error('[orders] only pending orders can be edited')
    }

    const normalized = await normalizeOrderInput(input)
    const matches = await listEffectiveOrdersForKey(
      input.customer_id,
      input.order_date,
      input.meal_type,
      [id],
    )
    const target = singlePendingOrThrow(matches)

    if (target) {
      if (!input.confirm_merge) {
        throw new OrderMergeConfirmationError(id, target.id)
      }
      const merged = mergeOrderPaymentOrThrow(target, normalized.breakdown)
      await assertMealCardAvailability(input.customer_id, merged.mealCardQuantity, [id, target.id])
      assertPriceChangeConfirmed(target.id, merged, input.confirm_price_change)
      await exec(
        `UPDATE orders
        SET quantity = ?,
          unit_price = ?,
          amount = ?,
          payment_method = ?,
          meal_card_id = ?,
          meal_card_quantity = ?,
          note = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          target.quantity + input.quantity,
          merged.unitPrice,
          merged.amount,
          merged.paymentMethod,
          merged.mealCardQuantity > 0 ? (normalized.mealCardId ?? target.meal_card_id) : null,
          merged.mealCardQuantity,
          mergeOrderNotes(target.note, input.note) || null,
          nowText(),
          target.id,
        ],
      )
      await exec('DELETE FROM meal_card_usages WHERE order_id = ?', [id])
      await exec('DELETE FROM orders WHERE id = ?', [id])
      const mergedOrder = await getOrder(target.id)
      if (!mergedOrder) throw new Error('[orders] merged target order was not found')
      return mergedOrder
    }

    await assertMealCardAvailability(input.customer_id, normalized.breakdown.mealCardQuantity, [id])
    const sortOrder =
      current.order_date === input.order_date && current.meal_type === input.meal_type
        ? current.sort_order
        : await getNextSortOrder(input.order_date, input.meal_type)
    await exec(
      `UPDATE orders
      SET customer_id = ?,
        order_date = ?,
        meal_type = ?,
        quantity = ?,
        sort_order = ?,
        unit_price = ?,
        amount = ?,
        payment_method = ?,
        meal_card_id = ?,
        meal_card_quantity = ?,
        note = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        input.customer_id,
        input.order_date,
        input.meal_type,
        input.quantity,
        sortOrder,
        normalized.breakdown.unitPrice,
        normalized.breakdown.amount,
        normalized.breakdown.paymentMethod,
        normalized.mealCardId,
        normalized.breakdown.mealCardQuantity,
        input.note?.trim() || null,
        nowText(),
        id,
      ],
    )

    const updated = await getOrder(id)
    if (!updated) throw new Error('[orders] updated order was not found')
    return updated
  })
}

export async function reorderOrders(input: ReorderOrdersInput): Promise<void> {
  await tx(async () => {
    for (let index = 0; index < input.orderedIds.length; index += 1) {
      const orderId = input.orderedIds[index]
      if (orderId == null) continue
      await exec(
        `UPDATE orders
        SET sort_order = ?, updated_at = ?
        WHERE id = ? AND order_date = ? AND meal_type = ?`,
        [index + 1, nowText(), orderId, input.order_date, input.meal_type],
      )
    }
  })
}

export async function markDelivered(orderId: number): Promise<OrderResult> {
  return tx(async () => {
    const order = await getOrder(orderId)
    if (!order) throw new Error('[orders] order was not found')
    if (order.status === 'delivered') return order
    if (order.status === 'cancelled') {
      throw new Error('[orders] cancelled order cannot be delivered')
    }

    const sortOrder = await getNextSortOrder(order.order_date, order.meal_type)
    const now = nowText()
    await exec(
      `UPDATE orders
      SET status = 'delivered',
        sort_order = ?,
        updated_at = ?
      WHERE id = ?`,
      [sortOrder, now, orderId],
    )
    await consumeMealCards(order, now)

    const updated = await getOrder(orderId)
    if (!updated) throw new Error('[orders] delivered order was not found')
    return updated
  })
}

export async function cancelOrder(orderId: number): Promise<OrderResult | null> {
  return tx(async () => {
    const order = await getOrder(orderId)
    if (!order) return null
    if (order.status === 'delivered') throw new AlreadyDeliveredError()
    if (order.status === 'cancelled') return order

    const now = nowText()
    await exec(
      `UPDATE orders
      SET status = 'cancelled', updated_at = ?, cancelled_at = ?
      WHERE id = ?`,
      [now, now, orderId],
    )
    return getOrder(orderId)
  })
}

export async function deleteOrder(orderId: number): Promise<boolean> {
  return tx(async () => {
    const order = await getOrder(orderId)
    if (!order) return false
    if (order.status === 'delivered' && order.meal_card_quantity > 0) {
      await rollbackMealCardUsages(order)
    }
    await exec('DELETE FROM meal_card_usages WHERE order_id = ?', [orderId])
    await exec('DELETE FROM orders WHERE id = ?', [orderId])
    return true
  })
}
