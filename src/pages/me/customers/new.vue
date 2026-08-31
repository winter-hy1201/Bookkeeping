<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getCustomer } from '../../../api/customers'
import { DuplicateCustomerNameError } from '../../../api/errors'
import { useCustomerStore } from '../../../stores/customer'
import { parseMoney } from '../../../utils/format'
import { showToast } from '../../../utils/ui'

const customerStore = useCustomerStore()
const id = ref<number | null>(null)
const name = ref('')
const phone = ref('')
const wechat = ref('')
const lunchPrice = ref('')
const dinnerPrice = ref('')
const discountPercent = ref('100')
const note = ref('')
const saving = ref(false)

const isEdit = computed(() => id.value !== null)
const canSave = computed(() => name.value.trim().length > 0 && !saving.value)

function parseNullablePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = parseMoney(trimmed)
  return parsed >= 0 ? parsed : null
}

function parseDiscountRate(value: string): number {
  const num = Number(value.trim())
  if (!Number.isFinite(num)) return 1
  return Math.max(0, Math.min(1, num / 100))
}

async function loadCustomer(customerId: number): Promise<void> {
  const customer = await getCustomer(customerId)
  if (!customer) {
    showToast('客户不存在')
    return
  }
  id.value = customer.id
  name.value = customer.name
  phone.value = customer.phone ?? ''
  wechat.value = customer.wechat ?? ''
  lunchPrice.value =
    customer.default_lunch_price !== null ? String(customer.default_lunch_price) : ''
  dinnerPrice.value =
    customer.default_dinner_price !== null ? String(customer.default_dinner_price) : ''
  discountPercent.value = String(Math.round((customer.discount_rate ?? 1) * 100))
  note.value = customer.note ?? ''
}

async function save(): Promise<void> {
  if (!canSave.value) return
  saving.value = true
  try {
    const input = {
      name: name.value.trim(),
      phone: phone.value.trim() || null,
      wechat: wechat.value.trim() || null,
      default_lunch_price: parseNullablePrice(lunchPrice.value),
      default_dinner_price: parseNullablePrice(dinnerPrice.value),
      discount_rate: parseDiscountRate(discountPercent.value),
      note: note.value.trim() || null,
    }
    if (id.value === null) {
      await customerStore.create(input)
    } else {
      await customerStore.update(id.value, input)
    }
    showToast('保存成功')
    uni.navigateBack()
  } catch (error) {
    if (error instanceof DuplicateCustomerNameError) {
      showToast(error.message)
    } else {
      showToast('客户保存失败')
    }
  } finally {
    saving.value = false
  }
}

onLoad((query) => {
  const customerId = Number(query?.id)
  if (Number.isFinite(customerId) && customerId > 0) {
    void loadCustomer(customerId)
  }
})
</script>

<template>
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <uni-forms class="form" label-width="100px" label-align="left">
        <view class="form-card">
          <view class="entry-section">
            <uni-forms-item label="姓名" required>
              <view class="field-control">
                <uni-easyinput
                  v-model="name"
                  class="field-input"
                  placeholder="必填"
                  :clearable="true"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>

            <view class="field-divider" />

            <uni-forms-item label="手机">
              <view class="field-control">
                <uni-easyinput
                  v-model="phone"
                  class="field-input"
                  type="number"
                  placeholder="选填，用于电话联系"
                  :clearable="true"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>

            <view class="field-divider" />

            <uni-forms-item label="微信">
              <view class="field-control">
                <uni-easyinput
                  v-model="wechat"
                  class="field-input"
                  placeholder="选填，用于微信对账"
                  :clearable="true"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>
          </view>

          <view class="section-divider" />

          <view class="entry-section">
            <uni-forms-item label="午餐价">
              <view class="price-field-wrap">
                <view class="amount-control">
                  <text class="amount-prefix">¥</text>
                  <uni-easyinput
                    v-model="lunchPrice"
                    class="amount-input"
                    type="digit"
                    inputmode="decimal"
                    placeholder="留空则录单时手动输入"
                    :clearable="true"
                    :input-border="false"
                  />
                </view>
                <text class="field-helper">留空则录单时手动输入</text>
              </view>
            </uni-forms-item>

            <view class="field-divider" />

            <uni-forms-item label="晚餐价">
              <view class="price-field-wrap">
                <view class="amount-control">
                  <text class="amount-prefix">¥</text>
                  <uni-easyinput
                    v-model="dinnerPrice"
                    class="amount-input"
                    type="digit"
                    inputmode="decimal"
                    placeholder="留空则录单时手动输入"
                    :clearable="true"
                    :input-border="false"
                  />
                </view>
                <text class="field-helper">留空则录单时手动输入</text>
              </view>
            </uni-forms-item>

            <view class="field-divider" />

            <uni-forms-item label="折扣">
              <view class="price-field-wrap">
                <view class="percent-control">
                  <uni-easyinput
                    v-model="discountPercent"
                    class="percent-input"
                    type="number"
                    placeholder="100"
                    :clearable="false"
                    :input-border="false"
                  />
                  <text class="percent-suffix">%</text>
                </view>
                <text class="field-helper">100% 为无折扣，90% 为 9 折</text>
              </view>
            </uni-forms-item>
          </view>

          <view class="section-divider" />

          <view class="entry-section entry-section--note">
            <uni-forms-item label="备注">
              <view class="field-control">
                <uni-easyinput
                  v-model="note"
                  class="note-input"
                  type="textarea"
                  placeholder="周一到周五配送、偏好少辣等"
                  :input-border="false"
                />
              </view>
            </uni-forms-item>
          </view>
        </view>

        <view class="form-scroll-spacer" />
      </uni-forms>
    </scroll-view>

    <view class="submit-bar">
      <button class="save-button" :disabled="!canSave" @click="save">
        {{ saving ? '保存中...' : isEdit ? '保存修改' : '新建客户' }}
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  height: 100vh;
  background: $hej-color-canvas;
  box-sizing: border-box;
}

