<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCustomer } from '../../../api/customers'
import { MealCardReservationConflictError, MealCardTotalTooSmallError } from '../../../api/errors'
import { getCard, listCards, openCard, updateCardTotalMeals } from '../../../api/meal-cards'
import type { Customer, MealCard } from '../../../types/domain'
import { formatDate } from '../../../utils/date'
import { formatMoney, parseMoney } from '../../../utils/format'
import { confirmDialog, showToast, toNumber } from '../../../utils/ui'

interface UniFormsRef {
  validate: (keepItems: string[], callback: (errors: unknown[] | null) => void) => void
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
    validateTrigger: 'blur',
    rules: [{ required: true, errorMessage: '请输入总次数' }],
  },
  amount: {
    validateTrigger: 'blur',
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
      const ok = await confirmDialog(
        '该客户已有 active 次卡',
        `当前 ${activeCardSummary.value.count} 张共剩 ${activeCardSummary.value.remaining}/${activeCardSummary.value.total}，是否继续开新卡？`,
      )
      if (!ok) uni.navigateBack()
    }
  } catch {
    showToast(isEditMode.value ? '充值记录加载失败' : '开卡页面加载失败')
  } finally {
    loading.value = false
  }
}

function onTotalMeals(value: string | number): void {
  form.total_meals = Math.max(minimumTotalMeals.value, Math.floor(toNumber(value)))
}

function validateForm(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!formRef.value) {
      resolve(false)
      return
    }
    formRef.value.validate([], (errors) => resolve(errors === null))
  })
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
  <scroll-view class="page" scroll-y>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!customer" class="empty">客户不存在</view>
    <view v-else-if="isEditMode && !card" class="empty">充值记录不存在</view>
    <template v-else>
      <view class="hero">
        <text class="title">{{ isEditMode ? '修改充值记录' : '开次卡' }}</text>
        <text class="subtitle">{{ customer.name }}</text>
      </view>

      <view v-if="card" class="summary-card">
        <view class="summary-row">
          <text>充值金额</text>
          <text>{{ formatMoney(card.amount) }}</text>
        </view>
        <view class="summary-row">
          <text>充值日期</text>
          <text>{{ formatDate(card.created_at) }}</text>
        </view>
        <view class="summary-row">
          <text>已用次数</text>
          <text>{{ card.used_meals }}</text>
        </view>
        <view class="summary-row">
          <text>当前状态</text>
          <text>{{ card.status === 'active' ? '使用中' : '已用完' }}</text>
        </view>
        <view class="summary-row">
          <text>修改后剩余</text>
          <text class="remaining">{{ remainingMeals }}</text>
        </view>
      </view>

      <uni-forms
        ref="formRef"
        class="form"
        :model-value="form"
        :rules="rules"
        validate-trigger="blur"
        label-width="88"
      >
        <uni-forms-item name="total_meals" label="总次数" required>
          <view class="number-control">
            <uni-number-box
              v-model="form.total_meals"
              class="number-box"
              :min="minimumTotalMeals"
              :max="999"
              :width="72"
              @change="onTotalMeals"
            />
            <text v-if="card" class="field-hint">最少 {{ card.used_meals }} 次</text>
          </view>
        </uni-forms-item>

        <uni-forms-item v-if="!isEditMode" name="amount" label="金额" required>
          <view class="amount-control">
            <text class="amount-prefix">¥</text>
            <uni-easyinput
              v-model="form.amount"
              class="amount-input"
              type="digit"
              inputmode="decimal"
              placeholder="例如 300"
              :clearable="false"
              :input-border="false"
            />
          </view>
        </uni-forms-item>

        <view v-if="card" class="notice">
          仅修改本次充值的总次数，已用次数、充值金额和历史扣次记录不变。
        </view>

        <button class="save" :disabled="!canSave" @click="save">
          {{ saving ? '保存中...' : isEditMode ? '保存修改' : '保存' }}
        </button>
      </uni-forms>
    </template>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
}

.hero {
  padding: 32rpx 24rpx 8rpx;
}

.title,
.subtitle {
  display: block;
}

.title {
  color: #222222;
  font-size: 40rpx;
  font-weight: 700;
}

.subtitle,
.field-hint,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.subtitle {
  margin-top: 8rpx;
}

.summary-card,
.form {
  margin: 24rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
}

.summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 70rpx;
  border-bottom: 1rpx solid #f1f1f1;
  color: #333333;
  font-size: 28rpx;
}

.summary-row:last-child {
  border-bottom: 0;
}

.remaining {
  color: #007aff;
  font-weight: 700;
}

.form {
  display: flex;
  flex-direction: column;
}

.number-control,
.amount-control {
  display: flex;
  align-items: center;
  min-height: 72rpx;
}

.number-box,
.amount-input {
  flex: 1;
}

.field-hint {
  margin-left: 18rpx;
  white-space: nowrap;
}

.amount-control {
  border-bottom: 1rpx solid #e5e5e5;
}

.amount-prefix {
  margin-right: 8rpx;
  color: #333333;
  font-size: 30rpx;
}

.notice {
  margin-top: 8rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: #f2f7ff;
  color: #5b6b7f;
  font-size: 25rpx;
  line-height: 1.6;
}

.save {
  width: 100%;
  margin-top: 28rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}

.empty {
  padding: 120rpx 24rpx;
  text-align: center;
}
</style>
