<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { usePageReturnSnapshot } from '../../composables/usePageReturnSnapshot'
import { useCustomerStore } from '../../stores/customer'
import { useOrderStore } from '../../stores/order'
import type { MealType, Order, OrderStatus } from '../../types/domain'
import { today } from '../../utils/date'
import { addMoney } from '../../utils/format'
import {
  initializeLunchPanelCollapse,
  markLunchPanelManually,
  reconcileLunchPanelCollapse,
  shouldAutoCollapseTodayLunch,
  type LunchPanelCollapseState,
} from '../../utils/order-rules'
import { mealTypeText, orderSubtitle, showToast, statusText } from '../../utils/ui'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0
const hasLoaded = ref(false)
const loadError = ref(false)

interface OrderSection {
  type: MealType
  title: string
  orders: Order[]
  activeCount: number
  quantity: number
  amount: number
}

interface DragState {
  mealType: MealType
  startY: number
  currentIndex: number
  originalIndex: number
  orderId: number
  changed: boolean
}

interface DragIntent {
  mealType: MealType
  index: number
  orderId: number
  startY: number
}

// 激活阈值：触摸移动超过此距离才进入拖拽态（阈值内允许 scroll-view 正常滚屏）
const DRAG_ACTIVATION_PX = 10
// 屏幕顶/底边缘触发自动滚屏的范围（逻辑像素）
const DRAG_EDGE_PX = 64
// 边缘自动滚屏每帧位移（逻辑像素）
const DRAG_EDGE_SPEED = 6

const mealTypes: MealType[] = ['lunch', 'dinner']
const dragOrders = ref<Order[] | null>(null)
const dragState = ref<DragState | null>(null)
const dragIntent = ref<DragIntent | null>(null)
const dragSaving = ref(false)
const dragClickBlockedUntil = ref(0)

// 拖拽期间关闭 scroll-view 滚动能力，绕开「JS 层 preventDefault 在 Android 标准基座不生效」的死结
const listScrollable = ref(true)
// 程序化滚屏驱动；:scroll-top 受控，需配合 onListScroll 同步真实值
const listScrollTop = ref(0)
// 边缘自动滚屏定时器句柄（非响应式）。注意：uni-app app-plus 逻辑层无 DOM API，
// requestAnimationFrame 不可用，必须用 setTimeout（16ms ≈ 60fps）
let edgeScrollTimer: ReturnType<typeof setTimeout> | null = null
let edgeScrollDirection = 0

const dragItemHeightPx = computed(() => {
  try {
    return (uni.getSystemInfoSync().windowWidth / 750) * 132
  } catch {
    return 66
  }
})

const isInitialLoading = computed(() => !hasLoaded.value && !loadError.value)
const isRefreshing = computed(() => orderStore.loading || customerStore.loading)

const formattedCurrentDate = computed(() => {
  if (!orderStore.currentDate) return ''
  const parts = orderStore.currentDate.split('-')
  if (parts.length === 3) {
    return `${parts[0]}年${Number(parts[1])}月${Number(parts[2])}日`
  }
  return orderStore.currentDate
})

const displayedOrders = computed(() => dragOrders.value ?? orderStore.list)
const orderSections = computed<OrderSection[]>(() =>
  mealTypes.map((type) => {
    const orders = displayedOrders.value.filter((order) => order.meal_type === type)
    const activeOrders = orders.filter((order) => order.status !== 'cancelled')

    return {
      type,
      title: mealTypeText(type),
      orders,
      activeCount: activeOrders.length,
      quantity: activeOrders.reduce((total, order) => total + order.quantity, 0),
      amount: activeOrders.reduce((total, order) => addMoney(total, order.amount), 0),
    }
  }),
)

const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  scrollTop: listScrollTop,
  hasContent: () => orderStore.list.length > 0,
})

const defaultOpenSections = computed(() =>
  orderSections.value
    .filter((section) => section.orders.length > 0 && !shouldCollapseCompletedLunch(section))
    .map((section) => section.type),
)
const openSections = ref<MealType[]>([])
const lunchCollapseState = ref<LunchPanelCollapseState>(
  initializeLunchPanelCollapse(false, false),
)
let openSectionsInitialized = false

