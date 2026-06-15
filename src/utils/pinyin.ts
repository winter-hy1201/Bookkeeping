import { pinyin } from 'pinyin-pro'
import type { Customer } from '../types/domain'

const OTHER_INITIAL = '#'
const LETTER_RE = /^[a-z]$/

const pinyinOptions = {
  toneType: 'none',
  separator: '',
  mode: 'surname',
  surname: 'head',
  nonZh: 'consecutive',
  traditional: true,
  v: true,
} as const

const initialOptions = {
  ...pinyinOptions,
  pattern: 'first',
  type: 'array',
} as const

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function getCustomerPinyinKey(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  return normalizeKey(pinyin(trimmed, pinyinOptions))
}

export function getCustomerPinyinInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  return pinyin(trimmed, initialOptions)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function getCustomerInitial(name: string): string {
  const first = getCustomerPinyinKey(name).charAt(0)
  return LETTER_RE.test(first) ? first.toUpperCase() : OTHER_INITIAL
}

export function compareCustomerName(a: Customer, b: Customer): number {
  const aInitial = getCustomerInitial(a.name)
  const bInitial = getCustomerInitial(b.name)
  if (aInitial !== bInitial) {
    if (aInitial === OTHER_INITIAL) return 1
    if (bInitial === OTHER_INITIAL) return -1
    return aInitial.localeCompare(bInitial)
  }

  const aKey = getCustomerPinyinKey(a.name)
  const bKey = getCustomerPinyinKey(b.name)
  if (aKey !== bKey) return aKey.localeCompare(bKey)

  return a.name.localeCompare(b.name)
}
