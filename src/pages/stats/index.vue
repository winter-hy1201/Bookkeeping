<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import StatCard from '../../components/StatCard.vue'
import { useStatsStore } from '../../stores/stats'
import { formatDate, monthRange, today, weekRange } from '../../utils/date'
import { divideMoney, formatMoney } from '../../utils/format'
import { showToast } from '../../utils/ui'

type RangeMode = 'today' | 'week' | 'month' | 'custom'

const statsStore = useStatsStore()
const mode = ref<RangeMode>('today')
const customStart = ref(today())
const customEnd = ref(today())

const summary = computed(
  () => statsStore.summary ?? { orderCount: 0, income: 0, expense: 0, profit: 0 },
)
const averageOrder = computed(() => {
  if (summary.value.orderCount <= 0) return '—'
  return formatMoney(divideMoney(summary.value.income, summary.value.orderCount))
})
const maxTrendAmount = computed(() => {
  const values = statsStore.trend.flatMap((item) => [
    item.income,
    item.expense,
    Math.abs(item.profit),
  ])
  return Math.max(...values, 0)
})
const hasTrend = computed(() => statsStore.trend.some((item) => item.income || item.expense))
const hasBreakdown = computed(() => statsStore.breakdown.length > 0)

function resolveRange() {
  const current = today()
  if (mode.value === 'today') return { start: current, end: current }
  if (mode.value === 'week') return weekRange(current)
  if (mode.value === 'month') return monthRange(current)
  return { start: customStart.value, end: customEnd.value }
}

async function refresh(): Promise<void> {
  try {
    await statsStore.refreshRange(resolveRange())
  } catch {
    showToast('统计加载失败')
  }
}

function switchMode(value: RangeMode): void {
  mode.value = value
  void refresh()
}

function onStartChange(value: string): void {
  customStart.value = value
  mode.value = 'custom'
  void refresh()
}

function onEndChange(value: string): void {
  customEnd.value = value
  mode.value = 'custom'
  void refresh()
}

function trendWidth(amount: number): string {
  if (maxTrendAmount.value <= 0) return '0%'
  return `${(Math.abs(amount) / maxTrendAmount.value) * 100}%`
}

function profitFillClass(profit: number): string {
  return profit < 0 ? 'trend-fill--loss' : 'trend-fill--profit'
}

function profitValueClass(profit: number): string {
  if (profit > 0) return 'trend-value--positive'
  if (profit < 0) return 'trend-value--negative'
  return 'trend-value--normal'
}

function formatProfit(value: number): string {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="page-header">
      <text class="eyebrow">经营对账</text>
      <text class="title">收支与利润</text>
      <text class="subtitle">按选定日期核对入账、支出和当天利润。</text>
    </view>

    <view class="range-tabs">
      <button :class="{ active: mode === 'today' }" @click="switchMode('today')">今日</button>
      <button :class="{ active: mode === 'week' }" @click="switchMode('week')">本周</button>
      <button :class="{ active: mode === 'month' }" @click="switchMode('month')">本月</button>
      <button :class="{ active: mode === 'custom' }" @click="switchMode('custom')">自定义</button>
    </view>

    <view v-if="mode === 'custom'" class="custom-row">
      <uni-datetime-picker
        v-model="customStart"
        class="date-pill"
        type="date"
        :clear-icon="false"
        @change="onStartChange"
      />
      <text>至</text>
      <uni-datetime-picker
        v-model="customEnd"
        class="date-pill"
        type="date"
        :clear-icon="false"
        @change="onEndChange"
      />
    </view>

    <view class="stats-grid">
      <StatCard label="入账收入" :value="formatMoney(summary.income)" />
      <StatCard label="支出" :value="formatMoney(summary.expense)" />
      <StatCard label="利润" :value="formatMoney(summary.profit)" />
      <StatCard label="有效订单" :value="summary.orderCount" unit="单" />
    </view>
    <view class="avg">
      <text>平均每单收入</text>
      <text>{{ averageOrder }}</text>
    </view>

    <view class="section">
      <view class="section-heading">
        <text class="section-title">收支 / 利润趋势</text>
        <text class="section-meta">按日对账</text>
      </view>
      <view v-if="statsStore.loading" class="empty">正在读取收支记录...</view>
      <view v-else-if="!hasTrend" class="empty"> 选定范围内还没有可对账的收支记录。 </view>
      <view v-for="point in statsStore.trend" v-else :key="point.date" class="trend-day">
        <text class="trend-date">{{ formatDate(point.date) }}</text>
        <view class="trend-row">
          <text class="trend-label">入账</text>
          <view class="trend-track">
            <view
              class="trend-fill trend-fill--income"
              :style="{ width: trendWidth(point.income) }"
            />
          </view>
          <text class="trend-value">{{ formatMoney(point.income) }}</text>
        </view>
        <view class="trend-row">
          <text class="trend-label">支出</text>
          <view class="trend-track">
            <view
              class="trend-fill trend-fill--expense"
              :style="{ width: trendWidth(point.expense) }"
            />
          </view>
          <text class="trend-value">{{ formatMoney(point.expense) }}</text>
        </view>
        <view class="trend-row">
          <text class="trend-label">利润</text>
          <view class="trend-track">
            <view
              class="trend-fill"
              :class="profitFillClass(point.profit)"
              :style="{ width: trendWidth(point.profit) }"
            />
          </view>
          <text class="trend-value" :class="profitValueClass(point.profit)">
            {{ formatProfit(point.profit) }}
          </text>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-heading">
        <text class="section-title">支出分类</text>
        <text class="section-meta">仅统计已记账支出</text>
      </view>
      <view v-if="statsStore.loading" class="empty">正在读取支出分类...</view>
      <view v-else-if="!hasBreakdown" class="empty">选定范围内没有支出分类记录。</view>
      <view
        v-for="item in statsStore.breakdown"
        v-else
        :key="item.categoryId"
        class="breakdown-row"
      >
        <text class="breakdown-label">{{ item.categoryName }}</text>
        <view class="trend-track">
          <view class="trend-fill trend-fill--expense" :style="{ width: `${item.percentage}%` }" />
        </view>
        <text class="trend-value">{{ formatMoney(item.amount) }} · {{ item.percentage }}%</text>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: $hej-space-5;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: $hej-space-5;
}

