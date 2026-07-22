<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import CustomerPicker from '../../components/CustomerPicker.vue'
import {
  DeliveredOrderConflictError,
  InsufficientCardError,
  LegacyOrderConflictError,
  OrderPaymentConflictError,
  OrderPriceConfirmationError,
} from '../../api/errors'
import { findEffectiveOrder, getMealCardAvailability } from '../../api/orders'
import { useOrderStore } from '../../stores/order'
import type { MealCardAvailabilityResult } from '../../types/api'
import type { Customer, MealType, Order, PaymentMethod } from '../../types/domain'
import { tomorrow } from '../../utils/date'
import { formatMoney, multiplyMoney, parseMoney, roundMoney } from '../../utils/format'
import type { OrderPaymentMode } from '../../utils/order-rules'
import {
  confirmDialog,
  customerPrice,
  orderPaymentSummary,
  priceHint,
  showToast,
  toNumber,
} from '../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface OrderForm {
  customer_id: number | ''
  order_date: string
  meal_type: MealType
  quantity: number
  payment_mode: OrderPaymentMode
  money_method: Exclude<PaymentMethod, 'meal_card'>
  meal_card_quantity: string
  actual_price: string
  note: string
}

const orderStore = useOrderStore()
const formRef = ref<UniFormsRef | null>(null)
const selectedCustomer = ref<Customer | null>(null)
const existingOrder = ref<Order | null>(null)
const availability = ref<MealCardAvailabilityResult | null>(null)
const contextLoading = ref(false)
const contextReady = ref(false)
const contextError = ref('')
const saving = ref(false)
const userEditedPrice = ref(false)
let contextVersion = 0

const form = reactive<OrderForm>({
  customer_id: '',
  order_date: tomorrow(),
  meal_type: 'lunch',
  quantity: 1,
  payment_mode: 'wechat',
  money_method: 'wechat',
  meal_card_quantity: '',
  actual_price: '',
  note: '',
})

const rules = {
  customer_id: {
    rules: [{ required: true, errorMessage: '请选择客户' }],
  },
  order_date: {
    rules: [{ required: true, errorMessage: '请选择日期' }],
  },
  meal_type: {
    rules: [{ required: true, errorMessage: '请选择餐次' }],
  },
  quantity: {
    rules: [{ required: true, errorMessage: '请输入本次新增份数' }],
  },
  payment_mode: {
    rules: [{ required: true, errorMessage: '请选择支付方式' }],
  },
  money_method: {
    rules: [{ required: true, errorMessage: '请选择补款方式' }],
  },
  meal_card_quantity: {
    rules: [{ required: true, errorMessage: '请输入次卡次数' }],
  },
  actual_price: {
    rules: [{ required: true, errorMessage: '请输入实际单价' }],
  },
}

const mealTypeOptions = [
  { text: '午餐', value: 'lunch' },
  { text: '晚餐', value: 'dinner' },
]
const paymentOptions = computed(() => [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
  { text: '次卡', value: 'meal_card' },
  { text: '组合支付', value: 'mixed', disabled: form.quantity <= 1 },
])
const moneyMethodOptions = [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
]

const isMixed = computed(() => form.payment_mode === 'mixed')
const hasMoney = computed(() => form.payment_mode !== 'meal_card')
const actualPrice = computed(() => roundMoney(parseMoney(form.actual_price)))
const mixedCardQuantity = computed(() => {
  const value = Number(form.meal_card_quantity)
  return Number.isInteger(value) && value > 0 ? value : 0
})
const cardQuantity = computed(() => {
  if (form.payment_mode === 'meal_card') return form.quantity
  if (form.payment_mode === 'mixed') return mixedCardQuantity.value
  return 0
})
const requiredCardQuantity = computed(
  () =>
    cardQuantity.value +
    (existingOrder.value?.status === 'pending' ? existingOrder.value.meal_card_quantity : 0),
)
const cardRequirementLabel = computed(() =>
  existingOrder.value?.status === 'pending' ? '合并后订单需要' : '订单需要',
)
const moneyQuantity = computed(() => Math.max(0, form.quantity - cardQuantity.value))
const totalAmount = computed(() => multiplyMoney(actualPrice.value, moneyQuantity.value))
const cardAvailabilityError = computed(() => {
  if (!availability.value || requiredCardQuantity.value === 0) return ''
  if (requiredCardQuantity.value <= availability.value.available) return ''
  return `当前可用 ${availability.value.available} 次，${cardRequirementLabel.value} ${requiredCardQuantity.value} 次，请减少份数或调整支付方式`
})
const canSave = computed(
  () =>
    selectedCustomer.value !== null &&
    Boolean(form.order_date) &&
    Number.isInteger(form.quantity) &&
    form.quantity > 0 &&
    contextReady.value &&
    !contextLoading.value &&
    existingOrder.value?.status !== 'delivered' &&
    !saving.value,
)

