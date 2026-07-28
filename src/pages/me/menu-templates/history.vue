<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import {
  getMessageTemplate,
  listTemplateVersions,
  restoreTemplateVersion,
} from '../../../api/message-templates'
import type { MessageTemplate, TemplateVersion } from '../../../types/domain'
import { confirmDialog, showToast } from '../../../utils/ui'

const templateId = ref<number | null>(null)
const template = ref<MessageTemplate | null>(null)
const versions = ref<TemplateVersion[]>([])
const loading = ref(false)
const restoringId = ref<number | null>(null)

async function refresh(): Promise<void> {
  if (templateId.value === null) return
  loading.value = true
  try {
    const [templateResult, versionResults] = await Promise.all([
      getMessageTemplate(templateId.value),
      listTemplateVersions(templateId.value),
    ])
    template.value = templateResult
    versions.value = versionResults
    if (templateResult) uni.setNavigationBarTitle({ title: `${templateResult.name} · 历史` })
  } catch {
    showToast('历史版本加载失败')
  } finally {
    loading.value = false
  }
}

async function restore(version: TemplateVersion): Promise<void> {
  if (!template.value || templateId.value === null) return
  const ok = await confirmDialog(
    `恢复“${version.name}”？`,
    '当前模板会先保存为新的历史版本，再恢复此版本的名称和正文；默认状态不变。',
  )
  if (!ok) return
  restoringId.value = version.id
  try {
    await restoreTemplateVersion(templateId.value, version.id)
    showToast('历史版本已恢复')
    uni.navigateBack()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '历史版本恢复失败')
  } finally {
    restoringId.value = null
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) templateId.value = id
  else showToast('模板参数无效')
})

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="hero">
      <text class="hero-title">历史版本</text>
      <text class="hero-text"
        >每次实际修改都会保留编辑前的名称和正文，恢复也不会覆盖当前版本。</text
      >
    </view>

    <view v-if="loading" class="empty">历史版本加载中...</view>
    <view v-else-if="!template" class="empty">模板不存在或已被删除</view>
    <view v-else-if="versions.length === 0" class="empty">
      <text class="empty-title">还没有历史版本</text>
      <text class="empty-text">模板第一次发生实际修改后，编辑前内容会出现在这里。</text>
    </view>

    <view v-else class="version-list">
      <view v-for="(version, index) in versions" :key="version.id" class="version-card">
        <view class="version-header">
          <view>
            <text class="version-name">{{ version.name }}</text>
            <text class="version-time">{{
              dayjs(version.created_at).format('YYYY-MM-DD HH:mm:ss')
            }}</text>
          </view>
          <text class="version-number">历史 {{ versions.length - index }}</text>
        </view>
        <text class="version-body">{{ version.body }}</text>
        <button class="restore-button" :disabled="restoringId !== null" @click="restore(version)">
          {{ restoringId === version.id ? '恢复中...' : '恢复这个版本' }}
        </button>
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

.hero-title,
.hero-text,
.version-name,
.version-time,
.version-body,
.empty-title,
.empty-text {
  display: block;
}

.hero-title {
  color: $hej-color-text;
  font-size: $hej-font-display;
  font-weight: 700;
}

.hero-text {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.55;
}

.version-list {
  margin-top: $hej-space-6;
}

.version-card {
  margin-bottom: $hej-space-4;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.version-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: $hej-space-4;
}

.version-name {
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 700;
}

.version-time {
  margin-top: 6rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.version-number {
  flex: 0 0 auto;
  padding: 4rpx 12rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.version-body {
  margin-top: $hej-space-4;
  padding: $hej-space-5;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  line-height: 1.6;
  white-space: pre-wrap;
}

.restore-button {
  height: 76rpx;
  margin: $hej-space-4 0 0;
  border: 1rpx solid $hej-color-accent;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  line-height: 76rpx;
  text-align: center;
}

.restore-button[disabled] {
  opacity: 0.4;
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
</style>
