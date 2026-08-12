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

const {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_ORDERS,
  SCHEMA_DAILY_MENUS,
  SCHEMA_MESSAGE_TEMPLATES,
  SCHEMA_TEMPLATE_VERSIONS,
  SCHEMA_MEAL_CARD_MESSAGE_TEMPLATES,
  SCHEMA_MEAL_CARD_TEMPLATE_VERSIONS,
} = require('../src/db/schema.ts')

function sqlite(sql) {
  const dir = mkdtempSync(join(tmpdir(), 'bookkeeping-schema-v5-'))
  const dbPath = join(dir, 'smoke.db')
  try {
    const result = spawnSync('sqlite3', [dbPath], { input: sql, encoding: 'utf8' })
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim().replace(/\r\n/g, '\n')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('current schema keeps a non-negative meal-card allocation', () => {
  assert.equal(CURRENT_SCHEMA_VERSION, 7)
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

test('fresh schema v6 menu tables enforce unique dates, names, and one default', () => {
  const output = sqlite(`
    PRAGMA foreign_keys = ON;
    ${SCHEMA_DAILY_MENUS}
    ${SCHEMA_MESSAGE_TEMPLATES}
    ${SCHEMA_TEMPLATE_VERSIONS}
    INSERT INTO daily_menus (menu_date, lunch_text, created_at, updated_at)
      VALUES ('2026-07-29', '午餐', 'now', 'now');
    INSERT OR IGNORE INTO daily_menus (menu_date, dinner_text, created_at, updated_at)
      VALUES ('2026-07-29', '晚餐', 'later', 'later');
    INSERT INTO message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('日常', 'body', 1, 'now', 'now');
    INSERT OR IGNORE INTO message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('日常', 'duplicate name', 0, 'later', 'later');
    INSERT OR IGNORE INTO message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('另一个默认', 'body', 1, 'later', 'later');
    INSERT INTO template_versions (template_id, name, body, created_at)
      VALUES (1, '日常', 'old body', 'now');
    SELECT (SELECT COUNT(*) FROM daily_menus) || ':' ||
      (SELECT COUNT(*) FROM message_templates) || ':' ||
      (SELECT COUNT(*) FROM message_templates WHERE is_default = 1);
  `)
  assert.equal(output, '1:1:1')
})

test('fresh schema v7 enforces independent monthly card templates and one default', () => {
  const output = sqlite(`
    PRAGMA foreign_keys = ON;
    ${SCHEMA_MEAL_CARD_MESSAGE_TEMPLATES}
    ${SCHEMA_MEAL_CARD_TEMPLATE_VERSIONS}
    INSERT INTO meal_card_message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('月卡', 'body', 1, 'now', 'now');
    INSERT OR IGNORE INTO meal_card_message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('月卡', 'duplicate name', 0, 'later', 'later');
    INSERT OR IGNORE INTO meal_card_message_templates (name, body, is_default, created_at, updated_at)
      VALUES ('另一个月卡', 'body', 1, 'later', 'later');
    INSERT INTO meal_card_template_versions (template_id, name, body, created_at)
      VALUES (1, '月卡', 'old body', 'now');
    SELECT (SELECT COUNT(*) FROM meal_card_message_templates) || ':' ||
      (SELECT COUNT(*) FROM meal_card_message_templates WHERE is_default = 1) || ':' ||
      (SELECT COUNT(*) FROM meal_card_template_versions);
  `)
  assert.equal(output, '1:1:1')
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

test('migration list appends the v6 menu and v7 monthly template tables', () => {
  const source = readFileSync(join(__dirname, '../src/db/migrations.ts'), 'utf8')
  assert.match(source, /SCHEMA_DAILY_MENUS/)
  assert.match(source, /SCHEMA_MESSAGE_TEMPLATES/)
  assert.match(source, /SCHEMA_TEMPLATE_VERSIONS/)
  assert.match(source, /SCHEMA_MEAL_CARD_MESSAGE_TEMPLATES/)
  assert.match(source, /SCHEMA_MEAL_CARD_TEMPLATE_VERSIONS/)
})
