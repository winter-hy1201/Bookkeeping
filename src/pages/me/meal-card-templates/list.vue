<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import {
  deleteMealCardMessageTemplate,
  listMealCardMessageTemplates,
  setDefaultMealCardMessageTemplate,
} from '../../../api/meal-card-templates'
import type { MealCardMessageTemplate } from '../../../types/domain'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'

const templates = ref<MealCardMessageTemplate[]>([])
const loading = ref(false)
const actioningId = ref<number | null>(null)
const pageReturn = usePageReturnSnapshot({
  mode: 'page',
  hasContent: () => templates.value.length > 0,
})

async function refresh(): Promise<boolean> {
  loading.value = true
  try {
    templates.value = await listMealCardMessageTemplates()
    return true
  } catch {
    showToast('月卡模板加载失败')
    return false
  } finally {
    loading.value = false
  }
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/me/meal-card-templates/edit' })
}

function goEdit(id: number): void {
  if (actioningId.value !== null) return
  void pageReturn.navigateTo({ url: `/pages/me/meal-card-templates/edit?id=${id}` })
}

function goHistory(id: number): void {
  if (actioningId.value !== null) return
  void pageReturn.navigateTo({ url: `/pages/me/meal-card-templates/history?id=${id}` })
}

async function makeDefault(template: MealCardMessageTemplate): Promise<void> {
  if (template.is_default === 1 || actioningId.value !== null) return
  actioningId.value = template.id
  try {
    await setDefaultMealCardMessageTemplate(template.id)
    showToast('已设为默认月卡模板')
    await refresh()
  } catch {
    showToast('默认月卡模板设置失败')
  } finally {
    actioningId.value = null
  }
}

async function remove(template: MealCardMessageTemplate): Promise<void> {
  let replacementId: number | undefined
  const others = templates.value.filter((item) => item.id !== template.id)
  if (template.is_default === 1 && others.length > 0) {
    const index = await actionSheet(others.map((item) => `设“${item.name}”为默认`))
    if (index === null) return
    replacementId = others[index]?.id
    if (!replacementId) return
  }

  const ok = await confirmDialog(
    `删除“${template.name}”？`,
    '模板及全部历史版本会永久删除，无法恢复。',
  )
  if (!ok) return
  actioningId.value = template.id
  try {
    await deleteMealCardMessageTemplate(template.id, replacementId)
    showToast('月卡模板已删除')
    await refresh()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '月卡模板删除失败')
  } finally {
    actioningId.value = null
  }
}

onShow(() => {
  void pageReturn.restoreOnShow(refresh)
})
</script>

<template>
  <view class="page">
    <!-- Header Toolbar -->
    <view class="toolbar">
      <view class="toolbar-info">
        <text class="page-title">月卡文案模板</text>
        <text class="page-subtitle">默认模板会用于订单详情的月卡信息复制</text>
      </view>
      <button class="add-button" @click="goNew">＋ 新建模板</button>
    </view>

    <!-- Warm Sand Syntax Note Banner -->
    <view class="syntax-note">
      <text class="syntax-note__icon">💡</text>
      <text class="syntax-note__text"
        >套餐说明直接写在正文中，只替换配送后的次数信息</text
      >
    </view>

    <!-- Available Placeholders Header -->
    <view class="placeholders-bar">
      <text class="placeholders-label">可替换的次数信息（下单时自动替换）</text>
      <view class="placeholders-tags">
        <text class="placeholder-chip">本次使用份数</text>
        <text class="placeholder-chip">当前可用份数</text>
      </view>
    </view>

    <!-- Loading State -->
    <view v-if="loading" class="state-card">
      <text class="state-title">正在读取月卡模板列表…</text>
    </view>

    <!-- Empty State -->
    <view v-else-if="templates.length === 0" class="state-card">
      <text class="state-title">还没有月卡文案模板</text>
      <text class="state-desc">新建并设为默认后，已配送次卡订单才能复制月卡信息。</text>
      <button class="empty-action" @click="goNew">＋ 新建第一个模板</button>
    </view>

    <!-- Template List -->
    <view v-else class="template-list">
      <view
        v-for="template in templates"
        :key="template.id"
        class="template-card"
      >
        <!-- Card Header -->
        <view class="template-header" @click="goEdit(template.id)">
          <view class="template-heading">
            <view class="name-row">
              <text class="template-name">{{ template.name }}</text>
              <text v-if="template.is_default === 1" class="default-badge">默认模板</text>
            </view>
            <text class="updated-at"
              >更新时间：{{ dayjs(template.updated_at).format('YYYY-MM-DD HH:mm') }}</text
            >
          </view>
          <text class="arrow">›</text>
        </view>

        <!-- Body Preview -->
        <view class="preview-wrap" @click="goEdit(template.id)">
          <text class="body-preview">{{ template.body }}</text>
        </view>

        <!-- Template Actions Footer -->
        <view class="template-actions" @click.stop>
          <view
            v-if="template.is_default !== 1"
            class="action-item action-item--accent"
            :class="{ disabled: actioningId !== null }"
            @click="makeDefault(template)"
          >
            <text class="action-item__icon">⭐</text>
            <text class="action-item__text">设为默认</text>
          </view>
          <view
            v-else
            class="action-item action-item--active"
          >
            <text class="action-item__icon">★</text>
            <text class="action-item__text">默认模板</text>
          </view>
          <view class="action-separator" />
          <view
            class="action-item"
            :class="{ disabled: actioningId !== null }"
            @click="goEdit(template.id)"
          >
            <text class="action-item__icon">✏️</text>
            <text class="action-item__text">编辑</text>
          </view>
          <view class="action-separator" />
          <view
            class="action-item"
            :class="{ disabled: actioningId !== null }"
            @click="goHistory(template.id)"
          >
            <text class="action-item__icon">🕒</text>
            <text class="action-item__text">历史</text>
          </view>
          <view class="action-separator" />
          <view
            class="action-item action-item--danger"
            :class="{ disabled: actioningId !== null }"
            @click="remove(template)"
          >
            <text class="action-item__icon">🗑️</text>
            <text class="action-item__text">删除</text>
          </view>
        </view>
      </view>

      <!-- Bottom Hint Note -->
      <view class="footer-hint">
        <text class="footer-hint__icon">ⓘ</text>
        <text class="footer-hint__text">提示：模板内容会复制到订单详情的月卡信息</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: $hej-space-6 $hej-space-5 64rpx;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
}

