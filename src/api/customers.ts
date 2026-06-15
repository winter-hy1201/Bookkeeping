import { exec, select, tx, type PlusSqliteRow } from '../db'
import { DuplicateCustomerNameError } from './errors'
import type { CreateCustomerInput, CustomerResult, UpdateCustomerInput } from '../types/api'
import type { Customer } from '../types/domain'

type CustomerRow = Customer & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

interface CountRow extends PlusSqliteRow {
  count: number
}

type CustomerColumn =
  | 'name'
  | 'phone'
  | 'wechat'
  | 'default_lunch_price'
  | 'default_dinner_price'
  | 'discount_rate'
  | 'note'

interface UpdatePair {
  column: CustomerColumn
  value: number | string | null
}

function nowText(): string {
  return new Date().toISOString()
}

function normalizeCreateInput(input: CreateCustomerInput): Required<CreateCustomerInput> {
  const name = input.name.trim()
  if (!name) {
    throw new Error('[customers] name is required')
  }

  return {
    name,
    phone: input.phone ?? null,
    wechat: input.wechat ?? null,
    default_lunch_price: input.default_lunch_price ?? null,
    default_dinner_price: input.default_dinner_price ?? null,
    discount_rate: input.discount_rate ?? 1,
    note: input.note ?? null,
  }
}

function buildUpdatePairs(input: UpdateCustomerInput): UpdatePair[] {
  const pairs: UpdatePair[] = []

  if (input.name !== undefined) {
    const name = input.name.trim()
    if (!name) {
      throw new Error('[customers] name is required')
    }
    pairs.push({ column: 'name', value: name })
  }

  if (input.phone !== undefined) pairs.push({ column: 'phone', value: input.phone })
  if (input.wechat !== undefined) pairs.push({ column: 'wechat', value: input.wechat })
  if (input.default_lunch_price !== undefined) {
    pairs.push({ column: 'default_lunch_price', value: input.default_lunch_price })
  }
  if (input.default_dinner_price !== undefined) {
    pairs.push({ column: 'default_dinner_price', value: input.default_dinner_price })
  }
  if (input.discount_rate !== undefined) {
    pairs.push({ column: 'discount_rate', value: input.discount_rate })
  }
  if (input.note !== undefined) pairs.push({ column: 'note', value: input.note })

  return pairs
}

async function getLastInsertId(): Promise<number> {
  const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
  const id = rows[0]?.id
  if (typeof id !== 'number') {
    throw new Error('[customers] failed to read inserted customer id')
  }
  return id
}

async function getCount(sql: string, args: Array<number | string | null>): Promise<number> {
  const rows = await select<CountRow>(sql, args)
  return rows[0]?.count ?? 0
}

async function assertUniqueCustomerName(name: string, excludeId?: number): Promise<void> {
  const sql =
    excludeId === undefined
      ? 'SELECT COUNT(*) AS count FROM customers WHERE name = ?'
      : 'SELECT COUNT(*) AS count FROM customers WHERE name = ? AND id != ?'
  const args: Array<number | string | null> =
    excludeId === undefined ? [name] : [name, excludeId]
  const count = await getCount(sql, args)
  if (count > 0) {
    throw new DuplicateCustomerNameError()
  }
}

export async function listCustomers(): Promise<CustomerResult[]> {
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
    ORDER BY created_at DESC, id DESC`,
  )
  return rows as CustomerResult[]
}

export async function getCustomer(id: number): Promise<CustomerResult | null> {
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
    [id],
  )
  return (rows[0] as CustomerResult | undefined) ?? null
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerResult> {
  return tx(async () => {
    const customer = normalizeCreateInput(input)
    const now = nowText()

    await assertUniqueCustomerName(customer.name)

    await exec(
      `INSERT INTO customers (
        name,
        phone,
        wechat,
        default_lunch_price,
        default_dinner_price,
        discount_rate,
        note,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.name,
        customer.phone,
        customer.wechat,
        customer.default_lunch_price,
        customer.default_dinner_price,
        customer.discount_rate,
        customer.note,
        now,
        now,
      ],
    )

    const id = await getLastInsertId()
    const created = await getCustomer(id)
    if (!created) {
      throw new Error('[customers] inserted customer was not found')
    }
    return created
  })
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<CustomerResult | null> {
  return tx(async () => {
    const updates = buildUpdatePairs(input)
    const nameUpdate = updates.find((item) => item.column === 'name')

    if (typeof nameUpdate?.value === 'string') {
      await assertUniqueCustomerName(nameUpdate.value, id)
    }

    if (updates.length > 0) {
      const assignments = updates.map(({ column }) => `${column} = ?`)
      const values = updates.map(({ value }) => value)
      await exec(
        `UPDATE customers
        SET ${assignments.join(', ')}, updated_at = ?
        WHERE id = ?`,
        [...values, nowText(), id],
      )
    }

    return getCustomer(id)
  })
}

export async function deleteCustomer(id: number): Promise<boolean> {
  return tx(async () => {
    const cardCount = await getCount(
      'SELECT COUNT(*) AS count FROM meal_cards WHERE customer_id = ?',
      [id],
    )
    const orderCount = await getCount(
      'SELECT COUNT(*) AS count FROM orders WHERE customer_id = ?',
      [id],
    )

    if (cardCount > 0 || orderCount > 0) {
      return false
    }

    await exec('DELETE FROM customers WHERE id = ?', [id])
    return true
  })
}
