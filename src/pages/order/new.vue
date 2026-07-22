<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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
  paymentText,
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
const cardOperationError = ref('')
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
    rules: [{ required: true, errorMessage: '先选择客户' }],
  },
  order_date: {
    rules: [{ required: true, errorMessage: '请选择配送日期' }],
  },
  meal_type: {
    rules: [{ required: true, errorMessage: '请选择午餐或晚餐' }],
  },
  quantity: {
    rules: [{ required: true, errorMessage: '请填写本次新增份数' }],
  },
  payment_mode: {
    rules: [{ required: true, errorMessage: '请选择收款方式' }],
  },
  money_method: {
    rules: [{ required: true, errorMessage: '请选择补款用微信还是现金' }],
  },
  meal_card_quantity: {
    rules: [{ required: true, errorMessage: '请填写本次使用的次卡次数' }],
  },
  actual_price: {
    rules: [{ required: true, errorMessage: '请填写本次实际单价' }],
  },
}

const mealTypeOptions = [
  { text: '午餐', value: 'lunch' },
  { text: '晚餐', value: 'dinner' },
]
const primaryPaymentOptions = [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
  { text: '次卡', value: 'meal_card' },
]
const moneyMethodOptions = [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
]

const isMixed = computed(() => form.payment_mode === 'mixed')
const hasMoney = computed(() => form.payment_mode !== 'meal_card')
const actualPrice = computed(() => roundMoney(parseMoney(form.actual_price)))
const hasActualPrice = computed(() => form.actual_price.trim().length > 0)
const mixedCardQuantity = computed(() => {
  const value = Number(form.meal_card_quantity)
  return Number.isInteger(value) && value > 0 ? value : 0
})
const hasMixedCardQuantity = computed(() => mixedCardQuantity.value > 0)
const mixedPaymentAvailable = computed(() => form.quantity > 1)
const mixedCardQuantityMax = computed(() => Math.max(1, form.quantity - 1))
const mixedCardQuantityInput = computed<number>({
  get: () => mixedCardQuantity.value,
  set: (value) => {
    const next = Math.min(
      mixedCardQuantityMax.value,
      Math.max(1, Math.floor(toNumber(value))),
    )
    form.meal_card_quantity = String(next)
  },
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
  existingOrder.value?.status === 'pending' ? '合并后共要用' : '本次要用',
)
const moneyQuantity = computed(() => Math.max(0, form.quantity - cardQuantity.value))
function moneyPaymentText(quantity: number): string {
  const method = isMixed.value
    ? form.money_method
    : form.payment_mode === 'cash'
      ? 'cash'
      : 'wechat'
  return `${quantity} 份${paymentText(method)}支付`
}
const moneyPaymentSummary = computed(() => moneyPaymentText(moneyQuantity.value))
const totalAmount = computed(() => multiplyMoney(actualPrice.value, moneyQuantity.value))
const cardAvailabilityError = computed(() => {
  if (!availability.value || requiredCardQuantity.value === 0) return ''
  if (requiredCardQuantity.value <= availability.value.available) return ''
  return `这次最多还能用 ${availability.value.available} 次次卡，但${cardRequirementLabel.value} ${requiredCardQuantity.value} 次。请减少次卡次数或改用微信 / 现金。`
})
const cardErrorMessage = computed(
  () => cardOperationError.value || cardAvailabilityError.value,
)
const submitValue = computed(() => {
  if (!selectedCustomer.value) return '待选择客户'
  if (!hasMoney.value) return '次卡支付'
  return hasActualPrice.value ? formatMoney(totalAmount.value) : '待填写单价'
})
const paymentSummaryText = computed(() => {
  if (isMixed.value) {
    if (!hasMixedCardQuantity.value) return '请选择次卡次数'
    return `次卡 ${cardQuantity.value} 次 · ${moneyPaymentSummary.value}`
  }
  return hasMoney.value ? moneyPaymentSummary.value : '金额记 ¥0.00'
})
const submitMeta = computed(() =>
  existingOrder.value?.status === 'pending'
    ? `将合并 · ${paymentSummaryText.value}`
    : paymentSummaryText.value,
)
const canSave = computed(
  () =>
    selectedCustomer.value !== null &&
    Boolean(form.order_date) &&
    Number.isInteger(form.quantity) &&
    form.quantity > 0 &&
    contextReady.value &&
    !contextLoading.value &&
    !contextError.value &&
    existingOrder.value?.status !== 'delivered' &&
    (!isMixed.value || hasMixedCardQuantity.value) &&
    (!hasMoney.value || (hasActualPrice.value && actualPrice.value >= 0)) &&
    !cardErrorMessage.value &&
    !saving.value,
)
const saveActionLabel = computed(() => {
  if (saving.value) return '保存中...'
  if (!selectedCustomer.value) return '先选客户'
  if (!form.order_date || !form.meal_type) return '补全配送安排'
  if (contextLoading.value || !contextReady.value) {
    return contextError.value ? '重新检查订单' : '检查中...'
  }
  if (existingOrder.value?.status === 'delivered') return '已配送，不能新增'
  if (isMixed.value && !hasMixedCardQuantity.value) return '选择次卡次数'
  if (hasMoney.value && !hasActualPrice.value) return '填写单价'
  if (hasMoney.value && actualPrice.value < 0) return '单价不能小于 0'
  if (cardErrorMessage.value) return '次卡不足'
  return existingOrder.value?.status === 'pending' ? '合并并保存' : '保存订单'
})

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
  () => form.quantity,
  (quantity) => {
    if (!isMixed.value) return
    if (quantity <= 1) {
      form.payment_mode = form.money_method
      form.meal_card_quantity = ''
      return
    }
    if (mixedCardQuantity.value >= quantity) {
      form.meal_card_quantity = String(quantity - 1)
    }
  },
)

