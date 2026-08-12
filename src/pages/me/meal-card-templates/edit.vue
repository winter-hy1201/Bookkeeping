<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  createMealCardMessageTemplate,
  getMealCardMessageTemplate,
  MealCardTemplateNameConflictError,
  updateMealCardMessageTemplate,
} from '../../../api/meal-card-templates'
import type { MealCardMessageTemplate } from '../../../types/domain'
import {
  DEFAULT_MEAL_CARD_TEMPLATE_BODY,
  renderMealCardTemplate,
  validateMealCardTemplate,
} from '../../../utils/meal-card-template'
import { showToast } from '../../../utils/ui'

interface UniFormsRef {
  validate: () => Promise<unknown>
}

interface TemplateForm {
  name: string
  body: string
}

const templateId = ref<number | null>(null)
const template = ref<MealCardMessageTemplate | null>(null)
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
    validateMealCardTemplate(form.body)
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : '模板格式无效'
  }
})

const preview = computed(() => {
  if (validationError.value) return ''
  try {
    return renderMealCardTemplate(form.body, { usedMeals: 1, availableMeals: 14 })
  } catch {
    return ''
  }
})

const canSave = computed(
  () => Boolean(form.name.trim() && form.body.trim()) && !validationError.value && !saving.value,
)

function appendToken(token: string): void {
  const separator = form.body.trim() ? '\n\n' : ''
  form.body = `${form.body.trimEnd()}${separator}${token}`
}

function insertUsedMeals(): void {
  appendToken('{{本次使用份数}}')
}

function insertAvailableMeals(): void {
  appendToken('{{当前可用份数}}')
}

function useDefaultBody(): void {
  if (form.body.trim()) {
    uni.showModal({
      title: '使用内置正文？',
      content: '当前正文会被内置月卡模板替换。',
      success: (result) => {
        if (result.confirm) form.body = DEFAULT_MEAL_CARD_TEMPLATE_BODY
      },
    })
    return
  }
  form.body = DEFAULT_MEAL_CARD_TEMPLATE_BODY
}

async function loadTemplate(id: number): Promise<void> {
  loading.value = true
  try {
    const result = await getMealCardMessageTemplate(id)
    if (!result) {
      showToast('月卡模板不存在或已被删除')
      return
    }
    templateId.value = id
    template.value = result
    form.name = result.name
    form.body = result.body
    uni.setNavigationBarTitle({ title: '编辑月卡模板' })
  } catch {
    showToast('月卡模板加载失败')
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
        ? await createMealCardMessageTemplate(input)
        : await updateMealCardMessageTemplate(templateId.value, input)
    if (!result) {
      showToast('月卡模板不存在')
      return
    }
    showToast('月卡模板已保存')
    uni.navigateBack()
  } catch (error) {
    if (error instanceof MealCardTemplateNameConflictError) {
      showToast('月卡模板名称已存在')
      return
    }
    showToast(error instanceof Error ? error.message : '月卡模板保存失败')
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const id = Number(query?.id)
  if (Number.isFinite(id) && id > 0) void loadTemplate(id)
  else form.body = DEFAULT_MEAL_CARD_TEMPLATE_BODY
})
</script>

