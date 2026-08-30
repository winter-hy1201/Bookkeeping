<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { usePageReturnSnapshot } from '../../composables/usePageReturnSnapshot'
import { useCustomerStore } from '../../stores/customer'
import { useOrderStore } from '../../stores/order'
import { useStatsStore } from '../../stores/stats'
import type { Order, OrderStatus } from '../../types/domain'
import { formatTime, formatTodayLabel, today } from '../../utils/date'
import { formatMoney } from '../../utils/format'
import { mealTypeText, orderDisplayAmount, orderPaymentSummary, statusText } from '../../utils/ui'

const statsStore = useStatsStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const todayText = ref(today())
const statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0
const hasLoaded = ref(false)
const loadError = ref(false)

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

const pendingOrders = computed(() => filterOrders('pending'))
const deliveredOrders = computed(() => filterOrders('delivered'))
const cancelledOrders = computed(() => filterOrders('cancelled'))
const isInitialLoading = computed(() => !hasLoaded.value && !loadError.value)
const isRefreshing = computed(() => statsStore.loading || orderStore.loading || customerStore.loading)

function filterOrders(status: OrderStatus): Order[] {
  return orderStore.list.filter((order) => order.status === status)
}

function totalQuantity(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + (order.quantity ?? 0), 0)
}

const pendingQuantity = computed(() => totalQuantity(pendingOrders.value))
const deliveredQuantity = computed(() => totalQuantity(deliveredOrders.value))
const cancelledQuantity = computed(() => totalQuantity(cancelledOrders.value))
const orderGroups = computed(() => [
  {
    status: 'pending' as const,
    label: '待配送',
    orders: pendingOrders.value,
    quantity: pendingQuantity.value,
  },
  {
    status: 'delivered' as const,
    label: '已配送',
    orders: deliveredOrders.value,
    quantity: deliveredQuantity.value,
  },
  {
    status: 'cancelled' as const,
    label: '已取消',
    orders: cancelledOrders.value,
    quantity: cancelledQuantity.value,
  },
])
const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  hasContent: () => orderStore.list.length > 0,
})

function customerName(id: number): string {
  return customerStore.list.find((customer) => customer.id === id)?.name ?? '客户 #' + id
}

function orderNumber(id: number): string {
  return '#' + String(id).padStart(3, '0')
}

function orderStatusClass(status: OrderStatus): string {
  return 'status-chip status-chip--' + status
}

function profitValueClass(): string {
  return summary.value.profit < 0
    ? 'metric-card__value metric-card__value--negative'
    : 'metric-card__value metric-card__value--positive'
}

function goDailyMenus(): void {
  void pageReturn.navigateTo({ url: '/pages/me/menus/list' })
}

function goOrders(): void {
  uni.switchTab({ url: '/pages/order/index' })
}

function retry(): void {
  void refresh()
}

