import { exec, select, tx, type PlusSqliteRow } from '../db'
import { seedIfEmpty } from '../db/seed'
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

/** 5+ `readEntries` 实际返回的条目视图，仅用到本场景下的字段 */
interface PlusIoEntryView {
  isFile?: boolean
  isDirectory?: boolean
  name?: string
  fullPath?: string
}

type AndroidActivityResultHandler = (request: number, result: number, data: unknown) => void

type AndroidActivity = PlusAndroidInstanceObject & {
  getContentResolver: () => { openInputStream: (uri: unknown) => PlusAndroidInstanceObject | null }
  onActivityResult?: AndroidActivityResultHandler
  startActivityForResult: (intent: PlusAndroidInstanceObject, requestCode: number) => void
}

type AndroidIntentClass = PlusAndroidClassObject & {
  ACTION_GET_CONTENT: string
  CATEGORY_OPENABLE: string
  createChooser: (intent: PlusAndroidInstanceObject, title: string) => PlusAndroidInstanceObject
}

type AndroidIntent = PlusAndroidInstanceObject & {
  addCategory: (category: string) => void
  setType: (type: string) => void
}

type AndroidTextReader = PlusAndroidInstanceObject & {
  readLine: () => string | null
  close: () => void
}

type AndroidInputStream = PlusAndroidInstanceObject & {
  close: () => void
}

type AndroidIntentResult = PlusAndroidInstanceObject & {
  getData: () => unknown
}

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

function ensureDownloadDir(): Promise<PlusIoDirectoryEntry> {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      '_downloads/',
      (entry) => resolve(entry as PlusIoDirectoryEntry),
      () => reject(new Error('下载目录不可用')),
    )
  })
}

async function copyToDownloads(srcPath: string, fileName: string): Promise<string> {
  const dir = await ensureDownloadDir()
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      srcPath,
      (srcEntry) => {
        const src = srcEntry as unknown as PlusIoFileEntry
        src.copyTo(
          dir,
          fileName,
          (fileEntry) => {
            const dest = fileEntry as unknown as PlusIoFileEntry
            resolve(dest.fullPath ?? fileName)
          },
          () => reject(new Error('复制到下载目录失败')),
        )
      },
      () => reject(new Error('打开备份文件失败')),
    )
  })
}

async function readFileText(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    plus.io.resolveLocalFileSystemURL(
      path,
      (entry) => {
        const file = entry as unknown as PlusIoFileEntry
        file.file(
          (blob) => {
            const reader = new plus.io.FileReader()
            reader.onloadend = () => {
              const result = reader.result
              if (result == null) {
                reject(new Error('读取备份文件失败'))
                return
              }
              resolve(result)
            }
            reader.onerror = () => reject(new Error('读取备份文件失败'))
            reader.readAsText(blob, 'utf-8')
          },
          () => reject(new Error('读取备份文件失败')),
        )
      },
      () => reject(new Error('打开备份文件失败')),
    )
  })
}

function readAndroidUriText(uri: unknown): string {
  const activity = plus.android.runtimeMainActivity() as AndroidActivity
  const resolver = activity.getContentResolver()
  const inputStream = resolver.openInputStream(uri) as AndroidInputStream | null
  if (!inputStream) {
    throw new Error('读取备份文件失败')
  }

  const inputStreamReader = plus.android.newObject('java.io.InputStreamReader', [
    inputStream,
    'UTF-8',
  ])
  const reader = plus.android.newObject('java.io.BufferedReader', [
    inputStreamReader,
  ]) as AndroidTextReader
  plus.android.importClass(reader)
  plus.android.importClass(inputStream)

  const lines: string[] = []
  try {
    let line = reader.readLine()
    while (line !== null) {
      lines.push(String(line))
      line = reader.readLine()
    }
  } finally {
    reader.close()
    inputStream.close()
  }
  return lines.join('\n')
}

function pickAndroidFileText(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.android) {
      reject(new Error('当前环境不支持安卓文件选择'))
      return
    }

    const Intent = plus.android.importClass('android.content.Intent') as AndroidIntentClass
    const activity = plus.android.runtimeMainActivity() as AndroidActivity
    const requestCode = Date.now() % 65535
    const previousHandler = activity.onActivityResult

    const restoreHandler = () => {
      activity.onActivityResult = previousHandler
    }

    activity.onActivityResult = (request: number, result: number, data: unknown) => {
      if (request !== requestCode) {
        previousHandler?.(request, result, data)
        return
      }
      restoreHandler()
      if (result !== -1 || !data) {
        reject(new Error('未选择文件'))
        return
      }
      try {
        const intentData = data as AndroidIntentResult
        plus.android.importClass(intentData)
        const uri = intentData.getData()
        resolve(readAndroidUriText(uri))
      } catch (error) {
        reject(error instanceof Error ? error : new Error('读取备份文件失败'))
      }
    }

    try {
      const intent = plus.android.newObject(
        'android.content.Intent',
        Intent.ACTION_GET_CONTENT,
      ) as AndroidIntent
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.setType('*/*')
      activity.startActivityForResult(Intent.createChooser(intent, '选择备份 JSON 文件'), requestCode)
    } catch {
      restoreHandler()
      reject(new Error('打开文件选择器失败'))
    }
  })
}

