<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import { getCustomer } from '../../../api/customers'
import { listCards } from '../../../api/meal-cards'
import { listOrders } from '../../../api/orders'
import { useCustomerStore } from '../../../stores/customer'
import type { Customer, MealCard, Order } from '../../../types/domain'
import { formatMoney } from '../../../utils/format'
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
const loadFailed = ref(false)

const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
})

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

function formatDiscount(rate: number): string {
  if (rate >= 1) return '无折扣'
  const val = (rate * 10).toFixed(1)
  return `${val} 折`
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : dateStr
}

async function refresh(): Promise<boolean> {
  if (customerId.value === null) return false
  loading.value = true
  loadFailed.value = false
  try {
    const [customerResult, cardResult, orderResult] = await Promise.all([
      getCustomer(customerId.value),
      listCards(customerId.value),
      listOrders({ customerId: customerId.value }),
    ])
    if (!customerResult) {
      loadFailed.value = true
      return false
    }
    customer.value = customerResult
    cards.value = cardResult
    orders.value = orderResult
    return true
  } catch {
    loadFailed.value = true
    showToast('客户详情加载失败')
    return false
  } finally {
    loading.value = false
  }
}

function goEdit(): void {
  if (customerId.value !== null) {
    void pageReturn.navigateTo({ url: `/pages/me/customers/new?id=${customerId.value}` })
  }
}

function goOpenCard(): void {
  if (customerId.value !== null) {
    void pageReturn.navigateTo({
      url: `/pages/me/customers/open-card?customerId=${customerId.value}`,
    })
  }
}

function goCardRecords(): void {
  if (customerId.value !== null) {
    void pageReturn.navigateTo({
      url: `/pages/me/customers/card-records?customerId=${customerId.value}`,
    })
  }
}