function isSectionOpen(type: MealType): boolean {
  return openSections.value.includes(type)
}

function resetOpenSections(): void {
  const nextOpenSections = [...defaultOpenSections.value]
  const lunchSection = orderSections.value.find((section) => section.type === 'lunch')
  const allLunchDelivered = lunchSection ? shouldCollapseCompletedLunch(lunchSection) : false
  openSections.value = nextOpenSections
  lunchCollapseState.value = initializeLunchPanelCollapse(
    nextOpenSections.includes('lunch'),
    allLunchDelivered,
  )
  openSectionsInitialized = true
}

function shouldCollapseCompletedLunch(section: OrderSection): boolean {
  return shouldAutoCollapseTodayLunch({
    currentDate: orderStore.currentDate,
    today: today(),
    mealType: section.type,
    orders: section.orders,
  })
}

function syncLunchCollapse(): void {
  const lunchSection = orderSections.value.find((section) => section.type === 'lunch')
  const allLunchDelivered = lunchSection ? shouldCollapseCompletedLunch(lunchSection) : false
  const hasPendingLunch = lunchSection?.orders.some((order) => order.status === 'pending') ?? false
  const previousState = lunchCollapseState.value
  const nextState = reconcileLunchPanelCollapse(
    previousState,
    allLunchDelivered,
    hasPendingLunch,
  )
  lunchCollapseState.value = nextState
  if (nextState.open === previousState.open) return

  if (nextState.open) {
    openSections.value = Array.from(new Set([...openSections.value, 'lunch']))
  } else {
    openSections.value = openSections.value.filter((section) => section !== 'lunch')
  }
}

function onSectionsChange(value: MealType[]): void {
  openSections.value = value
  const lunchOpen = value.includes('lunch')
  if (lunchOpen === lunchCollapseState.value.open) return
  lunchCollapseState.value = markLunchPanelManually(lunchCollapseState.value, lunchOpen)
}

function customerName(id: number): string {
  return customerStore.list.find((customer) => customer.id === id)?.name ?? `客户 #${id}`
}

function statusClass(status: OrderStatus): string {
  return `status-chip--${status}`
}

function orderMetaText(order: Order): string {
  return orderSubtitle(order)
}

function touchY(event: TouchEvent): number | null {
  return event.touches?.[0]?.clientY ?? event.changedTouches?.[0]?.clientY ?? null
}

function clampIndex(value: number, length: number): number {
  return Math.min(Math.max(value, 0), Math.max(length - 1, 0))
}

function moveOrder(items: Order[], from: number, to: number): Order[] {
  const next = [...items]
  const [item] = next.splice(from, 1)
  if (!item) return items
  next.splice(to, 0, item)
  return next
}

function sectionOrders(type: MealType): Order[] {
  return displayedOrders.value.filter((order) => order.meal_type === type)
}

function replaceSectionOrders(type: MealType, orders: Order[]): void {
  let index = 0
  const base = dragOrders.value ?? orderStore.list
  dragOrders.value = base.map((order) => {
    if (order.meal_type !== type) return order
    const next = orders[index]
    index += 1
    return next ?? order
  })
}

function lockScroll(): void {
  listScrollable.value = false
}

function unlockScroll(): void {
  stopEdgeAutoScroll()
  listScrollable.value = true
}

function onListScroll(event: { detail: { scrollTop: number } }): void {
  // :scroll-top 受控模式下必须同步真实滚动位置，否则同值再设不触发
  pageReturn.onScroll(event)
}

function stopEdgeAutoScroll(): void {
  if (edgeScrollTimer != null) {
    clearTimeout(edgeScrollTimer)
    edgeScrollTimer = null
  }
  edgeScrollDirection = 0
}

function applyReorder(state: DragState, y: number): void {
  const orders = sectionOrders(state.mealType)
  const targetIndex = clampIndex(
    state.originalIndex + Math.round((y - state.startY) / dragItemHeightPx.value),
    orders.length,
  )
  if (targetIndex === state.currentIndex) return

  const moved = moveOrder(orders, state.currentIndex, targetIndex)
  replaceSectionOrders(state.mealType, moved)
  dragState.value = {
    ...state,
    currentIndex: targetIndex,
    changed: true,
  }
}

