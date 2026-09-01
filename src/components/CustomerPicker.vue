<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import HejiIcon from './HejiIcon.vue'
import { useCustomerStore } from '../stores/customer'
import type { Customer } from '../types/domain'
import {
  compareCustomerName,
  getCustomerInitial,
  getCustomerPinyinInitials,
  getCustomerPinyinKey,
} from '../utils/pinyin'
import { discountLabel, showToast } from '../utils/ui'

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

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function customerSearchText(customer: Customer): string {
  const text = [
    customer.name,
    customer.phone,
    customer.wechat,
    getCustomerPinyinKey(customer.name),
    getCustomerPinyinInitials(customer.name),
  ]
    .filter(Boolean)
    .join('')

  return normalizeSearchText(text)
}

const filteredCustomers = computed(() => {
  const query = normalizeSearchText(keyword.value)
  const customers = [...customerStore.list].sort(compareCustomerName)
  if (!query) return customers

  return customers.filter((customer) => customerSearchText(customer).includes(query))
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
      showToast('客户加载失败')
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
</script>

<template>
  <view class="customer-picker">
    <view class="picker-input" @click="openSheet">
      <text class="picker-value" :class="{ 'picker-value--empty': !modelValue }">
        {{ selectedText }}
      </text>
      <HejiIcon class="picker-arrow" name="ChevronRight" :size="18" />
    </view>

    <view v-if="visible" class="picker-mask" @click="closeSheet">
      <view class="picker-panel" @click.stop>
        <view class="picker-handle"></view>
        <view class="search-box">
          <HejiIcon class="search-icon" name="Search" :size="18" />
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

        <button v-if="showCreate" class="create-button" @click="handleCreate">
          <HejiIcon name="Plus" :size="16" />
          <text>新建客户</text>
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.customer-picker {
  width: 100%;
}

.picker-input {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 80rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.picker-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-body;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-value--empty {
  color: $hej-color-text-tertiary;
}

.picker-arrow {
  flex: 0 0 auto;
  margin-left: $hej-space-2;
  color: $hej-color-text-tertiary;
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
  background: rgba(20, 20, 19, 0.4);
}

.picker-panel {
  position: relative;
  width: 100%;
  max-height: 78vh;
  padding: $hej-space-4 $hej-space-5 $hej-space-6;
  border-radius: $hej-radius-panel $hej-radius-panel 0 0;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.picker-handle {
  width: 72rpx;
  height: 8rpx;
  margin: 0 auto $hej-space-4;
  border-radius: $hej-radius-pill;
  background: $hej-color-border;
}

.search-box {
  display: flex;
  align-items: center;
  padding: $hej-space-2 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
}

.search-icon {
  flex: 0 0 auto;
  margin-right: $hej-space-2;
  color: $hej-color-text-tertiary;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.search-input :deep(.uni-easyinput__content) {
  min-height: 72rpx !important;
  padding: 0 $hej-space-2 !important;
  border: 0 !important;
  border-radius: $hej-radius-control !important;
  background: $hej-color-control !important;
  box-sizing: border-box;
}

.search-input :deep(.uni-easyinput__placeholder-class) {
  color: $hej-color-text-tertiary !important;
  font-size: $hej-font-body !important;
}

.search-input :deep(.uni-input-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
}

.customer-list {
  max-height: 52vh;
  margin-top: $hej-space-3;
  padding-right: $hej-space-6;
  box-sizing: border-box;
}

.section-title {
  height: 48rpx;
  padding: 0 $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 48rpx;
}

.customer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 88rpx;
  border-bottom: 1rpx solid $hej-color-border;
}

.customer-info {
  flex: 1;
  min-width: 0;
}

.customer-name {
  display: block;
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-meta {
  display: block;
  margin-top: 4rpx;
  overflow: hidden;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discount-badge {
  flex: 0 0 auto;
  margin-left: $hej-space-3;
  padding: 4rpx $hej-space-2;
  border-radius: $hej-radius-pill;
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
  font-size: $hej-font-caption;
  font-weight: 600;
}

.empty-state {
  padding: 64rpx 0;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-body;
  text-align: center;
}

.index-bar {
  position: absolute;
  top: 50%;
  right: $hej-space-1;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateY(-50%);
}

.index-letter {
  min-width: 32rpx;
  padding: 3rpx 0;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: $hej-font-caption;
  text-align: center;
}

.create-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-1;
  height: 80rpx;
  margin-top: $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 80rpx;
  text-align: center;
}

.create-button:active {
  opacity: 0.82;
}
</style>
