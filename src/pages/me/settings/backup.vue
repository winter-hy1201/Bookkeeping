<script setup lang="ts">
import { computed, ref } from 'vue'
import HejiIcon from '../../../components/HejiIcon.vue'
import {
  clearAllData,
  exportBackup,
  importBackup,
  listBackupFiles,
  parseBackupText,
  pickLocalBackupText,
  readBackupFile,
  type BackupFileEntry,
} from '../../../utils/backup'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'

type BusyAction = 'export' | 'saved' | 'local' | 'import' | 'clear'
type StatusTone = 'info' | 'working' | 'success' | 'error'

interface PageStatus {
  tone: StatusTone
  message: string
}

const importText = ref('')
const stagedSource = ref('')
const busyAction = ref<BusyAction | null>(null)
const exportStatus = ref<PageStatus | null>(null)
const restoreStatus = ref<PageStatus | null>(null)
const clearStatus = ref<PageStatus | null>(null)

const busy = computed(() => busyAction.value !== null)
const importReady = computed(() => importText.value.trim().length > 0)
const importLength = computed(() => importText.value.length.toLocaleString('zh-CN'))

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function describePath(result: { internalPath: string; downloadPath: string | null }): string {
  return result.downloadPath ?? result.internalPath
}

async function doExport(): Promise<void> {
  busyAction.value = 'export'
  exportStatus.value = { tone: 'working', message: '正在导出备份并写入本机…' }
  try {
    const result = await exportBackup()
    exportStatus.value = result.downloadPath
      ? { tone: 'success', message: `备份已保存到本机：${describePath(result)}` }
      : {
          tone: 'info',
          message: `备份已保存在应用内：${result.internalPath}。下载目录复制失败，仍可从“已保存备份”读取。`,
        }
    showToast('备份已保存')
  } catch (error) {
    exportStatus.value = {
      tone: 'error',
      message: `导出失败：${errorMessage(error, '请稍后重试')}`,
    }
  } finally {
    busyAction.value = null
  }
}

async function doImport(): Promise<void> {
  if (busy.value) return
  busyAction.value = 'import'
  try {
    let payload
    try {
      payload = parseBackupText(importText.value)
    } catch (error) {
      restoreStatus.value = {
        tone: 'error',
        message: `备份内容无效：${errorMessage(error, '请检查 JSON 内容')}`,
      }
      return
    }

    const ok = await confirmDialog(
      '导入将完整替换当前数据',
      '将覆盖菜单、模板、客户、订单、次卡、支出、支出分类与应用数据。导入会在事务中完成，校验失败会整笔回滚。是否继续？',
    )
    if (!ok) {
      restoreStatus.value = { tone: 'info', message: '已取消导入，当前数据没有变化。' }
      return
    }

    restoreStatus.value = { tone: 'working', message: '正在导入并校验数据库完整性…' }
    try {
      await importBackup(payload)
      importText.value = ''
      stagedSource.value = ''
      restoreStatus.value = {
        tone: 'success',
        message: '导入成功。请重启 App，让页面缓存重新读取已恢复的数据。',
      }
      showToast('导入成功，请重启 App')
    } catch (error) {
      restoreStatus.value = {
        tone: 'error',
        message: `导入失败：${errorMessage(error, '未知错误')}。覆盖未完成；请重启核对当前数据，必要时从刚导出的备份恢复后重试。`,
      }
    }
  } catch (error) {
    restoreStatus.value = {
      tone: 'error',
      message: `未能完成导入确认：${errorMessage(error, '请稍后重试')}。当前数据没有变化。`,
    }
  } finally {
    busyAction.value = null
  }
}