function runEdgeAutoScroll(state: DragState, y: number): void {
  let windowHeight = 0
  try {
    windowHeight = uni.getSystemInfoSync().windowHeight
  } catch {
    windowHeight = 0
  }

  let direction = 0
  if (y < DRAG_EDGE_PX) direction = -1
  else if (windowHeight > 0 && y > windowHeight - DRAG_EDGE_PX) direction = 1

  if (direction === 0) {
    // 不在边缘：停滚屏并恢复锁定（scroll-y=false 防抖）
    stopEdgeAutoScroll()
    listScrollable.value = false
    return
  }
  // 进入边缘区：必须临时打开 scroll-y，否则 scroll-y=false 会连带禁用 :scroll-top 的程序化滚屏
  listScrollable.value = true
  if (edgeScrollDirection === direction && edgeScrollTimer != null) return

  stopEdgeAutoScroll()
  edgeScrollDirection = direction

  const step = (): void => {
    const current = dragState.value
    if (!current || current.orderId !== state.orderId) {
      stopEdgeAutoScroll()
      return
    }
    // 滚屏一帧。scrollTop += direction*speed；要让 targetIndex 跟着滚屏方向前进，需把 startY 反向偏移
    listScrollTop.value += direction * DRAG_EDGE_SPEED
    dragState.value = { ...current, startY: current.startY - direction * DRAG_EDGE_SPEED }
    applyReorder(dragState.value, y)
    edgeScrollTimer = setTimeout(step, 16)
  }
  edgeScrollTimer = setTimeout(step, 16)
}

function onHandleTouchStart(
  event: TouchEvent,
  mealType: MealType,
  index: number,
  orderId: number,
): void {
  const orders = sectionOrders(mealType)
  const startY = touchY(event)
  if (orders.length <= 1 || startY == null || dragSaving.value) return

  dragIntent.value = { mealType, index, orderId, startY }
}

function onHandleTouchMove(event: TouchEvent): void {
  const intent = dragIntent.value
  if (!intent) return
  const y = touchY(event)
  if (y == null) return

  // 已激活：继续重排 + 边缘滚屏
  if (dragState.value) {
    applyReorder(dragState.value, y)
    runEdgeAutoScroll(dragState.value, y)
    return
  }

  // 未激活：跨阈值才正式进入拖拽态（阈值内不锁滚动，允许正常滚屏）
  if (Math.abs(y - intent.startY) < DRAG_ACTIVATION_PX) return

  lockScroll()
  dragOrders.value = [...orderStore.list]
  dragState.value = {
    mealType: intent.mealType,
    startY: intent.startY,
    currentIndex: intent.index,
    originalIndex: intent.index,
    orderId: intent.orderId,
    changed: false,
  }
  applyReorder(dragState.value, y)
  runEdgeAutoScroll(dragState.value, y)
}

async function onHandleTouchEnd(): Promise<void> {
  dragIntent.value = null
  unlockScroll()
  if (dragState.value) {
    await finishDrag()
  }
}

async function finishDrag(): Promise<void> {
  const state = dragState.value
  if (!state || dragSaving.value) return

  dragClickBlockedUntil.value = Date.now() + 350
  if (!state.changed) {
    dragState.value = null
    dragOrders.value = null
    return
  }

  const orderedIds = sectionOrders(state.mealType).map((order) => order.id)
  dragSaving.value = true
  try {
    await orderStore.reorder(orderStore.currentDate, state.mealType, orderedIds)
    showToast('排序已保存')
  } catch {
    showToast('排序保存失败')
    await refresh()
  } finally {
    dragSaving.value = false
    dragState.value = null
    dragOrders.value = null
  }
}

function isDragging(orderId: number): boolean {
  return dragState.value?.orderId === orderId
}

async function refresh(): Promise<boolean> {
  loadError.value = false
  const previousOrders = [...orderStore.list]
  const previousDate = orderStore.currentDate
  const previousCustomers = [...customerStore.list]
  const results = await Promise.allSettled([
    orderStore.refreshForDate(orderStore.currentDate),
    customerStore.refresh(),
  ])
  if (results.some((result) => result.status === 'rejected')) {
    orderStore.$patch({ list: previousOrders, currentDate: previousDate })
    customerStore.$patch({ list: previousCustomers })
    loadError.value = true
    uni.showToast({ title: '订单加载失败', icon: 'none' })
    return false
  }
  hasLoaded.value = true
  if (!openSectionsInitialized) resetOpenSections()
  else syncLunchCollapse()
  return true
}

