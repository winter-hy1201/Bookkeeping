<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AmountInput from '../../components/AmountInput.vue'
import CustomerPicker from '../../components/CustomerPicker.vue'
import { getCustomer } from '../../api/customers'
import { listCards } from '../../api/meal-cards'
import { getOrder, updateOrderPayment } from '../../api/orders'
import { InsufficientCardError } from '../../api/errors'
import { useOrderStore } from '../../stores/order'
import type { Customer, MealCard, MealType, Order, PaymentMethod } from '../../types/domain'
import { divideMoney, formatMoney, multiplyMoney } from '../../utils/format'
import dayjs from 'dayjs'
import {
  actionSheet,
  confirmDialog,
  customerPrice,
  mealTypeText,
  paymentText,
  priceHint,
  showToast,
  statusText,
  toNumber,
} from '../../utils/ui'

const orderStore = useOrderStore()
const order = ref<Order | null>(null)
const customer = ref<Customer | null>(null)
const loading = ref(false)
const editing = ref(false)
const saving = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const editDate = ref('')
const editMealType = ref<MealType>('lunch')
const editQuantity = ref(1)
const editPrice = ref(0)
const editPaymentMethod = ref<PaymentMethod>('wechat')
const editActiveCards = ref<MealCard[]>([])
const editNote = ref('')
const userEditedPrice = ref(false)
const initializingEditForm = ref(false)

const mealTypeOptions = [
  { text: '午餐', value: 'lunch' },
  { text: '晚餐', value: 'dinner' },
]
const paymentOptions = [
  { text: '微信', value: 'wechat' },
  { text: '现金', value: 'cash' },
  { text: '次卡', value: 'meal_card' },
]

const canEdit = computed(() => order.value?.status === 'pending')
const isEditMealCard = computed(() => editPaymentMethod.value === 'meal_card')
const editTotalAmount = computed(() =>
  isEditMealCard.value ? 0 : multiplyMoney(editPrice.value, editQuantity.value),
)
const cardRemaining = (card: MealCard): number => card.total_meals - card.used_meals
const editActiveCard = computed(
  () =>
    editActiveCards.value.find((card) => cardRemaining(card) >= editQuantity.value) ??
    editActiveCards.value.find((card) => cardRemaining(card) > 0) ??
    null,
)
const canSaveEdit = computed(() => {
  if (
    !order.value ||
    !selectedCustomer.value ||
    !editDate.value ||
    editQuantity.value <= 0 ||
    saving.value
  ) {
    return false
  }
  if (isEditMealCard.value) return editActiveCard.value !== null
  return editPrice.value >= 0
})
const copyInfoText = computed(() => {
  const current = order.value
  if (!current) return ''
  const customerName = customer.value?.name ?? `客户 #${current.customer_id}`
  const note = current.note?.trim()
  return [customerName, `${current.quantity}份`, note].filter(Boolean).join(' ')
})

const fallbackUnitPrice = computed(() => {
  const current = order.value
  if (!current) return 0
  return customerPrice(customer.value, current.meal_type) ?? current.unit_price
})

const fallbackAmount = computed(() => {
  const current = order.value
  if (!current) return 0
  return multiplyMoney(fallbackUnitPrice.value, current.quantity)
})

watch([selectedCustomer, editMealType], () => {
  if (!editing.value || initializingEditForm.value) return
  userEditedPrice.value = false
  const price = customerPrice(selectedCustomer.value, editMealType.value)
  editPrice.value = price ?? 0
  if (editPaymentMethod.value === 'meal_card') {
    void loadEditActiveCard()
  }
})

watch(editPaymentMethod, async (value) => {
  if (!editing.value || initializingEditForm.value) return
  if (value !== 'meal_card') {
    editActiveCards.value = []
    const price = customerPrice(selectedCustomer.value, editMealType.value)
    if (!userEditedPrice.value) editPrice.value = price ?? 0
    return
  }
  await loadEditActiveCard()
})

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