async function pickFromSavedBackups(): Promise<void> {
  busyAction.value = 'saved'
  restoreStatus.value = { tone: 'working', message: '正在读取已保存备份…' }
  try {
    const files = await listBackupFiles()
    if (!files.length) {
      restoreStatus.value = {
        tone: 'info',
        message: '应用内还没有已保存备份。请先导出，或从本地文件选择。',
      }
      return
    }
    const index = await actionSheet(files.map((file: BackupFileEntry) => file.name))
    const picked = index == null ? null : files[index]
    if (!picked) {
      restoreStatus.value = { tone: 'info', message: '未选择备份，当前数据没有变化。' }
      return
    }
    const payload = await readBackupFile(picked.fullPath)
    importText.value = JSON.stringify(payload, null, 2)
    stagedSource.value = picked.name
    restoreStatus.value = {
      tone: 'success',
      message: `已载入 ${picked.name}，尚未覆盖数据。请检查后点击“导入覆盖”。`,
    }
  } catch (error) {
    restoreStatus.value = {
      tone: 'error',
      message: `读取失败：${errorMessage(error, '无法读取已保存备份')}`,
    }
  } finally {
    busyAction.value = null
  }
}

async function pickFromLocalFile(): Promise<void> {
  busyAction.value = 'local'
  restoreStatus.value = { tone: 'working', message: '正在读取本地文件…' }
  try {
    importText.value = await pickLocalBackupText()
    stagedSource.value = '本地 JSON 文件'
    restoreStatus.value = {
      tone: 'success',
      message: '已读取本地文件，尚未覆盖数据。请检查后点击“导入覆盖”。',
    }
  } catch (error) {
    restoreStatus.value = {
      tone: 'error',
      message: `读取失败：${errorMessage(error, '请确认文件可访问后重试')}`,
    }
  } finally {
    busyAction.value = null
  }
}

function handleImportInput(value: string): void {
  importText.value = value
  stagedSource.value = value.trim() ? '手动粘贴内容' : ''
  restoreStatus.value = value.trim()
    ? { tone: 'info', message: '已更新粘贴内容，尚未覆盖数据。请检查后点击“导入覆盖”。' }
    : null
}

