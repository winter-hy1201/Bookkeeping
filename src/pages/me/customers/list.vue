<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listActiveMealCardCustomerIds } from '../../../api/meal-cards'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import { useCustomerStore } from '../../../stores/customer'
import type { Customer } from '../../../types/domain'
import {
  compareCustomerName,
  getCustomerInitial,
  getCustomerPinyinInitials,
  getCustomerPinyinKey,
} from '../../../utils/pinyin'
import { discountLabel, showToast } from '../../../utils/ui'

const customerStore = useCustomerStore()
const keyword = ref('')
const scrollTarget = ref('')
const pageLoading = ref(false)
const loadFailed = ref(false)
const activeMealCardCustomerIds = ref<Set<number>>(new Set())
let refreshGeneration = 0

interface CustomerSection {
  letter: string
  anchorId: string
  customers: Customer[]
}

function anchorId(letter: string): string {
  return letter === '#' ? 'section-other' : `section-${letter.toLowerCase()}`
}

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

const filtered = computed(() => {
  const query = normalizeSearchText(keyword.value)
  const customers = [...customerStore.list].sort(compareCustomerName)
  if (!query) return customers

  return customers.filter((customer) => customerSearchText(customer).includes(query))
})

const sections = computed<CustomerSection[]>(() => {
  const map = new Map<string, Customer[]>()

  filtered.value.forEach((customer) => {
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

const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  hasContent: () => filtered.value.length > 0,
  beforeRestore: async () => {
    scrollTarget.value = ''
    await nextTick()
  },
})

async function jumpTo(letter: string): Promise<void> {
  scrollTarget.value = ''
  await nextTick()
  scrollTarget.value = anchorId(letter)
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/me/customers/new' })
}

function goDetail(id: number): void {
  void pageReturn.navigateTo({ url: `/pages/me/customers/detail?id=${id}` })
}

function avatarLabel(customerId: number): '次' | '普' {
  return activeMealCardCustomerIds.value.has(customerId) ? '次' : '普'
}

function cleanDiscount(customer: Customer): string {
  return discountLabel(customer).replace(/\s+/g, '')
}

async function refresh(): Promise<boolean> {
  const generation = ++refreshGeneration
  const previousCustomers = [...customerStore.list]
  const previousCustomerIds = activeMealCardCustomerIds.value
  pageLoading.value = true
  loadFailed.value = false
  try {
    const [customersResult, customerIdsResult] = await Promise.allSettled([
      customerStore.refresh(),
      listActiveMealCardCustomerIds(),
    ])
    if (generation !== refreshGeneration) return false
    if (customersResult.status === 'rejected' || customerIdsResult.status === 'rejected') {
      customerStore.$patch({ list: previousCustomers })
      activeMealCardCustomerIds.value = previousCustomerIds
      loadFailed.value = true
      showToast('客户加载失败')
      return false
    }
    activeMealCardCustomerIds.value = new Set(customerIdsResult.value)
    return true
  } finally {
    if (generation === refreshGeneration) {
      pageLoading.value = false
    }
  }
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <view class="toolbar">
      <view class="search-box">
        <uni-easyinput
          v-model="keyword"
          class="search-input"
          prefix-icon="search"
          placeholder="搜索姓名、微信、手机或拼音"
          :input-border="false"
          :clearable="true"
        />
      </view>
      <button class="add-button" @click="goNew">新增客户</button>
    </view>

    <scroll-view
      v-if="sections.length > 0 && (!pageLoading || pageReturn.isReturningValue)"
      class="list"
      scroll-y
      :scroll-into-view="scrollTarget"
      :scroll-top="pageReturn.scrollTopValue"
      :scroll-with-animation="Boolean(scrollTarget)"
      @scroll="pageReturn.onScroll"
    >
      <view
        v-for="section in sections"
        :id="section.anchorId"
        :key="section.letter"
        class="section-group"
      >
        <view class="section-letter">{{ section.letter }}</view>
        <view class="section-card">
          <view
            v-for="(customer, idx) in section.customers"
            :key="customer.id"
            class="customer-item"
            :class="{ 'customer-item--divided': idx > 0 }"
            @click="goDetail(customer.id)"
          >
            <view class="avatar">
              <text class="avatar-text">{{ avatarLabel(customer.id) }}</text>
            </view>
            <view class="customer-main">
              <view class="name-row">
                <text class="customer-name">{{ customer.name }}</text>
                <text v-if="cleanDiscount(customer)" class="discount-badge">
                  {{ cleanDiscount(customer) }}
                </text>
              </view>
              <text class="customer-meta">
                {{ customer.wechat || customer.phone || '未填写联系方式' }}
              </text>
            </view>
            <text class="item-arrow">›</text>
          </view>
        </view>
      </view>

      <view class="list-footer">
        <text class="footer-count">共 {{ filtered.length }} 位客户</text>
      </view>
    </scroll-view>

    <view v-else-if="pageLoading" class="state-card">
      <text class="state-title">正在读取客户…</text>
      <text class="state-hint">正在从本地数据库同步客户档案与次卡状态</text>
    </view>

    <view v-else-if="loadFailed" class="state-card">
      <text class="state-title">客户加载失败</text>
      <text class="state-hint">请检查本地数据库状态后重试</text>
      <button class="state-button" @click="refresh">重新加载</button>
    </view>

    <view v-else class="state-card">
      <template v-if="keyword.trim()">
        <text class="state-title">未找到匹配客户</text>
        <text class="state-hint">可尝试更换姓名、微信、手机或拼音首字母搜索</text>
      </template>
      <template v-else>
        <text class="state-title">还没有客户档案</text>
        <text class="state-hint">新建客户后可在此搜索、拼音分组并管理次卡</text>
        <button class="state-button state-button--primary" @click="goNew">＋ 新增第一位客户</button>
      </template>
    </view>

    <view v-if="!pageLoading && !loadFailed && indexLetters.length > 0" class="index-bar">
      <text
        v-for="letter in indexLetters"
        :key="letter"
        class="index-letter"
        @click.stop="jumpTo(letter)"
      >
        {{ letter }}
      </text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  padding: $hej-space-3 $hej-space-3 0;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: $hej-space-3;
  margin-bottom: $hej-space-3;
}

.search-box {
  flex: 1;
  min-width: 0;
}

.search-input :deep(.uni-easyinput__content) {
  height: 76rpx !important;
  padding: 0 $hej-space-3 !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  background: $hej-color-surface !important;
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

.add-button {
  flex: 0 0 auto;
  min-width: 160rpx;
  height: 76rpx;
  padding: 0 $hej-space-4;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 76rpx;
  text-align: center;
  box-sizing: border-box;
}

.add-button::after {
  border: 0;
}

.add-button:active {
  opacity: 0.85;
}

.list {
  flex: 1;
  min-height: 0;
  padding-right: 48rpx;
  box-sizing: border-box;
}

.section-group {
  margin-bottom: $hej-space-3;
}

.section-letter {
  display: flex;
  align-items: center;
  height: 52rpx;
  padding: 0 $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 700;
}

.section-card {
  overflow: hidden;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.customer-item {
  display: flex;
  align-items: center;
  min-height: 116rpx;
  padding: $hej-space-3 $hej-space-4;
  box-sizing: border-box;
}

.customer-item:active {
  background: $hej-color-surface-subtle;
}

.customer-item--divided {
  border-top: 1rpx solid $hej-color-border;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 76rpx;
  width: 76rpx;
  height: 76rpx;
  margin-right: $hej-space-3;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
}

.avatar-text {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
  line-height: 1;
}

.customer-main {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.customer-name {
  overflow: hidden;
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.discount-badge {
  flex: 0 0 auto;
  margin-left: $hej-space-2;
  padding: 2rpx 10rpx;
  border: 1rpx solid rgba(201, 100, 66, 0.3);
  border-radius: 8rpx;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  font-size: $hej-font-caption;
  font-weight: 600;
  line-height: 1.2;
}

.customer-meta {
  display: block;
  margin-top: 4rpx;
  overflow: hidden;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-arrow {
  flex: 0 0 auto;
  margin-left: $hej-space-2;
  color: $hej-color-text-tertiary;
  font-size: 34rpx;
  line-height: 1;
}

.list-footer {
  padding: $hej-space-5 0 calc($hej-space-7 + env(safe-area-inset-bottom));
  text-align: center;
}

.footer-count {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-meta;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: $hej-space-5;
  padding: $hej-space-7 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-card;
  background: $hej-color-surface;
  text-align: center;
  box-shadow: $hej-shadow-panel;
}

.state-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.state-hint {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.state-button {
  min-width: 240rpx;
  height: 72rpx;
  margin-top: $hej-space-4;
  padding: 0 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;
}

.state-button::after {
  border: 0;
}

.state-button--primary {
  border-color: $hej-color-accent;
  background: $hej-color-accent;
  color: #ffffff;
}

.index-bar {
  position: fixed;
  top: 50%;
  right: 8rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $hej-space-2 4rpx;
  border-radius: 20rpx;
  background: rgba(232, 230, 220, 0.5);
  transform: translateY(-50%);
}

.index-letter {
  min-width: 32rpx;
  padding: 4rpx 0;
  color: $hej-color-text-secondary;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 28rpx;
  text-align: center;
}

.index-letter:active {
  color: $hej-color-accent;
}
</style>