watch(selectedCustomer, (customer) => {
  form.customer_id = customer?.id ?? ''
})

watch(
  [selectedCustomer, () => form.order_date, () => form.meal_type],
  () => {
    userEditedPrice.value = false
    void refreshOrderContext()
  },
  { immediate: true },
)

watch(
  () => form.payment_mode,
  (mode, previous) => {
    if (mode === 'mixed' && previous !== 'mixed') {
      form.meal_card_quantity = ''
    }
  },
)

async function refreshOrderContext(): Promise<void> {
  const version = ++contextVersion
  const customer = selectedCustomer.value
  contextLoading.value = false
  contextReady.value = false
  contextError.value = ''
  existingOrder.value = null
  availability.value = null
  if (!customer || !form.order_date || !form.meal_type) {
    form.actual_price = ''
    return
  }

  const defaultPrice = customerPrice(customer, form.meal_type)
  if (!userEditedPrice.value) {
    form.actual_price = defaultPrice == null ? '' : String(defaultPrice)
  }
  contextLoading.value = true
  try {
    const matchedOrder = await findEffectiveOrder(customer.id, form.order_date, form.meal_type)
    const excludedIds = matchedOrder?.status === 'pending' ? [matchedOrder.id] : []
    const cardAvailability = await getMealCardAvailability(customer.id, excludedIds)
    if (version !== contextVersion) return

    existingOrder.value = matchedOrder
    availability.value = cardAvailability
    const price = matchedOrder?.unit_price ?? customerPrice(customer, form.meal_type)
    if (!userEditedPrice.value) {
      form.actual_price = price == null ? '' : String(price)
    }
    contextReady.value = true
  } catch {
    if (version !== contextVersion) return
    contextError.value = '订单信息加载失败，请重试'
    showToast('订单信息加载失败')
  } finally {
    if (version === contextVersion) contextLoading.value = false
  }
}

function onQuantityChange(value: string | number): void {
  form.quantity = Math.max(1, Math.floor(toNumber(value)))
}

function onActualPriceInput(value: string | number): void {
  userEditedPrice.value = true
  form.actual_price = String(value)
}

