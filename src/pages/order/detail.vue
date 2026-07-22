<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import CustomerPicker from '../../components/CustomerPicker.vue'
import { getCustomer } from '../../api/customers'
import {
  DeliveredOrderConflictError,
  InsufficientCardError,
  LegacyOrderConflictError,
  OrderMergeConfirmationError,
  OrderPaymentConflictError,
  OrderPriceConfirmationError,
} from '../../api/errors'
import { findEffectiveOrder, getMealCardAvailability, getOrder } from '../../api/orders'
import { useOrderStore } from '../../stores/order'
import type { MealCardAvailabilityResult } from '../../types/api'
import type { Customer, MealType, Order, PaymentMethod } from '../../types/domain'
import { formatMoney, multiplyMoney, parseMoney, roundMoney } from '../../utils/format'
import type { OrderPaymentMode } from '../../utils/order-rules'
import {
  confirmDialog,
  customerPrice,
  mealTypeText,
  orderPaymentSummary,
  priceHint,
  showToast,
  statusText,
  toNumber,
} from '../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface EditOrderForm {
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
const order = ref<Order | null>(null)
const customer = ref<Customer | null>(null)
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)
const actioning = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const editTargetOrder = ref<Order | null>(null)
const editAvailability = ref<MealCardAvailabilityResult | null>(null)
const editContextLoading = ref(false)
const initializingEditForm = ref(false)
let editContextVersion = 0

