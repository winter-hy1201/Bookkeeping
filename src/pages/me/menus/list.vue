<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import {
  deleteDailyMenu,
  listCurrentDailyMenus,
  listHistoricalDailyMenus,
} from '../../../api/daily-menus'
import { getDefaultMessageTemplate } from '../../../api/message-templates'
import type { DailyMenu } from '../../../types/domain'
import { today } from '../../../utils/date'
import { renderMenuTemplate } from '../../../utils/menu-template'
import { confirmDialog, showToast } from '../../../utils/ui'

type MenuScope = 'current' | 'history'

const scope = ref<MenuScope>('current')
const currentMenus = ref<DailyMenu[]>([])
const historyMenus = ref<DailyMenu[]>([])
const loading = ref(false)
const actioningId = ref<number | null>(null)
const visibleMenus = computed(() =>
  scope.value === 'current' ? currentMenus.value : historyMenus.value,
)
const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
  containerSelector: '.page',
  itemIdPrefix: 'menu-return-item',
  getItemKeys: () => visibleMenus.value.map((menu) => menu.id),
})

async function refresh(): Promise<boolean> {
  loading.value = true
  try {
    const [current, history] = await Promise.all([
      listCurrentDailyMenus(today()),
      listHistoricalDailyMenus(today()),
    ])
    currentMenus.value = current
    historyMenus.value = history
    return true
  } catch {
    showToast('菜单加载失败')
    return false
  } finally {
    loading.value = false
  }
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/me/menus/edit' })
}

function goEdit(id: number): void {
  if (actioningId.value !== null) return
  void pageReturn.navigateTo({ url: `/pages/me/menus/edit?id=${id}` }, { anchorKey: id })
}

function goTemplates(): void {
  void pageReturn.navigateTo({ url: '/pages/me/menu-templates/list' })
}

function dateText(value: string): string {
  return dayjs(value).format('M月D日')
}

async function copyMenu(menu: DailyMenu): Promise<void> {
  actioningId.value = menu.id
  try {
    const template = await getDefaultMessageTemplate()
    if (!template) {
      const go = await confirmDialog('还没有默认模板', '请先新建或设置一个默认模板。')
      if (go) goTemplates()
      return
    }
    const text = renderMenuTemplate(template.body, {
      menuDate: menu.menu_date,
      lunchText: menu.lunch_text,
      dinnerText: menu.dinner_text,
    })
    uni.setClipboardData({
      data: text,
      success: () => showToast('菜单文案已复制'),
      fail: () => showToast('复制失败'),
    })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '复制失败')
  } finally {
    actioningId.value = null
  }
}

