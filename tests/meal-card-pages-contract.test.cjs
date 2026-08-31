const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const openCardPage = readFileSync(join(root, 'src/pages/me/customers/open-card.vue'), 'utf8')
const recordsPage = readFileSync(join(root, 'src/pages/me/customers/card-records.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('meal card open page keeps the real data chain, form structure, and error handling', () => {
  assert.match(openCardPage, /getCustomer/)
  assert.match(openCardPage, /getCard/)
  assert.match(openCardPage, /listCards/)
  assert.match(openCardPage, /openCard/)
  assert.match(openCardPage, /updateCardTotalMeals/)
  assert.match(openCardPage, /MealCardTotalTooSmallError/)
  assert.match(openCardPage, /MealCardReservationConflictError/)
  assert.match(openCardPage, /uni-forms/)
  assert.match(openCardPage, /uni-forms-item/)
  assert.match(openCardPage, /确认开卡/)
  assert.match(openCardPage, /保存修改/)
  assert.match(openCardPage, /本次增加/)
  assert.match(openCardPage, /修改后剩余/)

  // No hardcoded demo values in production template
  const demoValues = ['王阿姨']
  for (const demoValue of demoValues) {
    assert.doesNotMatch(openCardPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('meal card open page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(openCardPage, /<style scoped lang="scss">/)
  assert.match(openCardPage, /\$hej-color-canvas/)
  assert.match(openCardPage, /\$hej-color-surface/)
  assert.match(openCardPage, /\$hej-color-accent/)
  assert.match(openCardPage, /\$hej-color-border/)
  assert.doesNotMatch(openCardPage, /#007aff/i)
})

test('meal card records page displays real records, metrics, status, and deletion protection', () => {
  assert.match(recordsPage, /getCustomer/)
  assert.match(recordsPage, /listCards/)
  assert.match(recordsPage, /deleteCard/)
  assert.match(recordsPage, /usePageReturnSnapshot/)
  assert.match(recordsPage, /MealCardAlreadyUsedError/)
  assert.match(recordsPage, /MealCardReservationConflictError/)
  assert.match(recordsPage, /MealCardDeleteIntegrityError/)
  assert.match(recordsPage, /总次数/)
  assert.match(recordsPage, /已用/)
  assert.match(recordsPage, /剩余/)
  assert.match(recordsPage, /使用中/)
  assert.match(recordsPage, /已用完/)
  assert.match(recordsPage, /修改总次数/)
  assert.match(recordsPage, /已有扣次[，,]不能删除|已扣次[，,]不能删除/)
  assert.match(recordsPage, /删除这笔记录|删除记录/)

  const demoValues = ['王阿姨', '#36', '#35', '#34']
  for (const demoValue of demoValues) {
    assert.doesNotMatch(recordsPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('meal card records page visual contract uses warm paper semantic tokens', () => {
  assert.match(recordsPage, /<style scoped lang="scss">/)
  assert.match(recordsPage, /\$hej-color-canvas/)
  assert.match(recordsPage, /\$hej-color-surface/)
  assert.match(recordsPage, /\$hej-color-accent/)
  assert.match(recordsPage, /\$hej-color-danger/)
  assert.doesNotMatch(recordsPage, /#007aff/i)
})

test('meal card pages retain route and title semantics in pages.json', () => {
  const openCardEntry = pages.pages.find((p) => p.path === 'pages/me/customers/open-card')
  const recordsEntry = pages.pages.find((p) => p.path === 'pages/me/customers/card-records')

  assert.ok(openCardEntry)
  assert.ok(recordsEntry)
  assert.equal(openCardEntry.style?.navigationBarTitleText, '开次卡')
  assert.equal(recordsEntry.style?.navigationBarTitleText, '充值记录')
})
