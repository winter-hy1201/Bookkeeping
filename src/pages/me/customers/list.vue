<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { listActiveMealCardCustomerIds } from '../../../api/meal-cards'
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

async function jumpTo(letter: string): Promise<void> {
  scrollTarget.value = ''
  await nextTick()
  scrollTarget.value = anchorId(letter)
}

function goNew(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

function goDetail(id: number): void {
  uni.navigateTo({ url: `/pages/me/customers/detail?id=${id}` })
}

function avatarLabel(customerId: number): '次' | '普' {
  return activeMealCardCustomerIds.value.has(customerId) ? '次' : '普'
}

async function refresh(): Promise<void> {
  const generation = ++refreshGeneration
  pageLoading.value = true
  loadFailed.value = false
  activeMealCardCustomerIds.value = new Set()
  try {
    const [, customerIds] = await Promise.all([
      customerStore.refresh(),
      listActiveMealCardCustomerIds(),
    ])
    if (generation !== refreshGeneration) return
    activeMealCardCustomerIds.value = new Set(customerIds)
  } catch {
    if (generation !== refreshGeneration) return
    loadFailed.value = true
    showToast('客户加载失败')
  } finally {
    if (generation === refreshGeneration) {
      pageLoading.value = false
    }
  }
}

onShow(() => {
  void refresh()
})
</script>

<template>
  <view class="page">
    <view class="toolbar">
      <uni-easyinput
        v-model="keyword"
        class="search"
        prefix-icon="search"
        placeholder="请输入搜索信息"
        :input-border="false"
        :clearable="true"
      />
      <button class="add" @click="goNew">+</button>
    </view>

    <view v-if="pageLoading" class="empty">客户加载中...</view>
    <view v-else-if="loadFailed" class="empty">客户加载失败</view>
    <view v-else-if="sections.length === 0" class="empty">
      {{ keyword.trim() ? '未找到匹配客户' : '暂无客户' }}
    </view>
    <scroll-view
      v-else
      class="list"
      scroll-y
      :scroll-into-view="scrollTarget"
      :scroll-with-animation="true"
    >
      <view
        v-for="section in sections"
        :id="section.anchorId"
        :key="section.letter"
        class="section"
      >
        <view class="section-title">{{ section.letter }}</view>
        <view
          v-for="customer in section.customers"
          :key="customer.id"
          class="item"
          @click="goDetail(customer.id)"
        >
          <view class="avatar">{{ avatarLabel(customer.id) }}</view>
          <view class="main">
            <view class="name-row">
              <text class="name">{{ customer.name }}</text>
              <text v-if="discountLabel(customer)" class="badge">{{
                discountLabel(customer)
              }}</text>
            </view>
            <text class="meta">{{ customer.wechat || customer.phone || '未填写联系方式' }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

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

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  padding: 20rpx 24rpx 0;
  background: #f5f6f8;
  box-sizing: border-box;
}

.toolbar,
.item {
  display: flex;
  align-items: center;
}

.toolbar {
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.search {
  flex: 1;
  overflow: hidden;
  border-radius: 999rpx;
  background: #eceef1;
}

.add {
  width: 72rpx;
  height: 72rpx;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #007aff;
  color: #ffffff;
  font-size: 40rpx;
  line-height: 72rpx;
}

.list {
  flex: 1;
  min-height: 0;
  padding-right: 44rpx;
  box-sizing: border-box;
}

.section {
  overflow: hidden;
}

.section-title {
  height: 54rpx;
  padding: 0 4rpx;
  color: #6b7280;
  font-size: 26rpx;
  line-height: 54rpx;
}

.item {
  min-height: 112rpx;
  padding: 16rpx 18rpx;
  border-bottom: 1rpx solid #edf0f3;
  background: #ffffff;
  box-sizing: border-box;
}

.section-title + .item {
  border-top-left-radius: 12rpx;
  border-top-right-radius: 12rpx;
}

.item:last-child {
  border-bottom: 0;
  border-bottom-right-radius: 12rpx;
  border-bottom-left-radius: 12rpx;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 72rpx;
  width: 72rpx;
  height: 72rpx;
  margin-right: 18rpx;
  border-radius: 10rpx;
  background: #eef5ff;
  color: #2f6fde;
  font-size: 30rpx;
  font-weight: 700;
}

.main {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.name,
.meta {
  display: block;
}

.name {
  overflow: hidden;
  min-width: 0;
  color: #222222;
  font-size: 30rpx;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.badge {
  flex: 0 0 auto;
  margin-left: 12rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #fff7e6;
  color: #fa8c16;
  font-size: 24rpx;
}

.empty {
  padding: 120rpx 0;
  text-align: center;
}

.index-bar {
  position: fixed;
  top: 50%;
  right: 12rpx;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateY(-50%);
}

.index-letter {
  min-width: 34rpx;
  padding: 4rpx 0;
  color: #4b5563;
  font-size: 22rpx;
  line-height: 26rpx;
  text-align: center;
}
</style>