async function loadEditActiveCard(): Promise<void> {
  if (!selectedCustomer.value) {
    editPaymentMethod.value = 'wechat'
    editActiveCards.value = []
    showToast('请先选择客户')
    return
  }
  try {
    editActiveCards.value = (await listCards(selectedCustomer.value.id))
      .filter((card) => card.status === 'active' && cardRemaining(card) > 0)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id)
    if (!editActiveCard.value) {
      editPaymentMethod.value = 'wechat'
      showToast('该客户无可用次卡')
    }
  } catch {
    editPaymentMethod.value = 'wechat'
    editActiveCards.value = []
    showToast('次卡加载失败')
  }
}

async function startEdit(): Promise<void> {
  if (!order.value || !customer.value || !canEdit.value) return
  initializingEditForm.value = true
  editing.value = true
  selectedCustomer.value = customer.value
  editDate.value = order.value.order_date
  editMealType.value = order.value.meal_type
  editQuantity.value = order.value.quantity
  editPrice.value = order.value.unit_price
  editPaymentMethod.value = order.value.payment_method
  editNote.value = order.value.note ?? ''
  userEditedPrice.value = true
  editActiveCards.value = []

  try {
    if (order.value.payment_method === 'meal_card') {
      await loadEditActiveCard()
    }
  } catch {
    showToast('次卡加载失败')
  } finally {
    initializingEditForm.value = false
  }
}

function cancelEdit(): void {
  editing.value = false
}

function onQuantityChange(value: string | number): void {
  editQuantity.value = Math.max(1, Math.floor(toNumber(value)))
}

function onPriceChange(value: number): void {
  userEditedPrice.value = true
  editPrice.value = value
}

async function saveEdit(): Promise<void> {
  if (!canSaveEdit.value || !order.value || !selectedCustomer.value) return
  saving.value = true
  try {
    const card = editActiveCard.value
    const mealCardUnitPrice = card ? divideMoney(card.amount, card.total_meals) : undefined
    const updated = await orderStore.update(order.value.id, {
      customer_id: selectedCustomer.value.id,
      order_date: editDate.value,
      meal_type: editMealType.value,
      quantity: editQuantity.value,
      payment_method: editPaymentMethod.value,
      unit_price: isEditMealCard.value ? mealCardUnitPrice : editPrice.value,
      amount: isEditMealCard.value ? 0 : editTotalAmount.value,
      meal_card_id: isEditMealCard.value ? (card?.id ?? null) : null,
      note: editNote.value.trim() || null,
    })
    order.value = updated
    customer.value = await getCustomer(updated.customer_id)
    editing.value = false
    showToast('修改已保存')
  } catch {
    showToast('订单修改失败')
  } finally {
    saving.value = false
  }
}

