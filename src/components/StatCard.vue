<script setup lang="ts">
import { computed } from 'vue'

type StatColor = 'normal' | 'positive' | 'negative'

const props = withDefaults(
  defineProps<{
    label: string
    value: string | number
    color?: StatColor
    hint?: string
  }>(),
  {
    color: 'normal',
    hint: '',
  },
)

const numericValue = computed(() => {
  if (typeof props.value === 'number') return props.value

  const normalized = props.value.replace(/[¥￥,+,\s]/g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
})

const resolvedColor = computed<StatColor>(() => {
  if (props.color !== 'normal') return props.color
  if (props.label !== '利润' || numericValue.value === null) return 'normal'
  return numericValue.value >= 0 ? 'positive' : 'negative'
})
</script>

<template>
  <view class="stat-card">
    <text class="stat-label">{{ label }}</text>
    <text class="stat-value" :class="`stat-value--${resolvedColor}`">{{ value }}</text>
    <text v-if="hint" class="stat-hint">{{ hint }}</text>
  </view>
</template>

<style scoped>
.stat-card {
  min-width: 0;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
}

.stat-label {
  display: block;
  color: #8f8f94;
  font-size: 24rpx;
  line-height: 1.4;
}

.stat-value {
  display: block;
  margin-top: 10rpx;
  color: #333333;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.15;
  word-break: break-all;
}

.stat-value--positive {
  color: #07c160;
}

.stat-value--negative {
  color: #ee0a24;
}

.stat-value--normal {
  color: #333333;
}

.stat-hint {
  display: block;
  margin-top: 8rpx;
  color: #999999;
  font-size: 22rpx;
  line-height: 1.4;
}
</style>
