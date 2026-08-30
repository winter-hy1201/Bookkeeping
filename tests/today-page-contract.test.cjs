const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const todayPage = readFileSync(join(root, 'src/pages/index/index.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

test('today page keeps the real data chain and user-facing states', () => {
  assert.match(todayPage, /useStatsStore\(\)/)
  assert.match(todayPage, /useOrderStore\(\)/)
  assert.match(todayPage, /useCustomerStore\(\)/)
  assert.match(todayPage, /statsStore\.refreshSummary\(todayText\.value\)/)
  assert.match(todayPage, /orderStore\.refreshForDate\(todayText\.value\)/)
  assert.match(todayPage, /customerStore\.refresh\(\)/)
  assert.match(todayPage, /\/pages\/me\/menus\/list/)
  assert.match(todayPage, /待配送/)
  assert.match(todayPage, /已配送/)
  assert.match(todayPage, /已取消/)
  assert.match(todayPage, /loadError/)
  assert.match(todayPage, /重新加载/)
  assert.match(todayPage, /今天还没有订单/)
  assert.match(todayPage, /formatTodayLabel/)
  assert.match(todayPage, /orderGroups/)
  assert.match(todayPage, /orderPaymentSummary/)
  assert.match(todayPage, /class="empty-action"/)

  for (const demoValue of ['468.00', '126.50', '341.50', '王阿姨', '李师傅']) {
    assert.doesNotMatch(todayPage, new RegExp(demoValue))
  }
})

test('today visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(tokens, /\$hej-color-pending:\s*#657789/i)
  assert.match(tokens, /\$hej-color-delivered:\s*#64745b/i)
  assert.match(tokens, /\$hej-color-warning:\s*#8a6843/i)
  assert.match(design, /暖纸张|warm-paper/i)
  assert.match(design, /#C96442/i)
})

test('root tab routes remain stable while today owns the custom safe-area header', () => {
  const today = pages.pages.find((page) => page.path === 'pages/index/index')
  assert.equal(today?.style?.navigationStyle, 'custom')
  assert.deepEqual(
    pages.tabBar.list.map((item) => item.pagePath),
    ['pages/index/index', 'pages/order/index', 'pages/stats/index', 'pages/me/index'],
  )
  assert.equal(pages.tabBar.selectedColor.toUpperCase(), '#C96442')
})
