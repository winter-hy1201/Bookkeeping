<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCustomer } from '../../../api/customers'
import { listCards } from '../../../api/meal-cards'
import { listOrders } from '../../../api/orders'
import { useCustomerStore } from '../../../stores/customer'
import type { Customer, MealCard, Order } from '../../../types/domain'
import { formatMoney, formatPercent } from '../../../utils/format'
import {
  confirmDialog,
  mealTypeText,
  orderDisplayAmount,
  showToast,
  statusText,
} from '../../../utils/ui'

const customerStore = useCustomerStore()
const customerId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const cards = ref<MealCard[]>([])
const orders = ref<Order[]>([])
const loading = ref(false)

const activeCards = computed(() => cards.value.filter((item) => item.status === 'active'))
const activeCardSummary = computed(() => {
  const totalMeals = activeCards.value.reduce((sum, item) => sum + item.total_meals, 0)
  const usedMeals = activeCards.value.reduce((sum, item) => sum + item.used_meals, 0)
  return {
    count: activeCards.value.length,
    totalMeals,
    usedMeals,
    remainingMeals: totalMeals - usedMeals,
  }
})
const cardProgress = computed(() => {
  if (activeCardSummary.value.totalMeals <= 0) return 0
  return activeCardSummary.value.usedMeals / activeCardSummary.value.totalMeals
})

async function refresh(): Promise<void> {
  if (customerId.value === null) return
  loading.value = true
  try {
    const [customerResult, cardResult, orderResult] = await Promise.all([
      getCustomer(customerId.value),
      listCards(customerId.value),
      listOrders({ customerId: customerId.value }),
    ])
    customer.value = customerResult
    cards.value = cardResult
    orders.value = orderResult
  } catch {
    showToast('客户详情加载失败')
  } finally {
    loading.value = false
  }
}

function goEdit(): void {
  if (customerId.value !== null)
    uni.navigateTo({ url: `/pages/me/customers/new?id=${customerId.value}` })
}

function goOpenCard(): void {
  if (customerId.value !== null) {
    uni.navigateTo({ url: `/pages/me/customers/open-card?customerId=${customerId.value}` })
  }
}

function goCardRecords(): void {
  if (customerId.value !== null) {
    uni.navigateTo({ url: `/pages/me/customers/card-records?customerId=${customerId.value}` })
  }
}

async function deleteCustomer(): Promise<void> {
  if (customerId.value === null) return
  const ok = await confirmDialog('删除客户？', '删除后无法恢复；已有订单或次卡的客户不能删除。')
  if (!ok) return
  try {
    const deleted = await customerStore.remove(customerId.value)
    if (!deleted) {
      showToast('该客户已有订单或次卡，不能删除')
      return
    }
    showToast('已删除')
    uni.navigateBack()
  } catch {
    showToast('删除失败')
  }
}

onLoad((query) => {
  const id = Number(query?.id)
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
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!customer" class="empty">客户不存在</view>
    <template v-else>
      <view class="hero">
        <view>
          <text class="name">{{ customer.name }}</text>
          <text class="meta">{{ customer.wechat || customer.phone || '未填写联系方式' }}</text>
        </view>
        <view class="hero-actions">
          <button class="edit" @click="goEdit">编辑</button>
          <button class="delete" @click="deleteCustomer">删除</button>
        </view>
      </view>

      <view class="panel">
        <view class="row"
          ><text>手机</text><text>{{ customer.phone || '—' }}</text></view
        >
        <view class="row"
          ><text>微信</text><text>{{ customer.wechat || '—' }}</text></view
        >
        <view class="row"
          ><text>午餐价</text><text>{{ formatMoney(customer.default_lunch_price) }}</text></view
        >
        <view class="row"
          ><text>晚餐价</text><text>{{ formatMoney(customer.default_dinner_price) }}</text></view
        >
        <view class="row"
          ><text>折扣</text><text>{{ formatPercent(customer.discount_rate) }}</text></view
        >
        <view class="row"
          ><text>备注</text><text>{{ customer.note || '—' }}</text></view
        >
      </view>

      <view class="panel">
        <view class="section-head">
          <text class="section-title">次卡</text>
          <view class="section-actions">
            <button class="small secondary" @click="goCardRecords">充值记录</button>
            <button class="small" @click="goOpenCard">+ 开新卡</button>
          </view>
        </view>
        <view v-if="activeCardSummary.count > 0" class="card-box">
          <view class="card-top">
            <text
              >共剩 {{ activeCardSummary.remainingMeals }}/{{ activeCardSummary.totalMeals }}</text
            >
            <text>{{ formatPercent(cardProgress) }}</text>
          </view>
          <text class="card-meta"
            >当前 {{ activeCardSummary.count }} 张 active 次卡，剩余次数已叠加显示</text
          >
          <view class="progress"
            ><view class="progress-fill" :style="{ width: `${cardProgress * 100}%` }"
          /></view>
        </view>
        <view v-else class="empty-inline">该客户暂无次卡</view>
      </view>

      <view class="panel">
        <text class="section-title">历史订单（{{ orders.length }} 单）</text>
        <view v-if="orders.length === 0" class="empty-inline">暂无订单</view>
        <view v-for="order in orders" v-else :key="order.id" class="order-row">
          <view>
            <text class="order-title"
              >{{ order.order_date }} · {{ mealTypeText(order.meal_type) }} ×
              {{ order.quantity }}</text
            >
            <text class="order-meta">{{ statusText(order.status) }}</text>
          </view>
          <text class="order-amount">{{ orderDisplayAmount(order) }}</text>
        </view>
      </view>
    </template>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.hero,
.panel {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.hero,
.row,
.section-head,
.card-top,
.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name,
.meta,
.section-title,
.order-title,
.order-meta {
  display: block;
}

.name {
  color: #222222;
  font-size: 38rpx;
  font-weight: 700;
}

.meta,
.card-meta,
.empty,
.empty-inline,
.order-meta {
  color: #8f8f94;
  font-size: 26rpx;
}

.edit,
.small,
.delete {
  margin: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 26rpx;
}

.small {
  padding: 0 18rpx;
}

.hero-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 12rpx;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.secondary {
  border: 1rpx solid #007aff;
  background: #ffffff;
  color: #007aff;
}

.delete {
  background: #ee0a24;
}

.row {
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
  color: #333333;
  font-size: 28rpx;
}

.section-title {
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
}

.card-box {
  margin-top: 18rpx;
}

.card-meta {
  display: block;
  margin-top: 10rpx;
}

.progress {
  height: 18rpx;
  margin-top: 14rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #eef0f3;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #07c160;
}

.order-row {
  min-height: 92rpx;
  border-bottom: 1rpx solid #f1f1f1;
}

.order-title,
.order-amount {
  color: #333333;
  font-size: 28rpx;
  font-weight: 600;
}

.empty,
.empty-inline {
  padding: 40rpx 0;
  text-align: center;
}
</style>
