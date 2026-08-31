<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import {
  createDailyMenu,
  DailyMenuDateConflictError,
  deleteDailyMenu,
  getDailyMenu,
  getDailyMenuByDate,
  updateDailyMenu,
} from '../../../api/daily-menus'
import { getDefaultMessageTemplate } from '../../../api/message-templates'
import type { DailyMenu } from '../../../types/domain'
import { formatTodayLabel, today } from '../../../utils/date'
import { renderMenuTemplate } from '../../../utils/menu-template'
import { confirmDialog, showToast } from '../../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface MenuForm {
  menu_date: string
  lunch_text: string
  dinner_text: string
}

const menuId = ref<number | null>(null)
const pageReturn = usePageReturnSnapshot({
  mode: 'scroll-view',
})
const savedMenu = ref<DailyMenu | null>(null)
const loading = ref(false)
const saving = ref(false)
const formRef = ref<UniFormsRef | null>(null)
const form = reactive<MenuForm>({ menu_date: today(), lunch_text: '', dinner_text: '' })

const rules = {
  menu_date: { rules: [{ required: true, errorMessage: '请选择日期' }] },
}

const hasMeal = computed(() => Boolean(form.lunch_text.trim() || form.dinner_text.trim()))
const canSave = computed(() => Boolean(form.menu_date) && hasMeal.value && !saving.value)
const isNew = computed(() => menuId.value === null)

function fillForm(menu: DailyMenu): void {
  form.menu_date = menu.menu_date
  form.lunch_text = menu.lunch_text ?? ''
  form.dinner_text = menu.dinner_text ?? ''
}

async function loadMenu(id: number): Promise<void> {
  loading.value = true
  try {
    const menu = await getDailyMenu(id)
    if (!menu) {
      showToast('菜单不存在或已被删除')
      return
    }
    menuId.value = id
    savedMenu.value = menu
    fillForm(menu)
    uni.setNavigationBarTitle({ title: '编辑菜单' })
  } catch {
    showToast('菜单加载失败')
  } finally {
    loading.value = false
  }
}

function openExisting(id: number): void {
  uni.redirectTo({ url: `/pages/me/menus/edit?id=${id}` })
}

async function save(continueNext = false): Promise<void> {
  if (!canSave.value) {
    if (!hasMeal.value) showToast('午餐和晚餐至少填写一项')
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const input = {
      menu_date: form.menu_date,
      lunch_text: form.lunch_text,
      dinner_text: form.dinner_text,
    }
    const result =
      menuId.value === null
        ? await createDailyMenu(input)
        : await updateDailyMenu(menuId.value, input)
    if (!result) {
      showToast('菜单不存在')
      return
    }
    savedMenu.value = result
    menuId.value = result.id
    showToast('菜单已保存')

    if (!continueNext) {
      uni.navigateBack()
      return
    }

    const nextDate = dayjs(result.menu_date).add(1, 'day').format('YYYY-MM-DD')
    const nextMenu = await getDailyMenuByDate(nextDate)
    if (nextMenu) {
      showToast('下一天已有菜单')
      openExisting(nextMenu.id)
      return
    }
    menuId.value = null
    savedMenu.value = null
    form.menu_date = nextDate
    form.lunch_text = ''
    form.dinner_text = ''
    uni.setNavigationBarTitle({ title: '新建菜单' })
  } catch (error) {
    if (error instanceof DailyMenuDateConflictError) {
      showToast('该日期已有菜单')
      openExisting(error.existingId)
      return
    }
    showToast(error instanceof Error ? error.message : '菜单保存失败')
  } finally {
    saving.value = false
  }
}

