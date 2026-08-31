<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import { useExpenseStore } from '../../../stores/expense'
import type { Expense, ExpenseCategory } from '../../../types/domain'
import { formatTodayLabel, formatTime, today } from '../../../utils/date'
import { addMoney, formatAmountNumber, formatMoney, subtractMoney } from '../../../utils/format'
import { resolveLucideIconName } from '../../../utils/icon'
import { confirmDialog, showToast } from '../../../utils/ui'

const expenseStore = useExpenseStore()
const pageReturn = usePageReturnSnapshot({
  mode: 'page',
  hasContent: () => expenseStore.list.length > 0,
})

const categoryMap = computed(() => {
  const map = new Map<number, ExpenseCategory>()
  for (const category of expenseStore.categories) {
    map.set(category.id, category)
  }
  return map
})

const isToday = computed(() => expenseStore.currentDate === today())
const netAmountLabel = computed(() => (isToday.value ? '今日支出（元）' : '当日支出（元）'))

const totalNetAmount = computed(() => {
  return expenseStore.list.reduce((sum, item) => {
    const net = Math.max(0, subtractMoney(item.amount, item.refund_amount ?? 0))
    return addMoney(sum, net)
  }, 0)
})

const totalRefundAmount = computed(() => {
  return expenseStore.list.reduce((sum, item) => {
    return addMoney(sum, item.refund_amount ?? 0)
  }, 0)
})

function netExpenseAmount(expense: Expense): number {
  return Math.max(0, subtractMoney(expense.amount, expense.refund_amount ?? 0))
}

async function refresh(): Promise<boolean> {
  const previousCategories = [...expenseStore.categories]
  const previousExpenses = [...expenseStore.list]
  const previousDate = expenseStore.currentDate
  const results = await Promise.allSettled([
    expenseStore.refreshCategories(),
    expenseStore.refreshForDate(expenseStore.currentDate),
  ])
  if (results.some((result) => result.status === 'rejected')) {
    expenseStore.$patch({
      categories: previousCategories,
      list: previousExpenses,
      currentDate: previousDate,
    })
    showToast('支出加载失败')
    return false
  }
  return true
}

function onDateChange(value: string): void {
  void expenseStore.refreshForDate(value)
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/me/expenses/new' })
}

function goDetail(id: number): void {
  void pageReturn.navigateTo({ url: `/pages/me/expenses/detail?id=${id}` })
}

