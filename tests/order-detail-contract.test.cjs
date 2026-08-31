const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const detailPage = readFileSync(join(root, 'src/pages/order/detail.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

test('order detail page keeps the real data chain, state machine, and action hierarchy', () => {
  assert.match(detailPage, /useOrderStore\(\)/)
  assert.match(detailPage, /getOrder/)
  assert.match(detailPage, /getCustomer/)
  assert.match(detailPage, /findEffectiveOrder/)
  assert.match(detailPage, /getMealCardAvailability/)
  assert.match(detailPage, /getDefaultMealCardMessageTemplate/)
  assert.match(detailPage, /renderMealCardTemplate/)
  assert.match(detailPage, /usePageReturnSnapshot/)
  assert.match(detailPage, /pageReturn\.restoreOnShow/)
  assert.match(detailPage, /OrderMergeConfirmationError/)
  assert.match(detailPage, /OrderPriceConfirmationError/)
  assert.match(detailPage, /InsufficientCardError/)
  assert.match(detailPage, /statusText/)
  assert.match(detailPage, /formatMoney/)
  assert.match(detailPage, /orderPaymentSummary/)

  // Actions
  assert.match(detailPage, /标记已配送/)
  assert.match(detailPage, /复制信息/)
  assert.match(detailPage, /复制月卡信息/)
  assert.match(detailPage, /取消订单/)
  assert.match(detailPage, /删除订单/)
  assert.match(detailPage, /danger-zone/)

  // Edit form structure
  assert.match(detailPage, /label-width="100px"/)
  assert.match(detailPage, /label-align="left"/)
  assert.match(detailPage, /CustomerPicker/)
  assert.match(detailPage, /entry-divider/)
  assert.match(detailPage, /保存修改/)
  assert.match(detailPage, /取消编辑/)
  assert.match(detailPage, /本次实际金额/)

  // Check no demo names or mock values hardcoded in page
  const demoNames = ['王阿姨', '李师傅', '周老师', 'azhen88']
  for (const demoName of demoNames) {
    assert.doesNotMatch(detailPage, new RegExp(demoName))
  }
})

test('order detail page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(tokens, /\$hej-color-pending:\s*#657789/i)
  assert.match(tokens, /\$hej-color-delivered:\s*#64745b/i)
  assert.match(tokens, /\$hej-color-warning:\s*#8a6843/i)
  assert.match(tokens, /\$hej-color-danger:\s*#8d4545/i)

  assert.match(detailPage, /<style scoped lang="scss">/)
  assert.match(detailPage, /\$hej-color-canvas/)
  assert.match(detailPage, /\$hej-color-surface/)
  assert.match(detailPage, /\$hej-color-accent/)
  assert.match(detailPage, /\$hej-color-pending/)
  assert.match(detailPage, /\$hej-color-delivered/)
  assert.match(detailPage, /\$hej-color-warning/)
  assert.match(detailPage, /\$hej-color-danger/)
  assert.match(detailPage, /min-width:\s*180rpx|min-width:\s*200rpx/)
  assert.match(detailPage, /height:\s*88rpx/)
  assert.match(detailPage, /height:\s*64rpx/)
  assert.doesNotMatch(detailPage, /#0070f3/i)
  assert.doesNotMatch(detailPage, /#007aff/i)
  assert.match(design, /暖纸张|warm-paper/i)
})

test('order detail page retains sub-page navigation semantics in pages.json', () => {
  const detailPageEntry = pages.pages.find((page) => page.path === 'pages/order/detail')
  assert.ok(detailPageEntry)
  assert.equal(detailPageEntry.style?.navigationBarTitleText, '订单详情')
  assert.notEqual(detailPageEntry.style?.navigationStyle, 'custom')
})
