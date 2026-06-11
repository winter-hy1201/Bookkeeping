<script setup lang="ts">
function go(url: string): void {
  uni.navigateTo({ url })
}
</script>

<template>
  <view class="page">
    <view class="hero">
      <text class="title">我的</text>
      <text class="subtitle">客户、支出和数据备份</text>
    </view>

    <view class="menu">
      <view class="menu-item" @click="go('/pages/me/customers/list')">
        <view><text class="menu-title">客户管理</text><text class="menu-sub">客户档案、历史订单、次卡</text></view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/me/expenses/list')">
        <view><text class="menu-title">支出管理</text><text class="menu-sub">记录菜品、耗材、工具等支出</text></view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/me/settings/backup')">
        <view><text class="menu-title">备份 / 恢复</text><text class="menu-sub">导出 JSON、导入覆盖、清空数据</text></view>
        <text class="arrow">›</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 28rpx 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.hero {
  margin-bottom: 24rpx;
}

.title,
.menu-title,
.menu-sub {
  display: block;
}

.title {
  color: #222222;
  font-size: 42rpx;
  font-weight: 700;
}

.subtitle {
  margin-top: 8rpx;
  color: #8f8f94;
  font-size: 26rpx;
}

.menu {
  overflow: hidden;
  border-radius: 12rpx;
  background: #ffffff;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 126rpx;
  padding: 0 24rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.menu-title {
  color: #222222;
  font-size: 32rpx;
  font-weight: 700;
}

.menu-sub {
  margin-top: 8rpx;
  color: #8f8f94;
  font-size: 24rpx;
}

.arrow {
  color: #999999;
  font-size: 44rpx;
}
</style>