async function onLongPress(id: number): Promise<void> {
  const ok = await confirmDialog('删除支出？', '删除后无法恢复，确定要删除此支出记录吗？')
  if (!ok) return
  try {
    const deleted = await expenseStore.remove(id)
    if (!deleted) {
      showToast('支出不存在')
      return
    }
    showToast('已删除')
  } catch {
    showToast('删除失败')
  }
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <!-- Top Filter Bar -->
    <view class="toolbar">
      <view class="date-picker-wrap">
        <uni-datetime-picker
          class="date-picker"
          type="date"
          :model-value="expenseStore.currentDate"
          :clear-icon="false"
          @change="onDateChange"
        />
      </view>
      <button class="add-button" @click="goNew">
        <HejiIcon name="Plus" :size="16" />
        <text>新建支出</text>
      </button>
    </view>

    <!-- Summary Metrics Card -->
    <view class="summary-card">
      <view class="metric-item">
        <text class="metric-label">{{ netAmountLabel }}</text>
        <text class="metric-value">{{ formatAmountNumber(totalNetAmount) }}</text>
      </view>
      <view class="metric-divider" />
      <view class="metric-item">
        <text class="metric-label">支出笔数</text>
        <text class="metric-value">{{ expenseStore.list.length }}</text>
      </view>
      <view class="metric-divider" />
      <view class="metric-item">
        <text class="metric-label">退差金额（元）</text>
        <text class="metric-value">{{ formatAmountNumber(totalRefundAmount) }}</text>
      </view>
    </view>

    <!-- Date Section Header -->
    <view class="section-header">
      <text class="section-date">{{ formatTodayLabel(expenseStore.currentDate) }}</text>
      <view class="section-header__right">
        <text class="section-meta">共 {{ expenseStore.list.length }} 笔</text>
        <view class="sort-indicator" aria-label="按时间排序">
          <HejiIcon name="ArrowDownUp" :size="14" />
          <text>按时间</text>
          <HejiIcon name="ChevronDown" :size="12" />
        </view>
      </view>
    </view>

    <!-- State Views -->
    <view v-if="expenseStore.loading" class="state-card">
      <text class="state-title">正在读取支出记录…</text>
    </view>
    <view v-else-if="expenseStore.list.length === 0" class="state-card">
      <text class="state-title">该日期暂无支出</text>
      <text class="state-hint">点击右上角“新建支出”记录第一笔支出</text>
    </view>

    <!-- Expense List Items -->
    <view v-else class="list-wrap">
      <view
        v-for="expense in expenseStore.list"
        :key="expense.id"
        class="expense-card"
        @click="goDetail(expense.id)"
        @longpress="onLongPress(expense.id)"
      >
        <view class="icon-avatar">
          <HejiIcon
            class="icon-text"
            :name="resolveLucideIconName(categoryMap.get(expense.category_id)?.icon)"
            :size="22"
          />
        </view>
        <view class="card-center">
          <text class="category-name">
            {{ categoryMap.get(expense.category_id)?.name || `分类 #${expense.category_id}` }}
          </text>
          <text class="expense-note">{{ expense.note || '无备注' }}</text>
          <text v-if="expense.refund_amount > 0" class="refund-detail">
            原支出 {{ formatMoney(expense.amount) }} · 退差 {{ formatMoney(expense.refund_amount) }}
          </text>
        </view>
        <view class="card-right">
          <text class="net-amount">{{ formatMoney(netExpenseAmount(expense)) }}</text>
          <text class="expense-time">{{ formatTime(expense.created_at) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: $hej-space-3;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-bottom: $hej-space-3;
}

.date-picker-wrap {
  flex: 1;
  min-width: 0;
}

.date-picker :deep(.uni-date-x) {
  height: 72rpx !important;
  background-color: $hej-color-control !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
}

.date-picker :deep(.uni-date__x-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  font-weight: 500;
}

.add-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  height: 72rpx;
  line-height: 72rpx;
  padding: 0 $hej-space-4;
  margin: 0;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-body;
  font-weight: 600;
  white-space: nowrap;
}

.add-button::after {
  border: 0;
}

.summary-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $hej-space-4 $hej-space-2;
  margin-bottom: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.metric-item {
  flex: 1;
  min-width: 0;
  text-align: center;
}

.metric-divider {
  width: 1rpx;
  height: 48rpx;
  background: $hej-color-border;
}

.metric-label {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.3;
}

.metric-value {
  display: block;
  margin-top: 8rpx;
  color: $hej-color-text;
  font-size: 36rpx;
  font-weight: 700;
  font-family: $hej-font-family;
  line-height: 1.2;
}

.section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0 $hej-space-1;
  margin-bottom: $hej-space-2;
}

.section-header__right {
  display: inline-flex;
  align-items: center;
  gap: $hej-space-3;
}

.section-date {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
}

.section-meta {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.sort-indicator {
  display: inline-flex;
  align-items: center;
  gap: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.state-card {
  padding: 100rpx $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  text-align: center;
  box-shadow: $hej-shadow-panel;
}

.state-title {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 500;
}

.state-hint {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.expense-card {
  display: flex;
  align-items: center;
  gap: $hej-space-3;
  padding: $hej-space-3 $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.icon-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
}

.icon-text {
  color: $hej-color-accent;
}

.card-center {
  flex: 1;
  min-width: 0;
}

.category-name {
  display: block;
  color: $hej-color-text;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.3;
}

.expense-note {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.refund-detail {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-tertiary;
  font-size: 22rpx;
  line-height: 1.3;
}

.card-right {
  flex: 0 0 auto;
  text-align: right;
}

.net-amount {
  display: block;
  color: $hej-color-text;
  font-size: 32rpx;
  font-weight: 700;
  font-family: $hej-font-family;
  line-height: 1.2;
}

.expense-time {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-tertiary;
  font-size: 22rpx;
  line-height: 1.2;
}
</style>