interface UniChooseFileResult {
  tempFiles?: Array<{ path?: string; name?: string }>
  tempFilePaths?: string[]
}

function pickUniFileText(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chooseFile = uni.chooseFile as
      | ((options: {
          type?: string
          count?: number
          extension?: string[]
          success: (result: UniChooseFileResult) => void
          fail: (error: { errMsg?: string }) => void
        }) => void)
      | undefined
    if (typeof chooseFile !== 'function') {
      reject(new Error('当前环境不支持文件选择'))
      return
    }
    chooseFile({
      type: 'all',
      count: 1,
      extension: ['.json', 'json'],
      success: (result) => {
        const path = result.tempFiles?.[0]?.path ?? result.tempFilePaths?.[0]
        if (!path) {
          reject(new Error('读取备份文件失败'))
          return
        }
        readFileText(path).then(resolve).catch(reject)
      },
      fail: () => reject(new Error('未选择文件')),
    })
  })
}

export async function pickLocalBackupText(): Promise<string> {
  if (typeof plus !== 'undefined' && plus.android) {
    return pickAndroidFileText()
  }
  return pickUniFileText()
}

export interface ExportResult {
  /** 沙盒文档目录路径，永久存在 */
  internalPath: string
  /** 5+ 应用私有下载目录，文件管理可见；复制失败时为 null */
  downloadPath: string | null
}

export async function exportBackup(): Promise<ExportResult> {
  const payload = await buildBackupPayload()
  const fileName = `backup_${nowStamp()}.json`
  const internalPath = await writeDocFile(fileName, JSON.stringify(payload, null, 2))
  let downloadPath: string | null = null
  try {
    downloadPath = await copyToDownloads(internalPath, fileName)
  } catch {
    downloadPath = null
  }
  return { internalPath, downloadPath }
}

export function parseBackupText(text: string): BackupPayload {
  if (!text.trim()) {
    throw new Error('文件无效')
  }
  return ensureBackupPayload(JSON.parse(text) as unknown)
}

export interface BackupFileEntry {
  name: string
  fullPath: string
}

/** 列出 `_doc/` 下所有 `backup_*.json`，按文件名倒序（最新在前） */
export async function listBackupFiles(): Promise<BackupFileEntry[]> {
  if (typeof plus === 'undefined' || !plus.io) return []
  return new Promise((resolve) => {
    plus.io.resolveLocalFileSystemURL(
      '_doc/',
      (entry) => {
        const reader = (entry as PlusIoDirectoryEntry).createReader()
        reader.readEntries(
          (raw) => {
            const entries = raw as unknown as PlusIoEntryView[]
            const files = entries
              .filter((e) => Boolean(e.isFile) && /^backup_.*\.json$/.test(e.name ?? ''))
              .map((e) => ({ name: e.name as string, fullPath: (e.fullPath ?? '') as string }))
              .sort((a, b) => b.name.localeCompare(a.name))
            resolve(files)
          },
          () => resolve([]),
        )
      },
      () => resolve([]),
    )
  })
}

/** 从应用沙盒内绝对路径读取并解析备份 payload；用于"从已保存备份恢复" */
export async function readBackupFile(path: string): Promise<BackupPayload> {
  const text = await readFileText(path)
  return parseBackupText(text)
}

export async function importBackup(payload: BackupPayload): Promise<void> {
  const currentSchemaVersion = await schemaVersion()
  const canUpgradeOlderBackup =
    (payload.schema_version === 1 && currentSchemaVersion === 2) ||
    ([1, 2].includes(payload.schema_version) && currentSchemaVersion === 3)
  if (payload.schema_version !== currentSchemaVersion && !canUpgradeOlderBackup) {
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
      const sortOrder = item.sort_order ?? 0
      await exec(
        `INSERT INTO orders (
          id, customer_id, order_date, meal_type, quantity, sort_order, unit_price, amount,
          payment_method, meal_card_id, status, note, created_at, updated_at, cancelled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.customer_id,
          item.order_date,
          item.meal_type,
          item.quantity,
          sortOrder,
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
      const refundAmount = item.refund_amount ?? 0
      await exec(
        `INSERT INTO expenses (
          id, expense_date, category_id, amount, refund_amount, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.expense_date,
          item.category_id,
          item.amount,
          refundAmount,
          item.note,
          item.created_at,
        ],
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
    await seedIfEmpty()
  })
}