async function doClear(): Promise<void> {
  if (busy.value) return
  busyAction.value = 'clear'
  try {
    const first = await confirmDialog(
      '确认清空所有数据？',
      '这会删除客户、订单、次卡、菜单、两类模板及版本、支出和支出分类；之后只恢复内置文案模板、月卡文案模板和 5 个默认支出分类。',
    )
    if (!first) return
    const second = await confirmDialog(
      '再次确认：重要数据是否已备份？',
      '未导出的客户、订单、次卡、菜单、模板、支出和自定义支出分类将永久删除。',
    )
    if (!second) return
    const third = await confirmDialog('最后确认：此操作不可恢复', '确定要清空上述所有业务数据吗？')
    if (!third) return

    clearStatus.value = { tone: 'working', message: '正在清空并恢复系统默认数据…' }
    try {
      await clearAllData()
      importText.value = ''
      stagedSource.value = ''
      clearStatus.value = {
        tone: 'success',
        message: '已清空业务数据，并恢复内置模板与 5 个默认支出分类。',
      }
      showToast('已清空所有数据')
    } catch (error) {
      clearStatus.value = {
        tone: 'error',
        message: `清空失败：${errorMessage(error, '未知错误')}。事务已回滚，请确认当前数据后重试。`,
      }
    }
  } catch (error) {
    clearStatus.value = {
      tone: 'error',
      message: `未能完成清空确认：${errorMessage(error, '请稍后重试')}。当前数据没有变化。`,
    }
  } finally {
    busyAction.value = null
  }
}
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="panel">
      <view class="section-heading">
        <view class="section-icon"><HejiIcon name="Upload" :size="21" /></view>
        <view class="section-copy">
          <text class="section-title">1. 备份（导出数据）</text>
          <text class="section-desc">
            将全部业务数据导出为 JSON 文件，保存在本机，用于日后恢复或留存记录。不会上传或自动同步。
          </text>
        </view>
      </view>

      <view v-if="exportStatus" class="status" :class="`status--${exportStatus.tone}`">
        <text>{{ exportStatus.message }}</text>
      </view>

      <button class="primary-button" :disabled="busy" @click="doExport">
        <HejiIcon name="Upload" :size="18" />
        <text>{{ busyAction === 'export' ? '正在导出备份…' : '导出备份' }}</text>
      </button>
    </view>

    <view class="panel">
      <view class="section-heading">
        <view class="section-icon"><HejiIcon name="Download" :size="21" /></view>
        <view class="section-copy">
          <text class="section-title">2. 恢复（导入并覆盖）</text>
          <text class="section-desc">
            导入会完整替换当前数据。导入前校验备份格式和 schema
            版本，写入后检查数据库完整性；任一步失败都会回滚。
          </text>
        </view>
      </view>

      <view class="restore-actions">
        <button class="secondary-button" :disabled="busy" @click="pickFromSavedBackups">
          <HejiIcon name="List" :size="17" />
          <text>{{ busyAction === 'saved' ? '正在读取…' : '从已保存备份选择' }}</text>
        </button>
        <button class="secondary-button" :disabled="busy" @click="pickFromLocalFile">
          <HejiIcon name="FolderPlus" :size="17" />
          <text>{{ busyAction === 'local' ? '正在读取…' : '从本地文件选择' }}</text>
        </button>
      </view>

      <text class="field-label">或粘贴备份文件内容（JSON）</text>
      <view class="import-editor">
        <uni-easyinput
          v-model="importText"
          class="textarea"
          type="textarea"
          placeholder="粘贴 backup_*.json 内容"
          :maxlength="-1"
          :disabled="busy"
          :input-border="false"
          @input="handleImportInput"
        />
        <text class="char-count">{{ importLength }} 字符</text>
      </view>

      <view class="restore-notes">
        <text>• 仅支持盒记导出的 backup_*.json 文件</text>
        <text>• 选择文件只会载入待导入内容，不会立即覆盖</text>
        <text>• 真正导入前还会再次确认</text>
      </view>

      <view v-if="stagedSource" class="source-pill">待导入：{{ stagedSource }}</view>
      <view v-if="restoreStatus" class="status" :class="`status--${restoreStatus.tone}`">
        <text>{{ restoreStatus.message }}</text>
      </view>

      <button class="import-button" :disabled="busy || !importReady" @click="doImport">
        <HejiIcon name="Download" :size="18" />
        <text>{{ busyAction === 'import' ? '正在导入并校验…' : '导入覆盖' }}</text>
      </button>
    </view>

    <view class="panel danger-zone">
      <view class="section-heading danger-heading">
        <view class="section-icon section-icon--danger">
          <HejiIcon name="TriangleAlert" :size="21" />
        </view>
        <view class="section-copy">
          <text class="section-title section-title--danger">3. 危险区（清空所有数据）</text>
          <text class="section-desc">
            此操作不可恢复，需要连续确认三次。将清空客户、订单、次卡、菜单、两类模板及版本、支出和支出分类。
          </text>
        </view>
      </view>

      <view class="danger-checklist">
        <view class="check-row">
          <HejiIcon class="danger-bullet" name="ShieldCheck" :size="16" />
          <text>清空前先确认重要数据已经导出备份</text>
        </view>
        <view class="check-row">
          <HejiIcon class="danger-bullet" name="ShieldCheck" :size="16" />
          <text>自定义支出分类和两类模板历史也会被删除</text>
        </view>
        <view class="check-row">
          <HejiIcon class="danger-bullet" name="ShieldCheck" :size="16" />
          <text>清空后恢复内置文案模板、月卡文案模板和 5 个默认支出分类</text>
        </view>
      </view>

      <view v-if="clearStatus" class="status" :class="`status--${clearStatus.tone}`">
        <text>{{ clearStatus.message }}</text>
      </view>

      <button class="danger-button" :disabled="busy" @click="doClear">
        <HejiIcon name="Trash2" :size="18" />
        <text>{{ busyAction === 'clear' ? '正在清空…' : '清空所有数据' }}</text>
      </button>
    </view>
  </scroll-view>
</template>

<style scoped lang="scss">
.page {
  height: 100vh;
  min-height: 100vh;
  padding: $hej-space-4;
  padding-bottom: calc($hej-space-7 + constant(safe-area-inset-bottom));
  padding-bottom: calc($hej-space-7 + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: $hej-color-canvas;
  color: $hej-color-text;
  font-family: $hej-font-family;
}

.panel {
  margin-bottom: $hej-space-4;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  gap: $hej-space-4;
}

.section-icon {
  display: flex;
  flex: 0 0 72rpx;
  align-items: center;
  justify-content: center;
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
}

.section-copy {
  min-width: 0;
  flex: 1;
}

.section-title,
.section-desc {
  display: block;
}

.section-title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 700;
  line-height: 1.4;
}

