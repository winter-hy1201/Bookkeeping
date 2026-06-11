<script setup lang="ts">
import { ref } from 'vue'
import {
  clearAllData,
  exportBackup,
  importBackup,
  listBackupFiles,
  parseBackupText,
  readBackupFile,
  type BackupFileEntry,
} from '../../../utils/backup'
import { actionSheet, confirmDialog, showToast } from '../../../utils/ui'

const importText = ref('')
const busy = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

function describePath(result: { internalPath: string; downloadPath: string | null }): string {
  return result.downloadPath ?? result.internalPath
}

async function doExport(): Promise<void> {
  busy.value = true
  try {
    const result = await exportBackup()
    showToast(`备份已保存: ${describePath(result)}`)
  } catch (error) {
    showToast(error instanceof Error ? error.message : '导出失败')
  } finally {
    busy.value = false
  }
}

async function doImport(): Promise<void> {
  const ok = await confirmDialog('导入将覆盖所有现有数据', '该操作无法恢复，是否继续？')
  if (!ok) return
  busy.value = true
  try {
    await importBackup(parseBackupText(importText.value))
    importText.value = ''
    showToast('导入成功，请重启 App')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '导入失败')
  } finally {
    busy.value = false
  }
}

async function pickFromSavedBackups(): Promise<void> {
  const files = await listBackupFiles()
  if (!files.length) {
    showToast('未找到已保存的备份')
    return
  }
  const index = await actionSheet(files.map((file: BackupFileEntry) => file.name))
  const picked = index == null ? null : files[index]
  if (!picked) return
  busy.value = true
  try {
    await importBackup(await readBackupFile(picked.fullPath))
    showToast('导入成功，请重启 App')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '导入失败')
  } finally {
    busy.value = false
  }
}

function openFilePicker(): void {
  fileInputRef.value?.click()
}

async function onFilePicked(event: Event): Promise<void> {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  busy.value = true
  try {
    const text = await file.text()
    importText.value = text
    showToast('已读取文件，点击「导入覆盖」完成恢复')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '读取文件失败')
  } finally {
    busy.value = false
  }
}

async function doClear(): Promise<void> {
  const first = await confirmDialog(
    '确认清空所有数据？',
    '这会删除客户、订单、次卡和支出，默认支出分类会恢复为初始 5 项。',
  )
  if (!first) return
  const second = await confirmDialog('再次确认', '清空后无法恢复。')
  if (!second) return
  const third = await confirmDialog('最后确认', '确定要清空全部数据吗？')
  if (!third) return
  busy.value = true
  try {
    await clearAllData()
    showToast('已清空')
  } catch {
    showToast('清空失败')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <scroll-view class="page" scroll-y>
    <view class="panel">
      <text class="title">备份</text>
      <text class="desc">导出 5 张业务表为 JSON，同时写入应用沙盒和下载目录，文件管理可见。</text>
      <button class="primary" :disabled="busy" @click="doExport">导出备份</button>
    </view>

    <view class="panel">
      <text class="title">恢复</text>
      <text class="desc">v1.0 使用全量覆盖。支持粘贴 JSON、从已下载的备份选择、或从本地文件选择。</text>
      <view class="actions">
        <button class="secondary" :disabled="busy" @click="pickFromSavedBackups">从已保存备份选择</button>
        <button class="secondary" :disabled="busy" @click="openFilePicker">从本地文件选择</button>
        <input
          ref="fileInputRef"
          class="file-input"
          type="file"
          accept=".json,application/json"
          @change="onFilePicked"
        />
      </view>
      <uni-easyinput
        v-model="importText"
        class="textarea"
        type="textarea"
        placeholder="粘贴 backup_*.json 内容"
        :input-border="false"
      />
      <button class="primary" :disabled="busy || !importText.trim()" @click="doImport">导入覆盖</button>
    </view>

    <view class="panel danger-zone">
      <text class="title">危险区</text>
      <text class="desc">清空客户、订单、次卡和支出，需要三次确认；默认支出分类会自动恢复。</text>
      <button class="danger" :disabled="busy" @click="doClear">清空所有数据</button>
    </view>
  </scroll-view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  background: #f6f7f9;
  box-sizing: border-box;
}

.panel {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.title,
.desc {
  display: block;
}

.title {
  color: #222222;
  font-size: 34rpx;
  font-weight: 700;
}

.desc {
  margin: 10rpx 0 22rpx;
  color: #8f8f94;
  font-size: 26rpx;
  line-height: 1.5;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.file-input {
  display: none;
}

.textarea {
  width: 100%;
  min-height: 260rpx;
  padding: 18rpx;
  border: 1rpx solid #e5e5e5;
  border-radius: 12rpx;
  background: #f9fafb;
  box-sizing: border-box;
}

.primary,
.danger,
.secondary {
  margin: 20rpx 0 0;
  border-radius: 12rpx;
  color: #ffffff;
  font-size: 30rpx;
}

.actions .secondary {
  margin: 0;
  flex: 1 1 280rpx;
}

.primary {
  background: #007aff;
}

.secondary {
  background: #5b6470;
}

.danger-zone {
  border: 1rpx solid #ffd6d6;
}

.danger {
  background: #ee0a24;
}
</style>
