<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getExpense } from '../../../api/expenses'
import { useExpenseStore } from '../../../stores/expense'
import type { Expense, ExpenseCategory } from '../../../types/domain'
import { formatMoney, parseMoney, subtractMoney } from '../../../utils/format'
import { confirmDialog, showToast } from '../../../utils/ui'

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
const expenseId = ref<number | null>(null)
const expense = ref<Expense | null>(null)
const loading = ref(false)
const saving = ref(false)
const formRef = ref<UniFormsRef | null>(null)
const form = reactive<ExpenseForm>({
  expense_date: '',
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
    rules: [{ required: true, errorMessage: '请输入金额' }],
  },
}

const categoryOptions = computed(() =>
  expenseStore.categories.map((category) => ({
    text: `${category.icon ?? ''} ${category.name}`.trim(),
    value: category.id,
  })),
)
const categoryById = computed(() => {
  const map = new Map<number, ExpenseCategory>()
  for (const category of expenseStore.categories) {
    map.set(category.id, category)
  }
  return map
})
const selectedCategory = computed(() =>
  form.category_id === '' ? null : categoryById.value.get(form.category_id) ?? null,
)
const amountValue = computed(() => parseMoney(form.amount))
const refundAmountValue = computed(() => parseMoney(form.refund_amount))
const netAmount = computed(() => Math.max(0, subtractMoney(amountValue.value, refundAmountValue.value)))
const canSave = computed(
  () =>
    Boolean(form.expense_date) &&
    selectedCategory.value !== null &&
    amountValue.value > 0 &&
    refundAmountValue.value >= 0 &&
    refundAmountValue.value <= amountValue.value &&
    !saving.value,
)

function fillForm(value: Expense): void {
  form.expense_date = value.expense_date
  form.category_id = value.category_id
  form.amount = String(value.amount)
  form.refund_amount = String(value.refund_amount ?? 0)
  form.note = value.note ?? ''
}

function onCategoryChange(value: string | number): void {
  form.category_id = value === '' ? '' : Number(value)
}

async function refresh(): Promise<void> {
  if (expenseId.value === null) return
  loading.value = true
  try {
    const [expenseResult] = await Promise.all([
      getExpense(expenseId.value),
      expenseStore.refreshCategories(),
    ])
    expense.value = expenseResult
    if (expenseResult) fillForm(expenseResult)
  } catch {
    showToast('支出详情加载失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!canSave.value || expenseId.value === null || selectedCategory.value === null) return
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const updated = await expenseStore.update(expenseId.value, {
      expense_date: form.expense_date,
      category_id: selectedCategory.value.id,
      amount: amountValue.value,
      refund_amount: refundAmountValue.value,
      note: form.note.trim() || null,
    })
    if (!updated) {
      showToast('支出不存在')
      return
    }
    showToast('修改已保存')
    uni.navigateBack()
  } catch {
    showToast('支出修改失败')
  } finally {
    saving.value = false
  }
}

async function deleteExpense(): Promise<void> {
  if (expenseId.value === null) return
  const ok = await confirmDialog('删除支出？', '删除后无法恢复。')
  if (!ok) return
  try {
    const deleted = await expenseStore.remove(expenseId.value)
    if (!deleted) {
      showToast('支出不存在')
      return
    }
    showToast('已删除')
    uni.navigateBack()
  } catch {
    showToast('删除失败')
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) {
    expenseId.value = id
  } else {
    showToast('支出参数无效')
  }
})

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="!expense" class="empty">支出不存在</view>
    <template v-else>
      <view class="hero">
        <text class="title">{{ formatMoney(netAmount) }}</text>
        <text class="meta">
          {{ selectedCategory?.name ?? `分类 #${expense.category_id}` }} · 支出
          {{ formatMoney(amountValue) }} · 退差 {{ formatMoney(refundAmountValue) }}
        </text>
      </view>

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
      </uni-forms>

      <view class="actions">
        <button class="primary" :disabled="!canSave" @click="save">保存修改</button>
        <button class="danger" @click="deleteExpense">删除支出</button>
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
.form {
  margin-bottom: 20rpx;
  padding: 28rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.title,
.meta {
  display: block;
}

.title {
  color: #222222;
  font-size: 42rpx;
  font-weight: 700;
}

.meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
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
  background: #f6f7f9;
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

.actions {
  display: flex;
  gap: 20rpx;
}

.primary,
.danger {
  flex: 1;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.primary {
  background: #007aff;
  color: #ffffff;
}

.danger {
  background: #ee0a24;
  color: #ffffff;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}
</style>