function goOrderDetail(orderId: number): void {
  void pageReturn.navigateTo({
    url: `/pages/order/detail?id=${orderId}`,
  })
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
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <scroll-view
      class="detail-scroll"
      scroll-y
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view v-if="loading" class="state-card">
        <text class="state-title">正在读取客户详情…</text>
      </view>

      <view v-else-if="loadFailed || !customer" class="state-card">
        <text class="state-title">客户不存在或加载失败</text>
        <button class="state-button" @click="refresh">重新加载</button>
      </view>

      <view v-else class="content-wrap">
        <!-- Hero Card -->
        <view class="hero-card">
          <view class="hero-info">
            <text class="hero-name">{{ customer.name }}</text>
            <text class="hero-meta">
              {{ customer.wechat || customer.phone || '未填写联系方式' }}
            </text>
          </view>
          <button class="edit-button" @click="goEdit">编辑</button>
        </view>

        <!-- Profile Panel -->
        <view class="panel-card">
          <view class="row">
            <text class="row-label">手机</text>
            <text class="row-value">{{ customer.phone || '—' }}</text>
          </view>
          <view class="row">
            <text class="row-label">微信</text>
            <text class="row-value">{{ customer.wechat || '—' }}</text>
          </view>
          <view class="row">
            <text class="row-label">午餐价</text>
            <text class="row-value">{{ formatMoney(customer.default_lunch_price) }}</text>
          </view>
          <view class="row">
            <text class="row-label">晚餐价</text>
            <text class="row-value">{{ formatMoney(customer.default_dinner_price) }}</text>
          </view>
          <view class="row">
            <text class="row-label">折扣</text>
            <text class="row-value">{{ formatDiscount(customer.discount_rate) }}</text>
          </view>
          <view class="row row--last">
            <text class="row-label">备注</text>
            <text class="row-value row-value--wrap">{{ customer.note || '—' }}</text>
          </view>
        </view>

        <!-- Meal Card Panel -->
        <view class="panel-card">
          <view class="panel-header">
            <text class="panel-title">次卡</text>
            <view class="panel-actions">
              <button class="action-chip action-chip--secondary" @click="goCardRecords">
                充值记录
              </button>
              <button class="action-chip action-chip--accent" @click="goOpenCard">
                <HejiIcon name="Plus" :size="14" />
                <text>开新卡</text>
              </button>
            </view>
          </view>

          <view v-if="activeCardSummary.count > 0" class="card-summary-box">
            <view class="card-stat-row">
              <view class="card-stat-left">
                <text class="stat-prefix">剩余</text>
                <text class="stat-highlight">{{ activeCardSummary.remainingMeals }}</text>
                <text class="stat-suffix">/ 总计 {{ activeCardSummary.totalMeals }} 次</text>
              </view>
              <text class="card-stat-right">{{ activeCardSummary.count }} 张使用中</text>
            </view>
            <view class="progress-track">
              <view class="progress-bar" :style="{ width: `${cardProgress * 100}%` }" />
            </view>
            <text class="card-stat-meta">
              已用 {{ activeCardSummary.usedMeals }} 次，剩余
              {{ activeCardSummary.remainingMeals }} 次
            </text>
          </view>
          <view v-else class="empty-inline">该客户暂无有效次卡</view>
        </view>

        <!-- History Orders Panel -->
        <view class="panel-card">
          <view class="panel-header">
            <text class="panel-title">历史订单（{{ orders.length }}单）</text>
          </view>

          <view v-if="orders.length > 0" class="orders-table">
            <view class="table-head">
              <text class="th th--date">日期</text>
              <text class="th th--meal">餐别</text>
              <text class="th th--qty">数量</text>
              <text class="th th--status">状态</text>
              <text class="th th--amount">金额</text>
            </view>
            <view
              v-for="order in orders"
              :key="order.id"
              class="table-row"
              @click="goOrderDetail(order.id)"
            >
              <text class="td td--date">{{ formatDateShort(order.order_date) }}</text>
              <text class="td td--meal">{{ mealTypeText(order.meal_type) }}</text>
              <text class="td td--qty">{{ order.quantity }} 份</text>
              <view class="td td--status">
                <view
                  class="status-chip"
                  :class="{
                    'status-chip--delivered': order.status === 'delivered',
                    'status-chip--pending': order.status === 'pending',
                    'status-chip--warning': order.status === 'cancelled',
                  }"
                >
                  <text class="status-chip-text">{{ statusText(order.status) }}</text>
                </view>
              </view>
              <view class="td td--amount">
                <text class="amount-text">{{ orderDisplayAmount(order) }}</text>
                <HejiIcon class="row-arrow" name="ChevronRight" :size="16" />
              </view>
            </view>
          </view>
          <view v-else class="empty-inline">暂无历史订单</view>
        </view>

        <!-- Danger Zone -->
        <view class="danger-zone">
          <button class="delete-button" @click="deleteCustomer">
            <HejiIcon name="Trash2" :size="18" />
            <text>删除客户</text>
          </button>
          <text class="danger-hint">已有订单或次卡的客户不能删除；删除后无法恢复。</text>
        </view>

        <view class="scroll-spacer" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.detail-scroll {
  flex: 1;
  min-height: 0;
}

.content-wrap {
  padding: $hej-space-3;
}

.hero-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  padding: $hej-space-4 $hej-space-4;
  margin-bottom: $hej-space-3;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name {
  display: block;
  color: $hej-color-text;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.2;
}

.hero-meta {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.edit-button {
  flex: 0 0 auto;
  min-width: 130rpx;
  height: 64rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 500;
  line-height: 64rpx;
  text-align: center;
  box-sizing: border-box;
}

.edit-button::after {
  border: 0;
}

.edit-button:active {
  background: $hej-color-surface-subtle;
}

.panel-card {
  margin-bottom: $hej-space-3;
  padding: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-card;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: $hej-space-2 0;
  border-bottom: 1rpx solid $hej-color-border;
  box-sizing: border-box;
}

.row--last {
  border-bottom: 0;
}

.row-label {
  flex: 0 0 140rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}

.row-value {
  flex: 1;
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 500;
  text-align: right;
}

.row-value--wrap {
  text-align: right;
  word-break: break-all;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin-bottom: $hej-space-3;
}

.panel-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.action-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-1;
  height: 56rpx;
  padding: 0 $hej-space-3;
  border-radius: $hej-radius-control;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 56rpx;
  text-align: center;
  box-sizing: border-box;
}

