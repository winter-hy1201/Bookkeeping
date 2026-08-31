<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useExpenseStore } from '../../../stores/expense'
import { today } from '../../../utils/date'
import { formatMoney, parseMoney, subtractMoney } from '../../../utils/format'
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
const hasAmount = computed(() => form.amount.trim().length > 0)
const refundAmountValue = computed(() => parseMoney(form.refund_amount))
const netAmount = computed(() =>
  Math.max(0, subtractMoney(amountValue.value, refundAmountValue.value)),
)
const isRefundValid = computed(
  () => refundAmountValue.value >= 0 && refundAmountValue.value <= amountValue.value,
)
const canSave = computed(
  () =>
    Boolean(form.expense_date) &&
    selectedCategory.value !== null &&
    amountValue.value > 0 &&
    isRefundValid.value &&
    !saving.value,
)

const saveActionLabel = computed(() => {
  if (saving.value) return '保存中...'
  if (!form.expense_date) return '选择日期'
  if (!selectedCategory.value) return '选择分类'
  if (!hasAmount.value || amountValue.value <= 0) return '填写金额'
  if (refundAmountValue.value < 0) return '退差不能小于 0'
  if (refundAmountValue.value > amountValue.value) return '退差不能大于金额'
  return '保存支出'
})

function onCategoryChange(value: string | number): void {
  form.category_id = value === '' ? '' : Number(value)
}

async function save(): Promise<void> {
  if (!canSave.value || !selectedCategory.value || saving.value) return
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
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <uni-forms
        ref="formRef"
        class="form"
        :model-value="form"
        :rules="rules"
        label-width="100px"
        label-align="left"
      >
        <view class="form-card">
          <!-- 日期 -->
          <view class="field-row">
            <uni-forms-item name="expense_date" label="日期" required>
              <uni-datetime-picker
                v-model="form.expense_date"
                class="date-picker"
                type="date"
                :clear-icon="false"
              />
            </uni-forms-item>
          </view>

          <view class="field-divider" />

          <!-- 分类 -->
          <view class="field-row">
            <uni-forms-item name="category_id" label="分类" required>
              <uni-data-select
                v-model="form.category_id"
                class="category-select"
                :localdata="categoryOptions"
                placeholder="请选择分类"
                :clear="false"
                @change="onCategoryChange"
              />
            </uni-forms-item>
          </view>

          <view class="field-divider" />

          <!-- 金额 -->
          <view class="field-row">
            <uni-forms-item name="amount" label="金额" required>
              <view class="amount-control">
                <text class="amount-prefix">¥</text>
                <uni-easyinput
                  v-model="form.amount"
                  class="amount-input"
                  type="digit"
                  inputmode="decimal"
                  placeholder="0.00"
                  :clearable="false"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>
          </view>

          <view class="field-divider" />

          <!-- 退差 -->
          <view class="field-row">
            <uni-forms-item name="refund_amount" label="退差">
              <view class="amount-control">
                <text class="amount-prefix">¥</text>
                <uni-easyinput
                  v-model="form.refund_amount"
                  class="amount-input"
                  type="digit"
                  inputmode="decimal"
                  placeholder="0.00"
                  :clearable="false"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>
            <text v-if="refundAmountValue > amountValue && refundAmountValue > 0" class="field-error">
              退差金额不能大于支出金额
            </text>
          </view>

          <view class="field-divider" />

          <!-- 备注 -->
          <view class="field-row">
            <uni-forms-item name="note" label="备注">
              <uni-easyinput
                v-model="form.note"
                class="note-input"
                type="text"
                placeholder="如：调料耗材、燃气费等"
                :clearable="true"
              />
            </uni-forms-item>
          </view>

          <!-- 实际支出计算行 -->
          <view class="calculation-box">
            <text class="calc-label">实际支出</text>
            <view class="calc-value-wrap">
              <text class="calc-amount">{{ formatMoney(netAmount) }}</text>
              <text v-if="refundAmountValue > 0" class="calc-formula">
                金额 {{ formatMoney(amountValue) }} - 退差 {{ formatMoney(refundAmountValue) }}
              </text>
            </view>
          </view>
        </view>

        <view class="form-scroll-spacer" />
      </uni-forms>
    </scroll-view>

    <!-- 固定底部确认区 -->
    <view class="submit-bar">
      <view class="submit-summary">
        <view class="summary-header">
          <text class="summary-title">支出小结</text>
          <text class="summary-sub">1项支出，合计实际支出</text>
        </view>
        <view class="summary-details">
          <text class="summary-net">{{ formatMoney(netAmount) }}</text>
          <text class="summary-meta">
            总金额 {{ formatMoney(amountValue) }}，退差 {{ formatMoney(refundAmountValue) }}
          </text>
        </view>
      </view>
      <button class="save-button" :disabled="!canSave" @click="save">
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
  padding: $hej-space-3 $hej-space-3 0;
}