async function handleDateChange(value: string): Promise<void> {
  const date = value || today()
  try {
    await orderStore.refreshForDate(date)
    resetOpenSections()
  } catch {
    showToast('订单加载失败')
  }
}

function retry(): void {
  void refresh()
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/order/new' })
}

function goDetail(id: number): void {
  if (dragState.value || Date.now() < dragClickBlockedUntil.value) return
  void pageReturn.navigateTo({ url: `/pages/order/detail?id=${id}` })
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>

    <view class="toolbar">
      <uni-datetime-picker
        class="date-picker-wrapper"
        type="date"
        :model-value="orderStore.currentDate"
        :clear-icon="false"
        :border="false"
        @change="handleDateChange"
      >
        <view class="date-selector" hover-class="date-selector--pressed">
          <uni-icons type="calendar" size="20" color="#141413" class="date-selector__icon"></uni-icons>
          <text class="date-selector__text">{{ formattedCurrentDate }}</text>
          <uni-icons type="bottom" size="12" color="#5e5d59" class="date-selector__arrow"></uni-icons>
        </view>
      </uni-datetime-picker>

      <button class="add-button" hover-class="add-button--pressed" @click="goNew">
        + 新建订单
      </button>
    </view>

    <view v-if="isInitialLoading" class="state-card state-card--loading">
      <uni-icons type="refreshempty" size="24" color="inherit"></uni-icons>
      <text class="state-card__title">正在读取订单数据</text>
      <text class="state-card__description">订单和配送状态马上就绪。</text>
    </view>

    <view v-else-if="!hasLoaded && loadError" class="state-card state-card--error">
      <uni-icons type="closeempty" size="24" color="inherit"></uni-icons>
      <text class="state-card__title">订单数据加载失败</text>
      <text class="state-card__description">请检查本地数据库状态后重试，已有数据不会被覆盖。</text>
      <button class="retry-button" :disabled="isRefreshing" @click="retry">
        {{ isRefreshing ? '重新加载中…' : '重新加载' }}
      </button>
    </view>

    <view v-else-if="orderStore.list.length === 0" class="empty-state-wrapper">
      <view class="state-card state-card--empty">
        <view class="empty-icon-box">
          <uni-icons type="list" size="28" color="#87867F"></uni-icons>
        </view>
        <text class="state-card__title">这一天还没有订单</text>
        <text class="state-card__description">录入订单后，会按午餐和晚餐在此分组展示并支持拖拽调整配送顺序。</text>
        <button class="empty-state-action" hover-class="empty-state-action--pressed" @click="goNew">
          新建订单
        </button>
      </view>
    </view>

    <scroll-view
      v-else
      class="list"
      :scroll-y="listScrollable"
      :scroll-top="listScrollTop"
      :scroll-with-animation="false"
      :bounces="false"
      :show-scrollbar="false"
      @scroll="onListScroll"
    >
      <view v-if="loadError" class="inline-error">
        <view class="inline-error__copy">
          <text class="inline-error__title">订单数据刷新失败</text>
          <text class="inline-error__description">当前仍保留上次成功读取的内容。</text>
        </view>
        <button class="retry-button retry-button--small" :disabled="isRefreshing" @click="retry">
          {{ isRefreshing ? '加载中…' : '重新加载' }}
        </button>
      </view>

      <view class="sections-container">
        <uni-collapse v-model="openSections" @change="onSectionsChange">
          <uni-collapse-item
            v-for="section in orderSections"
            :key="section.type"
            :name="section.type"
            :open="isSectionOpen(section.type)"
            :show-arrow="false"
            :border="false"
            :title-border="'none'"
            class="section-card"
          >
            <template #title>
              <view class="section-header" hover-class="section-header--pressed">
                <view class="section-header__left">
                  <uni-icons
                    :type="isSectionOpen(section.type) ? 'bottom' : 'right'"
                    size="16"
                    color="#141413"
                    class="section-header__arrow"
                  ></uni-icons>
                  <text class="section-header__title">{{ section.title }}</text>
                  <text class="section-header__stats">{{ section.activeCount }}单 · {{ section.quantity }}份</text>
                </view>
              </view>
            </template>

            <view v-if="section.orders.length === 0" class="section-empty">
              暂无{{ section.title }}订单
            </view>

            <view v-else class="order-list">
                <view
                  v-for="(order, index) in section.orders"
                  :key="order.id"
                  class="order-item"
                  :class="{
                    'order-item--dragging': isDragging(order.id),
                    'order-item--saving': dragSaving,
                  }"
                  hover-class="order-item--pressed"
                  @click="goDetail(order.id)"
                >
                  <view
                    class="drag-handle"
                    @click.stop
                    @touchstart.stop="onHandleTouchStart($event, section.type, index, order.id)"
                    @touchmove.stop="onHandleTouchMove($event)"
                    @touchend="onHandleTouchEnd"
                    @touchcancel="onHandleTouchEnd"
                  >
                    <view class="drag-handle-icon">
                      <view class="dot-col">
                        <view class="dot"></view>
                        <view class="dot"></view>
                        <view class="dot"></view>
                      </view>
                      <view class="dot-col">
                        <view class="dot"></view>
                        <view class="dot"></view>
                        <view class="dot"></view>
                      </view>
                    </view>
                  </view>

                  <view class="order-main">
                    <view class="order-title-row">
                      <text class="order-name">{{ customerName(order.customer_id) }}</text>
                      <text class="status-chip" :class="statusClass(order.status)">
                        {{ statusText(order.status) }}
                      </text>
                    </view>
                    <text class="order-meta">
                      {{ orderMetaText(order) }}
                    </text>
                  </view>
                </view>
              </view>
            </uni-collapse-item>
        </uni-collapse>
      </view>
      <view class="list-bottom-spacer"></view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
  overflow: hidden;
  font-family: $hej-font-family;
}

