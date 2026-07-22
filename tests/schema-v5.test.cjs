const assert = require('node:assert/strict')
const { mkdtempSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join } = require('node:path')
const { spawnSync } = require('node:child_process')
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

const { CURRENT_SCHEMA_VERSION, SCHEMA_ORDERS } = require('../src/db/schema.ts')

function sqlite(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'bookkeeping-schema-v5-'))
  const dbPath = join(dir, 'smoke.db')
  try {
    const result = spawnSync('sqlite3', [dbPath], { input: sql, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('fresh schema v5 stores a non-negative meal-card allocation', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 5)
  assert.match(
    SCHEMA_ORDERS,
    /meal_card_quantity INTEGER NOT NULL DEFAULT 0 CHECK \(meal_card_quantity >= 0\)/,
  )

  const output = sqlite(`
    PRAGMA foreign_keys = OFF;
    ${SCHEMA_ORDERS}
    INSERT INTO orders (
      customer_id, order_date, meal_type, quantity, sort_order, unit_price, amount,
      payment_method, meal_card_id, meal_card_quantity, status, created_at, updated_at
    ) VALUES (1, '2026-07-22', 'lunch', 2, 1, 25, 25, 'wechat', NULL, 1, 'pending', 'now', 'now');
    SELECT meal_card_quantity FROM orders;
  `)
  assert.equal(output, '1')
})

test('migration list appends the v5 column without rewriting prior migrations', () => {
  const source = readFileSync(join(__dirname, '../src/db/migrations.ts'), 'utf8')
  assert.match(
    source,
    /ALTER TABLE orders ADD COLUMN meal_card_quantity INTEGER NOT NULL DEFAULT 0 CHECK \(meal_card_quantity >= 0\)/,
  )
  assert.match(source, /SET meal_card_quantity = quantity[\s\S]*WHERE payment_method = 'meal_card'/)

  const output = sqlite(`
    CREATE TABLE orders (
      id INTEGER PRIMARY KEY,
      quantity INTEGER NOT NULL,
      payment_method TEXT NOT NULL
    );
    INSERT INTO orders VALUES (1, 2, 'meal_card'), (2, 3, 'wechat');
    ALTER TABLE orders ADD COLUMN meal_card_quantity INTEGER NOT NULL DEFAULT 0
      CHECK (meal_card_quantity >= 0);
    UPDATE orders SET meal_card_quantity = quantity WHERE payment_method = 'meal_card';
    SELECT id || ':' || meal_card_quantity FROM orders ORDER BY id;
  `)
  assert.equal(output, '1:2\n2:0')
})
