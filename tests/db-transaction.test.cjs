const assert = require('node:assert/strict')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = (module, filename) => {
  const source = require('node:fs').readFileSync(filename, 'utf8')
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

const transactionEvents = []
global.plus = {
  sqlite: {
    transaction(options) {
      transactionEvents.push(options.operation)
      queueMicrotask(() => options.success())
    },
  },
}

const { tx } = require('../src/db/index.ts')

test('serializes concurrent top-level transactions on the single SQLite connection', async () => {
  transactionEvents.length = 0
  let releaseFirst
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve
  })
  const workEvents = []

  const first = tx(async () => {
    workEvents.push('first:start')
    await firstGate
    workEvents.push('first:end')
  })
  const second = tx(async () => {
    workEvents.push('second:start')
  })

  await new Promise((resolve) => setImmediate(resolve))
  assert.deepEqual(workEvents, ['first:start'])

  releaseFirst()
  await Promise.all([first, second])

  assert.deepEqual(workEvents, ['first:start', 'first:end', 'second:start'])
  assert.deepEqual(transactionEvents, ['begin', 'commit', 'begin', 'commit'])
})

test('continues the transaction queue after a rollback', async () => {
  transactionEvents.length = 0

  await assert.rejects(
    tx(async () => {
      throw new Error('write failed')
    }),
    /write failed/,
  )
  await tx(async () => undefined)

  assert.deepEqual(transactionEvents, ['begin', 'rollback', 'begin', 'commit'])
})