async function refresh(): Promise<boolean> {
  loadError.value = false
  todayText.value = today()
  const previousSummary = statsStore.summary
  const previousRange = { ...statsStore.range }
  const previousOrders = [...orderStore.list]
  const previousOrderDate = orderStore.currentDate
  const previousCustomers = [...customerStore.list]
  const results = await Promise.allSettled([
    statsStore.refreshSummary(todayText.value),
    orderStore.refreshForDate(todayText.value),
    customerStore.refresh(),
  ])
  if (results.some((result) => result.status === 'rejected')) {
    statsStore.$patch({ summary: previousSummary, range: previousRange })
    orderStore.$patch({ list: previousOrders, currentDate: previousOrderDate })
    customerStore.$patch({ list: previousCustomers })
    loadError.value = true
    uni.showToast({ title: '首页数据加载失败', icon: 'none' })
    return false
  }
  hasLoaded.value = true
  return true
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
        <view class="header">
          <text class="title">今日</text>
          <text class="date">{{ formatTodayLabel(todayText) }}</text>
          <text class="subtitle">订单、收支和配送状态</text>
        </view>

        <view class="menu-shortcut" hover-class="menu-shortcut--pressed" @click="goDailyMenus">
          <view class="menu-shortcut__icon">
            <uni-icons type="compose" size="20" color="inherit"></uni-icons>
          </view>
          <view class="menu-shortcut__content">
            <text class="menu-shortcut__eyebrow">社群菜单</text>
            <text class="menu-shortcut__title">维护每日菜单并复制文案</text>
          </view>
          <uni-icons type="right" size="16" color="inherit"></uni-icons>
        </view>

        <view v-if="isInitialLoading" class="state-card state-card--loading">
          <uni-icons type="refreshempty" size="24" color="inherit"></uni-icons>
          <text class="state-card__title">正在读取今日数据</text>
          <text class="state-card__description">订单、客户和收支信息马上就绪。</text>
        </view>
        <view v-else-if="!hasLoaded" class="state-card state-card--error">
          <uni-icons type="closeempty" size="24" color="inherit"></uni-icons>
          <text class="state-card__title">今日数据加载失败</text>
          <text class="state-card__description">请检查本地数据库状态后重试，已有数据不会被覆盖。</text>
          <button class="retry-button" :disabled="isRefreshing" @click="retry">
            {{ isRefreshing ? '重新加载中…' : '重新加载' }}
          </button>
        </view>

        <template v-else>
          <view v-if="loadError" class="inline-error">
            <view class="inline-error__copy">
              <text class="inline-error__title">今日数据刷新失败</text>
              <text class="inline-error__description">当前仍保留上次成功读取的内容。</text>
            </view>
            <button class="retry-button retry-button--small" :disabled="isRefreshing" @click="retry">
              {{ isRefreshing ? '加载中…' : '重新加载' }}
            </button>
          </view>

          <view class="metrics">
            <view class="metric-card metric-card--orders">
              <view class="metric-card__icon metric-card__icon--accent">
                <uni-icons type="list" size="18" color="inherit"></uni-icons>
              </view>
              <view class="metric-card__copy">
                <text class="metric-card__label">订单</text>
                <view class="metric-card__value-row">
                  <text class="metric-card__value">{{ summary.orderCount }}</text>
                  <text class="metric-card__unit">单</text>
                  <text class="metric-card__separator">·</text>
                  <text class="metric-card__value">{{ summary.orderQuantity }}</text>
                  <text class="metric-card__unit">份</text>
                </view>
              </view>
            </view>

            <view class="metric-card">
              <view class="metric-card__icon metric-card__icon--success">
                <uni-icons type="wallet" size="18" color="inherit"></uni-icons>
              </view>
              <view class="metric-card__copy">
                <text class="metric-card__label">收入</text>
                <text class="metric-card__value">{{ formatMoney(summary.income) }}</text>
              </view>
            </view>

            <view class="metric-card">
              <view class="metric-card__icon metric-card__icon--warning">
                <uni-icons type="notification" size="18" color="inherit"></uni-icons>
              </view>
              <view class="metric-card__copy">
                <text class="metric-card__label">支出</text>
                <text class="metric-card__value">{{ formatMoney(summary.expense) }}</text>
              </view>
            </view>

            <view class="metric-card">
              <view class="metric-card__icon metric-card__icon--profit">
                <uni-icons type="checkbox-filled" size="18" color="inherit"></uni-icons>
              </view>
              <view class="metric-card__copy">
                <text class="metric-card__label">利润</text>
                <text :class="profitValueClass()">{{ formatMoney(summary.profit) }}</text>
              </view>
            </view>
          </view>

          <view v-if="isRefreshing" class="refreshing-note">
            <uni-icons type="refresh" size="14" color="inherit"></uni-icons>
            <text>正在刷新今日数据…</text>
          </view>

          <view class="order-panel">
            <view class="section-heading">
              <view class="section-heading__copy">
                <text class="section-title">今日订餐</text>
                <text class="section-meta">/ {{ orderStore.list.length }}单</text>
              </view>
              <view class="section-link" hover-class="section-link--pressed" @click="goOrders">
                <text>更多订单</text>
                <uni-icons type="right" size="14" color="inherit"></uni-icons>
              </view>
            </view>

            <view class="status-summary">
              <view class="status-summary__item status-summary__item--pending">
                <view class="status-summary__label">
                  <uni-icons type="notification" size="14" color="inherit"></uni-icons>
                  <text>待配送</text>
                </view>
                <text class="status-summary__value">{{ pendingOrders.length }}单 / {{ pendingQuantity }}份</text>
              </view>
              <view class="status-summary__item status-summary__item--delivered">
                <view class="status-summary__label">
                  <uni-icons type="checkbox-filled" size="14" color="inherit"></uni-icons>
                  <text>已配送</text>
                </view>
                <text class="status-summary__value">{{ deliveredOrders.length }}单 / {{ deliveredQuantity }}份</text>
              </view>
              <view class="status-summary__item status-summary__item--cancelled">
                <view class="status-summary__label">
                  <uni-icons type="closeempty" size="14" color="inherit"></uni-icons>
                  <text>已取消</text>
                </view>
                <text class="status-summary__value">{{ cancelledOrders.length }}单 / {{ cancelledQuantity }}份</text>
              </view>
            </view>

            <view v-if="orderStore.list.length === 0" class="empty-state">
              <view class="empty-state__icon">
                <uni-icons type="list" size="22" color="inherit"></uni-icons>
              </view>
              <text class="empty-state__title">今天还没有订单</text>
              <text class="empty-state__description">订单录入后，会在这里显示配送进度和收款信息。</text>
              <button class="empty-action" hover-class="empty-action--pressed" @click="goOrders">
                <text>前往订单页新建</text>
                <uni-icons type="right" size="14" color="inherit"></uni-icons>
              </button>
            </view>

            <view v-else class="order-groups">
              <view v-for="group in orderGroups" :key="group.status" class="order-group">
                <view class="order-group__heading">
                  <view class="order-group__label">
                    <text :class="'order-group__marker order-group__marker--' + group.status"></text>
                    <text class="order-group__title">{{ group.label }}</text>
                  </view>
                  <text class="order-group__count">{{ group.orders.length }}单 / {{ group.quantity }}份</text>
                </view>
                <view v-if="group.orders.length === 0" class="order-group__empty">暂无{{ group.label }}订单</view>
                <view v-else class="order-group__list">
                  <view v-for="order in group.orders" :key="order.id" class="order-row">
                    <view class="order-time">
                      <text class="order-time__clock">{{ formatTime(order.created_at) }}</text>
                      <text class="order-time__number">{{ orderNumber(order.id) }}</text>
                    </view>
                    <view class="order-detail">
                      <view class="order-line">
                        <text class="order-name">{{ customerName(order.customer_id) }}</text>
                        <text :class="orderStatusClass(order.status)">{{ statusText(order.status) }}</text>
                      </view>
                      <text class="order-meta">{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
                      <text class="order-payment">{{ orderPaymentSummary(order) }}</text>
                      <text v-if="order.note" class="order-note">{{ order.note }}</text>
                    </view>
                    <view class="order-amount-wrap">
                      <text class="order-amount">{{ orderDisplayAmount(order) }}</text>
                      <uni-icons type="right" size="14" color="inherit"></uni-icons>
                    </view>
                  </view>
                </view>
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
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: $hej-color-canvas;
  color: $hej-color-text;
  font-family: $hej-font-family;
  box-sizing: border-box;
}

.status-bar {
  width: 100%;
  flex-shrink: 0;
  background: $hej-color-canvas;
}

.content {
  width: 100%;
  box-sizing: border-box;
}

.content-inner {
  box-sizing: border-box;
  padding: 0 $hej-space-5 calc(140rpx + env(safe-area-inset-bottom));
}

.header {
  padding: $hej-space-6 0 $hej-space-5;
}

.title {
  display: block;
  color: $hej-color-text;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  font-size: $hej-font-hero;
  font-weight: 600;
  letter-spacing: 2rpx;
  line-height: 1.05;
}

.date {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-title;
  font-weight: 600;
  line-height: 1.2;
}

.subtitle {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-meta;
  line-height: 1.4;
}

.menu-shortcut {
  display: flex;
  align-items: center;
  min-height: 96rpx;
  margin-bottom: $hej-space-4;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-accent-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  box-sizing: border-box;
}

.menu-shortcut--pressed,
.section-link--pressed,
.empty-action--pressed {
  opacity: 0.72;
}

.menu-shortcut__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  flex-shrink: 0;
  margin-right: $hej-space-3;
  border: 1rpx solid currentColor;
  border-radius: $hej-radius-control;
}

