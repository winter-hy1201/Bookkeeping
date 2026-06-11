<script setup lang="ts">
import { ref, watch } from 'vue'
import { parseMoney } from '../utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: number
    label: string
    placeholder?: string
  }>(),
  {
    placeholder: '请输入金额',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void
}>()

const displayValue = ref(formatDisplayValue(props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    if (parseMoney(displayValue.value) !== value) {
      displayValue.value = formatDisplayValue(value)
    }
  },
)

function formatDisplayValue(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(value)
}

function handleInput(value: string | number): void {
  displayValue.value = String(value)
  emit('update:modelValue', parseMoney(String(value)))
}
</script>

<template>
  <view class="amount-field">
    <text class="amount-label">{{ label }}</text>
    <view class="amount-control">
      <text class="amount-prefix">¥</text>
      <uni-easyinput
        class="amount-input"
        :model-value="displayValue"
        type="digit"
        inputmode="decimal"
        :placeholder="placeholder"
        :clearable="false"
        :input-border="false"
        @input="handleInput"
      />
    </view>
  </view>
</template>

<style scoped>
.amount-field {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: 88rpx;
}

.amount-label {
  flex: 0 0 140rpx;
  color: #333333;
  font-size: 28rpx;
  line-height: 1.4;
}

.amount-control {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  padding: 18rpx 22rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
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
</style>
