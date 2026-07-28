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

const { parseBackupText } = require('../src/utils/backup.ts')

function basePayload(schemaVersion) {
  return {
    version: '1.0',
    exported_at: '2026-07-28T00:00:00.000Z',
    schema_version: schemaVersion,
    customers: [],
    meal_cards: [],
    orders: [],
    expense_categories: [],
    expenses: [],
  }
}

test('accepts a legacy v5 backup without menu arrays', () => {
  const payload = parseBackupText(JSON.stringify(basePayload(5)))
  assert.equal(payload.schema_version, 5)
  assert.equal(payload.daily_menus, undefined)
})

test('requires menu, template, and version arrays in a v6 backup', () => {
  assert.throws(
    () => parseBackupText(JSON.stringify(basePayload(6))),
    /备份文件缺少菜单或模板数据/,
  )

  const payload = parseBackupText(
    JSON.stringify({
      ...basePayload(6),
      daily_menus: [],
      message_templates: [],
      template_versions: [],
    }),
  )
  assert.deepEqual(payload.daily_menus, [])
  assert.deepEqual(payload.message_templates, [])
  assert.deepEqual(payload.template_versions, [])
})
