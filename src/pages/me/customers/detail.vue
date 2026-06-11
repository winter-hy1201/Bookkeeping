<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getCustomer } from '../../../api/customers'
import { getActiveCard } from '../../../api/meal-cards'
import { listOrders } from '../../../api/orders'
import type { Customer, MealCard, Order } from '../../../types/domain'
import { formatMoney, formatPercent } from '../../../utils/format'
import { mealTypeText, orderDisplayAmount, showToast, statusText } from '../../../utils/ui'

const customerId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const card = ref<MealCard | null>(null)
const orders = ref<Order[]>([])
const loading = ref(false)

const cardRemaining = computed(() => {
  if (!card.value) return 0
  return card.value.total_meals - card.value.used_meals
})
const cardProgress = computed(() => {
  if (!card.value || card.value.total_meals <= 0) return 0
  return card.value.used_meals / card.value.total_meals
})

async function refresh(): Promise<void> {
  if (customerId.value === null) return
  loading.value = true
  try {
    const [customerResult, cardResult, orderResult] = await Promise.all([
      getCustomer(customerId.value),
      getActiveCard(customerId.value),
      listOrders({ customerId: customerId.value }),
    ])
    customer.value = customerResult
    card.value = cardResult
    orders.value = orderResult
  } catch {
    showToast('客户详情加载失败')
  } finally {
    loading.value = false
  }
}

function goEdit(): void {
  if (customerId.value !== null) uni.navigateTo({ url: `/pages/me/customers/new?id=${customerId.value}` })
}

function goOpenCard(): void {
  if (customerId.value !== null) {
    uni.navigateTo({ url: `/pages/me/customers/open-card?customerId=${customerId.value}` })
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
        <button class="edit" @click="goEdit">编辑</button>
      </view>

      <view class="panel">
        <view class="row"><text>手机</text><text>{{ customer.phone || '—' }}</text></view>
        <view class="row"><text>微信</text><text>{{ customer.wechat || '—' }}</text></view>
        <view class="row"><text>午餐价</text><text>{{ formatMoney(customer.default_lunch_price) }}</text></view>
        <view class="row"><text>晚餐价</text><text>{{ formatMoney(customer.default_dinner_price) }}</text></view>
        <view class="row"><text>折扣</text><text>{{ formatPercent(customer.discount_rate) }}</text></view>
        <view class="row"><text>备注</text><text>{{ customer.note || '—' }}</text></view>
      </view>

      <view class="panel">
        <view class="section-head"><text class="section-title">次卡</text><button class="small" @click="goOpenCard">+ 开新卡</button></view>
        <view v-if="card" class="card-box">
          <view class="card-top">
            <text>#{{ card.id }} 剩 {{ cardRemaining }}/{{ card.total_meals }}</text>
            <text>{{ formatPercent(cardProgress) }}</text>
          </view>
          <view class="progress"><view class="progress-fill" :style="{ width: `${cardProgress * 100}%` }" /></view>
        </view>
        <view v-else class="empty-inline">该客户暂无次卡</view>
      </view>

      <view class="panel">
        <text class="section-title">历史订单（{{ orders.length }} 单）</text>
        <view v-if="orders.length === 0" class="empty-inline">暂无订单</view>
        <view v-for="order in orders" v-else :key="order.id" class="order-row">
          <view>
            <text class="order-title">{{ order.order_date }} · {{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
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
.empty,
.empty-inline,
.order-meta {
  color: #8f8f94;
  font-size: 26rpx;
}

.edit,
.small {
  margin: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 26rpx;
}

.small {
  padding: 0 18rpx;
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
