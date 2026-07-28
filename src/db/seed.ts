/**
 * 系统参考数据 seed：默认支出分类，以及显式调用时的内置文案模板。
 *
 * 数据来源：memory-bank/design-document.md §2.3
 * - 菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰
 * - is_default=1，sort_order 1-5
 *
 * 普通启动只补空的 expense_categories；内置模板仅由迁移、旧备份升级或危险清空调用，
 * 避免用户主动删除最后一个模板后又在下次启动被自动恢复。
 */

import { exec, select } from './index'
import { DEFAULT_MENU_TEMPLATE_BODY, DEFAULT_MENU_TEMPLATE_NAME } from '../utils/menu-template'

interface DefaultCategory {
  name: string
  icon: string
  sort_order: number
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: '菜品', icon: '🥬', sort_order: 1 },
  { name: '工具', icon: '🔧', sort_order: 2 },
  { name: '耗材', icon: '📦', sort_order: 3 },
  { name: '配送', icon: '🛵', sort_order: 4 },
  { name: '其他', icon: '💰', sort_order: 5 },
]

export async function seedDefaultMessageTemplate(): Promise<void> {
  const templateRows = await select<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM message_templates;',
  )
  if ((templateRows[0]?.cnt ?? 0) > 0) return
  const now = new Date().toISOString()
  await exec(
    `INSERT INTO message_templates (name, body, is_default, created_at, updated_at)
    VALUES (?, ?, 1, ?, ?)`,
    [DEFAULT_MENU_TEMPLATE_NAME, DEFAULT_MENU_TEMPLATE_BODY, now, now],
  )
}

export async function seedIfEmpty(): Promise<void> {
  const rows = await select<{ cnt: number }>('SELECT COUNT(*) as cnt FROM expense_categories;')
  const cnt = rows[0]?.cnt ?? 0
  if (cnt === 0) {
    for (const c of DEFAULT_CATEGORIES) {
      await exec(
        'INSERT INTO expense_categories (name, icon, sort_order, is_default) VALUES (?, ?, ?, 1);',
        [c.name, c.icon, c.sort_order],
      )
    }
  }
}