.eyebrow,
.subtitle,
.section-meta {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.eyebrow {
  color: $hej-color-accent;
  font-weight: 700;
}

.title {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text;
  font-size: $hej-font-display;
  font-weight: 700;
  line-height: 1.2;
}

.subtitle {
  margin-top: $hej-space-2;
  line-height: 1.5;
}

.range-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $hej-space-2;
}

.range-tabs button {
  height: 72rpx;
  margin: 0;
  padding: 0;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}

.range-tabs .active {
  border-color: $hej-color-accent;
  background: $hej-color-accent;
  color: $hej-color-surface;
}

.range-tabs button:focus-visible {
  outline: 2rpx solid $hej-color-text;
  outline-offset: 2rpx;
}

.custom-row {
  display: flex;
  align-items: center;
  gap: $hej-space-3;
  margin-top: $hej-space-3;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.date-pill {
  min-width: 220rpx;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $hej-space-3;
  margin-top: $hej-space-5;
}

.avg,
.section {
  margin-top: $hej-space-5;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.avg {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $hej-space-3;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 600;
}

.avg text:last-child {
  color: $hej-color-text;
  font-size: $hej-font-title;
}

.section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-bottom: $hej-space-4;
}

.section-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.trend-day {
  padding: $hej-space-4 0;
  border-top: 1rpx solid $hej-color-border;
}

.trend-day:first-of-type {
  padding-top: 0;
  border-top: 0;
}

.trend-date {
  display: block;
  margin-bottom: $hej-space-2;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.trend-row,
.breakdown-row {
  display: grid;
  grid-template-columns: 72rpx minmax(0, 1fr) 172rpx;
  gap: $hej-space-2;
  align-items: center;
  min-height: 48rpx;
}

.trend-label,
.breakdown-label,
.trend-value,
.empty {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.trend-value {
  text-align: right;
}

.trend-value--positive {
  color: $hej-color-success;
}

.trend-value--negative {
  color: $hej-color-danger;
}

.trend-value--normal {
  color: $hej-color-text-secondary;
}

.trend-track {
  height: 14rpx;
  overflow: hidden;
  border-radius: $hej-radius-pill;
  background: $hej-color-surface-subtle;
}

.trend-fill {
  height: 100%;
  border-radius: $hej-radius-pill;
  background: $hej-color-accent;
}

.trend-fill--income {
  background: $hej-color-accent;
}

.trend-fill--expense {
  background: $hej-color-warning;
}

.trend-fill--profit {
  background: $hej-color-success;
}

.trend-fill--loss {
  background: $hej-color-danger;
}

.empty {
  padding: $hej-space-7 0;
  line-height: 1.5;
  text-align: center;
}
</style>
