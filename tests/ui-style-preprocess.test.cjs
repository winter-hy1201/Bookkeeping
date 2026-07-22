const assert = require('node:assert/strict')
const { readdirSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

function listVueFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return listVueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

test('compiles every hej token style block with SCSS', () => {
  const offenders = [
    ...listVueFiles(join(__dirname, '../src/pages')),
    ...listVueFiles(join(__dirname, '../src/components')),
  ].flatMap((file) => {
    const source = readFileSync(file, 'utf8')
    return [...source.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)]
      .filter(
        ([, attributes, content]) =>
          content.includes('$hej-') && !/\blang\s*=\s*["']scss["']/.test(attributes),
      )
      .map(() => file)
  })

  assert.deepEqual(offenders, [])
})
