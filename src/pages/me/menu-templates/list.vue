<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import {
  deleteMessageTemplate,
  listMessageTemplates,
  setDefaultMessageTemplate,
} from '../../../api/message-templates'
import type { MessageTemplate } from '../../../types/domain'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'

const templates = ref<MessageTemplate[]>([])
const loading = ref(false)
const actioningId = ref<number | null>(null)

async function refresh(): Promise<void> {
  loading.value = true
  try {
    templates.value = await listMessageTemplates()
  } catch {
    showToast('模板加载失败')
  } finally {
    loading.value = false
  }
}

function goNew(): void {
  uni.navigateTo({ url: '/pages/me/menu-templates/edit' })
}

function goEdit(id: number): void {
  if (actioningId.value !== null) return
  uni.navigateTo({ url: `/pages/me/menu-templates/edit?id=${id}` })
}

function goHistory(id: number): void {
  if (actioningId.value !== null) return
  uni.navigateTo({ url: `/pages/me/menu-templates/history?id=${id}` })
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
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="toolbar">
      <view>
        <text class="page-title">文案模板</text>
        <text class="page-subtitle">默认模板会直接用于每日菜单复制</text>
      </view>
      <button class="add-button" @click="goNew">新建模板</button>
    </view>

    <view class="syntax-note">
      <text class="syntax-note__title">模板会保留固定文案，只替换日期和有内容的餐次</text>
      <text class="syntax-note__text"
        >编辑时可插入日期、午餐区块和晚餐区块，并实时检查最终效果。</text
      >
    </view>

    <view v-if="loading" class="empty">模板加载中...</view>
    <view v-else-if="templates.length === 0" class="empty">
      <text class="empty-title">还没有文案模板</text>
      <text class="empty-text">新建模板并设为默认后，每日菜单才能复制为社群文案。</text>
      <button class="empty-action" @click="goNew">新建第一个模板</button>
    </view>

    <view v-else class="template-list">
      <view v-for="template in templates" :key="template.id" class="template-card">
        <view class="template-header" @click="goEdit(template.id)">
          <view class="template-heading">
            <view class="name-row">
              <text class="template-name">{{ template.name }}</text>
              <text v-if="template.is_default === 1" class="default-badge">默认</text>
            </view>
            <text class="updated-at"
              >最后修改 {{ dayjs(template.updated_at).format('YYYY-MM-DD HH:mm') }}</text
            >
          </view>
          <text class="arrow">›</text>
        </view>
        <text class="body-preview">{{ template.body }}</text>
        <view class="template-actions">
          <button
            v-if="template.is_default !== 1"
            class="action-button accent"
            :disabled="actioningId !== null"
            @click="makeDefault(template)"
          >
            设为默认
          </button>
          <button
            class="action-button"
            :disabled="actioningId !== null"
            @click="goEdit(template.id)"
          >
            编辑
          </button>
          <button
            class="action-button"
            :disabled="actioningId !== null"
            @click="goHistory(template.id)"
          >
            历史
          </button>
          <button
            class="action-button danger"
            :disabled="actioningId !== null"
            @click="remove(template)"
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
.template-header,
.name-row,
.template-actions {
  display: flex;
  align-items: center;
}

.toolbar,
.template-header {
  justify-content: space-between;
  gap: $hej-space-5;
}

.page-title,
.page-subtitle,
.syntax-note__title,
.syntax-note__text,
.template-name,
.updated-at,
.body-preview,
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

.syntax-note {
  margin-top: $hej-space-6;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-accent-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-accent-soft;
}

.syntax-note__title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.syntax-note__text {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.template-list {
  margin-top: $hej-space-5;
}

.template-card {
  margin-bottom: $hej-space-4;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.template-heading {
  min-width: 0;
}

.name-row {
  gap: $hej-space-2;
}

.template-name {
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.default-badge {
  flex: 0 0 auto;
  padding: 4rpx 12rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-success-soft;
  color: $hej-color-success;
  font-size: $hej-font-caption;
}

.updated-at {
  margin-top: 6rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.arrow {
  color: $hej-color-text-tertiary;
  font-size: 44rpx;
}

.body-preview {
  display: -webkit-box;
  overflow: hidden;
  margin-top: $hej-space-4;
  padding: $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.55;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
}

.template-actions {
  justify-content: flex-end;
  gap: $hej-space-2;
  margin-top: $hej-space-4;
  padding-top: $hej-space-4;
  border-top: 1rpx solid $hej-color-border;
}

.action-button {
  height: 68rpx;
  margin: 0;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 68rpx;
  text-align: center;
}

.action-button.accent {
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
  color: $hej-color-text-secondary;
  text-align: center;
}

.empty-title,
.empty-text {
  display: block;
}

.empty-title {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}

.empty-text {
  margin-top: $hej-space-2;
  font-size: $hej-font-meta;
  line-height: 1.6;
}

.empty-action {
  margin: $hej-space-5 auto 0;
}
</style>
