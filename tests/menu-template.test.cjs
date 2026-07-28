const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
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
  DEFAULT_MENU_TEMPLATE_BODY,
  renderMenuTemplate,
  validateMenuTemplate,
} = require('../src/utils/menu-template.ts')

test('renders both meal blocks with an unpadded Chinese date', () => {
  const output = renderMenuTemplate(DEFAULT_MENU_TEMPLATE_BODY, {
    menuDate: '2026-07-29',
    lunchText: '红烧肉➕手撕包菜',
    dinnerText: '干锅牛肉➕手撕包菜',
  })
  assert.match(output, /7月29日午餐🍱\n红烧肉➕手撕包菜/)
  assert.match(output, /7月29日晚餐🍱\n干锅牛肉➕手撕包菜/)
  assert.doesNotMatch(output, /{{/)
})

test('removes the complete missing dinner block and collapses excess blank lines', () => {
  const output = renderMenuTemplate(DEFAULT_MENU_TEMPLATE_BODY, {
    menuDate: '2026-07-29',
    lunchText: '红烧肉➕手撕包菜',
    dinnerText: '',
  })
  assert.match(output, /7月29日午餐🍱/)
  assert.doesNotMatch(output, /晚餐🍱/)
  assert.doesNotMatch(output, /\n\n\n/)
  assert.match(output, /🌟🌟🌟/)
})

test('preserves line breaks inside meal text', () => {
  const output = renderMenuTemplate(DEFAULT_MENU_TEMPLATE_BODY, {
    menuDate: '2026-07-29',
    lunchText: '主菜：红烧肉\n配菜：手撕包菜',
  })
  assert.match(output, /主菜：红烧肉\n配菜：手撕包菜/)
})

test('preserves dollar replacement characters and accepts spaced block markers', () => {
  const output = renderMenuTemplate(
    '{{ #午餐 }}\n{{日期}}午餐🍱\n{{午餐}}\n{{ /午餐 }}',
    {
      menuDate: '2026-07-29',
      lunchText: '套餐 $& / $1',
    },
  )
  assert.equal(output, '7月29日午餐🍱\n套餐 $& / $1')
})

test('rejects unknown, unclosed, nested, and misplaced tokens', () => {
  assert.throws(() => validateMenuTemplate('{{价格}}'), /不支持占位符/)
  assert.throws(() => validateMenuTemplate('{{#午餐}}{{午餐}}'), /缺少结束标记/)
  assert.throws(
    () => validateMenuTemplate('{{#午餐}}{{#晚餐}}{{晚餐}}{{\/晚餐}}{{\/午餐}}'),
    /不能嵌套/,
  )
  assert.throws(() => validateMenuTemplate('{{午餐}}'), /必须放在午餐区块内/)
})
