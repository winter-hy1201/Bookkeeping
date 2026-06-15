import Big from 'big.js'

// 全局舍入模式：金额统一按"分"用四舍五入（避免银行家舍入的边界问题）。
// 注意 Big.DP 只影响除法和 round()，不影响加减乘——所以每个 helper 末尾
// 都显式 .toFixed(2) → Number()，确保输出永远只有 2 位小数。
Big.RM = Big.roundHalfUp

function toBig(value: number | null | undefined): Big {
  if (value === null || value === undefined || !Number.isFinite(value)) return new Big(0)
  return new Big(value)
}

function toMoney(big: Big): number {
  return Number(big.toFixed(2))
}

/**
 * 金额按分四舍五入。
 * 例：roundMoney(0.0000000004) → 0；roundMoney(100.005) → 100.01；roundMoney(null) → 0
 */
export function roundMoney(n: number | null | undefined): number {
  return toMoney(toBig(n).round(2, Big.roundHalfUp))
}

/**
 * 多金额相加，按分累加后输出 number。
 * 例：addMoney(100.10, 0.20, 0.10) → 100.40（不是 JS 的 100.40000000000001）
 */
export function addMoney(...values: Array<number | null | undefined>): number {
  return toMoney(values.reduce<Big>((sum, value) => sum.plus(toBig(value)), new Big(0)))
}

/**
 * 多金额相乘，按分累加后输出 number。
 * 例：multiplyMoney(15.10, 0.9) → 13.59（不是 JS 的 13.590000000000002）
 */
export function multiplyMoney(...values: Array<number | null | undefined>): number {
  return toMoney(values.reduce<Big>((product, value) => product.times(toBig(value)), new Big(1)))
}

/**
 * 两金额相减，按分累加后输出 number。
 * 例：subtractMoney(100.10, 100.10) → 0（不是 JS 的 0.0000000004）
 */
export function subtractMoney(a: number | null | undefined, b: number | null | undefined): number {
  return toMoney(toBig(a).minus(toBig(b)))
}

/**
 * 金额相除，按分累加后输出 number。divisor 为 0 时返回 0（避免 big.js 抛错）。
 * 例：divideMoney(300, 20) → 15（次卡均摊单价）
 */
export function divideMoney(
  numerator: number | null | undefined,
  divisor: number | null | undefined,
): number {
  const bigDivisor = toBig(divisor)
  if (bigDivisor.eq(0)) return 0
  return toMoney(toBig(numerator).div(bigDivisor))
}

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
