/**
 * 首次启动 seed：写入 5 个默认支出分类。
 *
 * 数据来源：memory-bank/design-document.md §2.3
 * - 菜品 🥬 / 工具 🔧 / 耗材 📦 / 配送 🛵 / 其他 💰
 * - is_default=1，sort_order 1-5
 *
 * 策略：检查 expense_categories 行数；为 0 才插入；不强制覆盖用户已添加的分类。
 */

import { exec, select } from './index'

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

export async function seedIfEmpty(): Promise<void> {
  const rows = await select<{ cnt: number }>('SELECT COUNT(*) as cnt FROM expense_categories;')
  const cnt = rows[0]?.cnt ?? 0
  if (cnt > 0) return

  for (const c of DEFAULT_CATEGORIES) {
    await exec(
      'INSERT INTO expense_categories (name, icon, sort_order, is_default) VALUES (?, ?, ?, 1);',
      [c.name, c.icon, c.sort_order],
    )
  }
}
