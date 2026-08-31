<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import { getCustomer } from '../../../api/customers'
import {
  MealCardAlreadyUsedError,
  MealCardDeleteIntegrityError,
  MealCardReservationConflictError,
} from '../../../api/errors'
import { deleteCard, listCards } from '../../../api/meal-cards'
import type { Customer, MealCard } from '../../../types/domain'
import { formatDate } from '../../../utils/date'
import { formatMoney } from '../../../utils/format'
import { confirmDialog, showToast } from '../../../utils/ui'

const customerId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const cards = ref<MealCard[]>([])
const loading = ref(false)
const operatingCardId = ref<number | null>(null)
const deletingCardId = ref<number | null>(null)
const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  hasContent: () => cards.value.length > 0,
})

function remainingMeals(card: MealCard): number {
  return card.total_meals - card.used_meals
}

function cardStatusText(card: MealCard): string {
  return card.status === 'active' ? '使用中' : '已用完'
}

async function refresh(): Promise<boolean> {
  if (customerId.value === null) return false
  loading.value = true
  try {
    const [customerResult, cardResult] = await Promise.all([
      getCustomer(customerId.value),
      listCards(customerId.value),
    ])
    customer.value = customerResult
    cards.value = cardResult
    return true
  } catch {
    showToast('充值记录加载失败')
    return false
  } finally {
    loading.value = false
  }
}

function goEdit(card: MealCard): void {
  if (customerId.value === null || operatingCardId.value !== null) return
  void pageReturn.navigateTo({
    url: `/pages/me/customers/open-card?customerId=${customerId.value}&cardId=${card.id}`,
  })
}

function goOpenCard(): void {
  if (customerId.value === null) return
  void pageReturn.navigateTo({
    url: `/pages/me/customers/open-card?customerId=${customerId.value}`,
  })
}

function showDeleteError(title: string, content: string): void {
  uni.showModal({ title, content, showCancel: false })
}

async function deleteRecord(card: MealCard): Promise<void> {
  if (operatingCardId.value !== null || card.used_meals > 0) return
  operatingCardId.value = card.id
  try {
    const confirmed = await confirmDialog(
      '删除次卡记录？',
      `将删除 ${formatDate(card.created_at)} 的 ${formatMoney(
        card.amount,
      )} 开卡收入，并减少该客户 ${card.total_meals} 次可用余额。删除后无法恢复。`,
    )
    if (!confirmed) return

    deletingCardId.value = card.id
    const deleted = await deleteCard(card.id)
    if (!deleted) {
      showToast('次卡记录不存在')
      await refresh()
      return
    }
    await refresh()
    showToast('次卡记录已删除')
  } catch (error) {
    if (error instanceof MealCardAlreadyUsedError) {
      showDeleteError('不能删除次卡记录', error.message)
    } else if (error instanceof MealCardReservationConflictError) {
      showDeleteError(
        '不能删除次卡记录',
        `删除后剩余 ${error.remainingAfterChange} 次，但待配送订单已预占 ${error.reservedMeals} 次。请先修改或删除相关待配送订单。`,
      )
    } else if (error instanceof MealCardDeleteIntegrityError) {
      showDeleteError('不能删除次卡记录', error.message)
    } else {
      showToast('次卡记录删除失败')
    }
  } finally {
    deletingCardId.value = null
    operatingCardId.value = null
  }
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
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <scroll-view
      class="records-scroll"
      scroll-y
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view class="hero">
        <text class="hero-title">次卡充值记录</text>
        <text class="hero-subtitle"
          >{{ customer?.name ?? '客户' }} · 共 {{ cards.length }} 笔</text
        >
      </view>

      <view v-if="loading" class="state-card">
        <text class="state-title">正在读取充值记录…</text>
      </view>
      <view v-else-if="!customer" class="state-card">
        <text class="state-title">客户不存在</text>
      </view>
      <view v-else-if="cards.length === 0" class="state-card empty-card">
        <HejiIcon class="empty-icon" name="Ticket" :size="40" />
        <text class="state-title">暂无充值记录</text>
        <text class="state-desc">为客户开通次卡后，充值记录将展示在这里</text>
        <button class="open-card-btn" @click="goOpenCard">开通次卡</button>
      </view>
      <view v-else class="records-list">
        <view v-for="card in cards" :key="card.id" class="record-card">
          <!-- Card Header -->
          <view class="record-head">
            <text class="record-amount">{{ formatMoney(card.amount) }}</text>
            <view class="status-tag" :class="card.status">
              <text class="status-tag-text">{{ cardStatusText(card) }}</text>
            </view>
          </view>

          <!-- Date Subhead -->
          <view class="record-date-row">
            <view class="record-date">
              <HejiIcon name="CalendarDays" :size="16" />
              <text>{{ formatDate(card.created_at) }}</text>
            </view>
          </view>

          <view class="card-divider" />

          <!-- Metrics Row (3 Equal Columns) -->
          <view class="metrics-row">
            <view class="metric-col">
              <text class="metric-label">总次数</text>
              <text class="metric-num">{{ card.total_meals }}</text>
            </view>
            <view class="metric-col-divider" />
            <view class="metric-col">
              <text class="metric-label">已用</text>
              <text class="metric-num">{{ card.used_meals }}</text>
            </view>
            <view class="metric-col-divider" />
            <view class="metric-col">
              <text class="metric-label">剩余</text>
              <text class="metric-num metric-num--accent">{{ remainingMeals(card) }}</text>
            </view>
          </view>

          <view class="card-divider" />

          <!-- Footer Action Row -->
          <view class="record-footer">
            <view class="record-id">
              <HejiIcon name="FileText" :size="16" />
              <text>记录 #{{ card.id }}</text>
            </view>
            <button class="edit-link-btn" @click="goEdit(card)">
              <text class="edit-link-text">修改总次数</text>
              <HejiIcon class="edit-link-arrow" name="ChevronRight" :size="16" />
            </button>
          </view>

          <!-- Danger / Delete Zone -->
          <view class="danger-zone">
            <view v-if="card.used_meals > 0" class="delete-disabled-box">
              <HejiIcon class="delete-disabled-icon" name="Ban" :size="16" />
              <text class="delete-disabled-text">已有扣次，不能删除</text>
            </view>
            <button
              v-else
              class="delete-btn"
              :disabled="operatingCardId !== null"
              @click="deleteRecord(card)"
            >
              <template v-if="deletingCardId === card.id">删除中…</template>
              <template v-else-if="operatingCardId === card.id">等待确认…</template>
              <template v-else>
                <HejiIcon name="Trash2" :size="18" />
                <text>删除这笔记录</text>
              </template>
            </button>
          </view>
        </view>
      </view>

      <view class="scroll-spacer" />
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.records-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
  padding: $hej-space-3;
  box-sizing: border-box;
}

