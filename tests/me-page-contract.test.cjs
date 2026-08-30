const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const mePage = readFileSync(join(root, 'src/pages/me/index.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

test('me page keeps the 6 business entries and readable descriptions', () => {
  assert.match(mePage, /\/pages\/me\/menus\/list/)
  assert.match(mePage, /\/pages\/me\/menu-templates\/list/)
  assert.match(mePage, /\/pages\/me\/meal-card-templates\/list/)
  assert.match(mePage, /\/pages\/me\/customers\/list/)
  assert.match(mePage, /\/pages\/me\/expenses\/list/)
  assert.match(mePage, /\/pages\/me\/settings\/backup/)

  assert.match(mePage, /菜单管理/)
  assert.match(mePage, /每日菜单、复制文案、历史记录/)
  assert.match(mePage, /文案模板/)
  assert.match(mePage, /默认模板、条件区块、历史版本/)
  assert.match(mePage, /月卡文案模板/)
  assert.match(mePage, /月卡说明、次数占位符、历史版本/)
  assert.match(mePage, /客户管理/)
  assert.match(mePage, /客户档案、历史订单、次卡/)
  assert.match(mePage, /支出管理/)
  assert.match(mePage, /记录菜品、耗材、工具等支出/)
  assert.match(mePage, /备份 \/ 恢复/)
  assert.match(mePage, /导出 JSON、导入覆盖、清空数据/)

  assert.match(mePage, /usePageReturnSnapshot/)
  assert.match(mePage, /pageReturn\.restoreOnShow\(\)/)
})

test('me page does not display or imply unrequested account or cloud features', () => {
  for (const forbidden of ['avatar', '头像', '账户', '个人中心', '银行卡', '云同步', 'VIP会员', '订阅']) {
    assert.doesNotMatch(mePage, new RegExp(forbidden, 'i'))
  }
})

test('me page visual contract uses warm paper semantic tokens', () => {
  assert.match(mePage, /\$hej-color-canvas/)
  assert.match(mePage, /\$hej-color-surface/)
  assert.match(mePage, /\$hej-color-border/)
  assert.match(mePage, /\$hej-color-text/)
  assert.match(mePage, /\$hej-font-hero/)
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(design, /暖纸张|warm-paper/i)
})

test('me page uses custom navigationStyle while maintaining tab routes', () => {
  const me = pages.pages.find((page) => page.path === 'pages/me/index')
  assert.equal(me?.style?.navigationStyle, 'custom')
  assert.deepEqual(
    pages.tabBar.list.map((item) => item.pagePath),
    ['pages/index/index', 'pages/order/index', 'pages/stats/index', 'pages/me/index'],
  )
  assert.equal(pages.tabBar.selectedColor.toUpperCase(), '#C96442')
})
