<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import StatCard from '../../components/StatCard.vue'
import { useCustomerStore } from '../../stores/customer'
import { useOrderStore } from '../../stores/order'
import { useStatsStore } from '../../stores/stats'
import type { Order, OrderStatus } from '../../types/domain'
import { formatDate, today } from '../../utils/date'
import { formatMoney } from '../../utils/format'
import { mealTypeText, orderDisplayAmount, statusText } from '../../utils/ui'

const statsStore = useStatsStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const todayText = today()
const summary = computed(() => statsStore.summary ?? { orderCount: 0, income: 0, expense: 0, profit: 0 })

const pendingOrders = computed(() => filterOrders('pending'))
const deliveredOrders = computed(() => filterOrders('delivered'))
const cancelledOrders = computed(() => filterOrders('cancelled'))

function filterOrders(status: OrderStatus): Order[] {
  return orderStore.list.filter((order) => order.status === status)
}

function customerName(id: number): string {
  return customerStore.list.find((customer) => customer.id === id)?.name ?? `客户 #${id}`
}

async function refresh(): Promise<void> {
  try {
    await Promise.all([
      statsStore.refreshSummary(today()),
      orderStore.refreshForDate(today()),
      customerStore.refresh(),
    ])
  } catch {
    uni.showToast({ title: '首页数据加载失败', icon: 'none' })
  }
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="header">
      <text class="title">今日 · {{ formatDate(todayText) }}</text>
      <text class="subtitle">订单、收支和配送状态</text>
    </view>

    <view class="stats-grid">
      <StatCard label="订单" :value="summary.orderCount" hint="非取消订单" />
      <StatCard label="收入" :value="formatMoney(summary.income)" />
      <StatCard label="支出" :value="formatMoney(summary.expense)" />
      <StatCard label="利润" :value="formatMoney(summary.profit)" />
    </view>

    <view class="section">
      <view class="section-title-row">
        <text class="section-title">今日订餐</text>
        <text class="section-meta">{{ orderStore.list.length }} 单</text>
      </view>

      <view class="status-cards">
        <view class="status-card status-card--pending">
          <text class="status-label">待配送</text>
          <text class="status-value">{{ pendingOrders.length }}</text>
        </view>
        <view class="status-card status-card--delivered">
          <text class="status-label">已配送</text>
          <text class="status-value">{{ deliveredOrders.length }}</text>
        </view>
        <view class="status-card status-card--cancelled">
          <text class="status-label">已取消</text>
          <text class="status-value">{{ cancelledOrders.length }}</text>
        </view>
      </view>

      <view v-if="orderStore.loading" class="empty">加载中...</view>
      <template v-else>
        <view class="group group--pending">
          <text class="group-title">待配送</text>
          <view v-if="pendingOrders.length === 0" class="empty">暂无待配送订单</view>
          <view v-for="order in pendingOrders" :key="order.id" class="order-row">
            <view class="order-main">
              <text class="order-name">{{ customerName(order.customer_id) }}</text>
              <text class="order-meta">{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
            </view>
            <text class="order-amount">{{ orderDisplayAmount(order) }}</text>
          </view>
        </view>

        <view class="group group--delivered">
          <text class="group-title">已配送</text>
          <view v-if="deliveredOrders.length === 0" class="empty">暂无已配送订单</view>
          <view v-for="order in deliveredOrders" :key="order.id" class="order-row">
            <view class="order-main">
              <text class="order-name">{{ customerName(order.customer_id) }}</text>
              <text class="order-meta">{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
            </view>
            <text class="order-amount">{{ orderDisplayAmount(order) }}</text>
          </view>
        </view>

        <view class="group group--cancelled">
          <text class="group-title">已取消</text>
          <view v-if="cancelledOrders.length === 0" class="empty">暂无已取消订单</view>
          <view v-for="order in cancelledOrders" :key="order.id" class="order-row order-row--muted">
            <view class="order-main">
              <text class="order-name">{{ customerName(order.customer_id) }}</text>
              <text class="order-meta">{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
            </view>
            <text class="order-amount">{{ statusText(order.status) }}</text>
          </view>
        </view>
      </template>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f6f7f9;
  box-sizing: border-box;
}

.header {
  padding: 36rpx 28rpx 18rpx;
}

.title {
  display: block;
  color: #222222;
  font-size: 42rpx;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 8rpx;
  color: #8f8f94;
  font-size: 26rpx;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  padding: 0 24rpx;
}

.section {
  margin-top: 28rpx;
  padding: 28rpx 24rpx 44rpx;
  background: #ffffff;
}

.section-title-row,
.order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  color: #222222;
  font-size: 34rpx;
  font-weight: 700;
}

.section-meta,
.order-meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.status-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 20rpx;
}

.status-card {
  min-width: 0;
  padding: 18rpx 14rpx;
  border: 1rpx solid currentColor;
  border-radius: 12rpx;
  text-align: center;
}

.status-card--pending {
  color: $uni-color-primary;
  background: rgba($uni-color-primary, 0.08);
}

.status-card--delivered {
  color: $uni-color-success;
  background: rgba($uni-color-success, 0.08);
}

.status-card--cancelled {
  color: $uni-color-warning;
  background: rgba($uni-color-warning, 0.1);
}

.status-label {
  display: block;
  font-size: 23rpx;
  line-height: 1.3;
}

.status-value {
  display: block;
  margin-top: 6rpx;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.2;
}

.group {
  margin-top: 28rpx;
  padding: 20rpx 22rpx 4rpx;
  border: 1rpx solid transparent;
  border-radius: 14rpx;
}

.group--pending {
  border-color: rgba($uni-color-primary, 0.28);
  background: rgba($uni-color-primary, 0.06);
}

.group--pending .group-title {
  color: $uni-color-primary;
}

.group--delivered {
  border-color: rgba($uni-color-success, 0.28);
  background: rgba($uni-color-success, 0.06);
}

.group--delivered .group-title {
  color: $uni-color-success;
}

.group--cancelled {
  border-color: rgba($uni-color-warning, 0.32);
  background: rgba($uni-color-warning, 0.08);
}

.group--cancelled .group-title {
  color: $uni-color-warning;
}

.group-title {
  display: block;
  margin-bottom: 12rpx;
  color: #333333;
  font-size: 36rpx;
  font-weight: 600;
}

.empty {
  padding: 28rpx 0;
  text-align: center;
}

.order-row {
  min-height: 96rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.order-row--muted {
  opacity: 0.55;
}

.order-main {
  min-width: 0;
}

.order-name {
  display: block;
  color: #222222;
  font-size: 30rpx;
  font-weight: 600;
}

.order-amount {
  color: #333333;
  font-size: 28rpx;
  font-weight: 600;
}
</style>
