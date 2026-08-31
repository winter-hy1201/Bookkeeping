import { HEJI_ICON_COMPONENTS } from '../components/icon-registry'

// 只兼容数据库里已经存在的 emoji；界面代码不得在这里新增业务语义别名。
const LEGACY_CATEGORY_ICONS: Record<string, keyof typeof HEJI_ICON_COMPONENTS> = {
  '🥬': 'Utensils',
  '🔧': 'Wrench',
  '📦': 'Package',
  '🛵': 'Bike',
  '💰': 'Wallet',
}

/** 将旧备份或外部导入中的已知分类 emoji 归一化为 Lucide 名称。 */
export function normalizeExpenseCategoryIcon(value: string | null | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate) return null
  if (candidate in HEJI_ICON_COMPONENTS) {
    return candidate
  }
  return LEGACY_CATEGORY_ICONS[candidate] ?? candidate
}

export function resolveLucideIconName(
  value: string | null | undefined,
  fallback: keyof typeof HEJI_ICON_COMPONENTS = 'Package',
): keyof typeof HEJI_ICON_COMPONENTS {
  const candidate = value?.trim()
  if (candidate && candidate in HEJI_ICON_COMPONENTS) {
    return candidate as keyof typeof HEJI_ICON_COMPONENTS
  }
  return (candidate && LEGACY_CATEGORY_ICONS[candidate]) || fallback
}

export function isLucideIconName(value: string | null | undefined): boolean {
  const candidate = value?.trim()
  return Boolean(candidate && candidate in HEJI_ICON_COMPONENTS)
}