.action-chip::after {
  border: 0;
}

.action-chip--secondary {
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
}

.action-chip--secondary:active {
  background: $hej-color-surface-subtle;
}

.action-chip--accent {
  border: 1rpx solid rgba(201, 100, 66, 0.3);
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
}

.action-chip--accent:active {
  opacity: 0.85;
}

.card-summary-box {
  margin-top: $hej-space-2;
}

.card-stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.card-stat-left {
  display: flex;
  align-items: baseline;
  gap: $hej-space-1;
}

.stat-prefix,
.stat-suffix {
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}

.stat-highlight {
  color: $hej-color-accent;
  font-size: 38rpx;
  font-weight: 700;
}

.card-stat-right {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.progress-track {
  height: 14rpx;
  margin: $hej-space-3 0 $hej-space-2;
  overflow: hidden;
  border-radius: 999rpx;
  background: $hej-color-surface-subtle;
}

.progress-bar {
  height: 100%;
  border-radius: 999rpx;
  background: $hej-color-accent;
}

.card-stat-meta {
  display: block;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.empty-inline {
  padding: $hej-space-4 0;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-meta;
  text-align: center;
}

.orders-table {
  margin-top: $hej-space-2;
}

.table-head {
  display: flex;
  align-items: center;
  padding-bottom: $hej-space-2;
  border-bottom: 1rpx solid $hej-color-border;
}

.th {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  font-weight: 500;
}

.th--date,
.td--date {
  flex: 0 0 110rpx;
}

.th--meal,
.td--meal {
  flex: 0 0 80rpx;
}

.th--qty,
.td--qty {
  flex: 0 0 80rpx;
}

.th--status,
.td--status {
  flex: 0 0 140rpx;
}

.th--amount,
.td--amount {
  flex: 1;
  text-align: right;
}

.table-row {
  display: flex;
  align-items: center;
  min-height: 84rpx;
  padding: $hej-space-2 0;
  border-bottom: 1rpx solid $hej-color-border;
  box-sizing: border-box;
}

.table-row:last-child {
  border-bottom: 0;
}

.table-row:active {
  background: $hej-color-surface-subtle;
}

.td {
  color: $hej-color-text;
  font-size: $hej-font-meta;
}

.td--date {
  color: $hej-color-text-secondary;
}

.td--meal,
.td--qty {
  color: $hej-color-text;
  font-weight: 500;
}

.td--amount {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: $hej-space-1;
}

.amount-text {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.row-arrow {
  color: $hej-color-text-tertiary;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2rpx 12rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  line-height: 1.3;
}

.status-chip--delivered {
  background: $hej-color-delivered-soft;
  color: $hej-color-delivered;
}

.status-chip--pending {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.status-chip--warning {
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
}

.status-chip-text {
  font-size: 22rpx;
  font-weight: 600;
}

.danger-zone {
  margin-top: $hej-space-5;
  padding: $hej-space-4;
  border: 1rpx solid rgba(141, 69, 69, 0.2);
  border-radius: $hej-radius-card;
  background: $hej-color-danger-soft;
  text-align: center;
}

.delete-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-2;
  width: 100%;
  height: 80rpx;
  border: 1rpx solid rgba(141, 69, 69, 0.3);
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-danger;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;
  box-sizing: border-box;
}

.delete-button::after {
  border: 0;
}

.delete-button:active {
  background: $hej-color-danger-soft;
}

.danger-hint {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-danger;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.scroll-spacer {
  height: calc($hej-space-7 + env(safe-area-inset-bottom));
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: $hej-space-5 $hej-space-3;
  padding: $hej-space-7 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-card;
  background: $hej-color-surface;
  text-align: center;
}

.state-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.state-button {
  min-width: 200rpx;
  height: 72rpx;
  margin-top: $hej-space-4;
  padding: 0 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}

.state-button::after {
  border: 0;
}
</style>
