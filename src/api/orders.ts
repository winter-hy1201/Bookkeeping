import { exec, select, tx, type PlusSqliteRow } from '../db'
import type {
  CreateOrderInput,
  ListOrdersInput,
  OrderResult,
  ReorderOrdersInput,
  UpdateOrderInput,
  UpdateOrderPaymentInput,
} from '../types/api'
import type { Customer, MealCard, MealType, Order, OrderStatus } from '../types/domain'
import { divideMoney, multiplyMoney } from '../utils/format'
import { AlreadyDeliveredError, InsufficientCardError } from './errors'

type OrderRow = Order & PlusSqliteRow
type CustomerRow = Customer & PlusSqliteRow
type MealCardRow = MealCard & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

interface MaxSortOrderRow extends PlusSqliteRow {
  max_sort_order: number | null
}

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

async function resolveOrderPrice(input: CreateOrderInput): Promise<{
  unitPrice: number
  amount: number
  mealCardId: number | null
}> {
  assertPositiveQuantity(input.quantity)

  if (input.payment_method === 'meal_card') {
    if (input.meal_card_id == null) {
      throw new Error('[orders] meal_card_id is required for meal card orders')
    }
    const card = await getMealCard(input.meal_card_id)
    if (!card) {
      throw new Error('[orders] meal card was not found')
    }
    if (card.customer_id !== input.customer_id) {
      throw new Error('[orders] meal card does not belong to the customer')
    }
    if (card.total_meals <= 0) {
      throw new Error('[orders] meal card total_meals is invalid')
    }
    return {
      unitPrice: input.unit_price ?? divideMoney(card.amount, card.total_meals),
      amount: 0,
      mealCardId: input.meal_card_id,
    }
  }

  const customer = await getCustomer(input.customer_id)
  if (!customer) {
    throw new Error('[orders] customer was not found')
  }

  const defaultPrice =
    input.meal_type === 'lunch' ? customer.default_lunch_price : customer.default_dinner_price
  const unitPrice =
    input.unit_price ??
    (defaultPrice == null ? null : multiplyMoney(defaultPrice, customer.discount_rate))
  if (unitPrice == null) {
    throw new Error('[orders] unit_price is required when customer default price is empty')
  }
  assertNonNegativeAmount(unitPrice, 'unit_price')

  const amount = input.amount ?? multiplyMoney(unitPrice, input.quantity)
  assertNonNegativeAmount(amount, 'amount')

  return {
    unitPrice,
    amount,
    mealCardId: null,
  }
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
    `SELECT
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
      status,
      note,
      created_at,
      updated_at,
      cancelled_at
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
    `SELECT
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
      status,
      note,
      created_at,
      updated_at,
      cancelled_at
    FROM orders
    WHERE id = ?`,
    [id],
  )
  return (rows[0] as OrderResult | undefined) ?? null
}

export async function createOrder(input: CreateOrderInput): Promise<OrderResult> {
  return tx(async () => {
    const pricing = await resolveOrderPrice(input)
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
        status,
        note,
        created_at,
        updated_at,
        cancelled_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NULL)`,
      [
        input.customer_id,
        input.order_date,
        input.meal_type,
        input.quantity,
        sortOrder,
        pricing.unitPrice,
        pricing.amount,
        input.payment_method,
        pricing.mealCardId,
        input.note ?? null,
        now,
        now,
      ],
    )

    const id = await getLastInsertId()
    const order = await getOrder(id)
    if (!order) {
      throw new Error('[orders] inserted order was not found')
    }
    return order
  })
}

export async function updateOrder(id: number, input: UpdateOrderInput): Promise<OrderResult> {
  return tx(async () => {
    const current = await getOrder(id)
    if (!current) {
      throw new Error('[orders] order was not found')
    }
    if (current.status !== 'pending') {
      throw new Error('[orders] only pending orders can be edited')
    }

    const pricing = await resolveOrderPrice(input)
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
        note = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        input.customer_id,
        input.order_date,
        input.meal_type,
        input.quantity,
        sortOrder,
        pricing.unitPrice,
        pricing.amount,
        input.payment_method,
        pricing.mealCardId,
        input.note ?? null,
        nowText(),
        id,
      ],
    )

    const updated = await getOrder(id)
    if (!updated) {
      throw new Error('[orders] updated order was not found')
    }
    return updated
  })
}