async function copySavedMenu(): Promise<void> {
  if (!savedMenu.value) return
  try {
    const template = await getDefaultMessageTemplate()
    if (!template) {
      const go = await confirmDialog('还没有默认模板', '请先新建或设置一个默认模板。')
      if (go) void pageReturn.navigateTo({ url: '/pages/me/menu-templates/list' })
      return
    }
    const text = renderMenuTemplate(template.body, {
      menuDate: savedMenu.value.menu_date,
      lunchText: savedMenu.value.lunch_text,
      dinnerText: savedMenu.value.dinner_text,
    })
    uni.setClipboardData({
      data: text,
      success: () => showToast('菜单文案已复制'),
      fail: () => showToast('复制失败'),
    })
  } catch (error) {
    showToast(error instanceof Error ? error.message : '复制失败')
  }
}

function menuDateLabel(menuDate: string): string {
  try {
    return formatTodayLabel(menuDate)
  } catch {
    return menuDate
  }
}

async function remove(): Promise<void> {
  if (!savedMenu.value) return
  const ok = await confirmDialog(
    `删除 ${menuDateLabel(savedMenu.value.menu_date)} 菜单？`,
    '删除后无法恢复。',
  )
  if (!ok) return
  try {
    await deleteDailyMenu(savedMenu.value.id)
    showToast('菜单已删除')
    uni.navigateBack()
  } catch {
    showToast('菜单删除失败')
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) void loadMenu(id)
})

onShow(() => {
  void pageReturn.restoreOnShow()
})
</script>

