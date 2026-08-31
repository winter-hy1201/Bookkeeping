<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import HejiIcon from '../../components/HejiIcon.vue'
import { usePageReturnSnapshot } from '../../composables/usePageReturnSnapshot'

const statusBarHeight = uni.getSystemInfoSync().statusBarHeight ?? 0

const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
})

const menuSections = [
  {
    title: '菜单管理',
    subtitle: '每日菜单、复制文案、历史记录',
    url: '/pages/me/menus/list',
    icon: 'Menu',
  },
  {
    title: '文案模板',
    subtitle: '默认模板、条件区块、历史版本',
    url: '/pages/me/menu-templates/list',
    icon: 'NotebookPen',
  },
  {
    title: '月卡文案模板',
    subtitle: '月卡说明、次数占位符、历史版本',
    url: '/pages/me/meal-card-templates/list',
    icon: 'Ticket',
  },
  {
    title: '客户管理',
    subtitle: '客户档案、历史订单、次卡',
    url: '/pages/me/customers/list',
    icon: 'UsersRound',
  },
  {
    title: '支出管理',
    subtitle: '记录菜品、耗材、工具等支出',
    url: '/pages/me/expenses/list',
    icon: 'Wallet',
  },
  {
    title: '备份 / 恢复',
    subtitle: '导出 JSON、导入覆盖、清空数据',
    url: '/pages/me/settings/backup',
    icon: 'DatabaseBackup',
  },
]

function go(url: string): void {
  void pageReturn.navigateTo({ url })
}

onShow(() => {
  void pageReturn.restoreOnShow()
})
</script>

<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    <scroll-view
      class="content"
      scroll-y
      :style="{ height: 'calc(100vh - ' + statusBarHeight + 'px)' }"
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view class="content-inner">
        <view class="header">
          <text class="title">我的</text>
          <text class="subtitle">菜单、客户、支出和数据备份</text>
        </view>

        <view class="menu-card">
          <view
            v-for="(item, index) in menuSections"
            :key="item.url"
            class="menu-item"
            :class="{ 'menu-item--last': index === menuSections.length - 1 }"
            hover-class="menu-item--pressed"
            @click="go(item.url)"
          >
            <view class="menu-item__icon-wrap">
              <HejiIcon :name="item.icon" :size="22" />
            </view>
            <view class="menu-item__body">
              <text class="menu-item__title">{{ item.title }}</text>
              <text class="menu-item__subtitle">{{ item.subtitle }}</text>
            </view>
            <view class="menu-item__arrow">
              <HejiIcon name="ChevronRight" :size="16" />
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: $hej-color-canvas;
  color: $hej-color-text;
  font-family: $hej-font-family;
  box-sizing: border-box;
}

.status-bar {
  width: 100%;
  flex-shrink: 0;
  background: $hej-color-canvas;
}

.content {
  width: 100%;
  box-sizing: border-box;
}

.content-inner {
  box-sizing: border-box;
  padding: 0 $hej-space-5 calc(140rpx + env(safe-area-inset-bottom));
}

.header {
  padding: $hej-space-6 0 $hej-space-5;
}

.title {
  display: block;
  color: $hej-color-text;
  font-family: 'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif;
  font-size: $hej-font-hero;
  font-weight: 600;
  letter-spacing: 2rpx;
  line-height: 1.05;
}

.subtitle {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.4;
}

.menu-card {
  overflow: hidden;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.menu-item {
  display: flex;
  align-items: center;
  min-height: 136rpx;
  padding: $hej-space-4 $hej-space-5;
  border-bottom: 1rpx solid $hej-color-border;
  box-sizing: border-box;
  transition: background-color 0.15s ease;
}

.menu-item--last {
  border-bottom: none;
}

.menu-item--pressed {
  background: $hej-color-surface-subtle;
}

.menu-item__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80rpx;
  height: 80rpx;
  flex-shrink: 0;
  margin-right: $hej-space-4;
  border-radius: 16rpx;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
}

.menu-item__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  flex: 1;
}

.menu-item__title {
  display: block;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
  line-height: 1.3;
}

.menu-item__subtitle {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.menu-item__arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: $hej-space-3;
  color: $hej-color-text-tertiary;
}
</style>