export async function updateOrderStatus(
  id: number,
  status: OrderStatus,
): Promise<OrderResult | null> {
  return tx(async () => {
    await exec(
      `UPDATE orders
      SET status = ?, updated_at = ?
      WHERE id = ?`,
      [status, nowText(), id],
    )
    return getOrder(id)
  })
}

export async function updateOrderPayment(
  id: number,
  input: UpdateOrderPaymentInput,
): Promise<OrderResult | null> {
  assertNonNegativeAmount(input.unit_price, 'unit_price')
  assertNonNegativeAmount(input.amount, 'amount')

  return tx(async () => {
    await exec(
      `UPDATE orders
      SET payment_method = ?,
        unit_price = ?,
        amount = ?,
        meal_card_id = NULL,
        updated_at = ?
      WHERE id = ?`,
      [input.payment_method, input.unit_price, input.amount, nowText(), id],
    )
    return getOrder(id)
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
    if (!order) {
      throw new Error('[orders] order was not found')
    }
    if (order.status === 'delivered') {
      return order
    }
    if (order.status === 'cancelled') {
      throw new Error('[orders] cancelled order cannot be delivered')
    }

    await exec(
      `UPDATE orders
      SET status = 'delivered', updated_at = ?
      WHERE id = ?`,
      [nowText(), orderId],
    )

    if (order.payment_method === 'meal_card') {
      if (order.meal_card_id == null) {
        throw new Error('[orders] meal_card_id is required for meal card orders')
      }
      const card = await getMealCard(order.meal_card_id)
      if (!card) {
        throw new Error('[orders] meal card was not found')
      }
      const usedMeals = card.used_meals + order.quantity
      if (usedMeals > card.total_meals) {
        throw new InsufficientCardError()
      }
      const status = usedMeals >= card.total_meals ? 'depleted' : 'active'
      await exec(
        `UPDATE meal_cards
        SET used_meals = ?, status = ?
        WHERE id = ?`,
        [usedMeals, status, card.id],
      )
    }

    const updated = await getOrder(orderId)
    if (!updated) {
      throw new Error('[orders] delivered order was not found')
    }
    return updated
  })
}

export async function cancelOrder(orderId: number): Promise<OrderResult | null> {
  return tx(async () => {
    const order = await getOrder(orderId)
    if (!order) {
      return null
    }
    if (order.status === 'delivered') {
      throw new AlreadyDeliveredError()
    }
    if (order.status === 'cancelled') {
      return order
    }

    await exec(
      `UPDATE orders
      SET status = 'cancelled', updated_at = ?, cancelled_at = ?
      WHERE id = ?`,
      [nowText(), nowText(), orderId],
    )

    return getOrder(orderId)
  })
}

export async function deleteOrder(orderId: number): Promise<boolean> {
  return tx(async () => {
    const order = await getOrder(orderId)
    if (!order) {
      return false
    }

    if (order.status === 'delivered' && order.payment_method === 'meal_card') {
      if (order.meal_card_id == null) {
        throw new Error('[orders] meal_card_id is required for delivered meal card orders')
      }
      const card = await getMealCard(order.meal_card_id)
      if (!card) {
        throw new Error('[orders] meal card was not found')
      }
      const usedMeals = Math.max(0, card.used_meals - order.quantity)
      const status = usedMeals >= card.total_meals ? 'depleted' : 'active'
      await exec(
        `UPDATE meal_cards
        SET used_meals = ?, status = ?
        WHERE id = ?`,
        [usedMeals, status, card.id],
      )
    }

    await exec('DELETE FROM orders WHERE id = ?', [orderId])
    return true
  })
}
