const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const root = join(__dirname, '..')
const listPage = readFileSync(join(root, 'src/pages/me/expenses/list.vue'), 'utf8')
const newPage = readFileSync(join(root, 'src/pages/me/expenses/new.vue'), 'utf8')
const detailPage = readFileSync(join(root, 'src/pages/me/expenses/detail.vue'), 'utf8')
const tokens = readFileSync(join(root, 'src/uni.scss'), 'utf8')
const pages = JSON.parse(readFileSync(join(root, 'src/pages.json'), 'utf8'))

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

test('expense list page keeps real data chain, summary metrics, and user-facing states', () => {
  assert.match(listPage, /useExpenseStore/)
  assert.match(listPage, /usePageReturnSnapshot/)
  assert.match(listPage, /subtractMoney/)
  assert.match(listPage, /formatAmountNumber/)
  assert.match(listPage, /formatMoney/)
  assert.match(listPage, /uni-datetime-picker/)
  assert.match(listPage, /支出笔数/)
  assert.match(listPage, /退差金额/)
  assert.match(listPage, /正在读取支出记录/)
  assert.match(listPage, /该日期暂无支出/)
  assert.match(listPage, /新建支出/)

  // No hardcoded demo text
  const demoValues = ['今日蔬菜', '打包盒200个', '86.50']
  for (const demoValue of demoValues) {
    assert.doesNotMatch(listPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('expense list page visual contract uses warm paper semantic tokens', () => {
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

test('expense new page keeps real form chain, 100px label alignment, and net calculation', () => {
  assert.match(newPage, /useExpenseStore/)
  assert.match(newPage, /expenseStore\.create/)
  assert.match(newPage, /uni-forms/)
  assert.match(newPage, /uni-forms-item/)
  assert.match(newPage, /label-width="100px"/)
  assert.match(newPage, /label-align="left"/)
  assert.match(newPage, /name="expense_date"/)
  assert.match(newPage, /name="category_id"/)
  assert.match(newPage, /name="amount"/)
  assert.match(newPage, /name="refund_amount"/)
  assert.match(newPage, /name="note"/)
  assert.match(newPage, /实际支出/)
  assert.match(newPage, /支出小结/)
  assert.match(newPage, /保存支出/)
  assert.match(newPage, /退差金额不能大于支出金额/)

  // No hardcoded demo text
  const demoValues = ['今日蔬菜', '86.50']
  for (const demoValue of demoValues) {
    assert.doesNotMatch(newPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('expense new page visual contract uses warm paper semantic tokens', () => {
  assert.match(newPage, /<style scoped lang="scss">/)
  assert.match(newPage, /\$hej-color-canvas/)
  assert.match(newPage, /\$hej-color-surface/)
  assert.match(newPage, /\$hej-color-accent/)
  assert.match(newPage, /\$hej-color-border/)
  assert.doesNotMatch(newPage, /#007aff/i)
  assert.doesNotMatch(newPage, /#ee0a24/i)
})

test('expense detail page keeps real data chain, hero summary, form structure, and isolated danger zone', () => {
  assert.match(detailPage, /useExpenseStore/)
  assert.match(detailPage, /getExpense/)
  assert.match(detailPage, /expenseStore\.update/)
  assert.match(detailPage, /expenseStore\.remove/)
  assert.match(detailPage, /uni-forms/)
  assert.match(detailPage, /uni-forms-item/)
  assert.match(detailPage, /label-width="100px"/)
  assert.match(detailPage, /label-align="left"/)
  assert.match(detailPage, /实际支出/)
  assert.match(detailPage, /保存修改/)
  assert.match(detailPage, /删除支出/)
  assert.match(detailPage, /删除后将无法恢复/)

  // No hardcoded demo text
  const demoValues = ['今日蔬菜', '86.50']
  for (const demoValue of demoValues) {
    assert.doesNotMatch(detailPage, new RegExp(escapeRegex(demoValue)))
  }
})

test('expense detail page visual contract uses warm paper semantic tokens', () => {
  assert.match(detailPage, /<style scoped lang="scss">/)
  assert.match(detailPage, /\$hej-color-canvas/)
  assert.match(detailPage, /\$hej-color-surface/)
  assert.match(detailPage, /\$hej-color-accent/)
  assert.match(detailPage, /\$hej-color-danger/)
  assert.match(detailPage, /\$hej-color-danger-soft/)
  assert.doesNotMatch(detailPage, /#007aff/i)
  assert.doesNotMatch(detailPage, /#ee0a24/i)
})

test('expense pages retain route and title semantics in pages.json', () => {
  const listEntry = pages.pages.find((p) => p.path === 'pages/me/expenses/list')
  const newEntry = pages.pages.find((p) => p.path === 'pages/me/expenses/new')
  const detailEntry = pages.pages.find((p) => p.path === 'pages/me/expenses/detail')

  assert.ok(listEntry)
  assert.ok(newEntry)
  assert.ok(detailEntry)
  assert.equal(listEntry.style?.navigationBarTitleText, '支出管理')
  assert.equal(newEntry.style?.navigationBarTitleText, '新建支出')
  assert.equal(detailEntry.style?.navigationBarTitleText, '支出详情')
})
