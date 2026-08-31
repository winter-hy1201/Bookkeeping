<template>
  <view class="syntax-note">
    <text class="syntax-note__icon">{{ icon }}</text>
    <view class="syntax-note__content">
      <slot>
        <text class="syntax-note__text">{{ text }}</text>
      </slot>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    text?: string
  }>(),
  {
    icon: 'ⓘ',
    text: '',
  }
)
</script>

<style scoped lang="scss">
.syntax-note {
  display: flex;
  align-items: flex-start;
  gap: $hej-space-2;
  margin-top: $hej-space-5;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-warning-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-warning-soft;
}

.syntax-note__icon {
  flex: 0 0 auto;
  color: $hej-color-warning;
  font-size: $hej-font-body;
  line-height: 1.4;
}

.syntax-note__content {
  flex: 1;
  min-width: 0;
}

.syntax-note__text {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  line-height: 1.5;
}
</style>
