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

<style scoped lang="scss">
.amount-field {
  display: flex;
  align-items: center;
  gap: $hej-space-3;
  min-height: 88rpx;
}

.amount-label {
  flex: 0 0 140rpx;
  color: $hej-color-text;
  font-size: $hej-font-body;
  line-height: 1.4;
}

.amount-control {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  padding: $hej-space-3 $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-control;
}

.amount-prefix {
  flex: 0 0 auto;
  margin-right: $hej-space-2;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}

.amount-input {
  flex: 1;
  min-width: 0;
}
</style>
