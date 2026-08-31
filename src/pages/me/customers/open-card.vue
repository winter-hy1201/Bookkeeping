<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import { getCustomer } from '../../../api/customers'
import { MealCardReservationConflictError, MealCardTotalTooSmallError } from '../../../api/errors'
import { getCard, listCards, openCard, updateCardTotalMeals } from '../../../api/meal-cards'
import type { Customer, MealCard } from '../../../types/domain'
import { formatDate } from '../../../utils/date'
import { formatMoney, parseMoney } from '../../../utils/format'
import { confirmDialog, showToast } from '../../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface CardForm {
  total_meals: number
  amount: string
}

const customerId = ref<number | null>(null)
const cardId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const card = ref<MealCard | null>(null)
const activeCards = ref<MealCard[]>([])
const loading = ref(false)
const saving = ref(false)
const formRef = ref<UniFormsRef | null>(null)
const form = reactive<CardForm>({
  total_meals: 20,
  amount: '0',
})

const rules = {
  total_meals: {
    rules: [{ required: true, errorMessage: '请输入总次数' }],
  },
  amount: {
    rules: [{ required: true, errorMessage: '请输入金额' }],
  },
}

const isEditMode = computed(() => cardId.value !== null)
const minimumTotalMeals = computed(() =>
  isEditMode.value ? Math.max(1, card.value?.used_meals ?? 1) : 1,
)
const amountValue = computed(() => parseMoney(form.amount))
const remainingMeals = computed(() => {
  if (!card.value) return form.total_meals
  return form.total_meals - card.value.used_meals
})
const canSave = computed(
  () =>
    customerId.value !== null &&
    customer.value !== null &&
    Number.isInteger(form.total_meals) &&
    form.total_meals >= minimumTotalMeals.value &&
    (isEditMode.value ? card.value !== null : amountValue.value >= 0) &&
    !saving.value,
)
const activeCardSummary = computed(() => {
  const total = activeCards.value.reduce((sum, item) => sum + item.total_meals, 0)
  const used = activeCards.value.reduce((sum, item) => sum + item.used_meals, 0)
  return {
    count: activeCards.value.length,
    total,
    remaining: total - used,
  }
})

function stepMeals(delta: number): void {
  const next = form.total_meals + delta
  if (next >= minimumTotalMeals.value && next <= 999) {
    form.total_meals = next
  }
}

async function load(id: number, editingCardId: number | null): Promise<void> {
  customerId.value = id
  cardId.value = editingCardId
  loading.value = true
  try {
    customer.value = await getCustomer(id)
    if (!customer.value) return

    if (editingCardId !== null) {
      uni.setNavigationBarTitle({ title: '修改充值记录' })
      const result = await getCard(editingCardId)
      if (!result || result.customer_id !== id) {
        card.value = null
        return
      }
      card.value = result
      form.total_meals = result.total_meals
      form.amount = String(result.amount)
      return
    }

    activeCards.value = (await listCards(id)).filter((item) => item.status === 'active')
    if (activeCardSummary.value.count > 0) {
      const confirmed = await confirmDialog(
        '该客户已有 active 次卡',
        `当前 ${activeCardSummary.value.count} 张共剩 ${activeCardSummary.value.remaining}/${activeCardSummary.value.total} 次，是否继续开新卡？`,
      )
      if (!confirmed) uni.navigateBack()
    }
  } catch {
    showToast(isEditMode.value ? '充值记录加载失败' : '开卡页面加载失败')
  } finally {
    loading.value = false
  }
}

async function validateForm(): Promise<boolean> {
  if (!formRef.value) return true
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

async function save(): Promise<void> {
  if (!canSave.value || customerId.value === null) return
  if (!(await validateForm())) return

  saving.value = true
  try {
    if (isEditMode.value && cardId.value !== null) {
      const updated = await updateCardTotalMeals(cardId.value, {
        total_meals: form.total_meals,
      })
      if (!updated) {
        showToast('充值记录不存在')
        return
      }
      showToast('总次数已修改')
    } else {
      await openCard({
        customer_id: customerId.value,
        total_meals: form.total_meals,
        amount: amountValue.value,
      })
      showToast('开卡成功')
    }
    uni.navigateBack()
  } catch (error) {
    if (error instanceof MealCardTotalTooSmallError) {
      showToast(`总次数不能小于已用次数 ${error.usedMeals}`)
    } else if (error instanceof MealCardReservationConflictError) {
      showToast(error.message)
    } else {
      showToast(isEditMode.value ? '修改失败' : '开卡失败')
    }
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.customerId)
  const rawCardId = query?.cardId
  const editingCardId = rawCardId == null || rawCardId === '' ? null : Number(rawCardId)
  if (
    Number.isFinite(id) &&
    id > 0 &&
    (editingCardId === null || (Number.isFinite(editingCardId) && editingCardId > 0))
  ) {
    void load(id, editingCardId)
  } else {
    showToast('客户或充值记录参数无效')
  }
})
</script>

