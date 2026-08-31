<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../components/HejiIcon.vue'
import CustomerPicker from '../../components/CustomerPicker.vue'
import { usePageReturnSnapshot } from '../../composables/usePageReturnSnapshot'
import { getCustomer } from '../../api/customers'
import { getDefaultMealCardMessageTemplate } from '../../api/meal-card-templates'
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
import { renderMealCardTemplate } from '../../utils/meal-card-template'
import type { OrderPaymentMode } from '../../utils/order-rules'
import {
  confirmDialog,
  customerPrice,
  mealTypeText,
  orderPaymentSummary,
  paymentText,
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
const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
})
const formRef = ref<UniFormsRef | null>(null)
const order = ref<Order | null>(null)
const customer = ref<Customer | null>(null)
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)
const actioning = ref(false)
const copyingMealCard = ref(false)
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
  { text: '午餐', value: 'lunch', icon: 'Utensils' },
  { text: '晚餐', value: 'dinner', icon: 'Moon' },
]
const paymentOptions = computed(() => [
  { text: '微信', value: 'wechat', icon: 'MessageCircle' },
  { text: '现金', value: 'cash', icon: 'Banknote' },
  { text: '次卡', value: 'meal_card', icon: 'Ticket' },
  { text: '组合支付', value: 'mixed', icon: 'Wallet', disabled: form.quantity <= 1 },
])
const moneyMethodOptions = [
  { text: '微信', value: 'wechat', icon: 'MessageCircle' },
  { text: '现金', value: 'cash', icon: 'Banknote' },
]

