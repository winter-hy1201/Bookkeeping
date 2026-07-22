<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCustomerStore } from '../../stores/customer'
import { useOrderStore } from '../../stores/order'
import type { MealType, Order, OrderStatus } from '../../types/domain'
import { today } from '../../utils/date'
import { addMoney, formatMoney } from '../../utils/format'
import { mealTypeText, orderSubtitle, showToast, statusText } from '../../utils/ui'

const orderStore = useOrderStore()
const customerStore = useCustomerStore()

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

const defaultOpenSections = computed(() =>
  orderSections.value
    .filter((section) => section.orders.length > 0 && !shouldCollapseCompletedLunch(section))
    .map((section) => section.type),
)

function shouldCollapseCompletedLunch(section: OrderSection): boolean {
  return (
    orderStore.currentDate === today() &&
    section.type === 'lunch' &&
    section.orders.length > 0 &&
    section.orders.every((order) => order.status === 'delivered')
  )
}

function sectionTitle(section: OrderSection): string {
  return `${section.title} · ${section.activeCount}单 ${section.quantity}份 ${formatMoney(section.amount)}`
}

function customerName(id: number): string {
  return customerStore.list.find((customer) => customer.id === id)?.name ?? `客户 #${id}`
}

function statusClass(status: OrderStatus): string {
  return `status status--${status}`
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
  listScrollTop.value = event.detail.scrollTop
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
  // （手指在底/顶边缘时原生手势滚动方向与程序化滚屏方向一致，合力而非冲突，不会抖）
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
    // （scrollTop 增大=内容上移=目标应往更高 index 走，此时 startY 要减小）
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
  if (dragState.value || Date.now() < dragClickBlockedUntil.value) return
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
    <view v-else-if="orderStore.list.length === 0" class="empty">该日期暂无订单</view>
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
      <uni-collapse :model-value="defaultOpenSections">
        <uni-collapse-item
          v-for="section in orderSections"
          :key="section.type"
          :name="section.type"
        >
          <template #title>
            <view class="section-title">
              <text class="section-title-text">{{ sectionTitle(section) }}</text>
            </view>
          </template>
          <view v-if="section.orders.length === 0" class="section-empty">
            暂无{{ section.title }}订单
          </view>
          <template v-else>
            <view class="order-list">
              <view
                v-for="(order, index) in section.orders"
                :key="order.id"
                class="order-item"
                :class="{
                  'order-item--dragging': isDragging(order.id),
                  'order-item--saving': dragSaving,
                }"
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
                  <uni-icons type="bars" size="30" color="#8f8f94"></uni-icons>
                </view>
                <view class="order-main">
                  <view class="order-title-row">
                    <text class="order-name">{{ customerName(order.customer_id) }}</text>
                    <text :class="statusClass(order.status)">{{ statusText(order.status) }}</text>
                  </view>
                  <text class="order-meta">
                    {{ orderMetaText(order) }}
                  </text>
                </view>
              </view>
            </view>
          </template>
        </uni-collapse-item>
      </uni-collapse>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
  overflow: hidden;
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
  flex: 1;
  height: 0;
  min-height: 0;
  overscroll-behavior: contain;
}

.order-item,
.section-empty {
  padding: 22rpx 24rpx;
  background: #ffffff;
}

.order-item {
  min-height: 120rpx;
  gap: 18rpx;
}

.order-item--dragging {
  background: #eaf4ff;
  box-shadow: 0 8rpx 24rpx rgba(0, 122, 255, 0.16);
}

.order-item--saving {
  opacity: 0.72;
}

.order-item + .order-item {
  border-top: 1px solid #f0f0f0;
}

.order-list {
  margin: 0 0 16rpx;
  border-radius: 12rpx;
  background: #ffffff;
  overflow: hidden;
}

.section-empty {
  margin: 0 0 16rpx;
  border-radius: 12rpx;
}

.section-title {
  padding: 0 15px;
  height: 48px;
  line-height: 48px;
  box-sizing: border-box;
  color: #1677ff;
  font-weight: 700;
}

.section-title-text {
  font-size: 16px;
  font-weight: inherit;
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-main {
  flex: 1;
  min-width: 0;
}

.drag-handle {
  flex: 0 0 66rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 76rpx;
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
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: normal;
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

.section-empty {
  color: #8f8f94;
  font-size: 26rpx;
  text-align: center;
}
</style>
