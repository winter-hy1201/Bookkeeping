<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import { usePageReturnSnapshot } from '../../../composables/usePageReturnSnapshot'
import {
  deleteMessageTemplate,
  listMessageTemplates,
  setDefaultMessageTemplate,
} from '../../../api/message-templates'
import type { MessageTemplate } from '../../../types/domain'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'
import InfoBanner from '../../../components/InfoBanner.vue'

const templates = ref<MessageTemplate[]>([])
const loading = ref(false)
const actioningId = ref<number | null>(null)
const pageReturn = usePageReturnSnapshot({
  mode: 'page',
  hasContent: () => templates.value.length > 0,
})

async function refresh(): Promise<boolean> {
  loading.value = true
  try {
    templates.value = await listMessageTemplates()
    return true
  } catch {
    showToast('模板加载失败')
    return false
  } finally {
    loading.value = false
  }
}

function goNew(): void {
  void pageReturn.navigateTo({ url: '/pages/me/menu-templates/edit' })
}

function goEdit(id: number): void {
  if (actioningId.value !== null) return
  void pageReturn.navigateTo({ url: `/pages/me/menu-templates/edit?id=${id}` })
}

function goHistory(id: number): void {
  if (actioningId.value !== null) return
  void pageReturn.navigateTo({ url: `/pages/me/menu-templates/history?id=${id}` })
}

async function makeDefault(template: MessageTemplate): Promise<void> {
  if (template.is_default === 1 || actioningId.value !== null) return
  actioningId.value = template.id
  try {
    await setDefaultMessageTemplate(template.id)
    showToast('已设为默认模板')
    await refresh()
  } catch {
    showToast('默认模板设置失败')
  } finally {
    actioningId.value = null
  }
}

async function remove(template: MessageTemplate): Promise<void> {
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
    await deleteMessageTemplate(template.id, replacementId)
    showToast('模板已删除')
    await refresh()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '模板删除失败')
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
        <text class="page-title">文案模板</text>
        <text class="page-subtitle">默认模板会直接用于每日菜单复制</text>
      </view>
      <button class="add-button" @click="goNew">＋ 新建模板</button>
    </view>

    <!-- Warm Sand Syntax Note Banner -->
    <InfoBanner
      icon="ⓘ"
      text="模板中的「日期」和「可供餐食」部分会在复制时自动替换，其他内容保持不变。"
    />

    <!-- Loading State -->
    <view v-if="loading" class="state-card">
      <text class="state-title">正在读取模板列表…</text>
    </view>

    <!-- Empty State -->
    <view v-else-if="templates.length === 0" class="state-card">
      <text class="state-title">还没有文案模板</text>
      <text class="state-desc">新建模板并设为默认后，每日菜单才能复制为社群文案。</text>
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
              <text v-if="template.is_default === 1" class="default-badge">默认</text>
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
  margin-top: $hej-space-5;
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
</style>
