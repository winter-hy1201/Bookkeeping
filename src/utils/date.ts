import dayjs, { type ConfigType } from 'dayjs'

export interface DateRange {
  start: string
  end: string
}

const DATE_FORMAT = 'YYYY-MM-DD'
const DISPLAY_DATE_FORMAT = 'MM-DD'

function asDay(value: ConfigType) {
  const d = dayjs(value)
  if (!d.isValid()) {
    throw new Error(`[date] invalid date: ${String(value)}`)
  }
  return d
}

export function today(): string {
  return dayjs().format(DATE_FORMAT)
}

export function tomorrow(): string {
  return dayjs().add(1, 'day').format(DATE_FORMAT)
}

export function weekRange(d: string): DateRange {
  const current = asDay(d)
  const daysFromMonday = (current.day() + 6) % 7
  const start = current.subtract(daysFromMonday, 'day')
  return {
    start: start.format(DATE_FORMAT),
    end: start.add(6, 'day').format(DATE_FORMAT),
  }
}

export function monthRange(d: string): DateRange {
  const current = asDay(d)
  return {
    start: current.startOf('month').format(DATE_FORMAT),
    end: current.endOf('month').format(DATE_FORMAT),
  }
}

export function formatDate(d: string | Date): string {
  const current = asDay(d)
  const now = dayjs()
  if (current.year() === now.year()) {
    return current.format(DISPLAY_DATE_FORMAT)
  }
  return current.format(DATE_FORMAT)
}

export function daysBetween(a: string, b: string): number {
  return asDay(b).startOf('day').diff(asDay(a).startOf('day'), 'day')
}
