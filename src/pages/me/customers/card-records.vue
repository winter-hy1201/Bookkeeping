<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCustomer } from '../../../api/customers'
import { listCards } from '../../../api/meal-cards'
import type { Customer, MealCard } from '../../../types/domain'
import { formatDate } from '../../../utils/date'
import { formatMoney } from '../../../utils/format'
import { showToast } from '../../../utils/ui'

const customerId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const cards = ref<MealCard[]>([])
const loading = ref(false)

function remainingMeals(card: MealCard): number {
  return card.total_meals - card.used_meals
}

function cardStatusText(card: MealCard): string {
  return card.status === 'active' ? '使用中' : '已用完'
}

async function refresh(): Promise<void> {
  if (customerId.value === null) return
  loading.value = true
  try {
    const [customerResult, cardResult] = await Promise.all([
      getCustomer(customerId.value),
      listCards(customerId.value),
    ])
    customer.value = customerResult
    cards.value = cardResult
  } catch {
    showToast('充值记录加载失败')
  } finally {
    loading.value = false
  }
}

function goEdit(card: MealCard): void {
  if (customerId.value === null) return
  uni.navigateTo({
    url: `/pages/me/customers/open-card?customerId=${customerId.value}&cardId=${card.id}`,
  })
}

onLoad((query) => {
  const id = Number(query?.customerId)
  if (Number.isFinite(id) && id > 0) {
    customerId.value = id
  } else {
    showToast('客户参数无效')
  }
})

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="hero">
      <text class="title">次卡充值记录</text>
      <text class="subtitle">{{ customer?.name ?? '客户' }} · 共 {{ cards.length }} 笔</text>
    </view>

    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!customer" class="empty">客户不存在</view>
    <view v-else-if="cards.length === 0" class="empty">暂无充值记录</view>
    <view v-else class="records">
      <view v-for="card in cards" :key="card.id" class="record" @click="goEdit(card)">
        <view class="record-head">
          <view>
            <text class="record-title">{{ formatMoney(card.amount) }}</text>
            <text class="record-date">{{ formatDate(card.created_at) }} 充值</text>
          </view>
          <text class="status" :class="card.status">{{ cardStatusText(card) }}</text>
        </view>

        <view class="metrics">
          <view class="metric">
            <text class="metric-value">{{ card.total_meals }}</text>
            <text class="metric-label">总次数</text>
          </view>
          <view class="metric">
            <text class="metric-value">{{ card.used_meals }}</text>
            <text class="metric-label">已用</text>
          </view>
          <view class="metric">
            <text class="metric-value remaining">{{ remainingMeals(card) }}</text>
            <text class="metric-label">剩余</text>
          </view>
        </view>

        <view class="record-foot">
          <text>记录 #{{ card.id }}</text>
          <text class="edit-hint">修改总次数 ›</text>
        </view>
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

.hero {
  padding: 12rpx 4rpx 28rpx;
}

.title,
.subtitle,
.record-title,
.record-date,
.metric-value,
.metric-label {
  display: block;
}

.title {
  color: #222222;
  font-size: 40rpx;
  font-weight: 700;
}

.subtitle,
.record-date,
.metric-label,
.record-foot,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.subtitle {
  margin-top: 8rpx;
}

.records {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record {
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 22rpx rgba(22, 35, 55, 0.05);
}

.record-head,
.record-foot,
.metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-title {
  color: #222222;
  font-size: 36rpx;
  font-weight: 700;
}

.record-date {
  margin-top: 6rpx;
}

.status {
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.status.active {
  background: #eaf8ef;
  color: #07a44b;
}

.status.depleted {
  background: #f1f2f4;
  color: #8f8f94;
}

.metrics {
  margin-top: 24rpx;
  padding: 22rpx 0;
  border-top: 1rpx solid #f1f1f1;
  border-bottom: 1rpx solid #f1f1f1;
}

.metric {
  flex: 1;
  text-align: center;
}

.metric + .metric {
  border-left: 1rpx solid #f1f1f1;
}

.metric-value {
  color: #333333;
  font-size: 34rpx;
  font-weight: 700;
}

.metric-value.remaining {
  color: #007aff;
}

.metric-label {
  margin-top: 6rpx;
}

.record-foot {
  margin-top: 18rpx;
}

.edit-hint {
  color: #007aff;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}
</style>