<template>
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <view v-if="loading" class="state-card">
        <text class="state-title">正在读取客户次卡…</text>
      </view>
      <view v-else-if="!customer" class="state-card">
        <text class="state-title">客户不存在</text>
      </view>
      <view v-else-if="isEditMode && !card" class="state-card">
        <text class="state-title">充值记录不存在</text>
      </view>
      <template v-else>
        <!-- Form Area with uni-forms -->
        <uni-forms
          ref="formRef"
          class="form"
          :model-value="form"
          :rules="rules"
          validate-trigger="blur"
        >
          <!-- Customer Info Card -->
          <view class="card-panel customer-panel">
            <text class="panel-label">客户</text>
            <text class="customer-name">{{ customer.name }}</text>
          </view>

          <!-- Edit Mode: Card Details Read-only Summary -->
          <view v-if="card" class="card-panel summary-panel">
            <view class="summary-row">
              <text class="summary-label">充值金额</text>
              <text class="summary-value">{{ formatMoney(card.amount) }}</text>
            </view>
            <view class="summary-row">
              <text class="summary-label">充值日期</text>
              <text class="summary-value">{{ formatDate(card.created_at) }}</text>
            </view>
            <view class="summary-row">
              <text class="summary-label">已用次数</text>
              <text class="summary-value">{{ card.used_meals }} 次</text>
            </view>
            <view class="summary-row">
              <text class="summary-label">当前状态</text>
              <view class="status-tag" :class="card.status">
                <text class="status-tag-text">{{
                  card.status === 'active' ? '使用中' : '已用完'
                }}</text>
              </view>
            </view>
            <view class="summary-row summary-row--highlight">
              <text class="summary-label">修改后剩余</text>
              <text class="summary-value remaining-value">{{ remainingMeals }} 次</text>
            </view>
          </view>

          <!-- Total Meals Section -->
          <view class="card-panel stepper-panel">
            <text class="panel-label">总次数</text>
            <uni-forms-item name="total_meals">
              <view class="stepper-card-box">
                <button
                  class="stepper-btn stepper-btn--minus"
                  :disabled="form.total_meals <= minimumTotalMeals"
                  @click="stepMeals(-1)"
                >
                  <HejiIcon name="Minus" :size="18" />
                </button>
                <view class="stepper-display">
                  <text class="stepper-number">{{ form.total_meals }}</text>
                </view>
                <button
                  class="stepper-btn stepper-btn--plus"
                  :disabled="form.total_meals >= 999"
                  @click="stepMeals(1)"
                >
                  <HejiIcon name="Plus" :size="18" />
                </button>
              </view>
            </uni-forms-item>
            <text v-if="card" class="stepper-hint">最少 {{ card.used_meals }} 次</text>
            <text v-else class="stepper-hint">默认 20 次</text>
          </view>

          <!-- Amount Section (Only in Open Card Mode) -->
          <view v-if="!isEditMode" class="card-panel amount-panel">
            <text class="panel-label">金额</text>
            <uni-forms-item name="amount">
              <view class="amount-input-box">
                <text class="amount-prefix">¥</text>
                <uni-easyinput
                  v-model="form.amount"
                  class="amount-input"
                  type="digit"
                  inputmode="decimal"
                  placeholder="0.00"
                  :clearable="false"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>
            <view v-if="activeCardSummary.count > 0" class="info-banner">
              <HejiIcon class="info-icon" name="Info" :size="16" />
              <text class="info-text">
                当前可用 {{ activeCardSummary.remaining }} 次，开卡后余额将合并统计
              </text>
            </view>
          </view>

          <!-- Edit Mode Notice -->
          <view v-if="card" class="notice-panel">
            <text class="notice-text"
              >仅修改本次充值的总次数，已用次数、充值金额和历史扣次记录不变。</text
            >
          </view>
        </uni-forms>

        <view class="form-scroll-spacer" />
      </template>
    </scroll-view>

    <!-- Fixed Bottom Confirm Bar -->
    <view v-if="customer && (!isEditMode || card)" class="submit-bar">
      <view class="submit-summary">
        <template v-if="!isEditMode">
          <view class="summary-metric">
            <HejiIcon class="metric-icon" name="Ticket" :size="18" />
            <text class="metric-text"
              >本次增加 <text class="metric-emphasis">{{ form.total_meals }}</text> 次</text
            >
          </view>
          <view class="summary-metric-divider" />
          <view class="summary-metric">
            <HejiIcon class="metric-icon" name="WalletCards" :size="18" />
            <text class="metric-text"
              >入账 <text class="metric-emphasis">{{ formatMoney(amountValue) }}</text></text
            >
          </view>
        </template>
        <template v-else>
          <view class="summary-metric">
            <text class="metric-text"
              >已用 <text class="metric-emphasis">{{ card?.used_meals }}</text> 次</text
            >
          </view>
          <view class="summary-metric-divider" />
          <view class="summary-metric">
            <text class="metric-text"
              >修改后剩余 <text class="metric-emphasis">{{ remainingMeals }}</text> 次</text
            >
          </view>
        </template>
      </view>
      <button class="save-btn" :disabled="!canSave || saving" @click="save">
        {{ saving ? '保存中…' : isEditMode ? '保存修改' : '确认开卡' }}
      </button>
    </view>
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
  padding: $hej-space-3 $hej-space-3 0;
}

