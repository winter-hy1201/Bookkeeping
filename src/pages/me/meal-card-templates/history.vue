<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import dayjs from 'dayjs'
import HejiIcon from '../../../components/HejiIcon.vue'
import {
  getMealCardMessageTemplate,
  listMealCardTemplateVersions,
  restoreMealCardTemplateVersion,
} from '../../../api/meal-card-templates'
import type { MealCardMessageTemplate, MealCardTemplateVersion } from '../../../types/domain'
import { confirmDialog, showToast } from '../../../utils/ui'
import InfoBanner from '../../../components/InfoBanner.vue'

const templateId = ref<number | null>(null)
const template = ref<MealCardMessageTemplate | null>(null)
const versions = ref<MealCardTemplateVersion[]>([])
const loading = ref(false)
const restoringId = ref<number | null>(null)

async function refresh(): Promise<void> {
  if (templateId.value === null) return
  loading.value = true
  try {
    const [templateResult, versionResults] = await Promise.all([
      getMealCardMessageTemplate(templateId.value),
      listMealCardTemplateVersions(templateId.value),
    ])
    template.value = templateResult
    versions.value = versionResults
    if (templateResult) uni.setNavigationBarTitle({ title: `${templateResult.name} · 历史` })
  } catch {
    showToast('月卡模板历史加载失败')
  } finally {
    loading.value = false
  }
}

async function restore(version: MealCardTemplateVersion): Promise<void> {
  if (!template.value || templateId.value === null) return
  const ok = await confirmDialog(
    `恢复“${version.name}”？`,
    '恢复历史版本会先快照当前模板，再将此版本内容恢复为当前模板；默认状态保持不变。',
  )
  if (!ok) return
  restoringId.value = version.id
  try {
    await restoreMealCardTemplateVersion(templateId.value, version.id)
    showToast('月卡模板历史版本已恢复')
    uni.navigateBack()
  } catch (error) {
    showToast(error instanceof Error ? error.message : '月卡模板历史恢复失败')
  } finally {
    restoringId.value = null
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) templateId.value = id
  else showToast('月卡模板参数无效')
})

onShow(() => {
  void refresh()
})
</script>

<template>
  <scroll-view class="page" scroll-y>
    <!-- Hero Header -->
    <view class="hero">
      <text class="hero-title">月卡模板历史</text>
      <text class="hero-subtitle"
        >保存过的通知模板版本，可随时恢复使用。</text
      >
    </view>

    <!-- Warm Sand Notice Banner -->
    <InfoBanner
      icon="Info"
      text="恢复历史版本会先快照当前模板，再将此版本内容恢复为当前模板；默认状态保持不变。"
    />

    <!-- Loading State -->
    <view v-if="loading" class="state-card">
      <text class="state-title">正在读取月卡模板历史…</text>
    </view>

    <!-- Not Found State -->
    <view v-else-if="!template" class="state-card">
      <text class="state-title">月卡模板不存在或已被删除</text>
    </view>

    <!-- Empty State -->
    <view v-else-if="versions.length === 0" class="state-card">
      <text class="state-title">还没有历史版本</text>
      <text class="state-desc">模板第一次发生实际修改后，编辑前内容会出现在这里。</text>
    </view>

    <!-- Version List -->
    <view v-else class="version-list">
      <view
        v-for="(version, index) in versions"
        :key="version.id"
        class="version-card"
      >
        <view class="version-header">
          <view class="version-title-group">
            <view class="version-name-row">
              <HejiIcon class="doc-icon" name="FileText" :size="18" />
              <text class="version-name">{{ version.name }}</text>
              <text class="version-badge">历史{{ versions.length - index }}</text>
            </view>
            <view class="version-time-row">
              <HejiIcon class="clock-icon" name="History" :size="16" />
              <text class="version-time">{{
                dayjs(version.created_at).format('YYYY-MM-DD HH:mm')
              }}</text>
            </view>
          </view>
        </view>

        <view class="version-body-wrap">
          <text class="version-body">{{ version.body }}</text>
        </view>

        <view class="version-actions">
          <button
            class="restore-btn"
            :disabled="restoringId !== null"
            @click="restore(version)"
          >
            <template v-if="restoringId === version.id">恢复中...</template>
            <template v-else>
              <HejiIcon name="RefreshCw" :size="16" />
              <text>恢复此版本</text>
            </template>
          </button>
        </view>
      </view>

      <!-- Footer Summary -->
      <view class="history-footer">
        <HejiIcon class="footer-icon" name="Lightbulb" :size="16" />
        <text class="footer-text">按时间从新到旧排列，共 {{ versions.length }} 个历史版本。模板仅保存在本地，不会同步到其他设备。</text>
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

.hero {
  margin-bottom: $hej-space-4;
}

.hero-title {
  display: block;
  color: $hej-color-text;
  font-family: $hej-font-family;
  font-size: $hej-font-display;
  font-weight: 700;
  line-height: 1.25;
}

.hero-subtitle {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
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

.version-list {
  display: flex;
  flex-direction: column;
  gap: $hej-space-4;
}

.version-card {
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  padding: $hej-space-5;
}

.version-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.version-title-group {
  flex: 1;
  min-width: 0;
}

.version-name-row {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.doc-icon {
  font-size: $hej-font-body;
  line-height: 1;
}

.version-name {
  overflow: hidden;
  color: $hej-color-text;
  font-family: $hej-font-family;
  font-size: $hej-font-title;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-badge {
  flex: 0 0 auto;
  padding: 4rpx 14rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
  font-size: $hej-font-caption;
  font-weight: 600;
}

.version-time-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
}

.clock-icon {
  font-size: 22rpx;
  line-height: 1;
  color: $hej-color-text-tertiary;
}

.version-time {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.version-body-wrap {
  margin-top: $hej-space-3;
}

.version-body {
  display: block;
  padding: $hej-space-4;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-family: $hej-font-family-mono;
  font-size: $hej-font-meta;
  line-height: 1.6;
  white-space: pre-wrap;
}

.version-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: $hej-space-4;
}

.restore-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-1;
  height: 68rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-accent;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 600;
  line-height: 68rpx;
  text-align: center;

  &:active {
    opacity: 0.8;
  }

  &[disabled] {
    opacity: 0.4;
    pointer-events: none;
  }
}

.history-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-2;
  margin-top: $hej-space-4;
  padding: 0 $hej-space-4;
}

.footer-icon {
  font-size: $hej-font-caption;
  color: $hej-color-text-tertiary;
}

.footer-text {
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}
</style>