.hero {
  padding: $hej-space-2 $hej-space-1 $hej-space-4;
}

.hero-title {
  display: block;
  color: $hej-color-text;
  font-size: 40rpx;
  font-weight: 700;
  letter-spacing: -0.5rpx;
}

.hero-subtitle {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.record-card {
  padding: $hej-space-4;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-amount {
  color: $hej-color-text;
  font-size: 38rpx;
  font-weight: 700;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.status-tag.active {
  background: $hej-color-delivered-soft;
}

.status-tag.active .status-tag-text {
  color: $hej-color-delivered;
}

.status-tag.depleted {
  background: $hej-color-surface-subtle;
}

.status-tag.depleted .status-tag-text {
  color: $hej-color-text-tertiary;
}

.status-tag-text {
  font-size: $hej-font-caption;
  font-weight: 500;
}

.record-date-row {
  margin-top: $hej-space-1;
}

.record-date {
  display: inline-flex;
  align-items: center;
  gap: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.card-divider {
  height: 1rpx;
  margin: $hej-space-3 0;
  border-top: 1rpx dashed $hej-color-border;
}

.metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: $hej-space-1 0;
}

.metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.metric-label {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.metric-num {
  margin-top: $hej-space-1;
  color: $hej-color-text;
  font-size: 36rpx;
  font-weight: 700;
}

.metric-num--accent {
  color: $hej-color-accent;
}

.metric-col-divider {
  width: 1rpx;
  height: 48rpx;
  background: $hej-color-border;
}

.record-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.record-id {
  display: inline-flex;
  align-items: center;
  gap: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.edit-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  height: 48rpx;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 500;
  line-height: 48rpx;
  text-align: right;
}

.edit-link-btn::after {
  border: 0;
}

.edit-link-text {
  color: $hej-color-accent;
}

.edit-link-arrow {
  color: $hej-color-accent;
}

.danger-zone {
  margin-top: $hej-space-3;
  padding-top: $hej-space-3;
  border-top: 1rpx solid $hej-color-border;
}

.delete-disabled-box {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 72rpx;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.delete-disabled-icon {
  margin-right: $hej-space-1;
}

.delete-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-2;
  width: 100%;
  height: 88rpx;
  margin: 0;
  border: 1rpx solid $hej-color-danger;
  border-radius: $hej-radius-control;
  background: $hej-color-danger-soft;
  color: $hej-color-danger;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
}

.delete-btn::after {
  border: 0;
}

.delete-btn:active:not([disabled]) {
  opacity: 0.75;
}

.delete-btn[disabled] {
  opacity: 0.5;
}

.state-card {
  margin: 40rpx 0;
  padding: 80rpx 32rpx;
  text-align: center;
  background: $hej-color-surface;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  margin-bottom: $hej-space-2;
  color: $hej-color-accent;
}

.state-title {
  display: block;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}

.state-desc {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.open-card-btn {
  margin-top: $hej-space-4;
  height: 88rpx;
  padding: 0 48rpx;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
}

.open-card-btn::after {
  border: 0;
}

.scroll-spacer {
  height: 48rpx;
}
</style>
