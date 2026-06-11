<script setup lang="ts">
import { ref } from 'vue'
import { clearAllData, exportBackup, importBackup, parseBackupText } from '../../../utils/backup'
import { confirmDialog, showToast } from '../../../utils/ui'

const importText = ref('')
const busy = ref(false)

async function doExport(): Promise<void> {
  busy.value = true
  try {
    await exportBackup()
    showToast('备份已生成')
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
    showToast('导入成功，请重启 App')
  } catch (error) {
    showToast(error instanceof Error ? error.message : '导入失败')
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
      <text class="desc">导出 5 张业务表为 JSON，并调用系统分享面板。</text>
      <button class="primary" :disabled="busy" @click="doExport">导出备份</button>
    </view>

    <view class="panel">
      <text class="title">恢复</text>
      <text class="desc">v1.0 使用全量覆盖。当前页面先支持粘贴 JSON 导入，真机文件选择后续可接 plus.io 文件入口。</text>
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
.danger {
  margin: 20rpx 0 0;
  border-radius: 12rpx;
  color: #ffffff;
  font-size: 30rpx;
}

.primary {
  background: #007aff;
}

.danger-zone {
  border: 1rpx solid #ffd6d6;
}

.danger {
  background: #ee0a24;
}
</style>
