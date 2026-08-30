const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const statsPage = readFileSync(join(root, 'src/pages/stats/index.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

test('stats page keeps the real data chain and user-facing states', () => {
  assert.match(statsPage, /useStatsStore\(\)/)
  assert.match(statsPage, /useExpenseStore\(\)/)
  assert.match(statsPage, /statsStore\.refreshRange\(/)
  assert.match(statsPage, /expenseStore\.refreshCategories\(\)/)
  assert.match(statsPage, /usePageReturnSnapshot/)
  assert.match(statsPage, /pageReturn\.restoreOnShow/)
  assert.match(statsPage, /summary\.income/)
  assert.match(statsPage, /summary\.expense/)
  assert.match(statsPage, /summary\.profit/)
  assert.match(statsPage, /summary\.orderCount/)
  assert.match(statsPage, /summary\.orderQuantity/)
  assert.match(statsPage, /入账收入/)
  assert.match(statsPage, /支出/)
  assert.match(statsPage, /利润/)
  assert.match(statsPage, /有效订单/)
  assert.match(statsPage, /单/)
  assert.match(statsPage, /份/)
  assert.match(statsPage, /平均每单收入/)
  assert.match(statsPage, /收支 \/ 利润趋势/)
  assert.match(statsPage, /支出分类/)
  assert.match(statsPage, /loadError/)
  assert.match(statsPage, /重新加载/)
  assert.match(statsPage, /选定范围内还没有可对账的收支记录/)
  assert.match(statsPage, /选定范围内没有支出分类记录/)

  const demoNumbers = [
    '8,420.00',
    '2,368.50',
    '6,051.50',
    '226单',
    '318份',
    '37.26',
    '1,286.00',
    '356.00',
    '238.50',
  ]
  for (const demoValue of demoNumbers) {
    assert.doesNotMatch(statsPage, new RegExp(demoValue))
  }
})

test('stats page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(tokens, /\$hej-color-pending:\s*#657789/i)
  assert.match(tokens, /\$hej-color-delivered:\s*#64745b/i)
  assert.match(tokens, /\$hej-color-warning:\s*#8a6843/i)
  assert.match(tokens, /\$hej-color-danger:\s*#8d4545/i)
  assert.match(statsPage, /<style scoped lang="scss">/)
  assert.match(statsPage, /\$hej-color-canvas/)
  assert.match(statsPage, /\$hej-color-surface/)
  assert.match(statsPage, /\$hej-color-accent/)
  assert.match(statsPage, /\$hej-color-pending/)
  assert.match(statsPage, /\$hej-color-delivered/)
  assert.match(statsPage, /\$hej-color-warning/)
  assert.match(statsPage, /\$hej-color-danger/)
  assert.match(design, /暖纸张|warm-paper/i)
})

test('stats page uses custom navigationStyle while maintaining root tab routes', () => {
  const stats = pages.pages.find((page) => page.path === 'pages/stats/index')
  assert.equal(stats?.style?.navigationStyle, 'custom')
  assert.deepEqual(
    pages.tabBar.list.map((item) => item.pagePath),
    ['pages/index/index', 'pages/order/index', 'pages/stats/index', 'pages/me/index'],
  )
  assert.equal(pages.tabBar.selectedColor.toUpperCase(), '#C96442')
})