watch(
  [() => form.quantity, () => form.payment_mode, () => form.meal_card_quantity],
  () => {
    cardOperationError.value = ''
  },
)

async function refreshOrderContext(): Promise<void> {
  const version = ++contextVersion
  const customer = selectedCustomer.value
  contextLoading.value = false
  contextReady.value = false
  contextError.value = ''
  cardOperationError.value = ''
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
    contextError.value = '暂时无法确认这餐是否已有订单，请重新检查后再保存。'
    showToast('暂时无法确认订单信息')
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

function startMixedPayment(): void {
  if (!mixedPaymentAvailable.value) return
  form.meal_card_quantity = '1'
  form.payment_mode = 'mixed'
}

function exitMixedPayment(): void {
  form.payment_mode = form.money_method
  form.meal_card_quantity = ''
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
  if (!selectedCustomer.value) return false
  if (!Number.isInteger(form.quantity) || form.quantity <= 0) return false
  if (isMixed.value) {
    if (!form.meal_card_quantity.trim()) return false
    if (!Number.isInteger(Number(form.meal_card_quantity))) return false
    if (mixedCardQuantity.value <= 0 || mixedCardQuantity.value >= form.quantity) {
      return false
    }
  }
  if (hasMoney.value && !form.actual_price.trim()) return false
  if (hasMoney.value && actualPrice.value < 0) return false
  if (cardErrorMessage.value) return false
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
      '确认使用新单价？',
      `已有订单单价是 ${formatMoney(error.oldUnitPrice)}，本次单价是 ${formatMoney(
        error.newUnitPrice,
      )}。合并后，${moneyPaymentText(error.moneyQuantity)}将从 ${formatMoney(
        error.oldAmount,
      )} 调整为 ${formatMoney(error.newAmount)}。`,
    )
    if (!confirmed) return null
    return orderStore.create(createInput(true))
  }
}

async function handleSaveError(error: unknown): Promise<void> {
  if (error instanceof OrderPaymentConflictError) {
    const goEdit = await confirmDialog(
      '已有订单的收款方式不同',
      `${error.message}。要先去修改已有订单吗？`,
    )
    if (goEdit) uni.navigateTo({ url: `/pages/order/detail?id=${error.orderId}` })
    return
  }
  if (error instanceof InsufficientCardError) {
    cardOperationError.value = error.message
    return
  }
  if (error instanceof DeliveredOrderConflictError || error instanceof LegacyOrderConflictError) {
    contextError.value = error.message
    return
  }
  showToast('暂时没能保存订单，请稍后重试')
}

function choosePostSaveAction(merged: boolean): Promise<'continue' | 'finish'> {
  return new Promise((resolve) => {
    uni.showModal({
      title: merged ? '订单已合并' : '订单已保存',
      content: merged ? '本次新增份数已合入已有订单。还要继续录下一单吗？' : '还要继续录下一单吗？',
      cancelText: '结束录单',
      confirmText: '继续下一单',
      confirmColor: '#0070f3',
      success: (result) => resolve(result.confirm ? 'continue' : 'finish'),
      fail: () => resolve('finish'),
    })
  })
}