.form-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.card-panel {
  margin-bottom: $hej-space-3;
  padding: $hej-space-4;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.panel-label {
  display: block;
  margin-bottom: $hej-space-3;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  font-weight: 500;
}

.customer-panel .customer-name {
  display: block;
  color: $hej-color-text;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.3;
}

.form :deep(.uni-forms-item) {
  margin-bottom: 0;
  padding: 0;
}

.form :deep(.uni-forms-item__label) {
  display: none !important;
}

.form :deep(.uni-forms-item__content) {
  min-width: 0;
}

/* Stepper Card */
.stepper-card-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $hej-space-2;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-canvas;
}

.stepper-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 108rpx;
  height: 84rpx;
  margin: 0;
  padding: 0;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text;
  font-size: 44rpx;
  line-height: 84rpx;
  text-align: center;
}

.stepper-btn::after {
  border: 0;
}

.stepper-btn:active:not([disabled]) {
  background: $hej-color-surface-subtle;
}

.stepper-btn[disabled] {
  opacity: 0.35;
}

.stepper-display {
  flex: 1;
  text-align: center;
}

.stepper-number {
  color: $hej-color-text;
  font-size: 52rpx;
  font-weight: 700;
}

.stepper-hint {
  display: block;
  margin-top: $hej-space-3;
  text-align: center;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

/* Amount Card */
.amount-input-box {
  display: flex;
  align-items: center;
  min-height: 88rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-canvas;
}

.amount-prefix {
  margin-right: $hej-space-2;
  color: $hej-color-text;
  font-size: 40rpx;
  font-weight: 700;
}

.amount-input {
  flex: 1;
}

.amount-input :deep(.uni-easyinput__content) {
  background-color: transparent !important;
}

.amount-input :deep(.uni-easyinput__content-input) {
  color: $hej-color-text !important;
  font-size: 40rpx !important;
  font-weight: 700 !important;
  height: 88rpx !important;
  line-height: 88rpx !important;
}

/* Info Banner */
.info-banner {
  display: flex;
  align-items: center;
  margin-top: $hej-space-3;
  padding: $hej-space-3;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.info-icon {
  margin-right: $hej-space-2;
  font-size: $hej-font-caption;
}

.info-text {
  flex: 1;
}

/* Summary Panel for Edit Mode */
.summary-panel {
  display: flex;
  flex-direction: column;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64rpx;
  border-bottom: 1rpx solid $hej-color-border;
  color: $hej-color-text;
  font-size: $hej-font-body;
}

.summary-row:last-child {
  border-bottom: 0;
}

.summary-row--highlight {
  padding-top: $hej-space-2;
}

.summary-label {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.summary-value {
  font-size: $hej-font-body;
  font-weight: 500;
}

.remaining-value {
  color: $hej-color-accent;
  font-size: 32rpx;
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

/* Notice Panel */
.notice-panel {
  margin-top: $hej-space-1;
  padding: $hej-space-3;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
}

.notice-text {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.form-scroll-spacer {
  height: 48rpx;
}

/* Submit Bar */
.submit-bar {
  display: flex;
  flex-direction: column;
  padding: $hej-space-3 $hej-space-4 calc($hej-space-4 + env(safe-area-inset-bottom));
  margin: 0 (-$hej-space-3);
  border-top: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.submit-summary {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-bottom: $hej-space-3;
  padding: $hej-space-2 0;
}

.summary-metric {
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-icon {
  margin-right: $hej-space-1;
  font-size: 28rpx;
}

.metric-text {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.metric-emphasis {
  color: $hej-color-accent;
  font-size: 30rpx;
  font-weight: 700;
  margin: 0 4rpx;
}

.summary-metric-divider {
  width: 1rpx;
  height: 32rpx;
  background: $hej-color-border;
}

.save-btn {
  width: 100%;
  height: 88rpx;
  margin: 0;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
}

.save-btn::after {
  border: 0;
}

.save-btn:active:not([disabled]) {
  opacity: 0.85;
}

.save-btn[disabled] {
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
  opacity: 1;
}

.state-card {
  margin: 40rpx 0;
  padding: 80rpx 32rpx;
  text-align: center;
  background: $hej-color-surface;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
}

.state-title {
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}
</style>