.status-bar {
  width: 100%;
  flex-shrink: 0;
  background: $hej-color-canvas;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $hej-space-3 $hej-space-5 $hej-space-3;
  background: $hej-color-canvas;
  flex-shrink: 0;
}

.date-picker-wrapper {
  flex: 1;
  min-width: 0;
}

.date-selector {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
  height: 80rpx;
  box-sizing: border-box;

  &__icon {
    display: flex;
    align-items: center;
  }

  &__text {
    font-size: $hej-font-title;
    font-weight: 700;
    color: $hej-color-text;
    letter-spacing: -0.5rpx;
  }

  &__arrow {
    display: flex;
    align-items: center;
    margin-left: 2rpx;
  }

  &--pressed {
    opacity: 0.72;
  }
}

.add-button {
  flex: 0 0 auto;
  height: 76rpx;
  margin: 0;
  padding: 0 $hej-space-5;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 76rpx;
  text-align: center;
  box-sizing: border-box;
  box-shadow: 0 2rpx 6rpx rgba(201, 100, 66, 0.2);

  &::after {
    border: 0;
  }

  &--pressed {
    opacity: 0.88;
  }

  &:focus-visible {
    outline: 2rpx solid $hej-color-text;
    outline-offset: 2rpx;
  }
}

.list {
  flex: 1;
  height: 0;
  min-height: 0;
  box-sizing: border-box;
  overscroll-behavior: contain;
}

.sections-container {
  padding: 0 $hej-space-5;
  display: flex;
  flex-direction: column;
  gap: $hej-space-4;
}

.section-card {
  margin-bottom: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  overflow: hidden;

  &:last-child {
    margin-bottom: 0;
  }

  :deep(.uni-collapse-item__wrap),
  :deep(.uni-collapse-item__wrap-content),
  :deep(.uni-collapse-item__title-box) {
    background-color: $hej-color-surface !important;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 92rpx;
  padding: 0 $hej-space-5;
  box-sizing: border-box;
  background: $hej-color-surface;

  &__left {
    display: flex;
    align-items: center;
    gap: $hej-space-3;
  }

  &__arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32rpx;
    height: 32rpx;
  }

  &__title {
    font-size: $hej-font-title;
    font-weight: 700;
    color: $hej-color-text;
  }

  &__stats {
    font-size: $hej-font-meta;
    font-weight: 500;
    color: $hej-color-text-secondary;
  }

  &--pressed {
    background: rgba(0, 0, 0, 0.02);
  }
}