<template>
  <view class="page">
    <scroll-view
      class="content"
      scroll-y
      :scroll-top="pageReturn.scrollTopValue"
      @scroll="pageReturn.onScroll"
    >
      <view v-if="loading" class="empty-loading">
        <text class="empty-loading-text">正在读取菜单内容…</text>
      </view>
      <template v-else>
        <!-- Notice / Intro Card -->
        <view class="intro-card">
          <view class="intro-card__header">
            <view class="intro-card__title-group">
              <text class="intro-card__icon">📝</text>
              <text class="intro-title">{{ isNew ? '安排一天的菜单' : '修改菜单内容' }}</text>
            </view>
            <view v-if="savedMenu" class="top-copy-btn" @click="copySavedMenu">
              <text class="top-copy-icon">📋</text>
              <text class="top-copy-text">复制文案</text>
            </view>
          </view>
          <text class="intro-text">午餐、晚餐至少填写一项；支持换行补充主食、汤品或临时说明。</text>
        </view>

        <!-- Continuous Form Container -->
        <view class="form-container">
          <uni-forms
            ref="formRef"
            class="form"
            :model-value="form"
            :rules="rules"
            label-width="100px"
            label-align="left"
          >
            <!-- Date Field -->
            <uni-forms-item name="menu_date" label="日期" required>
              <uni-datetime-picker v-model="form.menu_date" type="date" :clear-icon="false" />
            </uni-forms-item>

            <view class="divider" />

            <!-- Lunch Field -->
            <uni-forms-item name="lunch_text" label="午餐">
              <uni-easyinput
                v-model="form.lunch_text"
                type="textarea"
                :auto-height="true"
                :placeholder="'例如：红烧排骨\n清炒时蔬\n番茄炒蛋\n紫菜蛋花汤\n米饭'"
                :input-border="false"
              />
            </uni-forms-item>

            <view class="divider" />

            <!-- Dinner Field -->
            <uni-forms-item name="dinner_text" label="晚餐">
              <uni-easyinput
                v-model="form.dinner_text"
                type="textarea"
                :auto-height="true"
                placeholder="没有晚餐可以留空"
                :input-border="false"
              />
            </uni-forms-item>
          </uni-forms>
        </view>

        <!-- Danger Zone (Delete) for saved menu -->
        <view v-if="savedMenu" class="danger-zone">
          <button class="delete-action-button" @click="remove">删除本日菜单</button>
        </view>

        <!-- Bottom scroll spacer to avoid overlap with fixed bar -->
        <view class="scroll-spacer" />
      </template>
    </scroll-view>

    <!-- Bottom Fixed Confirmation Bar -->
    <view class="confirm-bar">
      <view class="confirm-summary">
        <view class="confirm-status-row">
          <text class="confirm-icon">📄</text>
          <text class="confirm-title">{{ hasMeal ? '菜单可以保存' : '至少填写午餐或晚餐' }}</text>
        </view>
        <text class="confirm-date">{{ form.menu_date }}</text>
      </view>
      <view class="confirm-actions">
        <button v-if="isNew" class="next-button" :disabled="!canSave" @click="save(true)">
          保存并继续下一天
        </button>
        <button class="save-button" :disabled="!canSave" @click="save(false)">
          {{ saving ? '保存中...' : isNew ? '保存菜单' : '保存修改' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.content {
  position: relative;
  z-index: 10;
  padding: $hej-space-5 $hej-space-5 240rpx;
  box-sizing: border-box;
}

.empty-loading {
  padding: 80rpx $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  text-align: center;
}

.empty-loading-text {
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.intro-card {
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.intro-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-3;
}

.intro-card__title-group {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.intro-card__icon {
  font-size: 32rpx;
}

.intro-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.top-copy-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 6rpx $hej-space-3;
  border: 1rpx solid $hej-color-accent-soft;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
}

.top-copy-btn:active {
  background: $hej-color-accent-soft;
}

.top-copy-icon {
  font-size: 24rpx;
}

.top-copy-text {
  color: $hej-color-accent;
  font-size: $hej-font-caption;
  font-weight: 600;
}

.intro-text {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.form-container {
  position: relative;
  z-index: 30;
  margin-top: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  box-sizing: border-box;
}

.form {
  display: block;
  padding: $hej-space-4 $hej-space-5;
}

.form :deep(.uni-forms-item) {
  display: flex;
  align-items: flex-start;
  margin-bottom: 0;
  padding: $hej-space-2 0;
}

.form :deep(.uni-forms-item__label) {
  padding-top: $hej-space-2;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.form :deep(.uni-forms-item__content) {
  min-width: 0;
}

.form :deep(.uni-easyinput__content-textarea) {
  min-height: 160rpx;
  padding: $hej-space-2 0;
  color: $hej-color-text;
  font-size: $hej-font-body;
  line-height: 1.55;
}

.divider {
  height: 1rpx;
  margin: $hej-space-2 0 $hej-space-2 80px;
  background: $hej-color-border;
}

.danger-zone {
  display: flex;
  justify-content: center;
  margin-top: $hej-space-6;
  padding: $hej-space-3 0;
}

.delete-action-button {
  height: 64rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 0;
  background: transparent;
  color: $hej-color-danger;
  font-size: $hej-font-meta;
  font-weight: 500;
  line-height: 64rpx;
  text-align: center;
}

.delete-action-button::after {
  border: 0;
}

.delete-action-button:active {
  opacity: 0.7;
}

.scroll-spacer {
  height: 80rpx;
}

.confirm-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
  padding: $hej-space-4 $hej-space-5 calc($hej-space-4 + env(safe-area-inset-bottom));
  border-top: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  z-index: 1;
}

.confirm-summary {
  flex: 1;
  min-width: 0;
}

.confirm-status-row {
  display: flex;
  align-items: center;
  gap: $hej-space-1;
}

.confirm-icon {
  font-size: 28rpx;
}

.confirm-title {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.confirm-date {
  display: block;
  margin-top: 2rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.confirm-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: $hej-space-2;
}

.next-button,
.save-button {
  height: 88rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border-radius: $hej-radius-control;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
  white-space: nowrap;
}

.next-button::after,
.save-button::after {
  border: 0;
}

.next-button {
  border: 1rpx solid $hej-color-accent;
  background: $hej-color-surface;
  box-sizing: border-box;
  color: $hej-color-accent;
}

.next-button:active {
  background: $hej-color-accent-soft;
}

.save-button {
  border: 0;
  background: $hej-color-accent;
  color: #fff;
}

.save-button:active {
  opacity: 0.85;
}

button[disabled] {
  opacity: 0.4;
}
</style>
