import { exec, select, tx, type PlusSqliteRow } from '../db'
import type { SaveMessageTemplateInput } from '../types/api'
import type { MessageTemplate, TemplateVersion } from '../types/domain'
import { validateMenuTemplate } from '../utils/menu-template'

type MessageTemplateRow = MessageTemplate & PlusSqliteRow
type TemplateVersionRow = TemplateVersion & PlusSqliteRow

interface LastInsertRow extends PlusSqliteRow {
  id: number
}

export class TemplateNameConflictError extends Error {
  constructor() {
    super('模板名称已存在')
    this.name = 'TemplateNameConflictError'
  }
}

function normalizeInput(input: SaveMessageTemplateInput): SaveMessageTemplateInput {
  const name = input.name.trim()
  const body = input.body.trim()
  if (!name) throw new Error('请输入模板名称')
  validateMenuTemplate(body)
  return { name, body }
}

async function assertUniqueName(name: string, excludedId?: number): Promise<void> {
  const rows = await select<{ id: number } & PlusSqliteRow>(
    `SELECT id FROM message_templates WHERE name = ?${excludedId ? ' AND id != ?' : ''} LIMIT 1`,
    excludedId ? [name, excludedId] : [name],
  )
  if (rows.length > 0) throw new TemplateNameConflictError()
}

async function snapshot(template: MessageTemplate): Promise<void> {
  await exec(
    `INSERT INTO template_versions (template_id, name, body, created_at)
    VALUES (?, ?, ?, ?)`,
    [template.id, template.name, template.body, new Date().toISOString()],
  )
}

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  const rows = await select<MessageTemplateRow>(
    'SELECT * FROM message_templates ORDER BY is_default DESC, updated_at DESC, id DESC',
  )
  return rows as MessageTemplate[]
}

export async function getMessageTemplate(id: number): Promise<MessageTemplate | null> {
  const rows = await select<MessageTemplateRow>('SELECT * FROM message_templates WHERE id = ?', [
    id,
  ])
  return (rows[0] as MessageTemplate | undefined) ?? null
}

export async function getDefaultMessageTemplate(): Promise<MessageTemplate | null> {
  const rows = await select<MessageTemplateRow>(
    'SELECT * FROM message_templates WHERE is_default = 1 LIMIT 1',
  )
  return (rows[0] as MessageTemplate | undefined) ?? null
}

export async function createMessageTemplate(
  input: SaveMessageTemplateInput,
): Promise<MessageTemplate> {
  return tx(async () => {
    const normalized = normalizeInput(input)
    await assertUniqueName(normalized.name)
    const countRows = await select<{ cnt: number } & PlusSqliteRow>(
      'SELECT COUNT(*) AS cnt FROM message_templates',
    )
    const isDefault = (countRows[0]?.cnt ?? 0) === 0 ? 1 : 0
    const now = new Date().toISOString()
    await exec(
      `INSERT INTO message_templates (name, body, is_default, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)`,
      [normalized.name, normalized.body, isDefault, now, now],
    )
    const rows = await select<LastInsertRow>('SELECT last_insert_rowid() AS id')
    const id = rows[0]?.id
    if (typeof id !== 'number') throw new Error('模板保存失败')
    const created = await getMessageTemplate(id)
    if (!created) throw new Error('模板保存失败')
    return created
  })
}

export async function updateMessageTemplate(
  id: number,
  input: SaveMessageTemplateInput,
): Promise<MessageTemplate | null> {
  return tx(async () => {
    const existing = await getMessageTemplate(id)
    if (!existing) return null
    const normalized = normalizeInput(input)
    await assertUniqueName(normalized.name, id)
    if (existing.name === normalized.name && existing.body === normalized.body) return existing
    await snapshot(existing)
    await exec('UPDATE message_templates SET name = ?, body = ?, updated_at = ? WHERE id = ?', [
      normalized.name,
      normalized.body,
      new Date().toISOString(),
      id,
    ])
    return getMessageTemplate(id)
  })
}

export async function setDefaultMessageTemplate(id: number): Promise<boolean> {
  return tx(async () => {
    const existing = await getMessageTemplate(id)
    if (!existing) return false
    await exec('UPDATE message_templates SET is_default = 0 WHERE is_default = 1')
    await exec('UPDATE message_templates SET is_default = 1 WHERE id = ?', [id])
    return true
  })
}

export async function deleteMessageTemplate(id: number, replacementId?: number): Promise<boolean> {
  return tx(async () => {
    const existing = await getMessageTemplate(id)
    if (!existing) return false
    if (existing.is_default === 1) {
      const others = (await listMessageTemplates()).filter((item) => item.id !== id)
      if (others.length > 0) {
        const replacement = others.find((item) => item.id === replacementId)
        if (!replacement) throw new Error('请选择新的默认模板')
        await exec('UPDATE message_templates SET is_default = 0 WHERE id = ?', [id])
        await exec('UPDATE message_templates SET is_default = 1 WHERE id = ?', [replacement.id])
      }
    }
    await exec('DELETE FROM message_templates WHERE id = ?', [id])
    return true
  })
}

export async function listTemplateVersions(templateId: number): Promise<TemplateVersion[]> {
  const rows = await select<TemplateVersionRow>(
    `SELECT * FROM template_versions
    WHERE template_id = ? ORDER BY created_at DESC, id DESC`,
    [templateId],
  )
  return rows as TemplateVersion[]
}

export async function restoreTemplateVersion(
  templateId: number,
  versionId: number,
): Promise<MessageTemplate | null> {
  return tx(async () => {
    const existing = await getMessageTemplate(templateId)
    if (!existing) return null
    const rows = await select<TemplateVersionRow>(
      'SELECT * FROM template_versions WHERE id = ? AND template_id = ?',
      [versionId, templateId],
    )
    const version = rows[0]
    if (!version) throw new Error('历史版本不存在')
    validateMenuTemplate(version.body)
    await assertUniqueName(version.name, templateId)
    if (existing.name === version.name && existing.body === version.body) return existing
    await snapshot(existing)
    await exec('UPDATE message_templates SET name = ?, body = ?, updated_at = ? WHERE id = ?', [
      version.name,
      version.body,
      new Date().toISOString(),
      templateId,
    ])
    return getMessageTemplate(templateId)
  })
}