function goCreateCustomer(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

function goExistingOrder(): void {
  if (!existingOrder.value) return
  uni.navigateTo({ url: `/pages/order/detail?id=${existingOrder.value.id}` })
}

async function validateForm(): Promise<boolean> {
  try {
    await formRef.value?.validate()
  } catch {
    return false
  }
  if (!selectedCustomer.value) {
    showToast('请选择客户')
    return false
  }
  if (!Number.isInteger(form.quantity) || form.quantity <= 0) {
    showToast('本次新增份数必须是正整数')
    return false
  }
  if (isMixed.value) {
    if (!form.meal_card_quantity.trim()) {
      showToast('请输入次卡次数')
      return false
    }
    if (!Number.isInteger(Number(form.meal_card_quantity))) {
      showToast('次卡次数必须是整数')
      return false
    }
    if (mixedCardQuantity.value <= 0 || mixedCardQuantity.value >= form.quantity) {
      showToast('组合支付的次卡次数必须大于 0 且小于总份数')
      return false
    }
  }
  if (hasMoney.value && !form.actual_price.trim()) {
    showToast('请输入实际单价')
    return false
  }
  if (hasMoney.value && actualPrice.value < 0) {
    showToast('实际单价不能小于 0')
    return false
  }
  if (cardAvailabilityError.value) {
    showToast(cardAvailabilityError.value)
    return false
  }
  return true
}

function storedPaymentMethod(): PaymentMethod {
  if (form.payment_mode === 'mixed') return form.money_method
  return form.payment_mode
}

function createInput(confirmPriceChange = false) {
  const unitPrice = form.actual_price.trim() ? actualPrice.value : undefined
  return {
    customer_id: selectedCustomer.value?.id ?? 0,
    order_date: form.order_date,
    meal_type: form.meal_type,
    quantity: form.quantity,
    payment_method: storedPaymentMethod(),
    meal_card_quantity: cardQuantity.value,
    unit_price: unitPrice,
    note: form.note.trim() || null,
    confirm_price_change: confirmPriceChange,
  }
}

async function submitWithPriceConfirmation(): Promise<Order | null> {
  try {
    return await orderStore.create(createInput())
  } catch (error) {
    if (!(error instanceof OrderPriceConfirmationError)) throw error
    const confirmed = await confirmDialog(
      '确认修改合并订单单价？',
      `旧单价 ${formatMoney(error.oldUnitPrice)}，新单价 ${formatMoney(
        error.newUnitPrice,
      )}。合并后 ${error.moneyQuantity} 份货币支付将由 ${formatMoney(
        error.oldAmount,
      )} 重算为 ${formatMoney(error.newAmount)}。`,
    )
    if (!confirmed) return null
    return orderStore.create(createInput(true))
  }
}

async function handleSaveError(error: unknown): Promise<void> {
  if (error instanceof OrderPaymentConflictError) {
    const goEdit = await confirmDialog('支付方式冲突', `${error.message}，是否去编辑已有订单？`)
    if (goEdit) uni.navigateTo({ url: `/pages/order/detail?id=${error.orderId}` })
    return
  }
  if (
    error instanceof InsufficientCardError ||
    error instanceof DeliveredOrderConflictError ||
    error instanceof LegacyOrderConflictError
  ) {
    showToast(error.message)
    return
  }
  showToast('订单保存失败')
}

async function save(): Promise<void> {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    if (!(await validateForm())) return
    const saved = await submitWithPriceConfirmation()
    if (!saved) return
    showToast(existingOrder.value?.status === 'pending' ? '已合并到原订单' : '保存成功')
    uni.navigateBack()
  } catch (error) {
    await handleSaveError(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <scroll-view class="page" scroll-y>
    <uni-forms
      ref="formRef"
      class="form"
      :model-value="form"
      :rules="rules"
      validate-trigger="blur"
      label-width="88"
    >
      <uni-forms-item name="customer_id" label="客户" required>
        <CustomerPicker v-model="selectedCustomer" show-create @create="goCreateCustomer" />
      </uni-forms-item>

      <uni-forms-item name="order_date" label="日期" required>
        <uni-datetime-picker
          v-model="form.order_date"
          class="date-picker"
          type="date"
          :clear-icon="false"
        />
      </uni-forms-item>

      <uni-forms-item name="meal_type" label="餐次" required>
        <uni-data-checkbox
          v-model="form.meal_type"
          class="segmented"
          mode="button"
          :localdata="mealTypeOptions"
          selected-color="#007aff"
        />
      </uni-forms-item>

      <view v-if="contextLoading" class="context-box">正在检查本餐次已有订单...</view>
      <view v-else-if="contextError" class="context-box context-box--danger">
        {{ contextError }}
        <button class="link-button" @click="refreshOrderContext">重新加载</button>
      </view>
      <view v-else-if="existingOrder?.status === 'pending'" class="context-box context-box--info">
        <text>本次保存会合并到原订单 #{{ existingOrder.id }}</text>
        <text class="context-meta">
          已有 {{ existingOrder.quantity }} 份 · {{ orderPaymentSummary(existingOrder) }}
        </text>
        <button class="link-button" @click="goExistingOrder">查看原订单</button>
      </view>
      <view
        v-else-if="existingOrder?.status === 'delivered'"
        class="context-box context-box--danger"
      >
        该客户本餐次已经配送，不能继续新增。
        <button class="link-button" @click="goExistingOrder">查看已配送订单</button>
      </view>

      <uni-forms-item name="quantity" label="新增份数" required>
        <uni-number-box
          v-model="form.quantity"
          class="number-box"
          :min="1"
          :max="99"
          :width="72"
          @change="onQuantityChange"
        />
      </uni-forms-item>

      <uni-forms-item name="payment_mode" label="支付" required>
        <uni-data-checkbox
          v-model="form.payment_mode"
          class="payment-grid"
          mode="button"
          :localdata="paymentOptions"
          selected-color="#007aff"
        />
      </uni-forms-item>

      <template v-if="isMixed">
        <uni-forms-item name="money_method" label="补款方式" required>
          <uni-data-checkbox
            v-model="form.money_method"
            mode="button"
            :localdata="moneyMethodOptions"
            selected-color="#007aff"
          />
        </uni-forms-item>

        <uni-forms-item name="meal_card_quantity" label="次卡次数" required>
          <uni-easyinput
            v-model="form.meal_card_quantity"
            type="number"
            inputmode="numeric"
            placeholder="请手动填写"
            :clearable="true"
          />
        </uni-forms-item>
      </template>

      <view v-if="requiredCardQuantity > 0 && availability" class="card-box">
        <text>实际剩余 {{ availability.actual_remaining }} 次</text>
        <text>其他订单已预占 {{ availability.reserved_by_others }} 次</text>
        <text>
          当前可用 {{ availability.available }} 次，{{ cardRequirementLabel }}
          {{ requiredCardQuantity }} 次
        </text>
        <text v-if="cardAvailabilityError" class="inline-error">
          {{ cardAvailabilityError }}
        </text>
      </view>

      <view v-if="hasMoney" class="hint">
        {{ priceHint(selectedCustomer, form.meal_type) }}
      </view>
      <uni-forms-item v-if="hasMoney" name="actual_price" label="实际单价" required>
        <view class="amount-control">
          <text class="amount-prefix">¥</text>
          <uni-easyinput
            v-model="form.actual_price"
            class="amount-input"
            type="digit"
            inputmode="decimal"
            placeholder="请填单价"
            :clearable="false"
            :input-border="false"
            @input="onActualPriceInput"
          />
        </view>
      </uni-forms-item>

      <view v-if="isMixed" class="calculation-box">
        货币支付 {{ moneyQuantity }} 份，补款 {{ formatMoney(totalAmount) }}
      </view>

      <uni-forms-item name="note" label="备注">
        <uni-easyinput v-model="form.note" class="textarea" type="textarea" placeholder="可不填" />
      </uni-forms-item>

      <view class="total-row">
        <text>本次货币金额</text>
        <text>{{ hasMoney ? formatMoney(totalAmount) : '次卡支付，金额记 0' }}</text>
      </view>

      <button class="save" :disabled="!canSave" @click="save">
        {{ saving ? '保存中...' : existingOrder?.status === 'pending' ? '保存并合并' : '保存' }}
      </button>
    </uni-forms>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
}

.form {
  display: block;
  padding: 24rpx;
}

.context-box,
.card-box,
.calculation-box,
.total-row {
  margin-bottom: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
  color: #333333;
  font-size: 26rpx;
  line-height: 1.6;
}

.context-box--info {
  background: #eef6ff;
  color: #165d9c;
}

.context-box--danger {
  background: #fff1f0;
  color: #cf1322;
}

.context-meta,
.card-box text {
  display: block;
}

.context-meta {
  margin-top: 6rpx;
}

.link-button {
  display: inline-block;
  margin: 12rpx 0 0;
  padding: 0;
  background: transparent;
  color: #007aff;
  font-size: 26rpx;
  line-height: 1.5;
}

.hint {
  margin: -8rpx 0 20rpx 176rpx;
  color: #8f8f94;
  font-size: 24rpx;
}

.amount-control {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 12rpx 18rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 10rpx;
  background: #ffffff;
}

.amount-prefix {
  margin-right: 8rpx;
  color: #333333;
  font-size: 30rpx;
  font-weight: 600;
}

.amount-input {
  flex: 1;
  min-width: 0;
}

.inline-error {
  margin-top: 10rpx;
  color: #d93025;
  font-weight: 600;
}

.calculation-box {
  background: #f8f9fb;
}

.textarea {
  min-height: 150rpx;
}

.total-row {
  display: flex;
  justify-content: space-between;
  color: #222222;
  font-size: 30rpx;
  font-weight: 600;
}

.save {
  margin: 8rpx 0 32rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
