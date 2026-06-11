<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCustomer } from '../../api/customers'
import { getOrder, updateOrderPayment } from '../../api/orders'
import { InsufficientCardError } from '../../api/errors'
import { useOrderStore } from '../../stores/order'
import type { Customer, Order } from '../../types/domain'
import { formatMoney } from '../../utils/format'
import {
  actionSheet,
  confirmDialog,
  customerPrice,
  mealTypeText,
  paymentText,
  showToast,
  statusText,
} from '../../utils/ui'

const orderStore = useOrderStore()
const order = ref<Order | null>(null)
const customer = ref<Customer | null>(null)
const loading = ref(false)

const fallbackUnitPrice = computed(() => {
  const current = order.value
  if (!current) return 0
  return customerPrice(customer.value, current.meal_type) ?? current.unit_price
})

const fallbackAmount = computed(() => {
  const current = order.value
  if (!current) return 0
  return fallbackUnitPrice.value * current.quantity
})

async function load(id: number): Promise<void> {
  loading.value = true
  try {
    order.value = await getOrder(id)
    customer.value = order.value ? await getCustomer(order.value.customer_id) : null
  } catch {
    showToast('订单详情加载失败')
  } finally {
    loading.value = false
  }
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
        <text class="name">{{ customer?.name ?? `客户 #${order.customer_id}` }}</text>
        <text class="status">{{ statusText(order.status) }}</text>
      </view>

      <view class="panel">
        <view class="row"><text>日期</text><text>{{ order.order_date }}</text></view>
        <view class="row"><text>餐次</text><text>{{ mealTypeText(order.meal_type) }} × {{ order.quantity }}</text></view>
        <view class="row"><text>支付</text><text>{{ paymentText(order.payment_method) }}</text></view>
        <view class="row"><text>单价</text><text>{{ formatMoney(order.unit_price) }}</text></view>
        <view class="row"><text>金额</text><text>{{ order.payment_method === 'meal_card' ? '次卡订单记 0' : formatMoney(order.amount) }}</text></view>
        <view class="row"><text>备注</text><text>{{ order.note || '—' }}</text></view>
        <view class="row"><text>创建</text><text>{{ order.created_at }}</text></view>
        <view v-if="order.cancelled_at" class="row"><text>取消</text><text>{{ order.cancelled_at }}</text></view>
      </view>

      <view v-if="customer" class="panel">
        <view class="row"><text>微信</text><text>{{ customer.wechat || '—' }}</text></view>
        <view class="row"><text>手机</text><text>{{ customer.phone || '—' }}</text></view>
      </view>

      <view v-if="order.status === 'pending'" class="actions">
        <button class="primary" @click="markDelivered">标记已配送</button>
        <button class="danger" @click="cancelOrder">取消订单</button>
      </view>
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
.panel {
  margin-bottom: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.name {
  color: #222222;
  font-size: 38rpx;
  font-weight: 700;
}

.status {
  color: #007aff;
  font-size: 26rpx;
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

.primary,
.danger {
  flex: 1;
  border-radius: 12rpx;
  color: #ffffff;
  font-size: 30rpx;
}

.primary {
  background: #007aff;
}

.danger {
  background: #ee0a24;
}

.empty {
  padding: 120rpx 0;
  color: #8f8f94;
  font-size: 28rpx;
  text-align: center;
}
</style>