function resetForNextOrder(): void {
  contextVersion += 1
  selectedCustomer.value = null
  existingOrder.value = null
  availability.value = null
  contextLoading.value = false
  contextReady.value = false
  contextError.value = ''
  cardOperationError.value = ''
  userEditedPrice.value = false
  form.customer_id = ''
  form.quantity = 1
  form.meal_card_quantity = ''
  form.actual_price = ''
  form.note = ''
}

async function save(): Promise<void> {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    if (!(await validateForm())) return
    const saved = await submitWithPriceConfirmation()
    if (!saved) return
    const nextAction = await choosePostSaveAction(existingOrder.value?.status === 'pending')
    if (nextAction === 'continue') {
      resetForNextOrder()
      return
    }
    uni.navigateBack()
  } catch (error) {
    await handleSaveError(error)
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const date = String(query?.date ?? '')
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    form.order_date = date
  }
})
</script>

<template>
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <uni-forms
        ref="formRef"
        class="form"
        :model-value="form"
        :rules="rules"
        validate-trigger="blur"
        label-width="88"
      >
        <view class="order-card">
          <view class="delivery-strip">
            <text class="delivery-strip-title">配送安排</text>
            <view class="schedule-row">
              <uni-forms-item name="order_date" class="schedule-field schedule-field--date">
                <view class="schedule-control">
                  <text class="schedule-label">日期</text>
                  <uni-datetime-picker
                    v-model="form.order_date"
                    class="date-picker"
                    type="date"
                    :clear-icon="false"
                  />
                </view>
              </uni-forms-item>

              <uni-forms-item name="meal_type" class="schedule-field schedule-field--meal">
                <view class="schedule-control">
                  <text class="schedule-label">餐次</text>
                  <uni-data-checkbox
                    v-model="form.meal_type"
                    class="meal-choice"
                    mode="button"
                    :localdata="mealTypeOptions"
                    selected-color="#0070f3"
                  />
                </view>
              </uni-forms-item>
            </view>
          </view>

          <view class="entry-section entry-section--customer">
            <uni-forms-item name="customer_id" label="客户" required>
              <CustomerPicker v-model="selectedCustomer" show-create @create="goCreateCustomer" />
            </uni-forms-item>

            <view v-if="contextLoading" class="context-box">正在检查已有订单和次卡余额…</view>
            <view v-else-if="contextError" class="context-box context-box--danger">
              <text>{{ contextError }}</text>
              <button class="link-button" @click="refreshOrderContext">重新检查</button>
            </view>
            <view
              v-else-if="existingOrder?.status === 'pending'"
              class="context-box context-box--info"
            >
              <text>将合并到已有待配送订单 #{{ existingOrder.id }}</text>
              <text class="context-meta">
                已有 {{ existingOrder.quantity }} 份 · {{ orderPaymentSummary(existingOrder) }}
              </text>
              <button class="link-button" @click="goExistingOrder">查看已有订单</button>
            </view>
            <view
              v-else-if="existingOrder?.status === 'delivered'"
              class="context-box context-box--danger"
            >
              <text>这位客户这餐已经配送完成，不能再追加份数。</text>
              <button class="link-button" @click="goExistingOrder">查看已配送订单</button>
            </view>
          </view>

          <view class="entry-divider" />

          <view class="entry-section entry-section--order">
            <uni-forms-item name="quantity" label="新增份数" required>
              <uni-number-box
                v-model="form.quantity"
                class="quantity-box"
                :min="1"
                :max="99"
                :width="72"
                @change="onQuantityChange"
              />
            </uni-forms-item>

            <uni-forms-item name="payment_mode" label="支付" required>
              <view class="payment-control">
                <uni-data-checkbox
                  v-if="!isMixed"
                  v-model="form.payment_mode"
                  class="payment-primary"
                  mode="button"
                  :localdata="primaryPaymentOptions"
                  selected-color="#0070f3"
                />
                <view v-else class="mixed-mode-summary">
                  <view>
                    <text class="mixed-mode-title">组合支付</text>
                    <text class="mixed-mode-meta">次卡 + {{ paymentText(form.money_method) }}</text>
                  </view>
                  <button class="mixed-exit-button" @click="exitMixedPayment">改为纯支付</button>
                </view>
                <button
                  v-if="mixedPaymentAvailable && !isMixed"
                  class="mixed-entry-button"
                  @click="startMixedPayment"
                >
                  <text>组合支付</text>
                  <text class="mixed-entry-meta">次卡 + 微信/现金</text>
                </button>
              </view>
            </uni-forms-item>

            <view v-if="isMixed" class="mixed-payment-panel">
              <uni-forms-item name="meal_card_quantity" label="次卡次数" required>
                <uni-number-box
                  v-model="mixedCardQuantityInput"
                  class="mixed-count-box"
                  :min="1"
                  :max="mixedCardQuantityMax"
                  :width="72"
                />
              </uni-forms-item>

              <uni-forms-item name="money_method" label="补款方式" required>
                <uni-data-checkbox
                  v-model="form.money_method"
                  class="money-method-choice"
                  mode="button"
                  :localdata="moneyMethodOptions"
                  selected-color="#0070f3"
                />
              </uni-forms-item>

              <text class="mixed-calculation">
                次卡 {{ cardQuantity }} 次 · {{ moneyPaymentSummary }} · 补款
                {{ hasActualPrice ? formatMoney(totalAmount) : '待填写单价' }}
              </text>
            </view>

            <view v-if="requiredCardQuantity > 0 && availability" class="card-status">
              <text class="card-status-main">
                可用 {{ availability.available }} 次 · {{ cardRequirementLabel }} {{ requiredCardQuantity }} 次
              </text>
              <text
                v-if="availability.reserved_by_others > 0 || cardErrorMessage"
                class="card-status-detail"
              >
                卡内 {{ availability.actual_remaining }} 次 · 已预占
                {{ availability.reserved_by_others }} 次 · 当前可用 {{ availability.available }} 次
              </text>
              <text v-if="cardErrorMessage" class="inline-error">{{ cardErrorMessage }}</text>
            </view>

            <view v-if="hasMoney && selectedCustomer" class="price-section">
              <uni-forms-item name="actual_price" label="实际单价" required class="price-editor">
                <view class="amount-control">
                  <text class="amount-prefix">¥</text>
                  <uni-easyinput
                    v-model="form.actual_price"
                    class="amount-input"
                    type="digit"
                    inputmode="decimal"
                    placeholder="例如 15.00"
                    :clearable="false"
                    :input-border="false"
                    @input="onActualPriceInput"
                  />
                </view>
                <text class="price-hint">{{ priceHint(selectedCustomer, form.meal_type) }}</text>
              </uni-forms-item>
            </view>
          </view>

          <view class="entry-divider" />

          <view class="entry-section entry-section--note">
            <uni-forms-item name="note" label="备注">
              <uni-easyinput
                v-model="form.note"
                class="note-input"
                type="text"
                placeholder="如：不要葱、送到前台"
                :clearable="true"
              />
            </uni-forms-item>
          </view>
        </view>

        <view class="form-scroll-spacer" />
      </uni-forms>
    </scroll-view>

    <view class="submit-bar">
      <view class="submit-summary">
        <text class="submit-label">{{ hasMoney ? '本次实际金额' : '本次支付方式' }}</text>
        <text class="submit-value">{{ submitValue }}</text>
        <text class="submit-meta">{{ submitMeta }}</text>
      </view>
      <button class="save" :disabled="!canSave" @click="save">
        {{ saveActionLabel }}
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
}

