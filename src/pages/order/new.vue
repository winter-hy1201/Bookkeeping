<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CustomerPicker from '../../components/CustomerPicker.vue'
import AmountInput from '../../components/AmountInput.vue'
import { listCards } from '../../api/meal-cards'
import { useOrderStore } from '../../stores/order'
import type { Customer, MealCard, MealType, PaymentMethod } from '../../types/domain'
import { tomorrow } from '../../utils/date'
import { formatMoney } from '../../utils/format'
import { customerPrice, priceHint, showToast, toNumber } from '../../utils/ui'

const orderStore = useOrderStore()

const selectedCustomer = ref<Customer | null>(null)
const orderDate = ref(tomorrow())
const mealType = ref<MealType>('lunch')
const quantity = ref(1)
const actualPrice = ref(0)
const paymentMethod = ref<PaymentMethod>('wechat')
const activeCards = ref<MealCard[]>([])
const note = ref('')
const saving = ref(false)
const userEditedPrice = ref(false)
const mealTypeOptions = [
  { text: '午餐', value: 'lunch' },
  { text: '晚餐', value: 'dinner' },
]
const paymentOptions = [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
  { text: '次卡', value: 'meal_card' },
]

const isMealCard = computed(() => paymentMethod.value === 'meal_card')
const totalAmount = computed(() => (isMealCard.value ? 0 : actualPrice.value * quantity.value))
const selectedMealCard = computed(() => activeCards.value[0] ?? null)
const activeCardSummary = computed(() => {
  const totalMeals = activeCards.value.reduce((sum, card) => sum + card.total_meals, 0)
  const usedMeals = activeCards.value.reduce((sum, card) => sum + card.used_meals, 0)
  return {
    count: activeCards.value.length,
    totalMeals,
    usedMeals,
    remainingMeals: totalMeals - usedMeals,
  }
})
const canSave = computed(() => {
  if (
    !selectedCustomer.value ||
    !orderDate.value ||
    !mealType.value ||
    quantity.value <= 0 ||
    saving.value
  )
    return false
  if (isMealCard.value) return selectedMealCard.value !== null
  return actualPrice.value >= 0
})

watch([selectedCustomer, mealType], () => {
  userEditedPrice.value = false
  const price = customerPrice(selectedCustomer.value, mealType.value)
  actualPrice.value = price ?? 0
  if (paymentMethod.value === 'meal_card') {
    void loadActiveCard()
  }
})

watch(paymentMethod, async (value) => {
  if (value !== 'meal_card') {
    activeCards.value = []
    const price = customerPrice(selectedCustomer.value, mealType.value)
    if (!userEditedPrice.value) actualPrice.value = price ?? 0
    return
  }
  await loadActiveCard()
})

async function loadActiveCard(): Promise<void> {
  if (!selectedCustomer.value) {
    paymentMethod.value = 'wechat'
    showToast('请先选择客户')
    return
  }
  try {
    activeCards.value = (await listCards(selectedCustomer.value.id)).filter(
      (card) => card.status === 'active',
    )
    if (activeCards.value.length === 0) {
      paymentMethod.value = 'wechat'
      showToast('该客户无可用次卡')
    }
  } catch {
    paymentMethod.value = 'wechat'
    showToast('次卡加载失败')
  }
}

function onQuantityChange(value: string | number): void {
  quantity.value = Math.max(1, Math.floor(toNumber(value)))
}

function onPriceChange(value: number): void {
  userEditedPrice.value = true
  actualPrice.value = value
}

function goCreateCustomer(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

async function save(): Promise<void> {
  if (!canSave.value || !selectedCustomer.value) return
  saving.value = true
  try {
    const card = selectedMealCard.value
    const mealCardUnitPrice = card ? card.amount / card.total_meals : undefined
    await orderStore.create({
      customer_id: selectedCustomer.value.id,
      order_date: orderDate.value,
      meal_type: mealType.value,
      quantity: quantity.value,
      payment_method: paymentMethod.value,
      unit_price: isMealCard.value ? mealCardUnitPrice : actualPrice.value,
      amount: isMealCard.value ? 0 : totalAmount.value,
      meal_card_id: isMealCard.value ? (card?.id ?? null) : null,
      note: note.value.trim() || null,
    })
    showToast('保存成功')
    uni.navigateBack()
  } catch {
    showToast('订单保存失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="form">
      <CustomerPicker v-model="selectedCustomer" show-create @create="goCreateCustomer" />

      <view class="field">
        <text class="label">日期</text>
        <uni-datetime-picker v-model="orderDate" class="date-picker" type="date" />
      </view>

      <view class="field">
        <text class="label">餐次</text>
        <uni-data-checkbox
          v-model="mealType"
          class="segmented"
          mode="button"
          :localdata="mealTypeOptions"
          selected-color="#007aff"
        />
      </view>

      <view class="field">
        <text class="label">份数</text>
        <uni-number-box
          v-model="quantity"
          class="number-box"
          :min="1"
          :max="99"
          :width="72"
          @change="onQuantityChange"
        />
      </view>

      <view v-if="!isMealCard" class="hint">{{ priceHint(selectedCustomer, mealType) }}</view>
      <AmountInput
        v-if="!isMealCard"
        :model-value="actualPrice"
        label="实际价"
        placeholder="请填单价"
        @update:model-value="onPriceChange"
      />

      <view class="field">
        <text class="label">支付</text>
        <uni-data-checkbox
          v-model="paymentMethod"
          class="payment-grid"
          mode="button"
          :localdata="paymentOptions"
          selected-color="#007aff"
        />
      </view>

      <view v-if="isMealCard && selectedMealCard" class="card-box">
        <text>
          次卡共剩 {{ activeCardSummary.remainingMeals }}/{{ activeCardSummary.totalMeals }}
        </text>
        <text class="card-meta">
          当前 {{ activeCardSummary.count }} 张 active 次卡，本单优先使用 #{{
            selectedMealCard.id
          }}，次均 {{ formatMoney(selectedMealCard.amount / selectedMealCard.total_meals) }}
        </text>
      </view>

      <view class="field field--top">
        <text class="label">备注</text>
        <uni-easyinput
          v-model="note"
          class="textarea"
          type="textarea"
          placeholder="可不填"
          :input-border="false"
        />
      </view>

      <view class="total-row">
        <text>合计</text>
        <text>{{ isMealCard ? '次卡支付，订单金额记 0' : formatMoney(totalAmount) }}</text>
      </view>

      <button class="save" :disabled="!canSave" @click="save">保存</button>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
}

.nav,
.field,
.total-row {
  display: flex;
  align-items: center;
}

.nav {
  justify-content: space-between;
  padding: 24rpx;
  background: #ffffff;
}

.back {
  color: #222222;
  font-size: 34rpx;
  font-weight: 700;
}

.save {
  margin: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 28rpx;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
}

.field {
  min-height: 88rpx;
}

.field--top {
  align-items: flex-start;
}

.label {
  flex: 0 0 140rpx;
  color: #333333;
  font-size: 28rpx;
}

.segmented,
.payment-grid {
  flex: 1;
  color: #333333;
  font-size: 28rpx;
}

.date-picker,
.number-box,
.textarea {
  flex: 1;
}

.textarea {
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.textarea {
  min-height: 160rpx;
}

.hint {
  color: #8f8f94;
  font-size: 24rpx;
}

.total-row,
.card-box {
  justify-content: space-between;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
  color: #222222;
  font-size: 30rpx;
  font-weight: 600;
}

.card-meta {
  display: block;
  margin-top: 10rpx;
  color: #8f8f94;
  font-size: 24rpx;
  font-weight: 400;
}
</style>