.menu-shortcut__content {
  min-width: 0;
  flex: 1;
}

.menu-shortcut__eyebrow,
.menu-shortcut__title {
  display: block;
}

.menu-shortcut__eyebrow {
  color: $hej-color-accent;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.3;
}

.menu-shortcut__title {
  margin-top: 4rpx;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 1.3;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $hej-space-3;
}

.metric-card {
  display: flex;
  align-items: center;
  min-width: 0;
  min-height: 104rpx;
  padding: $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.metric-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  margin-right: $hej-space-2;
  border-radius: 50%;
}

.metric-card__icon--accent {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.metric-card__icon--success {
  background: $hej-color-success-soft;
  color: $hej-color-success;
}

.metric-card__icon--warning {
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
}

.metric-card__icon--profit {
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
}

.metric-card__copy {
  min-width: 0;
  flex: 1;
}

.metric-card__label {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.2;
}

.metric-card__value-row {
  display: flex;
  align-items: baseline;
  min-width: 0;
  margin-top: 4rpx;
  white-space: nowrap;
}

.metric-card__value {
  display: block;
  max-width: 100%;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.metric-card--orders .metric-card__value {
  font-size: $hej-font-caption;
}

.metric-card__unit,
.metric-card__separator {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  white-space: nowrap;
}

.metric-card__unit {
  margin-left: 2rpx;
}

.metric-card__separator {
  margin: 0 4rpx;
}

.metric-card__value--positive {
  color: $hej-color-text;
}

.metric-card__value--negative {
  color: $hej-color-danger;
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
  margin: $hej-space-3 0;
  padding: $hej-space-3 $hej-space-4;
  border: 1rpx solid $hej-color-danger-soft;
  border-radius: $hej-radius-control;
  background: $hej-color-danger-soft;
}

.inline-error__copy {
  min-width: 0;
  flex: 1;
}

.inline-error__title,
.inline-error__description {
  display: block;
}

.inline-error__title {
  color: $hej-color-danger;
  font-size: $hej-font-meta;
  font-weight: 700;
}

.inline-error__description {
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.retry-button--small {
  min-width: 156rpx;
  height: 88rpx;
  margin-top: 0;
  padding: 0 $hej-space-3;
  font-size: $hej-font-caption;
  line-height: 88rpx;
  flex-shrink: 0;
}

.refreshing-note {
  display: flex;
  align-items: center;
  margin: $hej-space-4 0 (-$hej-space-2);
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.refreshing-note text {
  margin-left: $hej-space-1;
}

.order-panel {
  margin-top: $hej-space-5;
  padding: $hej-space-5 $hej-space-4 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.section-heading__copy {
  display: flex;
  align-items: baseline;
  min-width: 0;
}

.section-title {
  color: $hej-color-text;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  font-size: $hej-font-title;
  font-weight: 600;
  line-height: 1.2;
}

.section-meta {
  margin-left: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  white-space: nowrap;
}

.section-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: $hej-space-3;
  color: $hej-color-accent;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.4;
}

.status-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: $hej-space-4;
  padding: $hej-space-3 0;
  border-top: 1rpx solid $hej-color-border;
  border-bottom: 1rpx solid $hej-color-border;
}

.status-summary__item {
  min-width: 0;
  padding: 0 $hej-space-2;
  border-left: 1rpx solid $hej-color-border;
}

.status-summary__item:first-child {
  border-left: 0;
  padding-left: 0;
}

.status-summary__item:last-child {
  padding-right: 0;
}

.status-summary__label {
  display: flex;
  align-items: center;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.3;
}

.status-summary__label text {
  margin-left: 4rpx;
  white-space: nowrap;
}

.status-summary__value {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text;
  font-size: $hej-font-caption;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.status-summary__item--pending {
  color: $hej-color-pending;
}

.status-summary__item--delivered {
  color: $hej-color-delivered;
}

.status-summary__item--cancelled {
  color: $hej-color-warning;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx $hej-space-4 40rpx;
  text-align: center;
}

.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
}

.empty-state__title {
  margin-top: $hej-space-3;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
}

.empty-state__description {
  max-width: 520rpx;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.empty-action {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 240rpx;
  height: 88rpx;
  margin-top: $hej-space-4;
  padding: 0 $hej-space-5;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 88rpx;
  text-align: center;
  box-sizing: border-box;
}

.empty-action::after {
  border: 0;
}

.empty-action uni-icons {
  margin-left: $hej-space-1;
}

.order-groups {
  margin-top: $hej-space-1;
}

.order-group + .order-group {
  margin-top: $hej-space-3;
}

.order-group__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: $hej-space-3 0;
  border-top: 1rpx solid $hej-color-border;
}

.order-group__label {
  display: flex;
  align-items: center;
  min-width: 0;
}

.order-group__marker {
  width: 12rpx;
  height: 12rpx;
  flex-shrink: 0;
  margin-right: $hej-space-2;
  border-radius: 50%;
  background: $hej-color-text-tertiary;
}

.order-group__marker--pending {
  background: $hej-color-pending;
}

.order-group__marker--delivered {
  background: $hej-color-delivered;
}

.order-group__marker--cancelled {
  background: $hej-color-warning;
}

.order-group__title {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 1.3;
}

.order-group__count {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.3;
  white-space: nowrap;
}

.order-group__empty {
  padding: $hej-space-3 0 $hej-space-4;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.order-group__list {
  min-width: 0;
}

.order-row {
  display: grid;
  grid-template-columns: 76rpx minmax(0, 1fr) auto;
  column-gap: $hej-space-3;
  align-items: start;
  min-width: 0;
  padding: $hej-space-4 0;
  border-top: 1rpx solid $hej-color-border;
}

.order-time {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-top: 2rpx;
}

.order-time__clock {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 1.3;
}

.order-time__number {
  margin-top: 4rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.3;
}

.order-detail {
  min-width: 0;
}

.order-line {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
  min-width: 0;
}

.order-name {
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.status-chip {
  flex-shrink: 0;
  padding: 6rpx 10rpx;
  border-radius: $hej-radius-pill;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
}

.status-chip--pending {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.status-chip--delivered {
  background: $hej-color-delivered-soft;
  color: $hej-color-delivered;
}

.status-chip--cancelled {
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
}

.order-meta {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.35;
}

.order-payment {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.35;
}

.order-note {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.order-amount-wrap {
  display: flex;
  align-items: center;
  max-width: 126rpx;
  min-width: 0;
  padding-top: 2rpx;
  color: $hej-color-text-secondary;
}

.order-amount {
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 700;
  line-height: 1.35;
  text-align: right;
  overflow-wrap: anywhere;
}
</style>
