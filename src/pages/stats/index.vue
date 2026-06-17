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

const summary = computed(() => statsStore.summary ?? { orderCount: 0, income: 0, expense: 0, profit: 0 })
const averageOrder = computed(() => {
  if (summary.value.orderCount <= 0) return '—'
  return formatMoney(divideMoney(summary.value.income, summary.value.orderCount))
})
const maxTrendIncome = computed(() => Math.max(...statsStore.trend.map((item) => item.income), 0))
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

function trendWidth(income: number): string {
  if (maxTrendIncome.value <= 0) return '0%'
  return `${(income / maxTrendIncome.value) * 100}%`
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
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
      <StatCard label="收入" :value="formatMoney(summary.income)" />
      <StatCard label="支出" :value="formatMoney(summary.expense)" />
      <StatCard label="利润" :value="formatMoney(summary.profit)" />
      <StatCard label="订单" :value="summary.orderCount" />
    </view>
    <view class="avg">客单价 {{ averageOrder }}</view>

    <view class="section">
      <text class="section-title">收入趋势</text>
      <view v-if="statsStore.loading" class="empty">加载中...</view>
      <view v-else-if="!hasTrend" class="empty">暂无数据</view>
      <view v-for="point in statsStore.trend" v-else :key="point.date" class="bar-row">
        <text class="bar-label">{{ formatDate(point.date) }}</text>
        <view class="bar-track"><view class="bar-fill" :style="{ width: trendWidth(point.income) }" /></view>
        <text class="bar-value">{{ formatMoney(point.income) }}</text>
      </view>
    </view>

    <view class="section">
      <text class="section-title">支出分类</text>
      <view v-if="statsStore.loading" class="empty">加载中...</view>
      <view v-else-if="!hasBreakdown" class="empty">暂无数据</view>
      <view v-for="item in statsStore.breakdown" v-else :key="item.categoryId" class="bar-row">
        <text class="bar-label">{{ item.categoryName }}</text>
        <view class="bar-track"><view class="bar-fill bar-fill--expense" :style="{ width: `${item.percentage}%` }" /></view>
        <text class="bar-value">{{ formatMoney(item.amount) }} · {{ item.percentage }}%</text>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.range-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
}

.range-tabs button {
  margin: 0;
  border-radius: 12rpx;
  background: #ffffff;
  color: #333333;
  font-size: 26rpx;
}

.range-tabs .active {
  background: #007aff;
  color: #ffffff;
}

.custom-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 18rpx;
  color: #555555;
  font-size: 26rpx;
}

.date-pill {
  min-width: 220rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  margin-top: 24rpx;
}

.avg,
.section {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.avg {
  color: #333333;
  font-size: 28rpx;
  font-weight: 600;
}

.section-title {
  display: block;
  margin-bottom: 18rpx;
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
}

.bar-row {
  display: grid;
  grid-template-columns: 110rpx minmax(0, 1fr) 190rpx;
  gap: 14rpx;
  align-items: center;
  min-height: 64rpx;
}

.bar-label,
.bar-value,
.empty {
  color: #8f8f94;
  font-size: 24rpx;
}

.bar-value {
  text-align: right;
}

.bar-track {
  height: 18rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #eef0f3;
}

.bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #007aff;
}

.bar-fill--expense {
  background: #fa8c16;
}

.empty {
  padding: 42rpx 0;
  text-align: center;
}
</style>
