<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import HejiIcon from '../../../components/HejiIcon.vue'
import {
  createMessageTemplate,
  getMessageTemplate,
  TemplateNameConflictError,
  updateMessageTemplate,
} from '../../../api/message-templates'
import type { MessageTemplate } from '../../../types/domain'
import { today } from '../../../utils/date'
import {
  DEFAULT_MENU_TEMPLATE_BODY,
  renderMenuTemplate,
  validateMenuTemplate,
} from '../../../utils/menu-template'
import { showToast } from '../../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface TemplateForm {
  name: string
  body: string
}

const templateId = ref<number | null>(null)
const template = ref<MessageTemplate | null>(null)
const loading = ref(false)
const saving = ref(false)
const formRef = ref<UniFormsRef | null>(null)
const form = reactive<TemplateForm>({ name: '', body: '' })

const rules = {
  name: { rules: [{ required: true, errorMessage: '请输入模板名称' }] },
  body: { rules: [{ required: true, errorMessage: '请输入模板正文' }] },
}

const validationError = computed(() => {
  try {
    validateMenuTemplate(form.body)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : '模板格式无效'
  }
})

const preview = computed(() => {
  if (validationError.value) return ''
  try {
    return renderMenuTemplate(form.body, {
      menuDate: today(),
      lunchText: '香菇滑鸡、清炒时蔬、番茄炒蛋',
      dinnerText: '土豆烧牛肉、蒜蓉生菜、冬瓜海带汤',
    })
  } catch {
    return ''
  }
})

const canSave = computed(
  () => Boolean(form.name.trim() && form.body.trim()) && !validationError.value && !saving.value,
)

function appendBlock(content: string): void {
  const separator = form.body.trim() ? '\n\n' : ''
  form.body = `${form.body.trimEnd()}${separator}${content}`
}

function insertDate(): void {
  appendBlock('{{日期}}')
}

function insertLunch(): void {
  appendBlock('{{#午餐}}\n{{日期}}午餐🍱\n{{午餐}}\n{{/午餐}}')
}

function insertDinner(): void {
  appendBlock('{{#晚餐}}\n{{日期}}晚餐🍱\n{{晚餐}}\n{{/晚餐}}')
}

function useDefaultBody(): void {
  if (form.body.trim()) {
    uni.showModal({
      title: '使用内置正文？',
      content: '当前正文会被内置日常模板替换。',
      success: (result) => {
        if (result.confirm) form.body = DEFAULT_MENU_TEMPLATE_BODY
      },
    })
    return
  }
  form.body = DEFAULT_MENU_TEMPLATE_BODY
}

async function loadTemplate(id: number): Promise<void> {
  loading.value = true
  try {
    const result = await getMessageTemplate(id)
    if (!result) {
      showToast('模板不存在或已被删除')
      return
    }
    templateId.value = id
    template.value = result
    form.name = result.name
    form.body = result.body
    uni.setNavigationBarTitle({ title: '编辑模板' })
  } catch {
    showToast('模板加载失败')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (!canSave.value) {
    if (validationError.value) showToast(validationError.value)
    return
  }
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  saving.value = true
  try {
    const input = { name: form.name, body: form.body }
    const result =
      templateId.value === null
        ? await createMessageTemplate(input)
        : await updateMessageTemplate(templateId.value, input)
    if (!result) {
      showToast('模板不存在')
      return
    }
    showToast('模板已保存')
    uni.navigateBack()
  } catch (error) {
    if (error instanceof TemplateNameConflictError) {
      showToast('模板名称已存在')
      return
    }
    showToast(error instanceof Error ? error.message : '模板保存失败')
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) void loadTemplate(id)
})
</script>

