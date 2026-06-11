<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useCustomerStore } from '../../../stores/customer'
import { discountLabel, showToast } from '../../../utils/ui'

const customerStore = useCustomerStore()
const keyword = ref('')

const filtered = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  if (!query) return customerStore.list
  return customerStore.list.filter((customer) =>
    [customer.name, customer.phone, customer.wechat].some((value) =>
      (value ?? '').toLowerCase().includes(query),
    ),
  )
})

function goNew(): void {
  uni.navigateTo({ url: '/pages/me/customers/new' })
}

function goDetail(id: number): void {
  uni.navigateTo({ url: `/pages/me/customers/detail?id=${id}` })
}

async function refresh(): Promise<void> {
  try {
    await customerStore.refresh()
  } catch {
    showToast('客户加载失败')
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
        placeholder="搜索姓名、微信或手机号"
        :input-border="false"
        :clearable="true"
      />
      <button class="add" @click="goNew">+</button>
    </view>

    <view v-if="customerStore.loading" class="empty">客户加载中...</view>
    <view v-else-if="filtered.length === 0" class="empty">暂无客户</view>
    <view v-for="customer in filtered" v-else :key="customer.id" class="item" @click="goDetail(customer.id)">
      <view class="main">
        <text class="name">{{ customer.name }}</text>
        <text class="meta">{{ customer.wechat || customer.phone || '未填写联系方式' }}</text>
      </view>
      <text v-if="discountLabel(customer)" class="badge">{{ discountLabel(customer) }}</text>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.toolbar,
.item {
  display: flex;
  align-items: center;
}

.toolbar {
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.search {
  flex: 1;
  padding: 18rpx 22rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.add {
  width: 84rpx;
  height: 84rpx;
  margin: 0;
  padding: 0;
  border-radius: 12rpx;
  background: #007aff;
  color: #ffffff;
  font-size: 42rpx;
  line-height: 84rpx;
}

.item {
  justify-content: space-between;
  min-height: 112rpx;
  margin-bottom: 14rpx;
  padding: 0 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.main {
  min-width: 0;
}

.name,
.meta {
  display: block;
}

.name {
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
}

.meta,
.empty {
  color: #8f8f94;
  font-size: 26rpx;
}

.badge {
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
</style>