<template>
  <view class="page">
    <scroll-view class="content" scroll-y>
      <view v-if="loading" class="empty">月卡模板加载中...</view>
      <template v-else>
        <view class="intro">
          <text class="intro-title">{{ template ? '编辑月卡模板' : '新建月卡模板' }}</text>
          <text class="intro-text"
            >套餐价格和总次数直接写在正文里；复制时只替换两个次数占位符。</text
          >
        </view>

        <uni-forms
          ref="formRef"
          class="form"
          :model-value="form"
          :rules="rules"
          label-width="80px"
          label-align="left"
        >
          <uni-forms-item name="name" label="名称" required>
            <uni-easyinput
              v-model="form.name"
              placeholder="例如：月卡信息"
              :input-border="false"
            />
          </uni-forms-item>
          <view class="divider" />
          <uni-forms-item name="body" label="正文" required>
            <uni-easyinput
              v-model="form.body"
              class="body-input"
              type="textarea"
              placeholder="输入月卡说明，再插入次数占位符"
              :input-border="false"
            />
          </uni-forms-item>
        </uni-forms>

        <view class="insert-panel">
          <view>
            <text class="panel-title">插入模板内容</text>
            <text class="panel-hint">两个占位符都必须保留，套餐描述可直接在正文中修改。</text>
          </view>
          <view class="insert-actions">
            <button class="insert-button" @click="insertUsedMeals">本次使用份数</button>
            <button class="insert-button" @click="insertAvailableMeals">当前可用份数</button>
            <button class="insert-button subtle" @click="useDefaultBody">内置正文</button>
          </view>
        </view>

        <view v-if="validationError" class="validation-card">
          <text class="validation-title">模板还不能保存</text>
          <text class="validation-text">{{ validationError }}</text>
        </view>

        <view v-else class="preview-card">
          <view class="preview-header">
            <text class="preview-title">月卡文案预览</text>
            <text class="preview-meta">示例：本次 1 份 · 当前 14 份</text>
          </view>
          <text class="preview-paper">{{ preview }}</text>
        </view>
      </template>
    </scroll-view>

    <view class="confirm-bar">
      <view>
        <text class="confirm-title">{{ validationError || '模板格式正确' }}</text>
        <text class="confirm-hint">保存编辑后，旧内容会进入历史版本</text>
      </view>
      <button class="save-button" :disabled="!canSave" @click="save">
        {{ saving ? '保存中...' : '保存模板' }}
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
  padding: $hej-space-6 $hej-space-1 220rpx;
  box-sizing: border-box;
}

.intro {
  padding: 0 $hej-space-5 $hej-space-5;
}

.intro-title,
.intro-text,
.panel-title,
.panel-hint,
.validation-title,
.validation-text,
.preview-title,
.preview-meta,
.preview-paper,
.confirm-title,
.confirm-hint {
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

.body-input :deep(.uni-easyinput__content-textarea) {
  min-height: 480rpx;
  padding: $hej-space-3 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.55;
}

.divider {
  height: 1rpx;
  margin: $hej-space-4 0 $hej-space-4 80px;
  background: $hej-color-border;
}

.insert-panel,
.validation-card,
.preview-card {
  margin: $hej-space-5 $hej-space-1 0;
  padding: $hej-space-5;
  border-radius: $hej-radius-panel;
  background: $hej-color-surface;
}

.panel-title,
.validation-title,
.preview-title {
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.panel-hint,
.validation-text,
.preview-meta {
  margin-top: 6rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
  line-height: 1.5;
}

.insert-actions {
  display: flex;
  flex-wrap: wrap;
  gap: $hej-space-2;
  margin-top: $hej-space-4;
}

.insert-button {
  height: 68rpx;
  margin: 0;
  padding: 0 $hej-space-4;
  border: 1rpx solid $hej-color-accent;
  border-radius: $hej-radius-control;
  background: $hej-color-accent-soft;
  color: $hej-color-accent;
  font-size: $hej-font-meta;
  line-height: 68rpx;
  text-align: center;
}

.insert-button.subtle {
  border-color: $hej-color-border;
  background: $hej-color-surface;
  color: $hej-color-text-secondary;
}

.validation-card {
  border: 1rpx solid $hej-color-danger-soft;
  background: $hej-color-danger-soft;
}

.validation-title,
.validation-text {
  color: $hej-color-danger;
}

.preview-card {
  border: 1rpx solid $hej-color-border;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $hej-space-4;
}

.preview-meta {
  margin-top: 0;
}

.preview-paper {
  margin-top: $hej-space-4;
  padding: $hej-space-6;
  border-left: 6rpx solid $hej-color-accent;
  border-radius: $hej-radius-control;
  background: $hej-color-surface-subtle;
  color: $hej-color-text;
  font-size: $hej-font-body;
  line-height: 1.7;
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

.confirm-bar > view {
  min-width: 0;
}

.confirm-title {
  overflow: hidden;
  color: $hej-color-text;
  font-size: $hej-font-meta;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.confirm-hint {
  margin-top: 4rpx;
  color: $hej-color-text-secondary;
  font-size: $hej-font-caption;
}

.save-button {
  flex: 0 0 auto;
  height: 88rpx;
  margin: 0;
  padding: 0 $hej-space-6;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #fff;
  font-size: $hej-font-body;
  line-height: 88rpx;
  text-align: center;
}

.save-button[disabled] {
  opacity: 0.4;
}

.empty {
  padding: 64rpx;
  color: $hej-color-text-secondary;
  text-align: center;
}
</style>