<template>
  <view class="page">
    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="state-card">
        <text class="state-title">正在读取模板详情…</text>
      </view>
      <template v-else>
        <!-- Form Header Intro -->
        <view class="intro">
          <text class="intro-title">{{ template ? '编辑社群文案' : '新建社群文案' }}</text>
          <text class="intro-text"
            >条件区块内的餐次为空时会整段移除，固定说明和分隔线保持原样。</text
          >
        </view>

        <!-- Continuous Surface Form -->
        <view class="form-card">
          <uni-forms
            ref="formRef"
            class="form"
            :model-value="form"
            :rules="rules"
            label-width="100px"
            label-align="left"
          >
            <uni-forms-item name="name" label="名称" required>
              <view class="input-row">
                <uni-easyinput
                  v-model="form.name"
                  placeholder="例如：日常午晚餐"
                  :maxlength="20"
                  :input-border="false"
                />
                <text class="char-count">{{ form.name.length }}/20</text>
              </view>
            </uni-forms-item>
            <view class="divider" />
            <uni-forms-item name="body" label="正文" required>
              <view class="textarea-wrap">
                <uni-easyinput
                  v-model="form.body"
                  class="body-input"
                  type="textarea"
                  placeholder="输入固定文案，再插入日期和餐次区块"
                  :maxlength="1000"
                  :input-border="false"
                  auto-height
                />
                <text class="char-count textarea-count">{{ form.body.length }}/1000</text>
              </view>
            </uni-forms-item>
          </uni-forms>
        </view>

        <!-- Insert Content Panel -->
        <view class="insert-panel">
          <view class="insert-header">
            <text class="panel-title">插入模板内容</text>
            <text class="panel-hint">点击追加标记到正文末尾，可自由编辑位置</text>
          </view>
          <view class="insert-actions">
            <button class="chip-btn" @click="insertDate">
              <text>日期</text>
              <HejiIcon name="Plus" :size="14" />
            </button>
            <button class="chip-btn" @click="insertLunch">
              <text>午餐区块</text>
              <HejiIcon name="Plus" :size="14" />
            </button>
            <button class="chip-btn" @click="insertDinner">
              <text>晚餐区块</text>
              <HejiIcon name="Plus" :size="14" />
            </button>
            <button class="chip-btn chip-btn--subtle" @click="useDefaultBody">
              <text>内置正文</text>
              <HejiIcon name="Plus" :size="14" />
            </button>
          </view>
        </view>

        <!-- Syntax Error Warning Card -->
        <view v-if="validationError" class="validation-card">
          <view class="validation-header">
            <HejiIcon class="validation-icon" name="CircleAlert" :size="18" />
            <text class="validation-title">模板还不能保存</text>
          </view>
          <text class="validation-text">{{ validationError }}</text>
        </view>

        <!-- Signature Preview Paper -->
        <view v-else class="preview-card">
          <view class="preview-header">
            <text class="preview-title">社群文案预览</text>
            <text class="preview-meta">使用示例菜品</text>
          </view>
          <text class="preview-paper">{{ preview }}</text>
        </view>
      </template>
    </scroll-view>

    <!-- Fixed Bottom Confirmation Bar -->
    <view class="confirm-bar">
      <view class="confirm-status">
        <view class="status-indicator">
          <HejiIcon
            v-if="validationError"
            class="status-icon status-icon--error"
            name="CircleX"
            :size="18"
          />
          <HejiIcon v-else class="status-icon status-icon--success" name="CircleCheck" :size="18" />
          <text :class="['confirm-title', { 'confirm-title--error': Boolean(validationError) }]">
            {{ validationError ? '语法错误' : '模板格式正确' }}
          </text>
        </view>
        <text class="confirm-hint">
          {{ validationError ? '请修正占位符标记后再保存' : '保存编辑后，旧内容会进入历史版本' }}
        </text>
      </view>
      <button class="save-button" :disabled="!canSave" @click="save">
        {{ saving ? '保存中...' : (templateId ? '保存修改' : '保存模板') }}
      </button>
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
  padding: $hej-space-6 $hej-space-5 240rpx;
  box-sizing: border-box;
}