function goCreateCustomer(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

async function cancelOrder(): Promise<void> {
  if (!order.value) return
  const ok = await confirmDialog('确认取消该订单？', '取消后不计入收入和订单数。')
  if (!ok) return
  try {
    await orderStore.cancel(order.value.id)
    showToast('已取消')
    uni.navigateBack()
  } catch {
    showToast('取消失败')
  }
}

async function deleteOrder(): Promise<void> {
  if (!order.value) return
  const ok = await confirmDialog(
    '删除订单？',
    '删除后无法恢复；已配送次卡订单会回滚已扣次数。',
  )
  if (!ok) return
  try {
    const deleted = await orderStore.remove(order.value.id)
    if (!deleted) {
      showToast('订单不存在')
      return
    }
    showToast('已删除')
    uni.navigateBack()
  } catch {
    showToast('删除失败')
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
  if (!order.value) return
  try {
    await orderStore.markDelivered(order.value.id)
    showToast('已标记配送')
    uni.navigateBack()
  } catch (error) {
    if (error instanceof InsufficientCardError) {
      await handleInsufficientCard()
      return
    }
    showToast('标记配送失败')
  }
}

async function handleInsufficientCard(): Promise<void> {
  if (!order.value) return
  const amount = fallbackAmount.value
  const index = await actionSheet([
    `改为微信 ${formatMoney(amount)}`,
    `改为现金 ${formatMoney(amount)}`,
    '取消标记',
  ])
  if (index === null || index === 2) return
  const method = index === 0 ? 'wechat' : 'cash'
  try {
    await updateOrderPayment(order.value.id, {
      payment_method: method,
      unit_price: fallbackUnitPrice.value,
      amount,
      meal_card_id: null,
    })
    await orderStore.markDelivered(order.value.id)
    showToast('已改支付并标记配送')
    uni.navigateBack()
  } catch {
    showToast('改支付失败')
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
        <button v-if="canEdit && !editing" class="edit-button" @click="startEdit">编辑</button>
      </view>

      <view v-if="editing" class="form">
        <CustomerPicker v-model="selectedCustomer" show-create @create="goCreateCustomer" />

        <view class="field">
          <text class="label">日期</text>
          <uni-datetime-picker v-model="editDate" class="date-picker" type="date" />
        </view>

        <view class="field">
          <text class="label">餐次</text>
          <uni-data-checkbox
            v-model="editMealType"
            class="segmented"
            mode="button"
            :localdata="mealTypeOptions"
            selected-color="#007aff"
          />
        </view>

        <view class="field">
          <text class="label">份数</text>
          <uni-number-box
            v-model="editQuantity"
            class="number-box"
            :min="1"
            :max="99"
            :width="72"
            @change="onQuantityChange"
          />
        </view>

        <view v-if="!isEditMealCard" class="hint">
          {{ priceHint(selectedCustomer, editMealType) }}
        </view>
        <AmountInput
          v-if="!isEditMealCard"
          :model-value="editPrice"
          label="实际价"
          placeholder="请填单价"
          @update:model-value="onPriceChange"
        />

        <view class="field">
          <text class="label">支付</text>
          <uni-data-checkbox
            v-model="editPaymentMethod"
            class="payment-grid"
            mode="button"
            :localdata="paymentOptions"
            selected-color="#007aff"
          />
        </view>

        <view v-if="isEditMealCard && editActiveCard" class="card-box">
          次卡共剩
          {{ editActiveCards.reduce((sum, card) => sum + cardRemaining(card), 0) }}/{{
            editActiveCards.reduce((sum, card) => sum + card.total_meals, 0)
          }}，参考次均 {{ formatMoney(divideMoney(editActiveCard.amount, editActiveCard.total_meals)) }}
        </view>

        <view class="field field--top">
          <text class="label">备注</text>
          <uni-easyinput
            v-model="editNote"
            class="textarea"
            type="textarea"
            placeholder="可不填"
            :input-border="false"
          />
        </view>

        <view class="total-row">
          <text>合计</text>
          <text>{{
            isEditMealCard ? '次卡支付，订单金额记 0' : formatMoney(editTotalAmount)
          }}</text>
        </view>

        <view class="actions">
          <button class="secondary" @click="cancelEdit">取消编辑</button>
          <button class="primary" :disabled="!canSaveEdit" @click="saveEdit">保存修改</button>
        </view>
      </view>

      <template v-else>
        <view class="panel">
          <view class="row"
            ><text>日期</text><text>{{ order.order_date }}</text></view
          >
          <view class="row"
            ><text>餐次</text
            ><text>{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text></view
          >
          <view class="row"
            ><text>支付</text><text>{{ paymentText(order.payment_method) }}</text></view
          >
          <view class="row"
            ><text>单价</text><text>{{ formatMoney(order.unit_price) }}</text></view
          >
          <view class="row"
            ><text>金额</text
            ><text>{{
              order.payment_method === 'meal_card' ? '次卡订单记 0' : formatMoney(order.amount)
            }}</text></view
          >
          <view class="row"
            ><text>备注</text><text>{{ order.note || '—' }}</text></view
          >
          <view class="row"
            ><text>创建</text
            ><text>{{ dayjs(order.created_at).format('YYYY-MM-DD HH:mm:ss') }}</text></view
          >
          <view v-if="order.cancelled_at" class="row"
            ><text>取消</text><text>{{ order.cancelled_at }}</text></view
          >
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
          <button class="secondary" @click="copyOrderInfo">复制信息</button>
          <button v-if="order.status === 'pending'" class="primary" @click="markDelivered">
            标记已配送
          </button>
          <button v-if="order.status === 'pending'" class="danger" @click="cancelOrder">
            取消订单
          </button>
        </view>
        <view class="danger-zone">
          <button class="danger-outline" @click="deleteOrder">删除订单</button>
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

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.field,
.total-row {
  display: flex;
  align-items: center;
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

.date-picker,
.segmented,
.payment-grid,
.number-box,
.textarea {
  flex: 1;
}

.textarea {
  min-height: 160rpx;
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
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
  background: #f8f9fb;
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
