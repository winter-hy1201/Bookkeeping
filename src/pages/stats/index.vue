<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { usePageReturnSnapshot } from '../../composables/usePageReturnSnapshot'
import { useExpenseStore } from '../../stores/expense'
import { useStatsStore } from '../../stores/stats'
import { formatDate, monthRange, today, weekRange } from '../../utils/date'
import { divideMoney, formatMoney } from '../../utils/format'
import { showToast } from '../../utils/ui'

type RangeMode = 'today' | 'week' | 'month' | 'custom'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0

const statsStore = useStatsStore()
const expenseStore = useExpenseStore()

const mode = ref<RangeMode>('today')
const customStart = ref(today())
const customEnd = ref(today())
const hasLoaded = ref(false)
const loadError = ref(false)

const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  hasContent: () => Boolean(statsStore.summary),
})

const summary = computed(
  () =>
    statsStore.summary ?? {
      orderCount: 0,
      orderQuantity: 0,
      income: 0,
      expense: 0,
      profit: 0,
    },
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

const hasTrend = computed(() =>
  statsStore.trend.some((item) => item.income > 0 || item.expense > 0 || item.profit !== 0),
)

const hasBreakdown = computed(() => statsStore.breakdown.length > 0)

const isInitialLoading = computed(() => !hasLoaded.value && statsStore.loading && !loadError.value)
const isRefreshing = computed(() => statsStore.loading || expenseStore.loading)

const categoryIconMap = computed(() => {
  const map = new Map<number, string>()
  for (const cat of expenseStore.categories) {
    if (cat.icon) {
      map.set(cat.id, cat.icon)
    }
  }
  return map
})

function resolveRange() {
  const current = today()
  if (mode.value === 'today') return { start: current, end: current }
  if (mode.value === 'week') return weekRange(current)
  if (mode.value === 'month') return monthRange(current)
  return { start: customStart.value, end: customEnd.value }
}

async function refresh(): Promise<boolean> {
  loadError.value = false
  const previousSummary = statsStore.summary
  const previousRange = { ...statsStore.range }
  const previousTrend = [...statsStore.trend]
  const previousBreakdown = [...statsStore.breakdown]
  const previousCategories = [...expenseStore.categories]

  const results = await Promise.allSettled([
    statsStore.refreshRange(resolveRange()),
    expenseStore.refreshCategories(),
  ])

  if (results.some((result) => result.status === 'rejected')) {
    statsStore.$patch({
      summary: previousSummary,
      range: previousRange,
      trend: previousTrend,
      breakdown: previousBreakdown,
    })
    expenseStore.$patch({ categories: previousCategories })
    loadError.value = true
    showToast('对账数据加载失败')
    return false
  }

  hasLoaded.value = true
  return true
}

function switchMode(value: RangeMode): void {
  if (mode.value === value) return
  mode.value = value
  void refresh()
}

function onStartChange(value: string): void {
  customStart.value = value || today()
  mode.value = 'custom'
  void refresh()
}

function onEndChange(value: string): void {
  customEnd.value = value || today()
  mode.value = 'custom'
  void refresh()
}

function retry(): void {
  void refresh()
}

function trendWidth(amount: number): string {
  if (maxTrendAmount.value <= 0) return '0%'
  return `${(Math.abs(amount) / maxTrendAmount.value) * 100}%`
}

function profitFillClass(profit: number): string {
  return profit < 0 ? 'trend-fill--loss' : 'trend-fill--profit'
}

function profitTextClass(profit: number): string {
  if (profit > 0) return 'metric-card__value--profit'
  if (profit < 0) return 'metric-card__value--negative'
  return ''
}

function formatProfit(value: number): string {
  return `${value > 0 ? '+' : ''}${formatMoney(value)}`
}

function categoryIcon(id: number): string {
  return categoryIconMap.value.get(id) ?? '📦'
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view
      class="content"
      scroll-y
      :style="{ height: 'calc(100vh - ' + statusBarHeight + 'px)' }"
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view class="content-inner">
        <view class="page-header">
          <text class="eyebrow">经营对账</text>
          <text class="title">收支与利润</text>
          <text class="subtitle">按选定日期核对入账、支出和当天利润。</text>
        </view>

        <view class="range-tabs-wrapper">
          <view class="range-tabs">
            <button
              class="range-tab"
              :class="{ 'range-tab--active': mode === 'today' }"
              @click="switchMode('today')"
            >
              今日
            </button>
            <button
              class="range-tab"
              :class="{ 'range-tab--active': mode === 'week' }"
              @click="switchMode('week')"
            >
              本周
            </button>
            <button
              class="range-tab"
              :class="{ 'range-tab--active': mode === 'month' }"
              @click="switchMode('month')"
            >
              本月
            </button>
            <button
              class="range-tab"
              :class="{ 'range-tab--active': mode === 'custom' }"
              @click="switchMode('custom')"
            >
              自定义
            </button>
          </view>
        </view>

        <view v-if="mode === 'custom'" class="custom-range-row">
          <uni-datetime-picker
            v-model="customStart"
            class="date-picker"
            type="date"
            :clear-icon="false"
            @change="onStartChange"
          />
          <text class="custom-range-sep">至</text>
          <uni-datetime-picker
            v-model="customEnd"
            class="date-picker"
            type="date"
            :clear-icon="false"
            @change="onEndChange"
          />
        </view>

        <view v-if="isInitialLoading" class="state-card state-card--loading">
          <uni-icons type="refreshempty" size="24" color="inherit"></uni-icons>
          <text class="state-card__title">正在读取对账数据</text>
          <text class="state-card__description">收支汇总、逐日趋势与分类明细马上就绪。</text>
        </view>

        <view v-else-if="!hasLoaded && loadError" class="state-card state-card--error">
          <uni-icons type="closeempty" size="24" color="inherit"></uni-icons>
          <text class="state-card__title">对账数据加载失败</text>
          <text class="state-card__description">请检查本地数据库状态后重试，已有数据不会被影响。</text>
          <button class="retry-button" :disabled="isRefreshing" @click="retry">
            {{ isRefreshing ? '重新加载中…' : '重新加载' }}
          </button>
        </view>

        <template v-else>
          <view v-if="loadError" class="inline-error">
            <view class="inline-error__copy">
              <text class="inline-error__title">对账数据刷新失败</text>
              <text class="inline-error__description">当前仍保留上次成功读取的内容。</text>
            </view>
            <button class="retry-button retry-button--small" :disabled="isRefreshing" @click="retry">
              {{ isRefreshing ? '加载中…' : '重新加载' }}
            </button>
          </view>

          <view class="metrics">
            <view class="metric-card">
              <view class="metric-card__header">
                <view class="metric-card__icon metric-card__icon--income">
                  <uni-icons type="wallet" size="16" color="inherit"></uni-icons>
                </view>
                <text class="metric-card__label">入账收入</text>
              </view>
              <text class="metric-card__value">{{ formatMoney(summary.income) }}</text>
            </view>

            <view class="metric-card">
              <view class="metric-card__header">
                <view class="metric-card__icon metric-card__icon--expense">
                  <uni-icons type="cart" size="16" color="inherit"></uni-icons>
                </view>
                <text class="metric-card__label">支出</text>
              </view>
              <text class="metric-card__value">{{ formatMoney(summary.expense) }}</text>
            </view>

            <view class="metric-card">
              <view class="metric-card__header">
                <view class="metric-card__icon metric-card__icon--profit">
                  <uni-icons type="paperplane" size="16" color="inherit"></uni-icons>
                </view>
                <text class="metric-card__label">利润</text>
              </view>
              <text class="metric-card__value" :class="profitTextClass(summary.profit)">
                {{ formatMoney(summary.profit) }}
              </text>
            </view>

            <view class="metric-card">
              <view class="metric-card__header">
                <view class="metric-card__icon metric-card__icon--orders">
                  <uni-icons type="list" size="16" color="inherit"></uni-icons>
                </view>
                <text class="metric-card__label">有效订单</text>
              </view>
              <view class="metric-card__value-row">
                <text class="metric-card__value">{{ summary.orderCount }}</text>
                <text class="metric-card__unit">单</text>
                <text class="metric-card__separator">·</text>
                <text class="metric-card__value">{{ summary.orderQuantity }}</text>
                <text class="metric-card__unit">份</text>
              </view>
            </view>
          </view>

          <view class="avg-card">
            <text class="avg-card__label">平均每单收入</text>
            <text class="avg-card__value">{{ averageOrder }}</text>
          </view>

          <view class="panel-card">
            <view class="panel-heading">
              <text class="panel-title">收支 / 利润趋势</text>
              <text class="panel-meta">按日对账</text>
            </view>
            <view v-if="statsStore.loading" class="empty-hint">正在读取收支记录…</view>
            <view v-else-if="!hasTrend" class="empty-hint">选定范围内还没有可对账的收支记录。</view>
            <view v-else class="trend-list">
              <view
                v-for="point in statsStore.trend"
                :key="point.date"
                class="trend-item"
              >
                <text v-if="statsStore.trend.length > 1" class="trend-date">
                  {{ formatDate(point.date) }}
                </text>
                <view class="trend-row">
                  <text class="trend-label">入账</text>
                  <view class="trend-track">
                    <view
                      class="trend-fill trend-fill--income"
                      :style="{ width: trendWidth(point.income) }"
                    />
                  </view>
                  <text class="trend-amount">{{ formatMoney(point.income) }}</text>
                </view>
                <view class="trend-row">
                  <text class="trend-label">支出</text>
                  <view class="trend-track">
                    <view
                      class="trend-fill trend-fill--expense"
                      :style="{ width: trendWidth(point.expense) }"
                    />
                  </view>
                  <text class="trend-amount">{{ formatMoney(point.expense) }}</text>
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
                  <text
                    class="trend-amount"
                    :class="point.profit < 0 ? 'trend-amount--loss' : ''"
                  >
                    {{ formatProfit(point.profit) }}
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view class="panel-card">
            <view class="panel-heading">
              <text class="panel-title">支出分类</text>
              <text class="panel-meta">金额 · 占比</text>
            </view>
            <view v-if="statsStore.loading" class="empty-hint">正在读取支出分类…</view>
            <view v-else-if="!hasBreakdown" class="empty-hint">选定范围内没有支出分类记录。</view>
            <view v-else class="breakdown-list">
              <view
                v-for="item in statsStore.breakdown"
                :key="item.categoryId"
                class="breakdown-row"
              >
                <view class="breakdown-icon">
                  <text class="breakdown-emoji">{{ categoryIcon(item.categoryId) }}</text>
                </view>
                <text class="breakdown-label">{{ item.categoryName }}</text>
                <view class="trend-track">
                  <view
                    class="trend-fill trend-fill--category"
                    :style="{ width: `${item.percentage}%` }"
                  />
                </view>
                <text class="breakdown-amount">
                  {{ formatMoney(item.amount) }} · {{ item.percentage }}%
                </text>
              </view>
            </view>
          </view>
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.status-bar {
  width: 100%;
  background: transparent;
}

.content {
  box-sizing: border-box;
}

.content-inner {
  padding: $hej-space-5;
  padding-bottom: $hej-space-7;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: $hej-space-5;
}

.eyebrow {
  display: block;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 1.3;
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
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.range-tabs-wrapper {
  margin-bottom: $hej-space-3;
}

.range-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: $hej-space-1;
  padding: 6rpx;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-pill;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.range-tab {
  height: 64rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: $hej-radius-pill;
  background: transparent;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 64rpx;
  text-align: center;
  transition: all 0.2s ease;
}

.range-tab::after {
  border: 0;
}

.range-tab--active {
  background: $hej-color-accent;
  color: #ffffff;
  font-weight: 700;
}

.custom-range-row {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
  margin-bottom: $hej-space-4;
  padding: $hej-space-2 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
}

.date-picker {
  flex: 1;
  min-width: 0;
}

.custom-range-sep {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: $hej-space-3;
  padding: 48rpx $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
  text-align: center;
  box-shadow: $hej-shadow-panel;
}

.state-card--loading {
  color: $hej-color-pending;
}

.state-card--error {
  color: $hej-color-danger;
}

.state-card__title {
  margin-top: $hej-space-3;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
}

.state-card__description {
  max-width: 520rpx;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.retry-button {
  min-width: 200rpx;
  height: 88rpx;
  margin-top: $hej-space-4;
  padding: 0 $hej-space-5;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-meta;
  line-height: 88rpx;
  text-align: center;
}

.retry-button::after {
  border: 0;
}

.retry-button[disabled] {
  background: $hej-color-border;
  color: $hej-color-text-tertiary;
}

.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-bottom: $hej-space-3;
  padding: $hej-space-3 $hej-space-4;
  border: 1rpx solid $hej-color-danger-soft;
  border-radius: $hej-radius-control;
  background: $hej-color-danger-soft;
}

.inline-error__copy {
  min-width: 0;
  flex: 1;
}

.inline-error__title {
  display: block;
  color: $hej-color-danger;
  font-size: $hej-font-meta;
  font-weight: 700;
}

.inline-error__description {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.retry-button--small {
  min-width: 156rpx;
  height: 64rpx;
  margin-top: 0;
  padding: 0 $hej-space-3;
  font-size: $hej-font-caption;
  line-height: 64rpx;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $hej-space-3;
}

.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  min-height: 156rpx;
  padding: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.metric-card__header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  min-width: 0;
}

.metric-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
}

.metric-card__icon--income {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.metric-card__icon--expense {
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
}

.metric-card__icon--profit {
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
}

.metric-card__icon--orders {
  background: $hej-color-delivered-soft;
  color: $hej-color-delivered;
}

.metric-card__label {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.metric-card__value {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-card__value--profit {
  color: $hej-color-text;
}

.metric-card__value--negative {
  color: $hej-color-danger;
}

.metric-card__value-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
  margin-top: $hej-space-2;
  white-space: nowrap;
}

.metric-card__unit,
.metric-card__separator {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  font-weight: 500;
  white-space: nowrap;
}

.metric-card__unit {
  margin-left: 2rpx;
}

.metric-card__separator {
  margin: 0 6rpx;
  color: $hej-color-text-tertiary;
}

.avg-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-top: $hej-space-3;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.avg-card__label {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.avg-card__value {
  color: $hej-color-text;
  font-size: 34rpx;
  font-weight: 700;
}

.panel-card {
  margin-top: $hej-space-3;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.panel-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-bottom: $hej-space-4;
}

.panel-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.panel-meta {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.trend-list {
  display: flex;
  flex-direction: column;
}

.trend-item {
  padding: $hej-space-3 0;
  border-top: 1rpx solid $hej-color-border;
}

.trend-item:first-of-type {
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

.trend-row {
  display: grid;
  grid-template-columns: 80rpx minmax(0, 1fr) 180rpx;
  gap: $hej-space-2;
  align-items: center;
  min-height: 48rpx;
}

.trend-label {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  font-weight: 500;
}

.trend-track {
  height: 16rpx;
  overflow: hidden;
  border-radius: $hej-radius-pill;
  background: $hej-color-surface-subtle;
}

.trend-fill {
  height: 100%;
  border-radius: $hej-radius-pill;
  background: $hej-color-pending;
  transition: width 0.3s ease;
}

.trend-fill--income {
  background: $hej-color-pending;
}

.trend-fill--expense {
  background: $hej-color-warning;
}

.trend-fill--profit {
  background: $hej-color-delivered;
}

.trend-fill--loss {
  background: $hej-color-danger;
}

.trend-fill--category {
  background: $hej-color-delivered;
}

.trend-amount {
  color: $hej-color-text;
  font-size: $hej-font-caption;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.trend-amount--loss {
  color: $hej-color-danger;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.breakdown-row {
  display: grid;
  grid-template-columns: 44rpx 130rpx minmax(0, 1fr) 180rpx;
  gap: $hej-space-2;
  align-items: center;
  min-height: 52rpx;
}

.breakdown-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
}

.breakdown-emoji {
  font-size: 22rpx;
  line-height: 1;
}

.breakdown-label {
  color: $hej-color-text;
  font-size: $hej-font-caption;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breakdown-amount {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
}

.empty-hint {
  padding: $hej-space-6 0;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-meta;
  line-height: 1.5;
  text-align: center;
}
</style>
