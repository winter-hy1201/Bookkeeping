const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const orderPage = readFileSync(join(root, 'src/pages/order/index.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

test('order page keeps the real data chain and user-facing states', () => {
  assert.match(orderPage, /useOrderStore\(\)/)
  assert.match(orderPage, /useCustomerStore\(\)/)
  assert.match(orderPage, /orderStore\.refreshForDate\(/)
  assert.match(orderPage, /customerStore\.refresh\(\)/)
  assert.match(orderPage, /orderSections/)
  assert.match(orderPage, /displayedOrders/)
  assert.match(orderPage, /orderMetaText|orderSubtitle/)
  assert.match(orderPage, /statusText/)
  assert.match(orderPage, /customerName/)
  assert.match(orderPage, /shouldAutoCollapseTodayLunch/)
  assert.match(orderPage, /reconcileLunchPanelCollapse/)
  assert.match(orderPage, /formatMoney/)
  assert.match(orderPage, /section\.activeCount[\s\S]+section\.quantity[\s\S]+formatMoney/)
  assert.match(orderPage, /usePageReturnSnapshot/)
  assert.match(orderPage, /pageReturn\.restoreOnShow/)
  assert.match(orderPage, /status-chip/)
  assert.match(orderPage, /statusClass/)
  assert.match(orderPage, /&--pending|status-chip--pending/)
  assert.match(orderPage, /&--delivered|status-chip--delivered/)
  assert.match(orderPage, /&--cancelled|status-chip--cancelled/)
  assert.match(orderPage, /正在读取订单数据/)
  assert.match(orderPage, /订单数据加载失败/)
  assert.match(orderPage, /重新加载/)
  assert.match(orderPage, /这一天还没有订单/)
  assert.match(orderPage, /新建订单/)
  assert.match(orderPage, /name="Plus"[\s\S]+新建订单/)

  const demoNames = [
    '张姐',
    '李伟',
    '王工',
    '陈小姐',
    '老周',
    '刘姐',
    '赵先生',
    '小林',
    '孙姐',
    '小陈',
    '周同学',
    '吴哥',
  ]
  for (const demoValue of demoNames) {
    assert.doesNotMatch(orderPage, new RegExp(demoValue))
  }
})

test('order page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(tokens, /\$hej-color-pending:\s*#657789/i)
  assert.match(tokens, /\$hej-color-delivered:\s*#64745b/i)
  assert.match(tokens, /\$hej-color-warning:\s*#8a6843/i)
  assert.match(orderPage, /<style scoped lang="scss">/)
  assert.match(orderPage, /\$hej-color-canvas/)
  assert.match(orderPage, /\$hej-color-surface/)
  assert.match(orderPage, /\$hej-color-accent/)
  assert.match(orderPage, /\$hej-color-pending/)
  assert.match(orderPage, /\$hej-color-delivered/)
  assert.match(orderPage, /\$hej-color-warning/)
  assert.match(design, /暖纸张|warm-paper/i)
})

test('order page uses custom navigationStyle while maintaining tab routes', () => {
  const order = pages.pages.find((page) => page.path === 'pages/order/index')
  assert.equal(order?.style?.navigationStyle, 'custom')
  assert.deepEqual(
    pages.tabBar.list.map((item) => item.pagePath),
    ['pages/index/index', 'pages/order/index', 'pages/stats/index', 'pages/me/index'],
  )
})