.section-desc {
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.6;
}

.primary-button,
.secondary-button,
.import-button,
.danger-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-2;
  box-sizing: border-box;
  height: 88rpx;
  padding: 0 $hej-space-5;
  border-radius: $hej-radius-control;
  font-size: $hej-font-body;
  line-height: 88rpx;
  text-align: center;
}

.primary-button::after,
.secondary-button::after,
.import-button::after,
.danger-button::after {
  border: 0;
}

.primary-button {
  margin: $hej-space-5 0 0;
  background: $hej-color-accent;
  color: $hej-color-surface;
  font-weight: 650;
}

.restore-actions {
  display: flex;
  gap: $hej-space-3;
  margin: $hej-space-5 0;
  padding-top: $hej-space-5;
  border-top: 1rpx dashed $hej-color-border;
}

.secondary-button {
  min-width: 0;
  flex: 1;
  margin: 0;
  border: 1rpx solid $hej-color-border;
  background: transparent;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  white-space: nowrap;
}

.field-label {
  display: block;
  margin-bottom: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
}

.import-editor {
  position: relative;
  overflow: hidden;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-surface;
}

.textarea {
  width: 100%;
  min-height: 210rpx;
  box-sizing: border-box;
}

.textarea :deep(.uni-easyinput__content) {
  min-height: 210rpx;
  background: transparent !important;
}

.textarea :deep(.uni-easyinput__content-textarea) {
  min-height: 160rpx;
  padding: $hej-space-4 $hej-space-4 52rpx;
  color: $hej-color-text;
  font-family: $hej-font-family-mono;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.char-count {
  position: absolute;
  right: $hej-space-4;
  bottom: $hej-space-3;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  pointer-events: none;
}

.restore-notes {
  display: flex;
  flex-direction: column;
  gap: $hej-space-1;
  margin-top: $hej-space-3;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.source-pill {
  display: inline-flex;
  max-width: 100%;
  margin-top: $hej-space-3;
  padding: $hej-space-1 $hej-space-3;
  overflow: hidden;
  border-radius: $hej-radius-pill;
  background: $hej-color-accent-soft;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  text-overflow: ellipsis;
  white-space: nowrap;
  box-sizing: border-box;
}

.status {
  margin-top: $hej-space-4;
  padding: $hej-space-3 $hej-space-4;
  border-radius: $hej-radius-control;
  color: $hej-color-text-secondary;
  font-size: $hej-font-meta;
  line-height: 1.5;
  word-break: break-all;
}

.status--info,
.status--working {
  background: $hej-color-pending-soft;
  color: $hej-color-pending;
}

.status--success {
  background: $hej-color-success-soft;
  color: $hej-color-success;
}

.status--error {
  background: $hej-color-danger-soft;
  color: $hej-color-danger;
}

.import-button {
  margin: $hej-space-5 0 0;
  border: 1rpx solid $hej-color-text-secondary;
  background: transparent;
  color: $hej-color-text;
  font-weight: 650;
}

.danger-zone {
  border-color: rgba(141, 69, 69, 0.18);
  background: $hej-color-danger-soft;
  box-shadow: none;
}

.section-icon--danger {
  background: $hej-color-surface;
  color: $hej-color-danger;
}

.section-title--danger {
  color: $hej-color-danger;
}

.danger-checklist {
  display: flex;
  flex-direction: column;
  gap: $hej-space-2;
  margin: $hej-space-5 0 0;
  padding-top: $hej-space-4;
  border-top: 1rpx solid rgba(141, 69, 69, 0.14);
}

.check-row {
  display: flex;
  align-items: flex-start;
  gap: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.danger-bullet {
  flex: 0 0 auto;
  color: $hej-color-danger;
}

.danger-button {
  margin: $hej-space-5 0 0;
  border: 2rpx solid $hej-color-danger;
  background: transparent;
  color: $hej-color-danger;
  font-weight: 650;
}

button[disabled] {
  border-color: $hej-color-border;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
  opacity: 0.72;
}

.primary-button:active,
.import-button:active,
.secondary-button:active,
.danger-button:active {
  opacity: 0.78;
}
</style>
