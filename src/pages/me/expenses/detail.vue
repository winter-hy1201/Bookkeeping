<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import { getExpense } from '../../../api/expenses'
import { useExpenseStore } from '../../../stores/expense'
import type { Expense, ExpenseCategory } from '../../../types/domain'
import { formatDate } from '../../../utils/date'
import { formatMoney, parseMoney, subtractMoney } from '../../../utils/format'
import { resolveLucideIconName } from '../../../utils/icon'
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
    text: category.name,
    value: category.id,
    icon: resolveLucideIconName(category.icon),
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
  return '保存修改'
})

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
  if (!canSave.value || expenseId.value === null || selectedCategory.value === null || saving.value) {
    return
  }
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
  const ok = await confirmDialog('删除支出？', '删除后将无法恢复，该支出记录会被永久移除。')
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
  <view class="page">
    <scroll-view class="detail-scroll" scroll-y>
      <view v-if="loading" class="state-card">
        <text class="state-title">正在读取支出详情…</text>
      </view>
      <view v-else-if="!expense" class="state-card">
        <text class="state-title">支出不存在</text>
        <button class="state-button" @click="refresh">重新加载</button>
      </view>
      <view v-else class="content-wrap">
        <!-- Hero Card -->
        <view class="hero-card">
          <text class="hero-amount">{{ formatMoney(netAmount) }}</text>
          <view class="hero-meta">
            <HejiIcon :name="resolveLucideIconName(selectedCategory?.icon)" :size="16" />
            <text>
              {{ selectedCategory?.name || `分类 #${expense.category_id}` }} ·
              {{ form.expense_date ? formatDate(form.expense_date) : '' }}
            </text>
          </view>
        </view>

        <!-- Form Card -->
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
                >
                  <template #selected="{ selectedItems }">
                    <view v-if="selectedItems[0]" class="category-option category-option--selected">
                      <HejiIcon :name="selectedItems[0].icon" :size="18" />
                      <text>{{ selectedItems[0].text }}</text>
                    </view>
                  </template>
                  <template #option="{ item }">
                    <view class="category-option">
                      <HejiIcon :name="item.icon" :size="18" />
                      <text>{{ item.text }}</text>
                    </view>
                  </template>
                </uni-data-select>
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
            <view class="calculation-row">
              <text class="calc-label">实际支出</text>
              <view class="calc-value-wrap">
                <text class="calc-amount">{{ formatMoney(netAmount) }}</text>
                <text class="calc-formula">
                  金额 {{ formatMoney(amountValue) }} - 退差 {{ formatMoney(refundAmountValue) }}
                </text>
              </view>
            </view>

            <!-- 保存修改按钮 -->
            <button class="save-button" :disabled="!canSave" @click="save">
              {{ saveActionLabel }}
            </button>
          </view>
        </uni-forms>

        <!-- 危险区：删除支出 -->
        <view class="danger-card" @click="deleteExpense">
          <view class="danger-header">
            <view class="danger-title-row">
              <HejiIcon class="danger-icon" name="Trash2" :size="18" />
              <text class="danger-title">删除支出</text>
            </view>
            <HejiIcon class="danger-arrow" name="ChevronRight" :size="18" />
          </view>
          <text class="danger-description">
            删除后将无法恢复，该支出记录会被永久移除。请谨慎操作。
          </text>
        </view>

        <view class="scroll-spacer" />
      </view>
    </scroll-view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.detail-scroll {
  flex: 1;
  min-height: 0;
}

.content-wrap {
  padding: $hej-space-3;
  display: flex;
  flex-direction: column;
  gap: $hej-space-3;
}

.hero-card {
  padding: $hej-space-5 $hej-space-4;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  text-align: center;
}

.hero-amount {
  display: block;
  color: $hej-color-text;
  font-size: 56rpx;
  font-weight: 700;
  font-family: $hej-font-family;
  line-height: 1.2;
}

.hero-meta {
  display: block;
  margin-top: 8rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
}

.form-card {
  overflow: hidden;
  border-radius: $hej-radius-panel;
  border: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  padding: $hej-space-2 $hej-space-4 $hej-space-4;
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
  padding-left: 100px;
  margin-top: -$hej-space-2;
  margin-bottom: $hej-space-2;
  color: $hej-color-danger;
  font-size: $hej-font-caption;
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

.date-picker :deep(.uni-date-x) {
  height: 72rpx !important;
  background-color: $hej-color-control !important;
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
  background-color: $hej-color-control !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-3 !important;
  box-sizing: border-box;
  font-size: $hej-font-body !important;
}

.category-option {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
  min-height: 72rpx;
  padding: 0 $hej-space-3;
  color: $hej-color-text;
  font-size: $hej-font-body;
}

.category-option--selected {
  min-height: 72rpx;
  padding: 0;
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
  background-color: $hej-color-control !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  padding: 0 $hej-space-2 !important;
}

.calculation-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: $hej-space-3;
  margin-bottom: $hej-space-4;
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
  color: $hej-color-text;
  font-size: 36rpx;
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

.save-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin: 0;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-body;
  font-weight: 600;
  text-align: center;
}

.save-button::after {
  border: 0;
}

.save-button:disabled {
  opacity: 0.45;
  background: $hej-color-text-tertiary;
}

.danger-card {
  padding: $hej-space-4;
  border-radius: $hej-radius-panel;
  border: 1rpx solid rgba(141, 69, 69, 0.2);
  background: $hej-color-danger-soft;
  box-sizing: border-box;
}

.danger-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.danger-title-row {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.danger-icon {
  font-size: 32rpx;
  color: $hej-color-danger;
}

.danger-title {
  color: $hej-color-danger;
  font-size: 30rpx;
  font-weight: 700;
}

.danger-arrow {
  color: $hej-color-danger;
  font-size: 36rpx;
  font-weight: 700;
}

.danger-description {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.state-card {
  padding: 100rpx $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  text-align: center;
  box-shadow: $hej-shadow-panel;
}

.state-title {
  display: block;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 500;
}

.state-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  line-height: 64rpx;
  margin-top: $hej-space-3;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text;
  font-size: $hej-font-body;
}

.scroll-spacer {
  height: 60rpx;
}
</style>