.form-scroll {
  flex: 1;
  height: 0;
  min-height: 0;
}

.form {
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

.form-card {
  overflow: hidden;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  padding: $hej-space-2 $hej-space-4;
}

.field-row {
  position: relative;
}

.field-divider {
  height: 1rpx;
  background: $hej-color-border;
}

.field-error {
  display: block;
  padding-left: 80px;
  margin-top: -$hej-space-2;
  margin-bottom: $hej-space-2;
  color: $hej-color-danger;
  font-size: $hej-font-caption;
}

.date-picker :deep(.uni-date-x) {
  height: 72rpx !important;
  background-color: $hej-color-surface !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
}

.date-picker :deep(.uni-date__x-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  font-weight: 500;
}

.category-select :deep(.uni-select) {
  height: 72rpx !important;
  background-color: $hej-color-surface !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
  font-size: $hej-font-body !important;
}

.amount-control {
  display: flex;
  align-items: center;
  min-width: 0;
  height: 72rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.amount-prefix {
  flex: 0 0 auto;
  margin-right: 12rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 600;
}

.amount-input {
  flex: 1;
  min-width: 0;
}

.note-input :deep(.uni-easyinput__content) {
  min-height: 72rpx !important;
  background-color: $hej-color-surface !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-2 !important;
}

.calculation-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $hej-space-3;
  margin-bottom: $hej-space-2;
  padding: $hej-space-3 $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  border: 1rpx solid rgba(232, 230, 220, 0.6);
}

.calc-label {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.calc-value-wrap {
  text-align: right;
}

.calc-amount {
  display: block;
  color: $hej-color-accent;
  font-size: 38rpx;
  font-weight: 700;
  font-family: $hej-font-family;
  line-height: 1.2;
}

.calc-formula {
  display: block;
  margin-top: 2rpx;
  color: $hej-color-text-tertiary;
  font-size: 22rpx;
}

.form-scroll-spacer {
  height: 40rpx;
}

.submit-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
  margin: 0 (-$hej-space-3);
  padding: $hej-space-3 $hej-space-4;
  background: $hej-color-surface;
  border-top: 1rpx solid $hej-color-border;
  box-sizing: border-box;
}

.submit-summary {
  flex: 1;
  min-width: 0;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.summary-title {
  color: $hej-color-text;
  font-size: $hej-font-caption;
  font-weight: 700;
}

.summary-sub {
  color: $hej-color-text-tertiary;
  font-size: 22rpx;
}

.summary-details {
  display: flex;
  align-items: baseline;
  gap: $hej-space-2;
  margin-top: 4rpx;
}

.summary-net {
  color: $hej-color-accent;
  font-size: 34rpx;
  font-weight: 700;
  font-family: $hej-font-family;
}

.summary-meta {
  color: $hej-color-text-secondary;
  font-size: 22rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 220rpx;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 $hej-space-5;
  margin: 0;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-body;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
}

.save-button::after {
  border: 0;
}

.save-button:disabled {
  opacity: 0.45;
  background: $hej-color-text-tertiary;
}
</style>