.section-empty {
  padding: $hej-space-6 $hej-space-5;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-body;
  text-align: center;
  border-top: 1rpx solid $hej-color-border;
}

.order-list {
  border-top: 1rpx solid $hej-color-border;
}

.order-item {
  display: flex;
  align-items: flex-start;
  min-height: 120rpx;
  padding: $hej-space-4 $hej-space-5;
  gap: $hej-space-3;
  background: $hej-color-surface;
  border-bottom: 1rpx solid $hej-color-border;
  box-sizing: border-box;

  &:last-child {
    border-bottom: 0;
  }

  &--dragging {
    background: $hej-color-accent-soft;
    box-shadow: 0 8rpx 24rpx rgba(201, 100, 66, 0.16);
  }

  &--saving {
    opacity: 0.72;
  }

  &--pressed {
    background: rgba(0, 0, 0, 0.02);
  }
}

.drag-handle {
  flex: 0 0 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  min-height: 76rpx;
  touch-action: none;
}

.drag-handle-icon {
  display: flex;
  flex-direction: row;
  gap: 6rpx;
  align-items: center;
  justify-content: center;
  padding: 8rpx;
}

.dot-col {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.dot {
  width: 6rpx;
  height: 6rpx;
  border-radius: 50%;
  background-color: $hej-color-text-tertiary;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.order-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-2;
}

.order-name {
  font-size: $hej-font-title;
  font-weight: 700;
  color: $hej-color-text;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-meta {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.status-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 14rpx;
  border-radius: $hej-radius-pill;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.4;

  &--pending {
    background: $hej-color-pending-soft;
    color: $hej-color-pending;
  }

  &--delivered {
    background: $hej-color-delivered-soft;
    color: $hej-color-delivered;
  }

  &--cancelled {
    background: $hej-color-warning-soft;
    color: $hej-color-warning;
  }
}

.empty-state-wrapper {
  padding: 0 $hej-space-5;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $hej-space-7 $hej-space-5;
  margin: 0 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  text-align: center;

  &__title {
    margin-top: $hej-space-3;
    font-size: $hej-font-title;
    font-weight: 700;
    color: $hej-color-text;
  }

  &__description {
    margin-top: $hej-space-2;
    font-size: $hej-font-body;
    line-height: 1.6;
    color: $hej-color-text-secondary;
    max-width: 520rpx;
  }

  &--loading {
    color: $hej-color-text-secondary;
    padding: 120rpx $hej-space-5;
  }

  &--error {
    color: $hej-color-danger;
  }

  &--empty {
    margin: 0;
  }
}

.empty-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
}

.empty-state-action {
  height: 80rpx;
  margin: $hej-space-5 0 0;
  padding: 0 $hej-space-6;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;
  box-shadow: 0 2rpx 6rpx rgba(201, 100, 66, 0.2);

  &::after {
    border: 0;
  }

  &--pressed {
    opacity: 0.88;
  }

  &:focus-visible {
    outline: 2rpx solid $hej-color-text;
    outline-offset: 2rpx;
  }
}

.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin: 0 $hej-space-5 $hej-space-4;
  padding: $hej-space-3 $hej-space-4;
  border: 1rpx solid $hej-color-danger-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-danger-soft;

  &__copy {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }

  &__title {
    font-size: $hej-font-body;
    font-weight: 600;
    color: $hej-color-danger;
  }

  &__description {
    font-size: $hej-font-caption;
    color: $hej-color-text-secondary;
  }
}

.retry-button {
  height: 72rpx;
  margin: $hej-space-5 0 0;
  padding: 0 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;

  &::after {
    border: 0;
  }

  &--small {
    margin: 0;
    height: 60rpx;
    padding: 0 $hej-space-3;
    line-height: 60rpx;
    font-size: $hej-font-caption;
    flex-shrink: 0;
  }

  &:focus-visible {
    outline: 2rpx solid $hej-color-text;
    outline-offset: 2rpx;
  }
}

.list-bottom-spacer {
  height: $hej-space-6;
}
</style>