.form-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.form {
  display: block;
  padding: $hej-space-5;
}

.order-card {
  overflow: hidden;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.delivery-strip {
  padding: $hej-space-4 $hej-space-5 $hej-space-3;
  border-left: 6rpx solid $hej-color-accent;
  background: $hej-color-accent-soft;
}

.delivery-strip-title {
  display: block;
  margin-bottom: $hej-space-2;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 700;
}

.schedule-row {
  display: flex;
  align-items: flex-start;
  gap: $hej-space-3;
}

.schedule-field {
  flex: 1;
  min-width: 0;
  margin-bottom: 0;
}

.schedule-field--date {
  flex: 1.05;
}

.schedule-field :deep(.uni-forms-item__label) {
  display: none;
}

.schedule-field :deep(.uni-forms-item__content) {
  min-width: 0;
}

.schedule-control {
  min-width: 0;
}

.schedule-label {
  display: block;
  margin-bottom: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.meal-choice :deep(.checklist-group),
.payment-primary :deep(.checklist-group),
.money-method-choice :deep(.checklist-group) {
  display: flex;
  flex-wrap: nowrap;
  gap: $hej-space-2;
}

.meal-choice :deep(.checklist-box),
.payment-primary :deep(.checklist-box),
.money-method-choice :deep(.checklist-box) {
  flex: 1;
  justify-content: center;
  min-width: 0;
  margin: 0;
  padding: $hej-space-2 $hej-space-1;
  border-color: $hej-color-border;
  border-radius: $hej-radius-control;
}

.meal-choice :deep(.checklist-box.is-checked),
.payment-primary :deep(.checklist-box.is-checked),
.money-method-choice :deep(.checklist-box.is-checked) {
  background: $hej-color-accent-soft;
}

.meal-choice :deep(.checklist-text),
.payment-primary :deep(.checklist-text),
.money-method-choice :deep(.checklist-text) {
  margin-left: 0;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.3;
}

.entry-section {
  padding: $hej-space-5;
}

.entry-section :deep(.uni-forms-item) {
  margin-bottom: $hej-space-5;
}

.entry-section :deep(.uni-forms-item__label) {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.entry-section--customer :deep(.uni-forms-item) {
  margin-bottom: 0;
}

.entry-section--customer .context-box {
  margin-top: $hej-space-4;
}

.entry-section--note {
  padding-top: $hej-space-4;
  padding-bottom: $hej-space-4;
}

.entry-section--note :deep(.uni-forms-item) {
  margin-bottom: 0;
}

.entry-divider {
  height: 1rpx;
  margin: 0 $hej-space-5;
  background: $hej-color-border;
}

.context-box,
.card-status {
  padding: $hej-space-4 $hej-space-5;
  border-radius: $hej-radius-control;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.6;
}

.context-box {
  background: $hej-color-surface-subtle;
}

.context-box--info {
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
}

.context-box--danger {
  background: $hej-color-danger-soft;
  color: $hej-color-danger;
}

.context-meta {
  display: block;
  margin-top: 6rpx;
}

.link-button {
  display: inline-block;
  height: 56rpx;
  margin: $hej-space-2 0 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 56rpx;
  text-align: center;
}

.payment-control {
  min-width: 0;
}

.mixed-entry-button,
.mixed-exit-button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.mixed-entry-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 64rpx;
  margin-top: $hej-space-3;
  padding: 0 $hej-space-3;
  border: 1rpx dashed $hej-color-border;
  border-radius: $hej-radius-control;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 64rpx;
  box-sizing: border-box;
}

.mixed-entry-meta,
.mixed-mode-meta {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.mixed-mode-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  padding: $hej-space-3;
  border-radius: $hej-radius-control;
  background: $hej-color-accent-soft;
}

.mixed-mode-title,
.mixed-mode-meta {
  display: block;
}

.mixed-mode-title {
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 700;
}

.mixed-exit-button {
  flex: 0 0 auto;
  height: 56rpx;
  color: $hej-color-accent;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 56rpx;
}

.mixed-payment-panel {
  margin-bottom: $hej-space-5;
  padding: $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
}

.mixed-payment-panel :deep(.uni-forms-item) {
  margin-bottom: $hej-space-4;
}

.mixed-calculation {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.quantity-box :deep(.uni-numbox-btns),
.mixed-count-box :deep(.uni-numbox-btns) {
  background: $hej-color-surface-subtle !important;
}

.card-status {
  margin-bottom: $hej-space-5;
  background: $hej-color-warning-soft;
}

.card-status-main,
.card-status-detail {
  display: block;
}

.card-status-main {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.card-status-detail {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.amount-control {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: $hej-space-2 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
}

.amount-prefix {
  margin-right: $hej-space-1;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.amount-input {
  flex: 1;
  min-width: 0;
}

.price-section {
  margin-top: 0;
  padding-top: $hej-space-4;
  border-top: 1rpx solid $hej-color-border;
}

.price-editor {
  margin-bottom: 0 !important;
}

.price-hint {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.inline-error {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-danger;
  font-weight: 600;
}

.note-input {
  min-height: 72rpx;
}

.form-scroll-spacer {
  height: $hej-space-2;
}

.submit-bar {
  display: flex;
  align-items: center;
  gap: $hej-space-4;
  padding: $hej-space-5 $hej-space-7;
  border-top: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
}

.submit-summary {
  flex: 1;
  min-width: 0;
}

.submit-label,
.submit-meta {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.submit-value {
  display: block;
  margin-top: 2rpx;
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submit-meta {
  margin-top: 2rpx;
}

.save {
  flex: 0 0 254rpx;
  height: 88rpx;
  margin: 0;
  padding: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
}

.save:active {
  opacity: 0.82;
}

.save:focus-visible {
  outline: 2rpx solid $hej-color-text;
  outline-offset: -4rpx;
}

.save[disabled] {
  background: $hej-color-border;
  color: $hej-color-text-tertiary;
}
</style>