.intro {
  margin-bottom: $hej-space-5;
}

.intro-title {
  display: block;
  color: $hej-color-text;
  font-family: $hej-font-family;
  font-size: $hej-font-display;
  font-weight: 700;
  line-height: 1.25;
}

.intro-text {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.4;
}

.form-card {
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
  padding: $hej-space-3 $hej-space-4;
}

.form :deep(.uni-forms-item) {
  margin-bottom: 0;
}

.form :deep(.uni-forms-item__label) {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.form :deep(.uni-forms-item__content) {
  min-width: 0;
}

.input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.char-count {
  flex: 0 0 auto;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
  margin-left: $hej-space-2;
}

.textarea-wrap {
  position: relative;
  width: 100%;
}

.body-input :deep(.uni-easyinput__content-textarea) {
  min-height: 380rpx;
  padding: $hej-space-2 0 $hej-space-6;
  font-family: $hej-font-family-mono;
  font-size: $hej-font-meta;
  line-height: 1.55;
}

.textarea-count {
  position: absolute;
  right: 0;
  bottom: 0;
}

.divider {
  height: 1rpx;
  margin: $hej-space-3 0 $hej-space-3 100px;
  background: $hej-color-border;
}

.insert-panel {
  margin-top: $hej-space-5;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.panel-title {
  display: block;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.panel-hint {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.insert-actions {
  display: flex;
  flex-wrap: wrap;
  gap: $hej-space-2;
  margin-top: $hej-space-3;
}

.chip-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $hej-space-1;
  height: 64rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-accent;
  border-radius: $hej-radius-pill;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  font-weight: 500;
  line-height: 64rpx;
  text-align: center;

  &:active {
    opacity: 0.75;
  }
}

.chip-btn--subtle {
  border-color: $hej-color-border;
  background: $hej-color-surface-subtle;
  color: $hej-color-text-secondary;
}

.validation-card {
  margin-top: $hej-space-5;
  padding: $hej-space-4 $hej-space-5;
  border: 1rpx solid $hej-color-danger-soft;
  border-radius: $hej-radius-panel;
  background: $hej-color-danger-soft;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: $hej-space-2;
}

.validation-icon {
  font-size: $hej-font-body;
}

.validation-title {
  color: $hej-color-danger;
  font-size: $hej-font-body;
  font-weight: 600;
}

.validation-text {
  display: block;
  margin-top: $hej-space-1;
  color: $hej-color-danger;
  font-size: $hej-font-meta;
  line-height: 1.5;
}

.preview-card {
  margin-top: $hej-space-5;
  padding: $hej-space-5;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.preview-title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.preview-meta {
  padding: 4rpx 14rpx;
  border-radius: $hej-radius-pill;
  background: $hej-color-warning-soft;
  color: $hej-color-warning;
  font-size: $hej-font-caption;
  font-weight: 500;
}

.preview-paper {
  display: block;
  margin-top: $hej-space-3;
  padding: $hej-space-4 $hej-space-5;
  border-left: 6rpx solid $hej-color-accent;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-family: $hej-font-family-mono;
  font-size: $hej-font-meta;
  line-height: 1.65;
  white-space: pre-wrap;
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

.confirm-status {
  flex: 1;
  min-width: 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: $hej-space-1;
}

.status-icon {
  font-size: $hej-font-meta;
  font-weight: 700;
}

.status-icon--success {
  color: $hej-color-delivered;
}

.status-icon--error {
  color: $hej-color-danger;
}

.confirm-title {
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-title--error {
  color: $hej-color-danger;
}

.confirm-hint {
  display: block;
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-button {
  flex: 0 0 auto;
  height: 88rpx;
  margin: 0;
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

  &[disabled] {
    opacity: 0.4;
    pointer-events: none;
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
  color: $hej-color-text;
  font-size: $hej-font-title;
  font-weight: 600;
}
</style>
