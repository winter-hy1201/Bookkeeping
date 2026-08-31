const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const listPage = readFileSync(join(root, 'src/pages/me/menus/list.vue'), 'utf8')
const editPage = readFileSync(join(root, 'src/pages/me/menus/edit.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('menu list page keeps real data chain, template link, and user-facing states', () => {
  assert.match(listPage, /listCurrentDailyMenus/)
  assert.match(listPage, /listHistoricalDailyMenus/)
  assert.match(listPage, /getDefaultMessageTemplate/)
  assert.match(listPage, /renderMenuTemplate/)
  assert.match(listPage, /deleteDailyMenu/)
  assert.match(listPage, /usePageReturnSnapshot/)
  assert.match(listPage, /formatTodayLabel/)
  assert.match(listPage, /每日菜单/)
  assert.match(listPage, /文案模板/)
  assert.match(listPage, /管理默认模板与历史版本/)
  assert.match(listPage, /当前/)
  assert.match(listPage, /历史/)
  assert.match(listPage, /复制文案/)
  assert.match(listPage, /正在读取菜单记录/)
  assert.match(listPage, /还没有待用菜单/)
  assert.match(listPage, /还没有历史菜单/)
  assert.match(listPage, /新建菜单/)

  // No hardcoded demo dishes from reference images
  const demoDishes = ['土豆烧牛肉', '糖醋里脊', '可乐鸡翅', '香辣虾仁']
  for (const demoDish of demoDishes) {
    assert.doesNotMatch(listPage, new RegExp(escapeRegex(demoDish)))
  }
})

test('menu list page visual contract uses warm paper semantic tokens', () => {
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

test('menu edit page keeps real form chain, 100px label alignment, and conflict redirection', () => {
  assert.match(editPage, /createDailyMenu/)
  assert.match(editPage, /updateDailyMenu/)
  assert.match(editPage, /getDailyMenu/)
  assert.match(editPage, /getDailyMenuByDate/)
  assert.match(editPage, /deleteDailyMenu/)
  assert.match(editPage, /DailyMenuDateConflictError/)
  assert.match(editPage, /getDefaultMessageTemplate/)
  assert.match(editPage, /renderMenuTemplate/)
  assert.match(editPage, /uni-forms/)
  assert.match(editPage, /uni-forms-item/)
  assert.match(editPage, /label-width="100px"/)
  assert.match(editPage, /name="menu_date"/)
  assert.match(editPage, /name="lunch_text"/)
  assert.match(editPage, /name="dinner_text"/)
  assert.match(editPage, /uni-datetime-picker/)
  assert.match(editPage, /uni-easyinput/)
  assert.match(editPage, /保存并继续下一天/)
  assert.match(editPage, /保存菜单/)
  assert.match(editPage, /删除本日菜单/)

  // No hardcoded demo dishes from reference images
  const demoDishes = ['土豆烧牛肉', '糖醋里脊', '可乐鸡翅', '香辣虾仁']
  for (const demoDish of demoDishes) {
    assert.doesNotMatch(editPage, new RegExp(escapeRegex(demoDish)))
  }
})

test('menu edit page visual contract uses warm paper semantic tokens', () => {
  assert.match(editPage, /<style scoped lang="scss">/)
  assert.match(editPage, /\$hej-color-canvas/)
  assert.match(editPage, /\$hej-color-surface/)
  assert.match(editPage, /\$hej-color-accent/)
  assert.match(editPage, /\$hej-color-danger/)
  assert.match(editPage, /\$hej-color-border/)
  assert.doesNotMatch(editPage, /#007aff/i)
  assert.doesNotMatch(editPage, /#ee0a24/i)
})

test('menu pages retain route and title semantics in pages.json', () => {
  const listEntry = pages.pages.find((p) => p.path === 'pages/me/menus/list')
  const editEntry = pages.pages.find((p) => p.path === 'pages/me/menus/edit')

  assert.ok(listEntry)
  assert.ok(editEntry)
  assert.equal(listEntry.style?.navigationBarTitleText, '每日菜单')
  assert.equal(editEntry.style?.navigationBarTitleText, '新建菜单')
})
