const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const iconComponent = readFileSync(join(__dirname, '../src/components/HejiIcon.vue'), 'utf8')

test('HejiIcon uses an app-plus-safe CSS mask instead of an inline SVG component', () => {
  assert.match(iconComponent, /<view\s+/)
  assert.match(iconComponent, /WebkitMaskImage/)
  assert.match(iconComponent, /maskImage/)
  assert.match(iconComponent, /HEJI_ICON_NODES/)
  assert.doesNotMatch(iconComponent, /<component\s+/)
})
