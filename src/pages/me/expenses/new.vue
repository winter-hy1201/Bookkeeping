<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AmountInput from '../../../components/AmountInput.vue'
import { useExpenseStore } from '../../../stores/expense'
import { today } from '../../../utils/date'
import { showToast } from '../../../utils/ui'

const expenseStore = useExpenseStore()
const expenseDate = ref(today())
const categoryId = ref<number | ''>('')
const amount = ref(0)
const note = ref('')
const saving = ref(false)

const selectedCategory = computed(
  () => expenseStore.categories.find((category) => category.id === categoryId.value) ?? null,
)
const categoryOptions = computed(() =>
  expenseStore.categories.map((category) => ({
    text: `${category.icon ?? ''} ${category.name}`.trim(),
    value: category.id,
  })),
)
const canSave = computed(() => selectedCategory.value !== null && amount.value > 0 && !saving.value)

function onDateChange(value: string): void {
  expenseDate.value = value
}

function onCategoryChange(value: string | number): void {
  categoryId.value = Number(value)
}

async function save(): Promise<void> {
  if (!canSave.value || !selectedCategory.value) return
  saving.value = true
  try {
    await expenseStore.create({
      expense_date: expenseDate.value,
      category_id: selectedCategory.value.id,
      amount: amount.value,
      note: note.value.trim() || null,
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
    <view class="form">
      <view class="field">
        <text class="label">日期</text>
        <uni-datetime-picker
          v-model="expenseDate"
          class="control"
          type="date"
          :clear-icon="false"
          @change="onDateChange"
        />
      </view>
      <view class="field">
        <text class="label">分类</text>
        <uni-data-select
          v-model="categoryId"
          class="control"
          :localdata="categoryOptions"
          placeholder="请选择分类"
          :clear="false"
          @change="onCategoryChange"
        />
      </view>
      <AmountInput v-model="amount" label="金额" placeholder="请输入支出金额" />
      <view class="field field--top">
        <text class="label">备注</text>
        <uni-easyinput v-model="note" class="textarea" type="textarea" :input-border="false" />
      </view>
      <button class="save" :disabled="!canSave" @click="save">保存支出</button>
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

.control,
.textarea {
  flex: 1;
}

.textarea {
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
  box-sizing: border-box;
}

.textarea {
  min-height: 160rpx;
}

.save {
  margin-top: 20rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
