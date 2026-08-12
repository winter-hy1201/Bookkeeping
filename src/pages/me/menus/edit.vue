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
import { today } from '../../../utils/date'
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
      uni.setNavigationBarTitle({ title: '编辑菜单' })
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

async function remove(): Promise<void> {
  if (!savedMenu.value) return
  const ok = await confirmDialog(
    `删除 ${dayjs(savedMenu.value.menu_date).format('M月D日')} 菜单？`,
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
      <view v-if="loading" class="empty">菜单加载中...</view>
      <template v-else>
        <view class="intro">
          <text class="intro-title">{{ isNew ? '安排一天的菜单' : '修改菜单内容' }}</text>
          <text class="intro-text">午餐、晚餐至少填写一项；支持换行补充主食、汤品或临时说明。</text>
        </view>

        <uni-forms ref="formRef" class="form" :model-value="form" :rules="rules" label-width="80px">
          <uni-forms-item name="menu_date" label="日期" required>
            <uni-datetime-picker v-model="form.menu_date" type="date" :clear-icon="false" />
          </uni-forms-item>
          <view class="divider" />
          <uni-forms-item name="lunch_text" label="午餐">
            <uni-easyinput
              v-model="form.lunch_text"
              type="textarea"
              placeholder="例如：红烧肉➕宫保鸡丁➕手撕包菜"
              :input-border="false"
            />
          </uni-forms-item>
          <view class="divider" />
          <uni-forms-item name="dinner_text" label="晚餐">
            <uni-easyinput
              v-model="form.dinner_text"
              type="textarea"
              placeholder="没有晚餐可以留空"
              :input-border="false"
            />
          </uni-forms-item>
        </uni-forms>

        <view v-if="savedMenu" class="saved-actions">
          <view>
            <text class="saved-title">已保存菜单</text>
            <text class="saved-hint">复制始终使用当前默认模板</text>
          </view>
          <button class="copy-button" @click="copySavedMenu">复制文案</button>
        </view>

        <view v-if="savedMenu" class="danger-zone">
          <text class="danger-title">删除菜单</text>
          <text class="danger-hint">当前记录和历史列表中的对应菜单会永久删除。</text>
          <button class="delete-button" @click="remove">删除菜单</button>
        </view>
      </template>
    </scroll-view>

    <view class="confirm-bar">
      <view class="confirm-summary">
        <text class="confirm-title">{{ hasMeal ? '菜单可以保存' : '至少填写午餐或晚餐' }}</text>
        <text class="confirm-date">{{ form.menu_date }}</text>
      </view>
      <view class="confirm-actions">
        <button v-if="isNew" class="next-button" :disabled="!canSave" @click="save(true)">
          保存并新增下一天
        </button>
        <button class="save-button" :disabled="!canSave" @click="save(false)">
          {{ saving ? '保存中...' : '保存菜单' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: $hej-color-canvas;
}

.content {
  height: 100vh;
  padding: $hej-space-6 $hej-space-1 240rpx;
  box-sizing: border-box;
}

.intro {
  padding: 0 $hej-space-5 $hej-space-5;
}

.intro-title,
.intro-text,
.saved-title,
.saved-hint,
.danger-title,
.danger-hint,
.confirm-title,
.confirm-date {
  display: block;
}

.intro-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.intro-text {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.55;
}

.form {
  display: block;
  padding: $hej-space-5;
  background: $hej-color-surface;
}

.form :deep(.uni-forms-item) {
  align-items: center;
  margin-bottom: 0;
}

.form :deep(.uni-forms-item__content) {
  min-width: 0;
}

.form :deep(.uni-easyinput__content-textarea) {
  min-height: 148rpx;
  padding: $hej-space-3 0;
  line-height: 1.5;
}

.divider {
  height: 1rpx;
  margin: $hej-space-4 0 $hej-space-4 80px;
  background: $hej-color-border;
}

.saved-actions,
.danger-zone {
  margin: $hej-space-5 $hej-space-1 0;
  padding: $hej-space-5;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
}

.saved-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
  border: 1rpx solid $hej-color-accent-soft;
}

.saved-title,
.danger-title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.saved-hint,
.danger-hint {
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.copy-button {
  flex: 0 0 auto;
  height: 72rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  line-height: 72rpx;
  text-align: center;
}

.danger-zone {
  border: 1rpx solid $hej-color-danger-soft;
}

.delete-button {
  height: 76rpx;
  margin: $hej-space-4 0 0;
  border: 1rpx solid $hej-color-danger;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-danger;
  font-size: $hej-font-meta;
  line-height: 76rpx;
  text-align: center;
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
  box-sizing: border-box;
}

.confirm-summary {
  min-width: 0;
}

.confirm-title {
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
}

.confirm-date {
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.confirm-actions {
  display: flex;
  flex: 0 0 auto;
  gap: $hej-space-2;
}

.next-button,
.save-button {
  height: 88rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border-radius: $hej-radius-control;
  font-size: $hej-font-meta;
  line-height: 88rpx;
  text-align: center;
}

.next-button {
  border: 1rpx solid $hej-color-accent;
  background: $hej-color-surface;
  color: $hej-color-accent;
}

.save-button {
  background: $hej-color-accent;
  color: #fff;
}

button[disabled] {
  opacity: 0.4;
}

.empty {
  padding: 64rpx;
  color: $hej-color-text-secondary;
  text-align: center;
}
</style>
