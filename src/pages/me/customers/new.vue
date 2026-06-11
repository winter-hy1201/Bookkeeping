<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AmountInput from '../../../components/AmountInput.vue'
import { getCustomer } from '../../../api/customers'
import { useCustomerStore } from '../../../stores/customer'
import { showToast, toNumber } from '../../../utils/ui'

const customerStore = useCustomerStore()
const id = ref<number | null>(null)
const name = ref('')
const phone = ref('')
const wechat = ref('')
const lunchPrice = ref(0)
const dinnerPrice = ref(0)
const lunchTouched = ref(false)
const dinnerTouched = ref(false)
const discountRate = ref(1)
const note = ref('')
const saving = ref(false)

const isEdit = computed(() => id.value !== null)
const canSave = computed(() => name.value.trim().length > 0 && !saving.value)
const discountPercent = computed({
  get: () => Math.round(discountRate.value * 100),
  set: (value: string | number) => {
    discountRate.value = Math.max(0, Math.min(1, toNumber(value) / 100))
  },
})

function nullablePrice(value: number, touched: boolean): number | null {
  return touched ? value : null
}

async function loadCustomer(customerId: number): Promise<void> {
  const customer = await getCustomer(customerId)
  if (!customer) {
    showToast('客户不存在')
    return
  }
  id.value = customer.id
  name.value = customer.name
  phone.value = customer.phone ?? ''
  wechat.value = customer.wechat ?? ''
  lunchTouched.value = customer.default_lunch_price !== null
  dinnerTouched.value = customer.default_dinner_price !== null
  lunchPrice.value = customer.default_lunch_price ?? 0
  dinnerPrice.value = customer.default_dinner_price ?? 0
  discountRate.value = customer.discount_rate
  note.value = customer.note ?? ''
}

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    const input = {
      name: name.value,
      phone: phone.value.trim() || null,
      wechat: wechat.value.trim() || null,
      default_lunch_price: nullablePrice(lunchPrice.value, lunchTouched.value),
      default_dinner_price: nullablePrice(dinnerPrice.value, dinnerTouched.value),
      discount_rate: discountRate.value,
      note: note.value.trim() || null,
    }
    if (id.value === null) {
      await customerStore.create(input)
    } else {
      await customerStore.update(id.value, input)
    }
    showToast('保存成功')
    uni.navigateBack()
  } catch {
    showToast('客户保存失败')
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const customerId = Number(query?.id)
  if (Number.isFinite(customerId) && customerId > 0) {
    void loadCustomer(customerId)
  }
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="form">
      <view class="field">
        <text class="label">姓名</text>
        <uni-easyinput v-model="name" class="input" placeholder="必填" :input-border="false" />
      </view>
      <view class="field">
        <text class="label">手机</text>
        <uni-easyinput v-model="phone" class="input" type="number" :input-border="false" />
      </view>
      <view class="field">
        <text class="label">微信</text>
        <uni-easyinput v-model="wechat" class="input" :input-border="false" />
      </view>
      <AmountInput
        :model-value="lunchPrice"
        label="午餐价"
        placeholder="不填则录单手动输入"
        @update:model-value="(value) => { lunchTouched = true; lunchPrice = value }"
      />
      <AmountInput
        :model-value="dinnerPrice"
        label="晚餐价"
        placeholder="不填则录单手动输入"
        @update:model-value="(value) => { dinnerTouched = true; dinnerPrice = value }"
      />
      <view class="field">
        <text class="label">折扣</text>
        <view class="discount-control">
          <uni-number-box v-model="discountPercent" :min="0" :max="100" :width="72" />
          <text class="discount-unit">%</text>
        </view>
      </view>
      <view class="field field--top">
        <text class="label">备注</text>
        <uni-easyinput v-model="note" class="textarea" type="textarea" :input-border="false" />
      </view>
      <button class="save" :disabled="!canSave" @click="save">{{ isEdit ? '保存修改' : '新建客户' }}</button>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
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

.field--top {
  align-items: flex-start;
}

.label {
  flex: 0 0 140rpx;
  color: #333333;
  font-size: 28rpx;
}

.input,
.textarea {
  flex: 1;
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.textarea {
  min-height: 160rpx;
}

.discount-control {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.discount-unit {
  color: #555555;
  font-size: 28rpx;
}

.save {
  margin-top: 20rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
