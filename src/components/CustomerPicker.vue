<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCustomerStore } from '../stores/customer'
import type { Customer } from '../types/domain'

const props = withDefaults(
  defineProps<{
    modelValue: Customer | null
    showCreate?: boolean
  }>(),
  {
    showCreate: false,
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: Customer | null): void
  (event: 'create'): void
}>()

const customerStore = useCustomerStore()
const visible = ref(false)
const keyword = ref('')

const selectedText = computed(() => props.modelValue?.name ?? '请选择客户')

const filteredCustomers = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return customerStore.list

  return customerStore.list.filter((customer) => {
    return [customer.name, customer.wechat, customer.phone].some((value) =>
      (value ?? '').toLowerCase().includes(query),
    )
  })
})

async function openSheet(): Promise<void> {
  visible.value = true
  keyword.value = ''

  if (!customerStore.loading && customerStore.list.length === 0) {
    try {
      await customerStore.refresh()
    } catch {
      uni.showToast({
        title: '客户加载失败',
        icon: 'none',
      })
    }
  }
}

function closeSheet(): void {
  visible.value = false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readValue(source: unknown): string | number | undefined {
  if (!isRecord(source)) return undefined
  const value = source.value
  return typeof value === 'string' || typeof value === 'number' ? value : undefined
}

function readInputValue(event: unknown): string {
  if (!isRecord(event)) return ''
  const value = readValue(event.detail) ?? readValue(event.target) ?? ''
  return String(value)
}

function handleSearch(event: unknown): void {
  keyword.value = readInputValue(event)
}

function selectCustomer(customer: Customer): void {
  emit('update:modelValue', customer)
  closeSheet()
}

function handleCreate(): void {
  emit('create')
  closeSheet()
}

function discountLabel(customer: Customer): string {
  if (customer.discount_rate === 1) return ''
  const value = Number((customer.discount_rate * 10).toFixed(1))
  return `${value} 折`
}
</script>

<template>
  <view class="customer-picker">
    <view class="picker-input" @click="openSheet">
      <view class="picker-main">
        <text class="picker-label">客户</text>
        <text class="picker-value" :class="{ 'picker-value--empty': !modelValue }">
          {{ selectedText }}
        </text>
      </view>
      <text class="picker-arrow">›</text>
    </view>

    <view v-if="visible" class="picker-mask" @click="closeSheet">
      <view class="picker-panel" @click.stop>
        <view class="picker-handle"></view>
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            type="text"
            :value="keyword"
            placeholder="搜索客户姓名、微信或手机号"
            placeholder-class="search-placeholder"
            confirm-type="search"
            @input="handleSearch"
          />
        </view>

        <scroll-view class="customer-list" scroll-y>
          <view v-if="customerStore.loading" class="empty-state">客户加载中...</view>
          <view v-else-if="filteredCustomers.length === 0" class="empty-state">
            {{ customerStore.list.length === 0 ? '暂无客户，请先新建' : '没有匹配的客户' }}
          </view>
          <view
            v-for="customer in filteredCustomers"
            v-else
            :key="customer.id"
            class="customer-item"
            @click="selectCustomer(customer)"
          >
            <view class="customer-info">
              <text class="customer-name">{{ customer.name }}</text>
              <text v-if="customer.wechat" class="customer-meta">{{ customer.wechat }}</text>
            </view>
            <text v-if="discountLabel(customer)" class="discount-badge">
              {{ discountLabel(customer) }}
            </text>
          </view>
        </scroll-view>

        <button v-if="showCreate" class="create-button" @click="handleCreate">+ 新建客户</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.customer-picker {
  width: 100%;
}

.picker-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 92rpx;
  padding: 0 24rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #ffffff;
}

.picker-main {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.picker-label {
  flex: 0 0 96rpx;
  color: #333333;
  font-size: 28rpx;
}

.picker-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: #333333;
  font-size: 30rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-value--empty {
  color: #999999;
}

.picker-arrow {
  flex: 0 0 auto;
  margin-left: 16rpx;
  color: #999999;
  font-size: 42rpx;
  line-height: 1;
}

.picker-mask {
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.4);
}

.picker-panel {
  width: 100%;
  max-height: 78vh;
  padding: 18rpx 24rpx 28rpx;
  border-radius: 24rpx 24rpx 0 0;
  background: #ffffff;
  box-sizing: border-box;
}

.picker-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto 22rpx;
  border-radius: 999rpx;
  background: #dddddd;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  background: #f7f7f7;
}

.search-icon {
  flex: 0 0 auto;
  margin-right: 12rpx;
  font-size: 26rpx;
  line-height: 1;
}

.search-input {
  flex: 1;
  min-width: 0;
  color: #333333;
  font-size: 28rpx;
  line-height: 1.4;
}

.search-placeholder {
  color: #999999;
}

.customer-list {
  max-height: 52vh;
  margin-top: 18rpx;
}

.customer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 96rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-name {
  display: block;
  overflow: hidden;
  color: #333333;
  font-size: 30rpx;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-meta {
  display: block;
  margin-top: 6rpx;
  overflow: hidden;
  color: #999999;
  font-size: 24rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discount-badge {
  flex: 0 0 auto;
  margin-left: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #fff3e0;
  color: #f57c00;
  font-size: 22rpx;
}

.empty-state {
  padding: 64rpx 0;
  color: #999999;
  font-size: 28rpx;
  text-align: center;
}

.create-button {
  margin-top: 18rpx;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 30rpx;
}
</style>
