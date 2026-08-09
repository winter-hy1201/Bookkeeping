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

test('restores the exact pixel when item order is unchanged', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [1, 2, 3]), {
    type: 'pixel',
    scrollTop: 420,
  })
})

test('keeps the interacted item at its prior offset after reordering', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [1, 3, 2]), {
    type: 'anchor',
    key: '2',
    offset: 96,
    source: 'anchor',
  })
})

test('uses the next neighbor when the interacted item was deleted', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [1, 3]), {
    type: 'anchor',
    key: '3',
    offset: 96,
    source: 'next',
  })
})

test('uses the previous neighbor when the item and next neighbor were deleted', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [1]), {
    type: 'anchor',
    key: '1',
    offset: 96,
    source: 'previous',
  })
})

test('returns to the top when no captured item survives', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [4, 5]), {
    type: 'top',
    scrollTop: 0,
  })
})

test('returns to the top when the refreshed list is empty', () => {
  const snapshot = createPageReturnSnapshot(420, [1], 1, 96)

  assert.deepEqual(resolvePageReturnTarget(snapshot, []), {
    type: 'top',
    scrollTop: 0,
  })
})

test('falls back to the pixel when no measurable anchor was captured', () => {
  const snapshot = createPageReturnSnapshot(420, [1, 2, 3], 2, null)

  assert.deepEqual(resolvePageReturnTarget(snapshot, [1, 3, 2]), {
    type: 'pixel',
    scrollTop: 420,
  })
})
