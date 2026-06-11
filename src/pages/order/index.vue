<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCustomerStore } from '../../stores/customer'
import { useOrderStore } from '../../stores/order'
import type { OrderStatus } from '../../types/domain'
import { today } from '../../utils/date'
import { formatMoney } from '../../utils/format'
import { mealTypeText, orderDisplayAmount, statusText } from '../../utils/ui'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const groupedOrders = computed(() => orderStore.list)

function customerName(id: number): string {
  return customerStore.list.find((customer) => customer.id === id)?.name ?? `客户 #${id}`
}

function statusClass(status: OrderStatus): string {
  return `status status--${status}`
}

async function refresh(): Promise<void> {
  try {
    await Promise.all([orderStore.refreshForDate(orderStore.currentDate), customerStore.refresh()])
  } catch {
    uni.showToast({ title: '订单加载失败', icon: 'none' })
  }
}

function handleDateChange(value: string): void {
  const date = value || today()
  void orderStore.refreshForDate(date)
}

function goNew(): void {
  uni.navigateTo({ url: '/pages/order/new' })
}

function goDetail(id: number): void {
  uni.navigateTo({ url: `/pages/order/detail?id=${id}` })
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
        :model-value="orderStore.currentDate"
        :clear-icon="false"
        @change="handleDateChange"
      />
      <button class="add-button" @click="goNew">+ 新建</button>
    </view>

    <view v-if="orderStore.loading" class="empty">订单加载中...</view>
    <view v-else-if="groupedOrders.length === 0" class="empty">该日期暂无订单</view>
    <scroll-view v-else class="list" scroll-y>
      <view v-for="order in groupedOrders" :key="order.id" class="order-item" @click="goDetail(order.id)">
        <view class="order-main">
          <view class="order-title-row">
            <text class="order-name">{{ customerName(order.customer_id) }}</text>
            <text :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
          </view>
          <text class="order-meta">
            {{ mealTypeText(order.meal_type) }} × {{ order.quantity }} · 单价 {{ formatMoney(order.unit_price) }}
          </text>
        </view>
        <text class="order-amount">{{ orderDisplayAmount(order) }}</text>
      </view>
    </scroll-view>
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
.order-item,
.order-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.toolbar {
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.date-button {
  min-width: 260rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.add-button {
  margin: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 28rpx;
}

.list {
  height: calc(100vh - 132rpx);
}

.order-item {
  min-height: 120rpx;
  margin-bottom: 16rpx;
  padding: 22rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.order-name {
  overflow: hidden;
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.order-meta {
  display: block;
  margin-top: 10rpx;
}

.order-amount {
  margin-left: 20rpx;
  color: #222222;
  font-size: 30rpx;
  font-weight: 700;
}

.status {
  flex: 0 0 auto;
  margin-left: 16rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}

.status--pending {
  background: #fff7e6;
  color: #fa8c16;
}

.status--delivered {
  background: #e8f7ee;
  color: #07c160;
}

.status--cancelled {
  background: #f0f0f0;
  color: #8f8f94;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}
</style>