async function removeMenu(menu: DailyMenu): Promise<void> {
  const summary = [menu.lunch_text ? '午餐' : '', menu.dinner_text ? '晚餐' : '']
    .filter(Boolean)
    .join('、')
  const ok = await confirmDialog(
    `删除 ${dateText(menu.menu_date)} 菜单？`,
    `${summary}菜单将被永久删除，无法恢复。`,
  )
  if (!ok) return
  actioningId.value = menu.id
  try {
    await deleteDailyMenu(menu.id)
    showToast('菜单已删除')
    await refresh()
  } catch {
    showToast('菜单删除失败')
  } finally {
    actioningId.value = null
  }
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <scroll-view
    class="page"
    scroll-y
    :scroll-top="pageReturn.scrollTopValue"
    @scroll="pageReturn.onScroll"
  >
    <view class="toolbar">
      <view>
        <text class="page-title">每日菜单</text>
        <text class="page-subtitle">按日期维护，套用默认模板后复制到社群</text>
      </view>
      <button class="add-button" @click="goNew">新建菜单</button>
    </view>

    <view class="scope-switch" role="tablist">
      <button :class="['scope-button', { active: scope === 'current' }]" @click="scope = 'current'">
        当前与未来 {{ currentMenus.length }}
      </button>
      <button :class="['scope-button', { active: scope === 'history' }]" @click="scope = 'history'">
        历史菜单 {{ historyMenus.length }}
      </button>
    </view>

    <button class="template-entry" @click="goTemplates">
      <text>文案模板</text>
      <text class="template-entry__hint">管理默认模板与历史版本 ›</text>
    </button>

    <view v-if="loading" class="empty"><text>菜单加载中...</text></view>
    <view v-else-if="visibleMenus.length === 0" class="empty">
      <text class="empty-title">{{
        scope === 'current' ? '还没有待用菜单' : '还没有历史菜单'
      }}</text>
      <text class="empty-text">
        {{
          scope === 'current'
            ? '从今天开始录入午餐或晚餐，保存后即可复制社群文案。'
            : '过去日期的菜单会自动出现在这里。'
        }}
      </text>
      <button v-if="scope === 'current'" class="empty-action" @click="goNew">新建第一条菜单</button>
    </view>

    <view v-else class="menu-list">
      <view
        v-for="menu in visibleMenus"
        :id="pageReturn.itemId(menu.id)"
        :key="menu.id"
        class="menu-card"
        @click="goEdit(menu.id)"
      >
        <view class="menu-card__header">
          <text class="menu-date">{{ dateText(menu.menu_date) }}</text>
          <text class="menu-year">{{ menu.menu_date }}</text>
        </view>
        <view v-if="menu.lunch_text" class="meal-row">
          <text class="meal-label">午餐</text>
          <text class="meal-text">{{ menu.lunch_text }}</text>
        </view>
        <view v-if="menu.dinner_text" class="meal-row">
          <text class="meal-label">晚餐</text>
          <text class="meal-text">{{ menu.dinner_text }}</text>
        </view>
        <view class="menu-actions" @click.stop>
          <button
            class="action-button copy"
            :disabled="actioningId !== null"
            @click="copyMenu(menu)"
          >
            复制文案
          </button>
          <button class="action-button" :disabled="actioningId !== null" @click="goEdit(menu.id)">
            编辑
          </button>
          <button
            class="action-button danger"
            :disabled="actioningId !== null"
            @click="removeMenu(menu)"
          >
            删除
          </button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: $hej-space-6 $hej-space-5 64rpx;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.toolbar,
.menu-card__header,
.meal-row,
.menu-actions {
  display: flex;
  align-items: center;
}

.toolbar {
  justify-content: space-between;
  gap: $hej-space-5;
}

.page-title,
.page-subtitle,
.menu-date,
.menu-year,
.meal-text,
.empty-title,
.empty-text {
  display: block;
}

.page-title {
  color: $hej-color-text;
  font-size: $hej-font-display;
  font-weight: 700;
}

.page-subtitle {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.add-button,
.empty-action {
  flex: 0 0 auto;
  height: 88rpx;
  margin: 0;
  padding: 0 $hej-space-5;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #fff;
  font-size: $hej-font-body;
  line-height: 88rpx;
  text-align: center;
}

.scope-switch {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $hej-space-1;
  margin-top: $hej-space-6;
  padding: $hej-space-1;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
}

.scope-button {
  height: 76rpx;
  margin: 0;
  border-radius: 10rpx;
  background: transparent;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 76rpx;
  text-align: center;
}

.scope-button.active {
  background: $hej-color-surface;
  color: $hej-color-text;
  font-weight: 600;
  box-shadow: $hej-shadow-panel;
}

.template-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 88rpx;
  margin: $hej-space-4 0 0;
  padding: 0 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text;
  font-size: $hej-font-body;
  line-height: 88rpx;
  text-align: left;
}

.template-entry__hint {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.menu-list {
  margin-top: $hej-space-5;
}

.menu-card {
  margin-bottom: $hej-space-4;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.menu-card__header {
  justify-content: space-between;
  padding-bottom: $hej-space-4;
  border-bottom: 1rpx solid $hej-color-border;
}

.menu-date {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.menu-year {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.meal-row {
  align-items: flex-start;
  gap: $hej-space-4;
  padding-top: $hej-space-4;
}

.meal-label {
  flex: 0 0 auto;
  padding: 4rpx 12rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  font-size: $hej-font-caption;
}

.meal-text {
  min-width: 0;
  color: $hej-color-text;
  font-size: $hej-font-body;
  line-height: 1.55;
  white-space: pre-wrap;
}

.menu-actions {
  justify-content: flex-end;
  gap: $hej-space-2;
  margin-top: $hej-space-5;
  padding-top: $hej-space-4;
  border-top: 1rpx solid $hej-color-border;
}

.action-button {
  height: 68rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 68rpx;
  text-align: center;
}

.action-button.copy {
  border-color: $hej-color-accent;
  color: $hej-color-accent;
}

.action-button.danger {
  border-color: $hej-color-danger-soft;
  color: $hej-color-danger;
}

.empty {
  margin-top: $hej-space-7;
  padding: 64rpx $hej-space-6;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  text-align: center;
}

.empty-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}

.empty-text {
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.6;
}

.empty-action {
  margin: $hej-space-5 auto 0;
}
</style>
