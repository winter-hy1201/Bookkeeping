const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText
  module._compile(output, filename)
}

const {
  DEFAULT_MEAL_CARD_TEMPLATE_BODY,
  renderMealCardTemplate,
  validateMealCardTemplate,
} = require('../src/utils/meal-card-template.ts')

const orderDetailSource = readFileSync(join(__dirname, '../src/pages/order/detail.vue'), 'utf8')

test('renders the default monthly card message with current counts', () => {
  const output = renderMealCardTemplate(DEFAULT_MEAL_CARD_TEMPLATE_BODY, {
    usedMeals: 1,
    availableMeals: 14,
  })
  assert.equal(
    output,
    '同步一下的月卡信息：\n您办理的是478元/20份的月卡套餐，本次使用1份，当前剩余14份可用，有任何问题随时联系我就可以啦😊',
  )
})

test('copies actual remaining meals without subtracting pending reservations', () => {
  assert.match(orderDetailSource, /availableMeals:\s*availability\.actual_remaining/)
  assert.doesNotMatch(orderDetailSource, /availableMeals:\s*availability\.available/)
})

test('allows editing the package text and repeating known placeholders', () => {
  const body = '套餐 398元/10份\n{{本次使用份数}} + {{本次使用份数}}\n剩余 {{当前可用份数}}'
  assert.equal(
    renderMealCardTemplate(body, { usedMeals: 2, availableMeals: 8 }),
    '套餐 398元/10份\n2 + 2\n剩余 8',
  )
})

test('rejects unknown, missing, and unclosed placeholders', () => {
  assert.throws(
    () => validateMealCardTemplate('套餐\n{{本次使用份数}}\n{{价格}}\n{{当前可用份数}}'),
    /不支持占位符/,
  )
  assert.throws(() => validateMealCardTemplate('{{本次使用份数}}'), /必须包含.*当前可用份数/)
  assert.throws(
    () => validateMealCardTemplate('{{本次使用份数}}\n{{当前可用份数}}\n{{未闭合'),
    /未闭合/,
  )
})
