const assert = require('node:assert/strict')
const { existsSync, readFileSync } = require('node:fs')
const { join } = require('node:path')
const test = require('node:test')

const iconComponent = readFileSync(join(__dirname, '../src/components/HejiIcon.vue'), 'utf8')
const iconRegistry = readFileSync(join(__dirname, '../src/components/icon-registry.ts'), 'utf8')
const pages = JSON.parse(readFileSync(join(__dirname, '../src/pages.json'), 'utf8'))
const iconMap = readFileSync(join(__dirname, '../docs/ui-reference/icon-map.md'), 'utf8')

test('HejiIcon uses an app-plus-safe CSS mask instead of an inline SVG component', () => {
  assert.match(iconComponent, /<view\s+/)
  assert.match(iconComponent, /WebkitMaskImage/)
  assert.match(iconComponent, /maskImage/)
  assert.match(iconComponent, /HEJI_ICON_NODES/)
  assert.doesNotMatch(iconComponent, /<component\s+/)
})

test('reference icon mapping registers the requested Lucide names and native tab assets', () => {
  for (const name of [
    'ArrowDownUp',
    'ChartNoAxesCombined',
    'ClipboardList',
    'CircleDollarSign',
    'GripVertical',
    'House',
    'Phone',
    'ShoppingBag',
    'ShieldCheck',
    'StickyNote',
    'Tag',
    'TriangleAlert',
    'WalletCards',
  ]) {
    assert.match(iconRegistry, new RegExp(`\\b${name}\\b`))
  }

  assert.match(iconMap, /\| 23 备份与恢复 \|/)
  for (const item of pages.tabBar.list) {
    assert.ok(item.iconPath)
    assert.ok(item.selectedIconPath)
    for (const path of [item.iconPath, item.selectedIconPath]) {
      const assetPath = join(__dirname, '../src', path)
      assert.equal(existsSync(assetPath), true, assetPath)
      assert.deepEqual(readFileSync(assetPath).subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    }
  }
})
