const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const listPage = readFileSync(join(root, 'src/pages/me/customers/list.vue'), 'utf8')
const newPage = readFileSync(join(root, 'src/pages/me/customers/new.vue'), 'utf8')
const detailPage = readFileSync(join(root, 'src/pages/me/customers/detail.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))
const design = readFileSync(join(root, 'docs/design.md'), 'utf8')

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('customer list page keeps real data chain, pinyin search, index bar, and meal card identity', () => {
  assert.match(listPage, /useCustomerStore\(\)/)
  assert.match(listPage, /listActiveMealCardCustomerIds\(\)/)
  assert.match(listPage, /usePageReturnSnapshot/)
  assert.match(listPage, /compareCustomerName/)
  assert.match(listPage, /getCustomerInitial/)
  assert.match(listPage, /getCustomerPinyinKey/)
  assert.match(listPage, /getCustomerPinyinInitials/)
  assert.match(listPage, /avatarLabel/)
  assert.match(listPage, /'次'\s*:\s*'普'/)
  assert.match(listPage, /新增客户/)
  assert.match(listPage, /indexLetters/)
  assert.match(listPage, /jumpTo/)
  assert.match(listPage, /正在读取客户/)
  assert.match(listPage, /客户加载失败/)
  assert.match(listPage, /没有找到匹配客户|未找到匹配客户/)
  assert.match(listPage, /还没有客户档案/)

  // No hardcoded demo values in production template
  for (const demoValue of ['周老师', 'azhen88', '138****2186']) {
    assert.doesNotMatch(listPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('customer list page visual contract uses warm paper semantic tokens', () => {
  assert.match(tokens, /\$hej-color-canvas:\s*#f5f4ed/i)
  assert.match(tokens, /\$hej-color-surface:\s*#faf9f5/i)
  assert.match(tokens, /\$hej-color-accent:\s*#c96442/i)
  assert.match(listPage, /<style scoped lang="scss">/)
  assert.match(listPage, /\$hej-color-canvas/)
  assert.match(listPage, /\$hej-color-surface/)
  assert.match(listPage, /\$hej-color-accent/)
  assert.match(listPage, /\$hej-color-border/)
})

test('customer form page adheres to 80px label business form specification and validation', () => {
  assert.match(newPage, /useCustomerStore\(\)/)
  assert.match(newPage, /getCustomer/)
  assert.match(newPage, /DuplicateCustomerNameError/)
  assert.match(newPage, /label-width="80px"/)
  assert.match(newPage, /label="姓名"/)
  assert.match(newPage, /label="手机"/)
  assert.match(newPage, /label="微信"/)
  assert.match(newPage, /label="午餐价"/)
  assert.match(newPage, /label="晚餐价"/)
  assert.match(newPage, /label="折扣"/)
  assert.match(newPage, /label="备注"/)
  assert.match(newPage, /留空则录单时手动输入/)
  assert.match(newPage, /parseNullablePrice/)
  assert.match(newPage, /parseDiscountRate/)
  assert.match(newPage, /新建客户/)
  assert.match(newPage, /保存修改/)
  assert.match(newPage, /<style scoped lang="scss">/)
  assert.match(newPage, /\$hej-color-canvas/)
  assert.match(newPage, /\$hej-color-surface/)
  assert.match(newPage, /\$hej-color-accent/)

  for (const demoValue of ['周老师', '138 0000 2468', 'zhoulaoshi']) {
    assert.doesNotMatch(newPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('customer detail page displays real profile, card summary, history orders, and isolated danger zone', () => {
  assert.match(detailPage, /getCustomer/)
  assert.match(detailPage, /listCards/)
  assert.match(detailPage, /listOrders/)
  assert.match(detailPage, /useCustomerStore\(\)/)
  assert.match(detailPage, /activeCardSummary/)
  assert.match(detailPage, /cardProgress/)
  assert.match(detailPage, /formatMoney/)
  assert.match(detailPage, /mealTypeText/)
  assert.match(detailPage, /statusText/)
  assert.match(detailPage, /充值记录/)
  assert.match(detailPage, /开新卡/)
  assert.match(detailPage, /删除客户/)
  assert.match(detailPage, /该客户已有订单或次卡，不能删除/)
  assert.match(detailPage, /<style scoped lang="scss">/)
  assert.match(detailPage, /\$hej-color-canvas/)
  assert.match(detailPage, /\$hej-color-surface/)
  assert.match(detailPage, /\$hej-color-accent/)
  assert.match(detailPage, /\$hej-color-danger/)
  assert.match(detailPage, /\$hej-color-delivered/)
  assert.match(detailPage, /\$hej-color-pending/)

  for (const demoValue of ['wangayi', '喜欢少辣']) {
    assert.doesNotMatch(detailPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('customer pages retain route and title semantics in pages.json', () => {
  const listEntry = pages.pages.find((p) => p.path === 'pages/me/customers/list')
  const newEntry = pages.pages.find((p) => p.path === 'pages/me/customers/new')
  const detailEntry = pages.pages.find((p) => p.path === 'pages/me/customers/detail')

  assert.ok(listEntry)
  assert.ok(newEntry)
  assert.ok(detailEntry)
  assert.equal(listEntry.style?.navigationBarTitleText, '客户管理')
  assert.equal(newEntry.style?.navigationBarTitleText, '客户档案')
  assert.equal(detailEntry.style?.navigationBarTitleText, '客户详情')
})
