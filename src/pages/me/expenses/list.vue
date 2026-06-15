<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useExpenseStore } from '../../../stores/expense'
import type { Expense } from '../../../types/domain'
import { formatMoney } from '../../../utils/format'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'

const expenseStore = useExpenseStore()

const categoryById = computed(() => {
  const map = new Map<number, string>()
  for (const category of expenseStore.categories) {
    map.set(category.id, `${category.icon ?? ''} ${category.name}`.trim())
  }
  return map
})

async function refresh(): Promise<void> {
  try {
    await Promise.all([
      expenseStore.refreshCategories(),
      expenseStore.refreshForDate(expenseStore.currentDate),
    ])
  } catch {
    showToast('支出加载失败')
  }
}

function onDateChange(value: string): void {
  void expenseStore.refreshForDate(value)
}

function goNew(): void {
  uni.navigateTo({ url: '/pages/me/expenses/new' })
}

function goDetail(id: number): void {
  uni.navigateTo({ url: `/pages/me/expenses/detail?id=${id}` })
}

function netExpenseAmount(expense: Expense): number {
  return Math.max(0, expense.amount - (expense.refund_amount ?? 0))
}

async function onLongPress(id: number): Promise<void> {
  const index = await actionSheet(['删除'])
  if (index !== 0) return
  const ok = await confirmDialog('删除支出？', '删除后无法恢复。')
  if (!ok) return
  try {
    await expenseStore.remove(id)
    showToast('已删除')
  } catch {
    showToast('删除失败')
  }
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <view class="page">
    <view class="toolbar">
      <uni-datetime-picker
        class="date-button"
        type="date"
        :model-value="expenseStore.currentDate"
        :clear-icon="false"
        @change="onDateChange"
      />
      <button class="add" @click="goNew">+ 新建</button>
    </view>

    <view v-if="expenseStore.loading" class="empty">支出加载中...</view>
    <view v-else-if="expenseStore.list.length === 0" class="empty">该日期暂无支出</view>
    <view v-else class="group">
      <text class="group-date">{{ expenseStore.currentDate }}</text>
      <view
        v-for="expense in expenseStore.list"
        :key="expense.id"
        class="item"
        @click="goDetail(expense.id)"
        @longpress="onLongPress(expense.id)"
      >
        <view>
          <text class="title">{{ categoryById.get(expense.category_id) ?? `分类 #${expense.category_id}` }}</text>
          <text class="meta">{{ expense.note || '无备注' }}</text>
          <text v-if="expense.refund_amount > 0" class="meta">
            支出 {{ formatMoney(expense.amount) }} · 退差 {{ formatMoney(expense.refund_amount) }}
          </text>
        </view>
        <text class="amount">{{ formatMoney(netExpenseAmount(expense)) }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.toolbar,
.item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.date-button,
.item,
.group {
  border-radius: 12rpx;
  background: #ffffff;
}

.date-button {
  min-width: 260rpx;
}

.add {
  margin: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 28rpx;
}

.group {
  padding: 24rpx;
}

.group-date {
  display: block;
  margin-bottom: 12rpx;
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
}

.item {
  min-height: 96rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.title,
.meta {
  display: block;
}

.title,
.amount {
  color: #222222;
  font-size: 30rpx;
  font-weight: 700;
}

.meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}
</style>
