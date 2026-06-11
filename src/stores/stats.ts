import { defineStore } from 'pinia'
import {
  getCategoryBreakdown,
  getDailyTrend,
  getDashboardSummary,
  getRangeSummary,
} from '../api/stats'
import type { CategoryBreakdown, DailyTrendPoint, StatsSummary } from '../types/api'
import { today } from '../utils/date'

interface StatsRange {
  start: string
  end: string
}

interface StatsState {
  summary: StatsSummary | null
  trend: DailyTrendPoint[]
  breakdown: CategoryBreakdown[]
  range: StatsRange
  loading: boolean
}

const todayText = today()

export const useStatsStore = defineStore('stats', {
  state: (): StatsState => ({
    summary: null,
    trend: [],
    breakdown: [],
    range: {
      start: todayText,
      end: todayText,
    },
    loading: false,
  }),

  actions: {
    async refreshSummary(date: string): Promise<void> {
      this.range = { start: date, end: date }
      this.loading = true
      try {
        this.summary = await getDashboardSummary(date)
      } finally {
        this.loading = false
      }
    },

    async refreshRange(range: StatsRange): Promise<void> {
      this.range = range
      this.loading = true
      try {
        const input = { startDate: range.start, endDate: range.end }
        const [summary, trend, breakdown] = await Promise.all([
          getRangeSummary(input),
          getDailyTrend(input),
          getCategoryBreakdown(input),
        ])
        this.summary = summary
        this.trend = trend
        this.breakdown = breakdown
      } finally {
        this.loading = false
      }
    },
  },
})
