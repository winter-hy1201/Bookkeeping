import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { SaveDailyMenuInput } from '../types/api'
import type { DailyMenu } from '../types/domain'

type DailyMenuRow = DailyMenu & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

export class DailyMenuDateConflictError extends Error {
  readonly existingId: number

  constructor(existingId: number) {
    super('该日期已有菜单')
    this.name = 'DailyMenuDateConflictError'
    this.existingId = existingId
  }
}

function normalizeInput(input: SaveDailyMenuInput): Required<SaveDailyMenuInput> {
  const menuDate = input.menu_date.trim()
  const lunchText = input.lunch_text?.trim() || null
  const dinnerText = input.dinner_text?.trim() || null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(menuDate)) throw new Error('请选择菜单日期')
  if (!lunchText && !dinnerText) throw new Error('午餐和晚餐至少填写一项')
  return { menu_date: menuDate, lunch_text: lunchText, dinner_text: dinnerText }
}

export async function listCurrentDailyMenus(todayDate: string): Promise<DailyMenu[]> {
  const rows = await select<DailyMenuRow>(
    `SELECT * FROM daily_menus WHERE menu_date >= ? ORDER BY menu_date ASC, id ASC`,
    [todayDate],
  )
  return rows as DailyMenu[]
}

export async function listHistoricalDailyMenus(todayDate: string): Promise<DailyMenu[]> {
  const rows = await select<DailyMenuRow>(
    `SELECT * FROM daily_menus WHERE menu_date < ? ORDER BY menu_date DESC, id DESC`,
    [todayDate],
  )
  return rows as DailyMenu[]
}

export async function getDailyMenu(id: number): Promise<DailyMenu | null> {
  const rows = await select<DailyMenuRow>('SELECT * FROM daily_menus WHERE id = ?', [id])
  return (rows[0] as DailyMenu | undefined) ?? null
}

export async function getDailyMenuByDate(menuDate: string): Promise<DailyMenu | null> {
  const rows = await select<DailyMenuRow>('SELECT * FROM daily_menus WHERE menu_date = ?', [
    menuDate,
  ])
  return (rows[0] as DailyMenu | undefined) ?? null
}

export async function createDailyMenu(input: SaveDailyMenuInput): Promise<DailyMenu> {
  return tx(async () => {
    const normalized = normalizeInput(input)
    const existing = await getDailyMenuByDate(normalized.menu_date)
    if (existing) throw new DailyMenuDateConflictError(existing.id)
    const now = new Date().toISOString()
    await exec(
      `INSERT INTO daily_menus (menu_date, lunch_text, dinner_text, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
      [normalized.menu_date, normalized.lunch_text, normalized.dinner_text, now, now],
    )
    const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
    const id = rows[0]?.id
    if (typeof id !== 'number') throw new Error('菜单保存失败')
    const created = await getDailyMenu(id)
    if (!created) throw new Error('菜单保存失败')
    return created
  })
}

export async function updateDailyMenu(
  id: number,
  input: SaveDailyMenuInput,
): Promise<DailyMenu | null> {
  return tx(async () => {
    const existing = await getDailyMenu(id)
    if (!existing) return null
    const normalized = normalizeInput(input)
    const dateMatch = await getDailyMenuByDate(normalized.menu_date)
    if (dateMatch && dateMatch.id !== id) throw new DailyMenuDateConflictError(dateMatch.id)
    await exec(
      `UPDATE daily_menus
      SET menu_date = ?, lunch_text = ?, dinner_text = ?, updated_at = ?
      WHERE id = ?`,
      [
        normalized.menu_date,
        normalized.lunch_text,
        normalized.dinner_text,
        new Date().toISOString(),
        id,
      ],
    )
    return getDailyMenu(id)
  })
}

export async function deleteDailyMenu(id: number): Promise<boolean> {
  return tx(async () => {
    const existing = await getDailyMenu(id)
    if (!existing) return false
    await exec('DELETE FROM daily_menus WHERE id = ?', [id])
    return true
  })
}
