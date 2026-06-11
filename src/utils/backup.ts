import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { Customer, Expense, ExpenseCategory, MealCard, Order } from '../types/domain'

const BACKUP_VERSION = '1.0'

interface BackupPayload {
  version: string
  exported_at: string
  schema_version: number
  customers: Customer[]
  meal_cards: MealCard[]
  orders: Order[]
  expense_categories: ExpenseCategory[]
  expenses: Expense[]
}

interface VersionRow extends PlusSqliteRow {
  user_version: number
}

type CustomerRow = Customer & PlusSqliteRow
type MealCardRow = MealCard & PlusSqliteRow
type OrderRow = Order & PlusSqliteRow
type ExpenseCategoryRow = ExpenseCategory & PlusSqliteRow
type ExpenseRow = Expense & PlusSqliteRow

function nowStamp(): string {
  const d = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

async function schemaVersion(): Promise<number> {
  const rows = await select<VersionRow>('PRAGMA user_version')
  return rows[0]?.user_version ?? 0
}

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [version, customers, mealCards, orders, expenseCategories, expenses] = await Promise.all([
    schemaVersion(),
    select<CustomerRow>('SELECT * FROM customers ORDER BY id ASC'),
    select<MealCardRow>('SELECT * FROM meal_cards ORDER BY id ASC'),
    select<OrderRow>('SELECT * FROM orders ORDER BY id ASC'),
    select<ExpenseCategoryRow>('SELECT * FROM expense_categories ORDER BY id ASC'),
    select<ExpenseRow>('SELECT * FROM expenses ORDER BY id ASC'),
  ])

  return {
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    schema_version: version,
    customers: customers as Customer[],
    meal_cards: mealCards as MealCard[],
    orders: orders as Order[],
    expense_categories: expenseCategories as ExpenseCategory[],
    expenses: expenses as Expense[],
  }
}

function ensureBackupPayload(value: unknown): BackupPayload {
  const payload = value as Partial<BackupPayload>
  const arrays = [
    payload.customers,
    payload.meal_cards,
    payload.orders,
    payload.expense_categories,
    payload.expenses,
  ]
  if (payload.version !== BACKUP_VERSION || arrays.some((item) => !Array.isArray(item))) {
    throw new Error('备份文件版本不兼容或格式无效')
  }
  if (typeof payload.schema_version !== 'number') {
    throw new Error('备份文件版本不兼容或格式无效')
  }
  return payload as BackupPayload
}

async function writeDocFile(fileName: string, content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      '_doc/',
      (entry) => {
        const directory = entry as PlusIoDirectoryEntry
        directory.getFile(
          fileName,
          { create: true },
          (fileEntry) => {
            fileEntry.createWriter(
              (writer) => {
                writer.onwrite = () => resolve(fileEntry.fullPath || `_doc/${fileName}`)
                writer.onerror = () => reject(new Error('写入备份文件失败'))
                writer.write(content)
              },
              () => reject(new Error('创建备份写入器失败')),
            )
          },
          () => reject(new Error('创建备份文件失败')),
        )
      },
      () => reject(new Error('打开应用沙盒失败')),
    )
  })
}

async function shareFile(path: string): Promise<void> {
  if (!plus.share) {
    throw new Error('当前环境不支持系统分享')
  }
  return new Promise((resolve, reject) => {
    plus.share.getServices(
      (services) => {
        const service = services[0]
        if (!service) {
          reject(new Error('没有可用的分享服务'))
          return
        }
        const message = {
            type: 'file',
            files: [path],
          } as unknown as PlusShareShareMessage
        service.send(
          message,
          () => resolve(),
          () => reject(new Error('分享备份文件失败')),
        )
      },
      () => reject(new Error('获取分享服务失败')),
    )
  })
}

export async function exportBackup(): Promise<string> {
  const payload = await buildBackupPayload()
  const fileName = `backup_${nowStamp()}.json`
  const path = await writeDocFile(fileName, JSON.stringify(payload, null, 2))
  await shareFile(path)
  return path
}

export function parseBackupText(text: string): BackupPayload {
  if (!text.trim()) {
    throw new Error('文件无效')
  }
  return ensureBackupPayload(JSON.parse(text) as unknown)
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  const currentSchemaVersion = await schemaVersion()
  if (payload.schema_version !== currentSchemaVersion) {
    throw new Error('备份文件版本不兼容')
  }

  await tx(async () => {
    await exec('DELETE FROM orders')
    await exec('DELETE FROM expenses')
    await exec('DELETE FROM meal_cards')
    await exec('DELETE FROM customers')
    await exec('DELETE FROM expense_categories')

    for (const item of payload.customers) {
      await exec(
        `INSERT INTO customers (
          id, name, phone, wechat, default_lunch_price, default_dinner_price,
          discount_rate, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.phone,
          item.wechat,
          item.default_lunch_price,
          item.default_dinner_price,
          item.discount_rate,
          item.note,
          item.created_at,
          item.updated_at,
        ],
      )
    }

    for (const item of payload.expense_categories) {
      await exec(
        `INSERT INTO expense_categories (id, name, icon, sort_order, is_default)
        VALUES (?, ?, ?, ?, ?)`,
        [item.id, item.name, item.icon, item.sort_order, item.is_default],
      )
    }

    for (const item of payload.meal_cards) {
      await exec(
        `INSERT INTO meal_cards (
          id, customer_id, total_meals, used_meals, amount, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.customer_id,
          item.total_meals,
          item.used_meals,
          item.amount,
          item.status,
          item.created_at,
        ],
      )
    }

    for (const item of payload.orders) {
      await exec(
        `INSERT INTO orders (
          id, customer_id, order_date, meal_type, quantity, unit_price, amount,
          payment_method, meal_card_id, status, note, created_at, updated_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.customer_id,
          item.order_date,
          item.meal_type,
          item.quantity,
          item.unit_price,
          item.amount,
          item.payment_method,
          item.meal_card_id,
          item.status,
          item.note,
          item.created_at,
          item.updated_at,
          item.cancelled_at,
        ],
      )
    }

    for (const item of payload.expenses) {
      await exec(
        `INSERT INTO expenses (id, expense_date, category_id, amount, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [item.id, item.expense_date, item.category_id, item.amount, item.note, item.created_at],
      )
    }
  })
}

export async function clearAllData(): Promise<void> {
  await tx(async () => {
    await exec('DELETE FROM orders')
    await exec('DELETE FROM expenses')
    await exec('DELETE FROM meal_cards')
    await exec('DELETE FROM customers')
    await exec('DELETE FROM expense_categories')
  })
}