.toolbar-info {
  flex: 1;
  min-width: 0;
}

.page-title {
  display: block;
  color: $hej-color-text;
  font-family: $hej-font-family;
  font-size: $hej-font-display;
  font-weight: 700;
  line-height: 1.25;
}

.page-subtitle {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.add-button {
  flex: 0 0 auto;
  height: 72rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #fff;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 72rpx;
  text-align: center;

  &:active {
    opacity: 0.85;
  }
}

.syntax-note {
  display: flex;
  align-items: flex-start;
  gap: $hej-space-2;
  margin-top: $hej-space-5;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-warning-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-warning-soft;
}

.syntax-note__icon {
  flex: 0 0 auto;
  color: $hej-color-warning;
  font-size: $hej-font-body;
  line-height: 1.4;
}

.syntax-note__text {
  flex: 1;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.placeholders-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $hej-space-2;
  margin-top: $hej-space-4;
  padding: 0 4rpx;
}

.placeholders-label {
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.placeholders-tags {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.placeholder-chip {
  padding: 4rpx 14rpx;
  border: 1rpx solid $hej-color-accent-soft;
  border-radius: $hej-radius-pill;
  background: $hej-color-surface;
  color: $hej-color-accent;
  font-size: 22rpx;
  font-weight: 500;
}

.state-card {
  margin-top: $hej-space-5;
  padding: 64rpx $hej-space-6;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  text-align: center;
}

.state-title {
  display: block;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}

.state-desc {
  display: block;
  margin-top: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.6;
}

.empty-action {
  height: 88rpx;
  margin: $hej-space-5 auto 0;
  padding: 0 $hej-space-6;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #fff;
  font-size: $hej-font-body;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;

  &:active {
    opacity: 0.85;
  }
}

.template-list {
  margin-top: $hej-space-4;
}

.template-card {
  margin-bottom: $hej-space-4;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
  padding: $hej-space-5 $hej-space-5 0;
}

.template-heading {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.template-name {
  overflow: hidden;
  color: $hej-color-text;
  font-family: $hej-font-family;
  font-size: $hej-font-title;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.default-badge {
  flex: 0 0 auto;
  padding: 4rpx 14rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
  font-size: $hej-font-caption;
  font-weight: 600;
}

.updated-at {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.arrow {
  color: $hej-color-text-tertiary;
  font-size: 40rpx;
  line-height: 1;
}

.preview-wrap {
  padding: $hej-space-3 $hej-space-5 $hej-space-4;
}

.body-preview {
  display: -webkit-box;
  overflow: hidden;
  padding: $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
  font-family: $hej-font-family-mono;
  font-size: $hej-font-meta;
  line-height: 1.55;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.template-actions {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: $hej-space-3 0;
  border-top: 1rpx solid $hej-color-border;
}

.action-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  flex: 1;
  height: 64rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  cursor: pointer;

  &:active {
    opacity: 0.7;
  }

  &.disabled {
    opacity: 0.4;
    pointer-events: none;
  }
}

.action-item__icon {
  font-size: 28rpx;
  line-height: 1;
}

.action-item__text {
  font-size: $hej-font-meta;
  font-weight: 500;
}

.action-item--accent {
  color: $hej-color-accent;
  .action-item__text {
    color: $hej-color-accent;
    font-weight: 600;
  }
}

.action-item--active {
  color: $hej-color-warning;
  .action-item__text {
    color: $hej-color-warning;
    font-weight: 600;
  }
}

.action-item--danger {
  color: $hej-color-danger;
  .action-item__text {
    color: $hej-color-danger;
  }
}

.action-separator {
  width: 1rpx;
  height: 32rpx;
  background: $hej-color-border;
}

.footer-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-2;
  margin-top: $hej-space-6;
  padding: 0 $hej-space-4;
}

.footer-hint__icon {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.footer-hint__text {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}
</style>
