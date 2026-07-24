<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
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
const deletingCardId = ref<number | null>(null)

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
  if (customerId.value === null || deletingCardId.value !== null) return
  uni.navigateTo({
    url: `/pages/me/customers/open-card?customerId=${customerId.value}&cardId=${card.id}`,
  })
}

function showDeleteError(title: string, content: string): void {
  uni.showModal({ title, content, showCancel: false })
}

async function deleteRecord(card: MealCard): Promise<void> {
  if (deletingCardId.value !== null || card.used_meals > 0) return
  const confirmed = await confirmDialog(
    '删除次卡记录？',
    `将删除 ${card.created_at.slice(0, 10)} 的 ${formatMoney(
      card.amount,
    )} 开卡收入，并减少该客户 ${card.total_meals} 次可用余额。删除后无法恢复。`,
  )
  if (!confirmed) return

  deletingCardId.value = card.id
  try {
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

        <view class="danger-zone" @click.stop>
          <button
            class="delete-button"
            :disabled="deletingCardId !== null || card.used_meals > 0"
            @click.stop="deleteRecord(card)"
          >
            {{
              deletingCardId === card.id
                ? '删除中…'
                : card.used_meals > 0
                  ? '已扣次，不能删除'
                  : '删除记录'
            }}
          </button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
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

.danger-zone {
  margin-top: 18rpx;
  padding-top: 18rpx;
  border-top: 1rpx solid $hej-color-border;
}

.delete-button {
  width: 100%;
  height: 88rpx;
  margin: 0;
  border: 1rpx solid $hej-color-danger;
  border-radius: $hej-radius-md;
  background: $hej-color-danger-soft;
  color: $hej-color-danger;
  font-size: 28rpx;
  line-height: 88rpx;
  text-align: center;
}

.delete-button::after {
  border: 0;
}

.delete-button:active:not([disabled]) {
  opacity: 0.78;
}

.delete-button[disabled] {
  border-color: $hej-color-border;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
  opacity: 1;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}
</style>
