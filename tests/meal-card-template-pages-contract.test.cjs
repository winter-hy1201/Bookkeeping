const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const listPage = readFileSync(join(root, 'src/pages/me/meal-card-templates/list.vue'), 'utf8')
const editPage = readFileSync(join(root, 'src/pages/me/meal-card-templates/edit.vue'), 'utf8')
const historyPage = readFileSync(join(root, 'src/pages/me/meal-card-templates/history.vue'), 'utf8')
const orderDetailPage = readFileSync(join(root, 'src/pages/order/detail.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('meal card templates list page keeps real data chain, actions, placeholders, and return snapshot', () => {
  assert.match(listPage, /listMealCardMessageTemplates/)
  assert.match(listPage, /setDefaultMealCardMessageTemplate/)
  assert.match(listPage, /deleteMealCardMessageTemplate/)
  assert.match(listPage, /usePageReturnSnapshot/)
  assert.match(listPage, /月卡文案模板/)
  assert.match(listPage, /默认模板会用于订单详情的月卡信息复制/)
  assert.match(listPage, /新建模板/)
  assert.match(listPage, /本次使用份数/)
  assert.match(listPage, /当前可用份数/)
  assert.match(listPage, /设为默认/)
  assert.match(listPage, /编辑/)
  assert.match(listPage, /历史/)
  assert.match(listPage, /删除/)
  assert.match(listPage, /正在读取月卡模板列表/)
  assert.match(listPage, /还没有月卡文案模板/)

  // No hardcoded demo templates from reference image
  const demoTemplates = ['20次月卡·午晚餐', '10次月卡·午餐', '30次月卡·全时段', '5次月卡·晚餐']
  for (const demo of demoTemplates) {
    assert.doesNotMatch(listPage, new RegExp(escapeRegex(demo)))
  }
})

test('meal card templates list page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(listPage, /<style scoped lang="scss">/)
  assert.match(listPage, /\$hej-color-canvas/)
  assert.match(listPage, /\$hej-color-surface/)
  assert.match(listPage, /\$hej-color-accent/)
  assert.match(listPage, /\$hej-color-border/)
  assert.doesNotMatch(listPage, /#007aff/i)
  assert.doesNotMatch(listPage, /#ee0a24/i)
})

test('meal card template edit page keeps pure text form, 80px label column, chips, preview, and validation', () => {
  assert.match(editPage, /getMealCardMessageTemplate/)
  assert.match(editPage, /createMealCardMessageTemplate/)
  assert.match(editPage, /updateMealCardMessageTemplate/)
  assert.match(editPage, /validateMealCardTemplate/)
  assert.match(editPage, /renderMealCardTemplate/)
  assert.match(editPage, /uni-forms/)
  assert.match(editPage, /uni-forms-item/)
  assert.match(editPage, /label-width="80px"/)
  assert.match(editPage, /name="name"/)
  assert.match(editPage, /name="body"/)
  assert.match(editPage, /uni-easyinput/)
  assert.match(editPage, /insertUsedMeals/)
  assert.match(editPage, /insertAvailableMeals/)
  assert.match(editPage, /useDefaultBody/)
  assert.match(editPage, /月卡文案预览/)
  assert.match(editPage, /示例：本次1份 · 当前14份/)
  assert.match(editPage, /模板格式正确/)
  assert.match(editPage, /保存编辑后，旧内容会进入历史版本/)

  // No rich text formatting tools
  assert.doesNotMatch(editPage, /bold|italic|underline|wysiwyg|quill/i)
})

test('meal card template edit page visual contract uses warm paper semantic tokens', () => {
  assert.match(editPage, /<style scoped lang="scss">/)
  assert.match(editPage, /\$hej-color-canvas/)
  assert.match(editPage, /\$hej-color-surface/)
  assert.match(editPage, /\$hej-color-accent/)
  assert.match(editPage, /\$hej-color-border/)
  assert.doesNotMatch(editPage, /#007aff/i)
  assert.doesNotMatch(editPage, /#ee0a24/i)
})

test('meal card template history page keeps version list, notice banner, and recovery flow', () => {
  assert.match(historyPage, /getMealCardMessageTemplate/)
  assert.match(historyPage, /listMealCardTemplateVersions/)
  assert.match(historyPage, /restoreMealCardTemplateVersion/)
  assert.match(historyPage, /月卡模板历史/)
  assert.match(historyPage, /恢复历史版本会先快照当前模板/)
  assert.match(historyPage, /恢复此版本/)
  assert.match(historyPage, /还没有历史版本/)

  // Visual tokens
  assert.match(historyPage, /<style scoped lang="scss">/)
  assert.match(historyPage, /\$hej-color-canvas/)
  assert.match(historyPage, /\$hej-color-surface/)
  assert.match(historyPage, /\$hej-color-accent/)
  assert.match(historyPage, /\$hej-color-border/)
  assert.doesNotMatch(historyPage, /#007aff/i)
  assert.doesNotMatch(historyPage, /#ee0a24/i)
})

test('meal card message copy in delivered order detail uses default template and actual balance', () => {
  assert.match(orderDetailPage, /getDefaultMealCardMessageTemplate/)
  assert.match(orderDetailPage, /getMealCardAvailability/)
  assert.match(orderDetailPage, /renderMealCardTemplate/)
  assert.match(orderDetailPage, /availableMeals:\s*availability\.actual_remaining/)
  assert.match(orderDetailPage, /还没有默认月卡模板/)
  assert.match(orderDetailPage, /\/pages\/me\/meal-card-templates\/list/)
})

test('meal card template pages retain route and title semantics in pages.json', () => {
  const listEntry = pages.pages.find((p) => p.path === 'pages/me/meal-card-templates/list')
  const editEntry = pages.pages.find((p) => p.path === 'pages/me/meal-card-templates/edit')
  const historyEntry = pages.pages.find((p) => p.path === 'pages/me/meal-card-templates/history')

  assert.ok(listEntry)
  assert.ok(editEntry)
  assert.ok(historyEntry)
  assert.equal(listEntry.style?.navigationBarTitleText, '月卡文案模板')
  assert.equal(editEntry.style?.navigationBarTitleText, '新建月卡模板')
  assert.equal(historyEntry.style?.navigationBarTitleText, '月卡模板历史')
})
