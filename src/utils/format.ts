export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return '¥—'
  }
  return `¥${n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function parseMoney(s: string): number {
  const normalized = s.replace(/[¥￥,\s]/g, '')
  if (normalized.length === 0) return 0
  const value = Number(normalized)
  if (!Number.isFinite(value)) return 0
  return value
}

export function formatPercent(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) {
    return '—'
  }
  return `${Math.round(n * 100)}%`
}