const form = reactive<EditOrderForm>({
  customer_id: '',
  order_date: '',
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
    rules: [{ required: true, errorMessage: '请输入总份数' }],
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

const canEdit = computed(() => order.value?.status === 'pending' && !actioning.value)
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
    (editTargetOrder.value?.status === 'pending' ? editTargetOrder.value.meal_card_quantity : 0),
)
const cardRequirementLabel = computed(() =>
  editTargetOrder.value?.status === 'pending' ? '合并后订单需要' : '订单需要',
)
const moneyQuantity = computed(() => Math.max(0, form.quantity - cardQuantity.value))
const editTotalAmount = computed(() => multiplyMoney(actualPrice.value, moneyQuantity.value))
const cardAvailabilityError = computed(() => {
  if (!editAvailability.value || requiredCardQuantity.value === 0) return ''
  if (requiredCardQuantity.value <= editAvailability.value.available) return ''
  return `当前可用 ${editAvailability.value.available} 次，${cardRequirementLabel.value} ${requiredCardQuantity.value} 次，请减少份数或调整支付方式`
})
const canSaveEdit = computed(
  () =>
    order.value !== null &&
    selectedCustomer.value !== null &&
    Boolean(form.order_date) &&
    Number.isInteger(form.quantity) &&
    form.quantity > 0 &&
    editTargetOrder.value?.status !== 'delivered' &&
    !actioning.value &&
    !saving.value,
)
const copyInfoText = computed(() => {
  const current = order.value
  if (!current) return ''
  const customerName = customer.value?.name ?? `客户 #${current.customer_id}`
  const note = current.note?.trim()
  return [customerName, `${current.quantity}份`, note].filter(Boolean).join(' ')
})
const orderMoneyQuantity = computed(() => {
  if (!order.value) return 0
  return order.value.quantity - order.value.meal_card_quantity
})

watch(selectedCustomer, (value) => {
  form.customer_id = value?.id ?? ''
})

watch([selectedCustomer, () => form.meal_type], () => {
  if (!editing.value || initializingEditForm.value) return
  const price = customerPrice(selectedCustomer.value, form.meal_type)
  form.actual_price = price == null ? '' : String(price)
})

watch([selectedCustomer, () => form.order_date, () => form.meal_type], () => {
  if (!editing.value || initializingEditForm.value) return
  void refreshEditContext()
})

watch(
  () => form.payment_mode,
  (mode, previous) => {
    if (!editing.value || initializingEditForm.value) return
    if (mode === 'mixed' && previous !== 'mixed') {
      form.meal_card_quantity = ''
    }
    if (mode !== 'meal_card' && previous === 'meal_card') {
      const price = customerPrice(selectedCustomer.value, form.meal_type)
      form.actual_price = price == null ? '' : String(price)
    }
  },
)

async function load(id: number): Promise<void> {
  loading.value = true
  try {
    order.value = await getOrder(id)
    customer.value = order.value ? await getCustomer(order.value.customer_id) : null
    editing.value = false
  } catch {
    showToast('订单详情加载失败')
  } finally {
    loading.value = false
  }
}

function paymentModeFromOrder(current: Order): OrderPaymentMode {
  if (current.meal_card_quantity === current.quantity) return 'meal_card'
  if (current.meal_card_quantity > 0) return 'mixed'
  return current.payment_method
}

async function startEdit(): Promise<void> {
  if (!order.value || !customer.value || order.value.status !== 'pending') return
  const current = order.value
  initializingEditForm.value = true
  editing.value = true
  selectedCustomer.value = customer.value
  form.customer_id = customer.value.id
  form.order_date = current.order_date
  form.meal_type = current.meal_type
  form.quantity = current.quantity
  form.payment_mode = paymentModeFromOrder(current)
  form.money_method = current.payment_method === 'meal_card' ? 'wechat' : current.payment_method
  form.meal_card_quantity =
    current.meal_card_quantity > 0 && current.meal_card_quantity < current.quantity
      ? String(current.meal_card_quantity)
      : ''
  form.actual_price = String(current.unit_price)
  form.note = current.note ?? ''
  editTargetOrder.value = null
  editAvailability.value = null
  await nextTick()
  initializingEditForm.value = false
  await refreshEditContext()
}

function cancelEdit(): void {
  editing.value = false
  editTargetOrder.value = null
  editAvailability.value = null
}

async function refreshEditContext(): Promise<void> {
  const version = ++editContextVersion
  const current = order.value
  const selected = selectedCustomer.value
  editTargetOrder.value = null
  editAvailability.value = null
  if (!current || !selected || !form.order_date || !form.meal_type) return

  editContextLoading.value = true
  try {
    const target = await findEffectiveOrder(selected.id, form.order_date, form.meal_type, [
      current.id,
    ])
    const excludedIds = [current.id]
    if (target?.status === 'pending') excludedIds.push(target.id)
    const availability = await getMealCardAvailability(selected.id, excludedIds)
    if (version !== editContextVersion) return
    editTargetOrder.value = target
    editAvailability.value = availability
  } catch {
    if (version !== editContextVersion) return
    showToast('订单校验信息加载失败')
  } finally {
    if (version === editContextVersion) editContextLoading.value = false
  }
}

function onQuantityChange(value: string | number): void {
  form.quantity = Math.max(1, Math.floor(toNumber(value)))
}

function goCreateCustomer(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

function goTargetOrder(): void {
  if (!editTargetOrder.value) return
  uni.navigateTo({ url: `/pages/order/detail?id=${editTargetOrder.value.id}` })
}

async function validateEditForm(): Promise<boolean> {
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
    showToast('总份数必须是正整数')
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

function updateInput(confirmMerge: boolean, confirmPriceChange: boolean) {
  return {
    customer_id: selectedCustomer.value?.id ?? 0,
    order_date: form.order_date,
    meal_type: form.meal_type,
    quantity: form.quantity,
    payment_method: storedPaymentMethod(),
    meal_card_quantity: cardQuantity.value,
    unit_price: form.actual_price.trim() ? actualPrice.value : undefined,
    note: form.note.trim() || null,
    confirm_merge: confirmMerge,
    confirm_price_change: confirmPriceChange,
  }
}

async function submitEditWithConfirmations(): Promise<Order | null> {
  if (!order.value) return null
  let confirmMerge = false
  let confirmPriceChange = false

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await orderStore.update(order.value.id, updateInput(confirmMerge, confirmPriceChange))
    } catch (error) {
      if (error instanceof OrderMergeConfirmationError) {
        const confirmed = await confirmDialog(
          '确认合并订单？',
          `修改后会与订单 #${error.targetOrderId} 合并。将保留目标订单及其排序，并删除当前订单。`,
        )
        if (!confirmed) return null
        confirmMerge = true
        continue
      }
      if (error instanceof OrderPriceConfirmationError) {
        const confirmed = await confirmDialog(
          '确认修改合并订单单价？',
          `旧单价 ${formatMoney(error.oldUnitPrice)}，新单价 ${formatMoney(
            error.newUnitPrice,
          )}。合并后 ${error.moneyQuantity} 份货币支付将由 ${formatMoney(
            error.oldAmount,
          )} 重算为 ${formatMoney(error.newAmount)}。`,
        )
        if (!confirmed) return null
        confirmPriceChange = true
        continue
      }
      throw error
    }
  }
  throw new Error('订单确认状态已变化，请重新保存')
}

async function handleEditError(error: unknown): Promise<void> {
  if (error instanceof OrderPaymentConflictError) {
    const goEdit = await confirmDialog('支付方式冲突', `${error.message}，是否查看目标订单？`)
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
  showToast('订单修改失败')
}

async function saveEdit(): Promise<void> {
  if (!canSaveEdit.value || saving.value) return
  saving.value = true
  try {
    if (!(await validateEditForm())) return
    const sourceOrderId = order.value?.id
    const updated = await submitEditWithConfirmations()
    if (!updated) return
    if (sourceOrderId != null && updated.id !== sourceOrderId) {
      showToast('订单已合并')
      uni.redirectTo({ url: `/pages/order/detail?id=${updated.id}` })
      return
    }
    order.value = updated
    customer.value = await getCustomer(updated.customer_id)
    editing.value = false
    showToast('修改已保存')
  } catch (error) {
    await handleEditError(error)
  } finally {
    saving.value = false
  }
}

async function cancelOrder(): Promise<void> {
  if (!order.value || actioning.value) return
  actioning.value = true
  try {
    const confirmed = await confirmDialog('确认取消该订单？', '取消后整张订单不计入收入和订单数。')
    if (!confirmed) return
    await orderStore.cancel(order.value.id)
    showToast('已取消')
    uni.navigateBack()
  } catch {
    showToast('取消失败')
  } finally {
    actioning.value = false
  }
}

async function deleteOrder(): Promise<void> {
  if (!order.value || actioning.value) return
  actioning.value = true
  try {
    const confirmed = await confirmDialog(
      '删除订单？',
      '删除后无法恢复；已配送订单中的次卡使用次数会按扣次明细回滚。',
    )
    if (!confirmed) return
    const deleted = await orderStore.remove(order.value.id)
    if (!deleted) {
      showToast('订单不存在')
      return
    }
    showToast('已删除')
    uni.navigateBack()
  } catch {
    showToast('删除失败')
  } finally {
    actioning.value = false
  }
}

function copyOrderInfo(): void {
  if (!copyInfoText.value) {
    showToast('暂无可复制内容')
    return
  }
  uni.setClipboardData({
    data: copyInfoText.value,
    success: () => showToast('已复制'),
    fail: () => showToast('复制失败'),
  })
}

async function markDelivered(): Promise<void> {
  if (!order.value || actioning.value) return
  actioning.value = true
  try {
    await orderStore.markDelivered(order.value.id)
    showToast('已标记配送')
    uni.navigateBack()
  } catch (error) {
    if (error instanceof InsufficientCardError) {
      const goEdit = await confirmDialog('次卡次数不足', `${error.message}，是否去编辑支付？`)
      if (goEdit) await startEdit()
      return
    }
    showToast('标记配送失败')
  } finally {
    actioning.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) {
    void load(id)
  } else {
    showToast('订单参数无效')
  }
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!order" class="empty">订单不存在</view>
    <template v-else>
      <view class="hero">
        <view class="hero-main">
          <text class="name">{{ customer?.name ?? `客户 #${order.customer_id}` }}</text>
          <text class="status">{{ statusText(order.status) }}</text>
        </view>
        <button
          v-if="canEdit && !editing"
          class="edit-button"
          :disabled="actioning"
          @click="startEdit"
        >
          编辑
        </button>
      </view>

      <uni-forms
        v-if="editing"
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

        <view v-if="editContextLoading" class="context-box">正在检查目标餐次...</view>
        <view
          v-else-if="editTargetOrder?.status === 'pending'"
          class="context-box context-box--info"
        >
          保存时会先询问是否与订单 #{{ editTargetOrder.id }} 合并，并保留目标排序。
          <button class="link-button" @click="goTargetOrder">查看目标订单</button>
        </view>
        <view
          v-else-if="editTargetOrder?.status === 'delivered'"
          class="context-box context-box--danger"
        >
          目标客户本餐次已经配送，不能修改到该餐次。
          <button class="link-button" @click="goTargetOrder">查看已配送订单</button>
        </view>

        <uni-forms-item name="quantity" label="总份数" required>
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

        <view v-if="requiredCardQuantity > 0 && editAvailability" class="card-box">
          <text>实际剩余 {{ editAvailability.actual_remaining }} 次</text>
          <text>其他订单已预占 {{ editAvailability.reserved_by_others }} 次</text>
          <text>
            当前可用 {{ editAvailability.available }} 次，{{ cardRequirementLabel }}
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
            />
          </view>
        </uni-forms-item>

        <view v-if="isMixed" class="calculation-box">
          货币支付 {{ moneyQuantity }} 份，补款 {{ formatMoney(editTotalAmount) }}
        </view>

        <uni-forms-item name="note" label="备注">
          <uni-easyinput
            v-model="form.note"
            class="textarea"
            type="textarea"
            placeholder="可不填"
          />
        </uni-forms-item>

        <view class="total-row">
          <text>货币金额</text>
          <text>{{ hasMoney ? formatMoney(editTotalAmount) : '次卡支付，金额记 0' }}</text>
        </view>

        <view class="actions">
          <button class="secondary" @click="cancelEdit">取消编辑</button>
          <button class="primary" :disabled="!canSaveEdit" @click="saveEdit">
            {{ saving ? '保存中...' : '保存修改' }}
          </button>
        </view>
      </uni-forms>

      <template v-else>
        <view class="panel">
          <view class="row"
            ><text>日期</text><text>{{ order.order_date }}</text></view
          >
          <view class="row">
            <text>餐次</text>
            <text>{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text>
          </view>
          <view class="row"
            ><text>支付</text><text>{{ orderPaymentSummary(order) }}</text></view
          >
          <view v-if="order.meal_card_quantity > 0" class="row">
            <text>次卡次数</text><text>{{ order.meal_card_quantity }} 次</text>
          </view>
          <view v-if="orderMoneyQuantity > 0" class="row">
            <text>货币份数</text><text>{{ orderMoneyQuantity }} 份</text>
          </view>
          <view class="row"
            ><text>实际单价</text><text>{{ formatMoney(order.unit_price) }}</text></view
          >
          <view class="row"
            ><text>货币金额</text><text>{{ formatMoney(order.amount) }}</text></view
          >
          <view class="row row--top"
            ><text>备注</text><text class="note">{{ order.note || '—' }}</text></view
          >
          <view class="row">
            <text>创建</text
            ><text>{{ dayjs(order.created_at).format('YYYY-MM-DD HH:mm:ss') }}</text>
          </view>
          <view v-if="order.cancelled_at" class="row">
            <text>取消</text><text>{{ order.cancelled_at }}</text>
          </view>
        </view>

        <view v-if="customer" class="panel">
          <view class="row"
            ><text>微信</text><text>{{ customer.wechat || '—' }}</text></view
          >
          <view class="row"
            ><text>手机</text><text>{{ customer.phone || '—' }}</text></view
          >
        </view>

        <view class="actions">
          <button class="secondary" :disabled="actioning" @click="copyOrderInfo">复制信息</button>
          <button
            v-if="order.status === 'pending'"
            class="primary"
            :disabled="actioning"
            @click="markDelivered"
          >
            标记已配送
          </button>
          <button
            v-if="order.status === 'pending'"
            class="danger"
            :disabled="actioning"
            @click="cancelOrder"
          >
            取消订单
          </button>
        </view>
        <view class="danger-zone">
          <button class="danger-outline" :disabled="actioning" @click="deleteOrder">
            删除订单
          </button>
        </view>
      </template>
    </template>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.hero,
.panel,
.form {
  margin-bottom: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
}

.hero-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.name {
  overflow: hidden;
  color: #222222;
  font-size: 38rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  margin-top: 8rpx;
  color: #007aff;
  font-size: 26rpx;
}

.edit-button {
  flex: 0 0 auto;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 12rpx;
  background: #eef5ff;
  color: #007aff;
  font-size: 28rpx;
}

.context-box,
.card-box,
.calculation-box,
.total-row {
  margin-bottom: 24rpx;
  padding: 22rpx 24rpx;
  border-radius: 12rpx;
  background: #f8f9fb;
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

.link-button {
  display: inline-block;
  margin: 12rpx 0 0;
  padding: 0;
  background: transparent;
  color: #007aff;
  font-size: 26rpx;
  line-height: 1.5;
}

.card-box text {
  display: block;
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

.row {
  display: flex;
  justify-content: space-between;
  gap: 24rpx;
  padding: 18rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
  color: #333333;
  font-size: 28rpx;
}

.row:last-child {
  border-bottom: 0;
}

.row--top {
  align-items: flex-start;
}

.note {
  max-width: 70%;
  overflow-wrap: anywhere;
  text-align: right;
  white-space: normal;
}

.actions {
  display: flex;
  gap: 20rpx;
}

.actions button {
  margin: 0;
}

.primary,
.secondary,
.danger,
.danger-outline {
  flex: 1;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.primary {
  background: #007aff;
  color: #ffffff;
}

.secondary {
  background: #eef0f4;
  color: #333333;
}

.danger {
  background: #ee0a24;
  color: #ffffff;
}

.danger-zone {
  margin-top: 20rpx;
}

.danger-outline {
  width: 100%;
  border: 1rpx solid #ffccc7;
  background: #ffffff;
  color: #ee0a24;
}

.empty {
  padding: 120rpx 0;
  color: #8f8f94;
  font-size: 28rpx;
  text-align: center;
}
</style>
