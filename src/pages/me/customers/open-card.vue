<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AmountInput from '../../../components/AmountInput.vue'
import { getCustomer } from '../../../api/customers'
import { listCards, openCard } from '../../../api/meal-cards'
import type { Customer, MealCard } from '../../../types/domain'
import { confirmDialog, showToast, toNumber } from '../../../utils/ui'

const customerId = ref<number | null>(null)
const customer = ref<Customer | null>(null)
const activeCards = ref<MealCard[]>([])
const totalMeals = ref(20)
const amount = ref(0)
const saving = ref(false)

const canSave = computed(
  () =>
    customerId.value !== null &&
    totalMeals.value > 0 &&
    Number.isFinite(amount.value) &&
    amount.value >= 0 &&
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

async function load(id: number): Promise<void> {
  customerId.value = id
  try {
    customer.value = await getCustomer(id)
    activeCards.value = (await listCards(id)).filter((card) => card.status === 'active')
    if (activeCardSummary.value.count > 0) {
      const ok = await confirmDialog(
        '该客户已有 active 次卡',
        `当前 ${activeCardSummary.value.count} 张共剩 ${activeCardSummary.value.remaining}/${activeCardSummary.value.total}，是否继续开新卡？`,
      )
      if (!ok) uni.navigateBack()
    }
  } catch {
    showToast('开卡页面加载失败')
  }
}

function onTotalMeals(value: string | number): void {
  totalMeals.value = Math.max(1, Math.floor(toNumber(value)))
}

async function save(): Promise<void> {
  if (!canSave.value || customerId.value === null) return
  saving.value = true
  try {
    await openCard({
      customer_id: customerId.value,
      total_meals: totalMeals.value,
      amount: amount.value,
    })
    showToast('开卡成功')
    uni.navigateBack()
  } catch {
    showToast('开卡失败')
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.customerId)
  if (Number.isFinite(id) && id > 0) {
    void load(id)
  } else {
    showToast('客户参数无效')
  }
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="hero">
      <text class="title">开次卡</text>
      <text class="subtitle">{{ customer?.name ?? '客户' }}</text>
    </view>
    <view class="form">
      <view class="field">
        <text class="label">总次数</text>
        <uni-number-box
          v-model="totalMeals"
          class="number-box"
          :min="1"
          :max="999"
          :width="72"
          @change="onTotalMeals"
        />
      </view>
      <AmountInput v-model="amount" label="金额" placeholder="例如 300" />
      <button class="save" :disabled="!canSave" @click="save">保存</button>
    </view>
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

.subtitle {
  margin-top: 8rpx;
  color: #8f8f94;
  font-size: 26rpx;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 24rpx;
}

.field {
  display: flex;
  align-items: center;
  min-height: 88rpx;
}

.label {
  flex: 0 0 140rpx;
  color: #333333;
  font-size: 28rpx;
}

.number-box {
  flex: 1;
}

.save {
  margin-top: 20rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