.form-scroll {
  flex: 1;
  min-height: 0;
}

.form {
  padding: $hej-space-3 $hej-space-3 0;
}

.form-card {
  overflow: hidden;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-card;
  background: $hej-color-surface;
  box-shadow: $hej-shadow-panel;
}

.entry-section {
  padding: $hej-space-4 $hej-space-5;
}

.entry-section :deep(.uni-forms-item) {
  margin-bottom: 0;
}

.entry-section :deep(.uni-forms-item__label) {
  height: 76rpx !important;
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  font-weight: 500 !important;
  line-height: 76rpx !important;
}

.entry-section--note :deep(.uni-forms-item__label) {
  height: auto !important;
  line-height: 1.5 !important;
}

.field-divider {
  height: 1rpx;
  margin: $hej-space-3 0;
  background: $hej-color-border;
}

.section-divider {
  height: 8rpx;
  background: $hej-color-canvas;
}

.field-control {
  min-width: 0;
}

.field-input :deep(.uni-easyinput__content) {
  height: 76rpx !important;
  padding: 0 $hej-space-3 !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  background: $hej-color-control !important;
  box-sizing: border-box;
}

.field-input :deep(.uni-input-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
}

.field-input :deep(.uni-easyinput__placeholder-class) {
  color: $hej-color-text-tertiary !important;
  font-size: $hej-font-body !important;
}

.price-field-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.amount-control,
.percent-control {
  display: flex;
  align-items: center;
  height: 76rpx;
  padding: 0 $hej-space-3;
  border: 1rpx solid $hej-color-border;
  border-radius: $hej-radius-control;
  background: $hej-color-control;
  box-sizing: border-box;
}

.amount-prefix {
  margin-right: $hej-space-2;
  color: $hej-color-text;
  font-size: $hej-font-body;
  font-weight: 600;
}

.amount-input :deep(.uni-easyinput__content),
.percent-input :deep(.uni-easyinput__content) {
  border: 0 !important;
  background: transparent !important;
  padding: 0 !important;
}

.amount-input :deep(.uni-input-input),
.percent-input :deep(.uni-input-input) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  font-weight: 600 !important;
}

.percent-suffix {
  margin-left: $hej-space-2;
  color: $hej-color-text-secondary;
  font-size: $hej-font-body;
  font-weight: 600;
}

.field-helper {
  display: block;
  margin-top: 6rpx;
  color: $hej-color-text-tertiary;
  font-size: $hej-font-caption;
}

.note-input :deep(.uni-easyinput__content) {
  min-height: 140rpx !important;
  padding: $hej-space-3 !important;
  border: 1rpx solid $hej-color-border !important;
  border-radius: $hej-radius-control !important;
  background: $hej-color-control !important;
  box-sizing: border-box;
}

.note-input :deep(.uni-easyinput__placeholder-class) {
  color: $hej-color-text-tertiary !important;
  font-size: $hej-font-body !important;
}

.note-input :deep(.uni-textarea-textarea) {
  color: $hej-color-text !important;
  font-size: $hej-font-body !important;
  line-height: 1.4 !important;
}

.form-scroll-spacer {
  height: $hej-space-6;
}

.submit-bar {
  padding: $hej-space-4 $hej-space-5 calc($hej-space-4 + env(safe-area-inset-bottom));
  border-top: 1rpx solid $hej-color-border;
  background: $hej-color-surface;
  box-sizing: border-box;
}

.save-button {
  width: 100%;
  height: 88rpx;
  border: 0;
  border-radius: $hej-radius-control;
  background: $hej-color-accent;
  color: #ffffff;
  font-size: $hej-font-title;
  font-weight: 600;
  line-height: 88rpx;
  text-align: center;
  box-sizing: border-box;
}

.save-button::after {
  border: 0;
}

.save-button:active {
  opacity: 0.85;
}

.save-button[disabled] {
  background: $hej-color-surface-subtle;
  color: $hej-color-text-tertiary;
}
</style>
