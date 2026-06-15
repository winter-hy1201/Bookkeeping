<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useExpenseStore } from '../../../stores/expense'
import { today } from '../../../utils/date'
import { formatMoney, parseMoney } from '../../../utils/format'
import { showToast } from '../../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface ExpenseForm {
  expense_date: string
  category_id: number | ''
  amount: string
  refund_amount: string
  note: string
}

const expenseStore = useExpenseStore()
const saving = ref(false)
const formRef = ref<UniFormsRef | null>(null)
const form = reactive<ExpenseForm>({
  expense_date: today(),
  category_id: '',
  amount: '',
  refund_amount: '0',
  note: '',
})

const rules = {
  expense_date: {
    rules: [{ required: true, errorMessage: '请选择日期' }],
  },
  category_id: {
    rules: [{ required: true, errorMessage: '请选择分类' }],
  },
  amount: {
    rules: [{ required: true, errorMessage: '请输入支出金额' }],
  },
}

const selectedCategory = computed(
  () => expenseStore.categories.find((category) => category.id === form.category_id) ?? null,
)
const categoryOptions = computed(() =>
  expenseStore.categories.map((category) => ({
    text: `${category.icon ?? ''} ${category.name}`.trim(),
    value: category.id,
  })),
)
const amountValue = computed(() => parseMoney(form.amount))
const refundAmountValue = computed(() => parseMoney(form.refund_amount))
const netAmount = computed(() => Math.max(0, amountValue.value - refundAmountValue.value))
const canSave = computed(
  () =>
    Boolean(form.expense_date) &&
    selectedCategory.value !== null &&
    amountValue.value > 0 &&
    refundAmountValue.value >= 0 &&
    refundAmountValue.value <= amountValue.value &&
    !saving.value,
)

function onCategoryChange(value: string | number): void {
  form.category_id = value === '' ? '' : Number(value)
}

async function save(): Promise<void> {
  if (!canSave.value || !selectedCategory.value) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    await expenseStore.create({
      expense_date: form.expense_date,
      category_id: selectedCategory.value.id,
      amount: amountValue.value,
      refund_amount: refundAmountValue.value,
      note: form.note.trim() || null,
    })
    showToast('保存成功')
    uni.navigateBack()
  } catch {
    showToast('支出保存失败')
  } finally {
    saving.value = false
  }
}

onShow(() => {
  void expenseStore.refreshCategories()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <uni-forms ref="formRef" class="form" :model-value="form" :rules="rules" label-width="88">
      <uni-forms-item name="expense_date" label="日期" required>
        <uni-datetime-picker
          v-model="form.expense_date"
          type="date"
          :clear-icon="false"
        />
      </uni-forms-item>

      <uni-forms-item name="category_id" label="分类" required>
        <uni-data-select
          v-model="form.category_id"
          :localdata="categoryOptions"
          placeholder="请选择分类"
          :clear="false"
          @change="onCategoryChange"
        />
      </uni-forms-item>

      <uni-forms-item name="amount" label="金额" required>
        <view class="amount-control">
          <text class="amount-prefix">¥</text>
          <uni-easyinput
            v-model="form.amount"
            class="amount-input"
            type="digit"
            inputmode="decimal"
            placeholder="请输入支出金额"
            :clearable="false"
            :input-border="false"
          />
        </view>
      </uni-forms-item>

      <uni-forms-item name="refund_amount" label="退差">
        <view class="amount-control">
          <text class="amount-prefix">¥</text>
          <uni-easyinput
            v-model="form.refund_amount"
            class="amount-input"
            type="digit"
            inputmode="decimal"
            placeholder="没有退差填 0"
            :clearable="false"
            :input-border="false"
          />
        </view>
      </uni-forms-item>

      <view class="summary">
        <text>实际支出</text>
        <text>{{ formatMoney(netAmount) }}</text>
      </view>

      <uni-forms-item name="note" label="备注">
        <uni-easyinput
          v-model="form.note"
          class="textarea"
          type="textarea"
          placeholder="可不填"
          :input-border="false"
        />
      </uni-forms-item>

      <button class="save" :disabled="!canSave" @click="save">保存支出</button>
    </uni-forms>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f6f7f9;
}

.form {
  padding: 24rpx;
}

.amount-control {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.amount-prefix {
  flex: 0 0 auto;
  margin-right: 10rpx;
  color: #333333;
  font-size: 30rpx;
  font-weight: 600;
}

.amount-input {
  flex: 1;
  min-width: 0;
}

.summary {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
  color: #222222;
  font-size: 28rpx;
  font-weight: 700;
}

.textarea {
  min-height: 160rpx;
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.save {
  margin-top: 20rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
