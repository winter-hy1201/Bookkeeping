const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')
const ts = require('typescript')

function loadTypeScriptModule(path) {
  const source = readFileSync(path, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText
  const module = { exports: {} }
  Function('require', 'module', 'exports', output)(require, module, module.exports)
  return module.exports
}

const { createPageReturnSnapshot, resolvePageReturnTarget } = loadTypeScriptModule(
  join(__dirname, '../src/utils/page-return.ts'),
)

test('restores the exact pixel when the refreshed content is still available', () => {
  const snapshot = createPageReturnSnapshot(420)

  assert.deepEqual(resolvePageReturnTarget(snapshot, true), {
    type: 'pixel',
    scrollTop: 420,
  })
})

test('keeps the same pixel when refreshed content changes order', () => {
  const snapshot = createPageReturnSnapshot(420)

  assert.deepEqual(resolvePageReturnTarget(snapshot, true), {
    type: 'pixel',
    scrollTop: 420,
  })
})

test('keeps the same pixel when refreshed content deletes an item', () => {
  const snapshot = createPageReturnSnapshot(420)

  assert.deepEqual(resolvePageReturnTarget(snapshot, true), {
    type: 'pixel',
    scrollTop: 420,
  })
})

test('returns to the top when refreshed content is empty', () => {
  const snapshot = createPageReturnSnapshot(420)

  assert.deepEqual(resolvePageReturnTarget(snapshot, false), {
    type: 'top',
    scrollTop: 0,
  })
})

test('clamps a negative captured pixel to the top', () => {
  const snapshot = createPageReturnSnapshot(-20)

  assert.deepEqual(resolvePageReturnTarget(snapshot, true), {
    type: 'pixel',
    scrollTop: 0,
  })
})
