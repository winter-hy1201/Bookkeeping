import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { SaveMealCardMessageTemplateInput } from '../types/api'
import type { MealCardMessageTemplate, MealCardTemplateVersion } from '../types/domain'
import { validateMealCardTemplate } from '../utils/meal-card-template'

type MealCardMessageTemplateRow = MealCardMessageTemplate & PlusSqliteRow
type MealCardTemplateVersionRow = MealCardTemplateVersion & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

export class MealCardTemplateNameConflictError extends Error {
  constructor() {
    super('月卡模板名称已存在')
    this.name = 'MealCardTemplateNameConflictError'
  }
}

function normalizeInput(input: SaveMealCardMessageTemplateInput): SaveMealCardMessageTemplateInput {
  const name = input.name.trim()
  const body = input.body.trim()
  if (!name) throw new Error('请输入模板名称')
  validateMealCardTemplate(body)
  return { name, body }
}

async function assertUniqueName(name: string, excludedId?: number): Promise<void> {
  const rows = await select<{ id: number } & PlusSqliteRow>(
    `SELECT id FROM meal_card_message_templates WHERE name = ?${excludedId ? ' AND id != ?' : ''} LIMIT 1`,
    excludedId ? [name, excludedId] : [name],
  )
  if (rows.length > 0) throw new MealCardTemplateNameConflictError()
}

async function snapshot(template: MealCardMessageTemplate): Promise<void> {
  await exec(
    `INSERT INTO meal_card_template_versions (template_id, name, body, created_at)
    VALUES (?, ?, ?, ?)`,
    [template.id, template.name, template.body, new Date().toISOString()],
  )
}

export async function listMealCardMessageTemplates(): Promise<MealCardMessageTemplate[]> {
  const rows = await select<MealCardMessageTemplateRow>(
    'SELECT * FROM meal_card_message_templates ORDER BY is_default DESC, updated_at DESC, id DESC',
  )
  return rows as MealCardMessageTemplate[]
}

export async function getMealCardMessageTemplate(
  id: number,
): Promise<MealCardMessageTemplate | null> {
  const rows = await select<MealCardMessageTemplateRow>(
    'SELECT * FROM meal_card_message_templates WHERE id = ?',
    [id],
  )
  return (rows[0] as MealCardMessageTemplate | undefined) ?? null
}

export async function getDefaultMealCardMessageTemplate(): Promise<MealCardMessageTemplate | null> {
  const rows = await select<MealCardMessageTemplateRow>(
    'SELECT * FROM meal_card_message_templates WHERE is_default = 1 LIMIT 1',
  )
  return (rows[0] as MealCardMessageTemplate | undefined) ?? null
}

export async function createMealCardMessageTemplate(
  input: SaveMealCardMessageTemplateInput,
): Promise<MealCardMessageTemplate> {
  return tx(async () => {
    const normalized = normalizeInput(input)
    await assertUniqueName(normalized.name)
    const countRows = await select<{ cnt: number } & PlusSqliteRow>(
      'SELECT COUNT(*) AS cnt FROM meal_card_message_templates',
    )
    const isDefault = (countRows[0]?.cnt ?? 0) === 0 ? 1 : 0
    const now = new Date().toISOString()
    await exec(
      `INSERT INTO meal_card_message_templates (name, body, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
      [normalized.name, normalized.body, isDefault, now, now],
    )
    const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
    const id = rows[0]?.id
    if (typeof id !== 'number') throw new Error('月卡模板保存失败')
    const created = await getMealCardMessageTemplate(id)
    if (!created) throw new Error('月卡模板保存失败')
    return created
  })
}

export async function updateMealCardMessageTemplate(
  id: number,
  input: SaveMealCardMessageTemplateInput,
): Promise<MealCardMessageTemplate | null> {
  return tx(async () => {
    const existing = await getMealCardMessageTemplate(id)
    if (!existing) return null
    const normalized = normalizeInput(input)
    await assertUniqueName(normalized.name, id)
    if (existing.name === normalized.name && existing.body === normalized.body) return existing
    await snapshot(existing)
    await exec(
      'UPDATE meal_card_message_templates SET name = ?, body = ?, updated_at = ? WHERE id = ?',
      [normalized.name, normalized.body, new Date().toISOString(), id],
    )
    return getMealCardMessageTemplate(id)
  })
}

export async function setDefaultMealCardMessageTemplate(id: number): Promise<boolean> {
  return tx(async () => {
    const existing = await getMealCardMessageTemplate(id)
    if (!existing) return false
    await exec('UPDATE meal_card_message_templates SET is_default = 0 WHERE is_default = 1')
    await exec('UPDATE meal_card_message_templates SET is_default = 1 WHERE id = ?', [id])
    return true
  })
}

export async function deleteMealCardMessageTemplate(
  id: number,
  replacementId?: number,
): Promise<boolean> {
  return tx(async () => {
    const existing = await getMealCardMessageTemplate(id)
    if (!existing) return false
    if (existing.is_default === 1) {
      const others = (await listMealCardMessageTemplates()).filter((item) => item.id !== id)
      if (others.length > 0) {
        const replacement = others.find((item) => item.id === replacementId)
        if (!replacement) throw new Error('请选择新的默认月卡模板')
        await exec(
          'UPDATE meal_card_message_templates SET is_default = 0 WHERE id = ?',
          [id],
        )
        await exec(
          'UPDATE meal_card_message_templates SET is_default = 1 WHERE id = ?',
          [replacement.id],
        )
      }
    }
    await exec('DELETE FROM meal_card_message_templates WHERE id = ?', [id])
    return true
  })
}

export async function listMealCardTemplateVersions(
  templateId: number,
): Promise<MealCardTemplateVersion[]> {
  const rows = await select<MealCardTemplateVersionRow>(
    `SELECT * FROM meal_card_template_versions
    WHERE template_id = ? ORDER BY created_at DESC, id DESC`,
    [templateId],
  )
  return rows as MealCardTemplateVersion[]
}

export async function restoreMealCardTemplateVersion(
  templateId: number,
  versionId: number,
): Promise<MealCardMessageTemplate | null> {
  return tx(async () => {
    const existing = await getMealCardMessageTemplate(templateId)
    if (!existing) return null
    const rows = await select<MealCardTemplateVersionRow>(
      'SELECT * FROM meal_card_template_versions WHERE id = ? AND template_id = ?',
      [versionId, templateId],
    )
    const version = rows[0]
    if (!version) throw new Error('月卡模板历史版本不存在')
    validateMealCardTemplate(version.body)
    await assertUniqueName(version.name, templateId)
    if (existing.name === version.name && existing.body === version.body) return existing
    await snapshot(existing)
    await exec(
      'UPDATE meal_card_message_templates SET name = ?, body = ?, updated_at = ? WHERE id = ?',
      [version.name, version.body, new Date().toISOString(), templateId],
    )
    return getMealCardMessageTemplate(templateId)
  })
}
