<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useCustomerStore } from '../stores/customer'
import type { Customer } from '../types/domain'
import { compareCustomerName, getCustomerInitial } from '../utils/pinyin'

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
const scrollTarget = ref('')

interface CustomerSection {
  letter: string
  anchorId: string
  customers: Customer[]
}

function anchorId(letter: string): string {
  return letter === '#' ? 'picker-section-other' : `picker-section-${letter.toLowerCase()}`
}

const selectedText = computed(() => props.modelValue?.name ?? '请选择客户')

const filteredCustomers = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  const customers = [...customerStore.list].sort(compareCustomerName)
  if (!query) return customers

  return customers.filter((customer) => {
    return [customer.name, customer.wechat, customer.phone].some((value) =>
      (value ?? '').toLowerCase().includes(query),
    )
  })
})

const sections = computed<CustomerSection[]>(() => {
  const map = new Map<string, Customer[]>()

  filteredCustomers.value.forEach((customer) => {
    const letter = getCustomerInitial(customer.name)
    const customers = map.get(letter) ?? []
    customers.push(customer)
    map.set(letter, customers)
  })

  return Array.from(map.entries()).map(([letter, customers]) => ({
    letter,
    anchorId: anchorId(letter),
    customers,
  }))
})

const indexLetters = computed(() => sections.value.map((section) => section.letter))

async function jumpTo(letter: string): Promise<void> {
  scrollTarget.value = ''
  await nextTick()
  scrollTarget.value = anchorId(letter)
}

async function openSheet(): Promise<void> {
  visible.value = true
  keyword.value = ''
  scrollTarget.value = ''

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
          <uni-easyinput
            v-model="keyword"
            class="search-input"
            type="text"
            placeholder="搜索客户姓名、微信或手机号"
            confirm-type="search"
            :input-border="false"
            :clearable="true"
          />
        </view>

        <scroll-view
          class="customer-list"
          scroll-y
          :scroll-into-view="scrollTarget"
          :scroll-with-animation="true"
        >
          <view v-if="customerStore.loading" class="empty-state">客户加载中...</view>
          <view v-else-if="sections.length === 0" class="empty-state">
            {{ customerStore.list.length === 0 ? '暂无客户，请先新建' : '没有匹配的客户' }}
          </view>
          <view
            v-for="section in sections"
            v-else
            :id="section.anchorId"
            :key="section.letter"
            class="customer-section"
          >
            <view class="section-title">{{ section.letter }}</view>
            <view
              v-for="customer in section.customers"
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
          </view>
        </scroll-view>

        <view v-if="!customerStore.loading && indexLetters.length > 0" class="index-bar">
          <text
            v-for="letter in indexLetters"
            :key="letter"
            class="index-letter"
            @click.stop="jumpTo(letter)"
          >
            {{ letter }}
          </text>
        </view>

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
  position: relative;
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
}

.customer-list {
  max-height: 52vh;
  margin-top: 18rpx;
  padding-right: 38rpx;
  box-sizing: border-box;
}

.section-title {
  height: 48rpx;
  padding: 0 4rpx;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 48rpx;
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

.index-bar {
  position: absolute;
  top: 50%;
  right: 8rpx;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateY(-50%);
}

.index-letter {
  min-width: 32rpx;
  padding: 3rpx 0;
  color: #4b5563;
  font-size: 21rpx;
  line-height: 25rpx;
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