const canEdit = computed(() => order.value?.status === 'pending' && !actioning.value)
const isMixed = computed(() => form.payment_mode === 'mixed')
const hasMoney = computed(() => form.payment_mode !== 'meal_card')
const actualPrice = computed(() => roundMoney(parseMoney(form.actual_price)))
const mixedCardQuantity = computed(() => {
  const value = Number(form.meal_card_quantity)
  return Number.isInteger(value) && value > 0 ? value : 0
})
const mixedCardQuantityMax = computed(() => Math.max(1, form.quantity - 1))
const mixedCardQuantityInput = computed<number>({
  get: () => mixedCardQuantity.value,
  set: (value) => {
    const next = Math.min(mixedCardQuantityMax.value, Math.max(1, Math.floor(toNumber(value))))
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
    (editTargetOrder.value?.status === 'pending' ? editTargetOrder.value.meal_card_quantity : 0),
)
const cardRequirementLabel = computed(() =>
  editTargetOrder.value?.status === 'pending' ? '合并后订单需要' : '订单需要',
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
    (!isMixed.value || mixedCardQuantity.value > 0) &&
    (!hasMoney.value || (form.actual_price.trim().length > 0 && actualPrice.value >= 0)) &&
    !cardAvailabilityError.value &&
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
const orderMoneyPaymentLabel = computed(() => {
  const current = order.value
  return current ? `${paymentText(current.payment_method)}支付份数` : '支付份数'
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
  () => form.quantity,
  (quantity) => {
    if (!editing.value || initializingEditForm.value || !isMixed.value) return
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
  () => form.payment_mode,
  (mode, previous) => {
    if (!editing.value || initializingEditForm.value) return
    if (mode === 'mixed' && previous !== 'mixed') {
      if (form.quantity > 1 && !form.meal_card_quantity) {
        form.meal_card_quantity = '1'
      }
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
      : form.quantity > 1
        ? '1'
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

async function refreshEditContext(): Promise<boolean> {
  const version = ++editContextVersion
  const current = order.value
  const selected = selectedCustomer.value
  editTargetOrder.value = null
  editAvailability.value = null
  if (!current || !selected || !form.order_date || !form.meal_type) return true

  editContextLoading.value = true
  try {
    const target = await findEffectiveOrder(selected.id, form.order_date, form.meal_type, [
      current.id,
    ])
    const excludedIds = [current.id]
    if (target?.status === 'pending') excludedIds.push(target.id)
    const availability = await getMealCardAvailability(selected.id, excludedIds)
    if (version !== editContextVersion) return false
    editTargetOrder.value = target
    editAvailability.value = availability
    return true
  } catch {
    if (version !== editContextVersion) return false
    showToast('订单校验信息加载失败')
    return false
  } finally {
    if (version === editContextVersion) editContextLoading.value = false
  }
}

async function refreshEditContextOnReturn(): Promise<boolean> {
  const previousTargetOrder = editTargetOrder.value
  const previousAvailability = editAvailability.value
  const refreshed = await refreshEditContext()
  if (!refreshed) {
    editTargetOrder.value = previousTargetOrder
    editAvailability.value = previousAvailability
  }
  return refreshed
}

function onQuantityChange(value: string | number): void {
  form.quantity = Math.max(1, Math.floor(toNumber(value)))
}

function goCreateCustomer(): void {
  void pageReturn.navigateTo({ url: '/pages/me/customers/new' })
}

function goTargetOrder(): void {
  if (!editTargetOrder.value) return
  void pageReturn.navigateTo({ url: `/pages/order/detail?id=${editTargetOrder.value.id}` })
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
          )}。合并后，${moneyPaymentText(error.moneyQuantity)}将由 ${formatMoney(
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
    if (goEdit) {
      void pageReturn.navigateTo({ url: `/pages/order/detail?id=${error.orderId}` })
    }
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

async function copyMealCardInfo(): Promise<void> {
  const current = order.value
  if (
    !current ||
    current.status !== 'delivered' ||
    current.meal_card_quantity <= 0 ||
    copyingMealCard.value
  ) {
    return
  }

  copyingMealCard.value = true
  try {
    const template = await getDefaultMealCardMessageTemplate()
    if (!template) {
      const goMaintain = await confirmDialog(
        '还没有默认月卡模板',
        '请先维护一个默认月卡模板，才能复制月卡信息。是否现在去维护？',
      )
      if (goMaintain) {
        void pageReturn.navigateTo({ url: '/pages/me/meal-card-templates/list' })
      }
      return
    }

    const availability = await getMealCardAvailability(current.customer_id)
    const text = renderMealCardTemplate(template.body, {
      usedMeals: current.meal_card_quantity,
      availableMeals: availability.actual_remaining,
    })
    uni.setClipboardData({
      data: text,
      success: () => showToast('月卡信息已复制'),
      fail: () => showToast('月卡信息复制失败'),
    })
  } catch {
    showToast('月卡信息生成失败')
  } finally {
    copyingMealCard.value = false
  }
}

async function markDelivered(): Promise<void> {
  if (!order.value || actioning.value) return
  actioning.value = true
  try {
    const updated = await orderStore.markDelivered(order.value.id)
    order.value = updated
    showToast('已标记配送')
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

onShow(() => {
  void pageReturn.restoreOnShow(refreshEditContextOnReturn)
})
</script>

<template>
  <view class="page">
    <scroll-view
      class="page-scroll"
      scroll-y
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view class="page-content">
        <view v-if="loading" class="state-card state-card--loading">
          <text class="state-card__title">正在读取订单...</text>
          <text class="state-card__desc">核对订单与客户数据</text>
        </view>
        <view v-else-if="!order" class="state-card state-card--empty">
          <text class="state-card__title">订单不存在或已被删除</text>
          <text class="state-card__desc">该订单记录可能已被清理，请返回订单列表查看最新数据。</text>
        </view>
        <template v-else>
          <!-- Read-only View -->
          <template v-if="!editing">
            <view class="hero-card">
              <view class="hero-header">
                <view class="hero-info">
                  <text class="hero-name">{{ customer?.name ?? `客户 #${order.customer_id}` }}</text>
                  <text v-if="customer?.wechat || customer?.phone" class="hero-meta">
                    {{ customer.wechat ? `微信：${customer.wechat}` : `手机：${customer.phone}` }}
                  </text>
                  <text v-else class="hero-meta">仅用于配送沟通</text>
                </view>
                <view class="hero-badge-wrap">
                  <text
                    class="status-chip"
                    :class="{
                      'status-chip--pending': order.status === 'pending',
                      'status-chip--delivered': order.status === 'delivered',
                      'status-chip--cancelled': order.status === 'cancelled',
                    }"
                  >
                    {{ statusText(order.status) }}
                  </text>
                </view>
              </view>
              <view v-if="canEdit" class="hero-action-row">
                <button class="hero-edit-btn" :disabled="actioning" @click="startEdit">
                  编辑订单
                </button>
              </view>
            </view>

            <view class="detail-panel">
              <view class="panel-header">
                <text class="panel-title">订单详情</text>
                <text class="panel-meta">配送与收款记录</text>
              </view>
              <view class="panel-row">
                <text class="row-label">日期</text>
                <text class="row-value">{{ order.order_date }}</text>
              </view>
              <view class="panel-row">
                <text class="row-label">餐次</text>
                <text class="row-value">{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}份</text>
              </view>
              <view class="panel-row">
                <text class="row-label">支付</text>
                <text class="row-value">{{ orderPaymentSummary(order) }}</text>
              </view>
              <view v-if="order.meal_card_quantity > 0" class="panel-row">
                <text class="row-label">次卡次数</text>
                <text class="row-value">{{ order.meal_card_quantity }} 次</text>
              </view>
              <view v-if="orderMoneyQuantity > 0" class="panel-row">
                <text class="row-label">{{ orderMoneyPaymentLabel }}</text>
                <text class="row-value">{{ orderMoneyQuantity }} 份</text>
              </view>
              <view class="panel-row">
                <text class="row-label">实际单价</text>
                <text class="row-value">{{ formatMoney(order.unit_price) }}</text>
              </view>
              <view class="panel-row">
                <text class="row-label">实际金额</text>
                <text class="row-value row-value--accent">{{ formatMoney(order.amount) }}</text>
              </view>
              <view class="panel-row panel-row--top">
                <text class="row-label">备注</text>
                <text class="row-value row-value--multiline">{{ order.note || '—' }}</text>
              </view>
              <view class="panel-row">
                <text class="row-label">创建时间</text>
                <text class="row-value">{{ dayjs(order.created_at).format('YYYY-MM-DD HH:mm:ss') }}</text>
              </view>
              <view v-if="order.cancelled_at" class="panel-row">
                <text class="row-label">取消时间</text>
                <text class="row-value">{{ order.cancelled_at }}</text>
              </view>
            </view>

            <view v-if="customer" class="detail-panel">
              <view class="panel-header">
                <text class="panel-title">客户联系</text>
                <text class="panel-meta">仅用于配送沟通</text>
              </view>
              <view class="panel-row">
                <text class="row-label">微信</text>
                <text class="row-value">{{ customer.wechat || '—' }}</text>
              </view>
              <view class="panel-row">
                <text class="row-label">手机</text>
                <text class="row-value">{{ customer.phone || '—' }}</text>
              </view>
            </view>

            <view class="actions-section">
              <button
                v-if="order.status === 'pending'"
                class="action-btn action-btn--primary"
                :disabled="actioning"
                @click="markDelivered"
              >
                标记已配送
              </button>

              <view v-if="order.status === 'pending'" class="action-btn-row">
                <button
                  class="action-btn action-btn--secondary"
                  :disabled="actioning"
                  @click="copyOrderInfo"
                >
                  复制信息
                </button>
                <button
                  class="action-btn action-btn--secondary"
                  :disabled="actioning"
                  @click="cancelOrder"
                >
                  取消订单
                </button>
              </view>

              <view v-else-if="order.status === 'delivered'" class="action-btn-group">
                <button
                  v-if="order.meal_card_quantity > 0"
                  class="action-btn action-btn--secondary"
                  :disabled="actioning || copyingMealCard"
                  @click="copyMealCardInfo"
                >
                  {{ copyingMealCard ? '生成中...' : '复制月卡信息' }}
                </button>
                <button
                  class="action-btn action-btn--secondary"
                  :disabled="actioning"
                  @click="copyOrderInfo"
                >
                  复制信息
                </button>
              </view>

              <view v-else-if="order.status === 'cancelled'" class="action-btn-group">
                <button
                  class="action-btn action-btn--secondary"
                  :disabled="actioning"
                  @click="copyOrderInfo"
                >
                  复制信息
                </button>
              </view>
            </view>

            <view class="danger-zone">
              <text class="danger-zone__title">危险操作</text>
              <text class="danger-zone__desc">删除后无法恢复；已配送订单中的次卡使用次数会按扣次明细精确回滚。</text>
              <button
                class="action-btn action-btn--danger-outline"
                :disabled="actioning"
                @click="deleteOrder"
              >
                删除订单
              </button>
            </view>
          </template>

          <!-- Edit Form View -->
          <uni-forms
            v-else
            ref="formRef"
            class="form"
            :model-value="form"
            :rules="rules"
            validate-trigger="blur"
            label-width="100px"
            label-align="left"
          >
            <view class="order-card">
              <view class="entry-section entry-section--schedule">
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
                    class="meal-choice"
                    mode="button"
                    :localdata="mealTypeOptions"
                  >
                    <template #option="{ item, selected, disabled }">
                      <view
                        class="choice-option"
                        :class="{ 'choice-option--selected': selected, 'choice-option--disabled': disabled }"
                      >
                        <HejiIcon :name="item.icon" :size="18" />
                        <text>{{ item.text }}</text>
                      </view>
                    </template>
                  </uni-data-checkbox>
                </uni-forms-item>
              </view>

              <view class="entry-divider" />

              <view class="entry-section entry-section--customer">
                <uni-forms-item name="customer_id" label="客户" required>
                  <CustomerPicker
                    v-model="selectedCustomer"
                    show-create
                    @create="goCreateCustomer"
                  />
                </uni-forms-item>

                <view v-if="editContextLoading" class="context-box">正在检查目标餐次...</view>
                <view
                  v-else-if="editTargetOrder?.status === 'pending'"
                  class="context-box context-box--info"
                >
                  <view class="context-box__main">
                    <text class="context-box__title">保存时将与已有待配送订单 #{{ editTargetOrder.id }} 合并</text>
                    <text class="context-meta">
                      已有 {{ editTargetOrder.quantity }} 份 · {{ orderPaymentSummary(editTargetOrder) }}
                    </text>
                  </view>
                  <button class="link-button" @click="goTargetOrder">
                    <text>查看目标订单</text>
                    <HejiIcon name="ChevronRight" :size="16" />
                  </button>
                </view>
                <view
                  v-else-if="editTargetOrder?.status === 'delivered'"
                  class="context-box context-box--danger"
                >
                  <view class="context-box__main">
                    <text class="context-box__title">目标客户本餐次已经配送完成，不能修改到该餐次。</text>
                  </view>
                  <button class="link-button" @click="goTargetOrder">
                    <text>查看已配送订单</text>
                    <HejiIcon name="ChevronRight" :size="16" />
                  </button>
                </view>
              </view>

              <view class="entry-divider" />

              <view class="entry-section entry-section--order">
                <uni-forms-item name="quantity" label="总份数" required>
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
                  <uni-data-checkbox
                    v-model="form.payment_mode"
                    class="payment-grid"
                    mode="button"
                    :localdata="paymentOptions"
                  >
                    <template #option="{ item, selected, disabled }">
                      <view
                        class="choice-option"
                        :class="{ 'choice-option--selected': selected, 'choice-option--disabled': disabled }"
                      >
                        <HejiIcon :name="item.icon" :size="18" />
                        <text>{{ item.text }}</text>
                      </view>
                    </template>
                  </uni-data-checkbox>
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
                    >
                      <template #option="{ item, selected, disabled }">
                        <view
                          class="choice-option"
                          :class="{ 'choice-option--selected': selected, 'choice-option--disabled': disabled }"
                        >
                          <HejiIcon :name="item.icon" :size="18" />
                          <text>{{ item.text }}</text>
                        </view>
                      </template>
                    </uni-data-checkbox>
                  </uni-forms-item>
                </view>

                <view
                  v-if="requiredCardQuantity > 0 && editAvailability"
                  class="card-status"
                >
                  <text class="card-status-main">
                    当前可用 {{ editAvailability.available }} 次 · {{ cardRequirementLabel }}
                    {{ requiredCardQuantity }} 次
                  </text>
                  <text class="card-status-detail">
                    卡内 {{ editAvailability.actual_remaining }} 次 · 已预占
                    {{ editAvailability.reserved_by_others }} 次
                  </text>
                  <text v-if="cardAvailabilityError" class="inline-error">
                    {{ cardAvailabilityError }}
                  </text>
                </view>

                <view v-if="hasMoney" class="price-section">
                  <uni-forms-item
                    name="actual_price"
                    label="实际单价"
                    required
                    class="price-editor"
                  >
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
                  <text class="price-hint">{{ priceHint(selectedCustomer, form.meal_type) }}</text>
                </view>
              </view>

              <view class="entry-divider" />

              <view class="entry-section entry-section--note">
                <uni-forms-item name="note" label="备注">
                  <uni-easyinput
                    v-model="form.note"
                    class="note-input"
                    type="textarea"
                    placeholder="可不填"
                  />
                </uni-forms-item>
              </view>
            </view>

            <view class="form-scroll-spacer" />
          </uni-forms>
        </template>
      </view>
    </scroll-view>

    <!-- Bottom Fixed Confirmation Bar for Edit Mode -->
    <view v-if="order && editing" class="submit-bar">
      <view class="submit-summary">
        <text class="submit-label">{{ hasMoney ? '本次实际金额' : '本次支付方式' }}</text>
        <view class="submit-value-row">
          <text class="submit-value" :class="{ 'submit-value--accent': hasMoney }">
            {{ hasMoney ? formatMoney(editTotalAmount) : '次卡支付' }}
          </text>
        </view>
        <text class="submit-meta">
          {{
            isMixed
              ? `次卡 ${cardQuantity} 次 · ${moneyPaymentSummary}`
              : hasMoney
                ? moneyPaymentSummary
                : '金额记 ¥0.00'
          }}
        </text>
      </view>
      <view class="edit-submit-actions">
        <button class="edit-btn edit-btn--secondary" @click="cancelEdit">取消编辑</button>
        <button class="edit-btn edit-btn--primary" :disabled="!canSaveEdit" @click="saveEdit">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </view>
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
  padding: 0 $hej-space-1;
}

.page-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.page-content {
  padding: $hej-space-3 0 $hej-space-6;
}

/* State Cards */
.state-card {
  padding: 80rpx $hej-space-5;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  text-align: center;
  box-shadow: $hej-shadow-panel;
}

.state-card__title {
  display: block;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.state-card__desc {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

/* Hero Card */
.hero-card {
  margin-bottom: $hej-space-3;
  padding: $hej-space-5;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.hero-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $hej-space-3;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-name {
  display: block;
  overflow: hidden;
  color: $hej-color-text;
  font-size: 38rpx;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-meta {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.hero-badge-wrap {
  flex: 0 0 auto;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx $hej-space-3;
  border-radius: $hej-radius-control;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.3;
  white-space: nowrap;
}

.status-chip--pending {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.status-chip--delivered {
  background: $hej-color-delivered-soft;
  color: $hej-color-delivered;
}

.status-chip--cancelled {
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
}

.hero-action-row {
  margin-top: $hej-space-4;
  padding-top: $hej-space-4;
  border-top: 1rpx solid $hej-color-border;
  display: flex;
  justify-content: flex-end;
}

.hero-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 180rpx;
  height: 64rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  box-sizing: border-box;
  color: $hej-color-text;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 64rpx;
  text-align: center;
  white-space: nowrap;
}

.hero-edit-btn::after {
  border: 0;
}

/* Detail Panels */
.detail-panel {
  margin-bottom: $hej-space-3;
  padding: $hej-space-4 $hej-space-5;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.panel-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: $hej-space-3;
  padding-bottom: $hej-space-3;
  border-bottom: 1rpx solid $hej-color-border;
  margin-bottom: $hej-space-1;
}

.panel-title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
}

.panel-meta {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.panel-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
  padding: $hej-space-3 0;
  border-bottom: 1rpx solid rgba(232, 230, 220, 0.6);
  font-size: $hej-font-body;
}

.panel-row:last-child {
  border-bottom: 0;
  padding-bottom: $hej-space-1;
}

.panel-row--top {
  align-items: flex-start;
}

.row-label {
  flex: 0 0 auto;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}

.row-value {
  flex: 1;
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 500;
  text-align: right;
  overflow-wrap: anywhere;
}

.row-value--accent {
  color: $hej-color-accent;
  font-weight: 700;
}

.row-value--multiline {
  max-width: 70%;
  white-space: normal;
}

/* Actions Section */
.actions-section {
  margin-top: $hej-space-4;
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.action-btn-row {
  display: flex;
  gap: $hej-space-3;
}

.action-btn-row .action-btn {
  flex: 1;
}

.action-btn-group {
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: $hej-radius-control;
  box-sizing: border-box;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
  white-space: nowrap;
}

.action-btn::after {
  border: 0;
}

.action-btn--primary {
  background: $hej-color-accent;
  color: $hej-color-surface;
}

.action-btn--secondary {
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  color: $hej-color-text;
  box-shadow: $hej-shadow-panel;
}

.action-btn--danger-outline {
  border: 1rpx solid rgba(141, 69, 69, 0.4);
  background: $hej-color-surface;
  color: $hej-color-danger;
}

/* Danger Zone */
.danger-zone {
  margin-top: $hej-space-6;
  padding: $hej-space-5;
  border-radius: $hej-radius-panel;
  border: 1rpx dashed rgba(141, 69, 69, 0.3);
  background: $hej-color-surface;
}

.danger-zone__title {
  display: block;
  color: $hej-color-danger;
  font-size: $hej-font-body;
  font-weight: 700;
}

.danger-zone__desc {
  display: block;
  margin: $hej-space-2 0 $hej-space-4;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

/* Form Styles */
.form {
  --order-label-width: 100px;
  display: block;
}

.form :deep(.uni-forms-item) {
  align-items: center;
  margin-bottom: 0;
  padding: $hej-space-3 0;
}

.form :deep(.uni-forms-item__label) {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 500;
}

.form :deep(.uni-forms-item__content) {
  min-width: 0;
}

.order-card {
  overflow: hidden;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.date-picker {
  display: block;
  width: 100%;
}

.date-picker :deep(.uni-date-x) {
  background-color: $hej-color-control !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  height: 72rpx !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
}

.date-picker :deep(.uni-date__x-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
}

.meal-choice :deep(.checklist-group),
.money-method-choice :deep(.checklist-group) {
  display: flex;
  flex-wrap: nowrap;
  gap: $hej-space-2;
}

.payment-grid :deep(.checklist-group) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $hej-space-2;
}

.meal-choice :deep(.checklist-box),
.payment-grid :deep(.checklist-box),
.money-method-choice :deep(.checklist-box) {
  justify-content: center;
  align-items: center;
  min-width: 0;
  height: 72rpx;
  margin: 0;
  padding: 0 $hej-space-2;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control;
  background: $hej-color-control !important;
  box-sizing: border-box;
}

.meal-choice :deep(.checklist-box),
.money-method-choice :deep(.checklist-box) {
  flex: 1;
}

.meal-choice :deep(.radio__inner),
.meal-choice :deep(.checkbox__inner),
.payment-grid :deep(.radio__inner),
.payment-grid :deep(.checkbox__inner),
.money-method-choice :deep(.radio__inner),
.money-method-choice :deep(.checkbox__inner) {
  display: none !important;
}

.meal-choice :deep(.checklist-box.is-checked),
.payment-grid :deep(.checklist-box.is-checked),
.money-method-choice :deep(.checklist-box.is-checked) {
  border: 1rpx solid $hej-color-accent !important;
  background: $hej-color-accent-soft !important;
}

.meal-choice :deep(.checklist-text),
.payment-grid :deep(.checklist-text),
.money-method-choice :deep(.checklist-text) {
  margin-left: 0;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
}

.choice-option {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 500;
  line-height: 1.3;
  white-space: nowrap;
}

.choice-option--selected {
  color: $hej-color-accent;
  font-weight: 600;
}

.choice-option--disabled {
  opacity: 0.45;
}

.meal-choice :deep(.checklist-box.is-checked .checklist-text),
.payment-grid :deep(.checklist-box.is-checked .checklist-text),
.money-method-choice :deep(.checklist-box.is-checked .checklist-text) {
  color: $hej-color-accent !important;
  font-weight: 600;
}

.entry-section {
  padding: $hej-space-4 $hej-space-5;
}

.entry-section--schedule :deep(.uni-forms-item:last-child) {
  margin-bottom: 0;
}

.entry-section--customer :deep(.uni-forms-item) {
  margin-bottom: 0;
}

.entry-section--customer .context-box {
  margin-top: $hej-space-3;
}

.entry-section--note {
  padding-top: $hej-space-3;
  padding-bottom: $hej-space-3;
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
  padding: $hej-space-3 $hej-space-4;
  border-radius: $hej-radius-control;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.context-box {
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
}

.context-box--info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
  border: 1rpx solid rgba(101, 119, 137, 0.15);
}

.context-box__main {
  flex: 1;
  min-width: 0;
}

.context-box__title {
  display: block;
  color: $hej-color-pending;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.context-box--danger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  background: $hej-color-danger-soft;
  color: $hej-color-danger;
  border: 1rpx solid rgba(141, 69, 69, 0.15);
}

.context-box--danger .context-box__title {
  color: $hej-color-danger;
}

.context-meta {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.link-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: auto;
  min-width: 200rpx;
  height: 64rpx;
  margin: 0;
  padding: 0 $hej-space-5;
  border: 1rpx solid rgba(101, 119, 137, 0.3);
  border-radius: $hej-radius-control;
  background: $hej-color-control;
  box-sizing: border-box;
  color: $hej-color-pending;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 64rpx;
  text-align: center;
  white-space: nowrap;
}

.context-box--danger .link-button {
  border-color: rgba(141, 69, 69, 0.3);
  color: $hej-color-danger;
}

.link-button::after {
  border: 0;
}

.mixed-payment-panel {
  margin: 0 (-$hej-space-5) $hej-space-4;
  padding: $hej-space-3 $hej-space-5;
  background: $hej-color-surface;
}

.quantity-box :deep(.uni-numbox-btns),
.mixed-count-box :deep(.uni-numbox-btns) {
  background: $hej-color-surface-subtle !important;
  border-radius: $hej-radius-control;
  height: 72rpx !important;
  line-height: 72rpx !important;
}

.quantity-box :deep(.uni-numbox__value),
.mixed-count-box :deep(.uni-numbox__value) {
  background: transparent !important;
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  font-weight: 600 !important;
  height: 72rpx !important;
}

.card-status {
  margin-bottom: $hej-space-4;
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
  height: 72rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-control;
  box-sizing: border-box;
}

.amount-prefix {
  margin-right: $hej-space-2;
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
  padding-top: $hej-space-3;
  border-top: 1rpx solid $hej-color-border;
}

.price-editor {
  margin-bottom: 0 !important;
}

.price-hint {
  display: block;
  margin: $hej-space-2 0 0 var(--order-label-width);
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

.note-input :deep(.uni-easyinput__content) {
  background: $hej-color-control !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  min-height: 72rpx !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
}

.form-scroll-spacer {
  height: $hej-space-6;
}

/* Submit Bar */
.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
  padding: $hej-space-4 $hej-space-5 calc($hej-space-4 + constant(safe-area-inset-bottom));
  padding: $hej-space-4 $hej-space-5 calc($hej-space-4 + env(safe-area-inset-bottom));
  border-top: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.submit-summary {
  flex: 1;
  min-width: 0;
}

.submit-label {
  display: block;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.submit-value-row {
  display: flex;
  align-items: baseline;
  gap: $hej-space-1;
  margin-top: 2rpx;
  overflow: hidden;
}

.submit-value {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
  white-space: nowrap;
}

.submit-value--accent {
  color: $hej-color-accent;
  font-size: 38rpx;
}

.submit-meta {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-submit-actions {
  display: flex;
  flex: 0 0 auto;
  gap: $hej-space-3;
}

.edit-btn {
  height: 88rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 0;
  border-radius: $hej-radius-control;
  box-sizing: border-box;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
  white-space: nowrap;
}

.edit-btn::after {
  border: 0;
}

.edit-btn--primary {
  min-width: 176rpx;
  background: $hej-color-accent;
  color: $hej-color-surface;
}

.edit-btn--secondary {
  min-width: 176rpx;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
}

.action-btn:active,
.hero-edit-btn:active,
.edit-btn:active {
  opacity: 0.82;
}

.action-btn:focus-visible,
.hero-edit-btn:focus-visible,
.edit-btn:focus-visible {
  outline: 2rpx solid $hej-color-text;
  outline-offset: -4rpx;
}

.action-btn[disabled],
.hero-edit-btn[disabled],
.edit-btn[disabled] {
  opacity: 0.5;
}
</style>
