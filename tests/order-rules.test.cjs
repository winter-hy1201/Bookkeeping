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

const {
  calculatePaymentBreakdown,
  evaluateMealCardAvailability,
  mergeOrderNotes,
  mergePaymentBreakdowns,
  selectPendingOrdersForReconciliation,
} = require('../src/utils/order-rules.ts')
const { orderSubtitle } = require('../src/utils/ui.ts')

test('rejects a two-meal card allocation when only one use is available', () => {
  assert.deepEqual(
    evaluateMealCardAvailability({ actualRemaining: 1, reservedByOthers: 0, required: 2 }),
    {
      actualRemaining: 1,
      reservedByOthers: 0,
      available: 1,
      required: 2,
      valid: false,
    },
  )
})

test('subtracts other pending reservations from the customer card pool', () => {
  assert.deepEqual(
    evaluateMealCardAvailability({ actualRemaining: 2, reservedByOthers: 1, required: 2 }),
    {
      actualRemaining: 2,
      reservedByOthers: 1,
      available: 1,
      required: 2,
      valid: false,
    },
  )
})

test('charges only the non-card portion of a mixed WeChat order', () => {
  assert.deepEqual(
    calculatePaymentBreakdown({
      mode: 'mixed',
      quantity: 2,
      mealCardQuantity: 1,
      moneyMethod: 'wechat',
      unitPrice: 25,
    }),
    {
      paymentMethod: 'wechat',
      mealCardQuantity: 1,
      moneyQuantity: 1,
      unitPrice: 25,
      amount: 25,
    },
  )
})

test('reserves every portion and records no cash income for a pure meal-card order', () => {
  assert.deepEqual(
    calculatePaymentBreakdown({
      mode: 'meal_card',
      quantity: 2,
      unitPrice: 15,
    }),
    {
      paymentMethod: 'meal_card',
      mealCardQuantity: 2,
      moneyQuantity: 0,
      unitPrice: 15,
      amount: 0,
    },
  )
})

test('charges every portion for a pure cash order', () => {
  assert.deepEqual(
    calculatePaymentBreakdown({
      mode: 'cash',
      quantity: 3,
      unitPrice: 12.5,
    }),
    {
      paymentMethod: 'cash',
      mealCardQuantity: 0,
      moneyQuantity: 3,
      unitPrice: 12.5,
      amount: 37.5,
    },
  )
})

test('rounds the stored unit price before calculating the order amount', () => {
  assert.deepEqual(
    calculatePaymentBreakdown({
      mode: 'wechat',
      quantity: 2,
      unitPrice: 1.005,
    }),
    {
      paymentMethod: 'wechat',
      mealCardQuantity: 0,
      moneyQuantity: 2,
      unitPrice: 1.01,
      amount: 2.02,
    },
  )
})

test('rejects a mixed payment when the card count covers the whole order', () => {
  assert.throws(
    () =>
      calculatePaymentBreakdown({
        mode: 'mixed',
        quantity: 2,
        mealCardQuantity: 2,
        moneyMethod: 'wechat',
        unitPrice: 15,
      }),
    /组合支付的次卡次数必须小于总份数/,
  )
})

test('rejects a mixed payment without a positive card count', () => {
  assert.throws(
    () =>
      calculatePaymentBreakdown({
        mode: 'mixed',
        quantity: 2,
        mealCardQuantity: 0,
        moneyMethod: 'cash',
        unitPrice: 15,
      }),
    /组合支付的次卡次数必须大于 0/,
  )
})

test('rejects a fractional card count', () => {
  assert.throws(
    () =>
      calculatePaymentBreakdown({
        mode: 'mixed',
        quantity: 3,
        mealCardQuantity: 1.5,
        moneyMethod: 'wechat',
        unitPrice: 15,
      }),
    /次卡次数必须为整数/,
  )
})

test('merges distinct notes while preserving one copy of duplicates', () => {
  assert.equal(mergeOrderNotes('不要葱', '少辣'), '不要葱；少辣')
  assert.equal(mergeOrderNotes('不要葱', '不要葱'), '不要葱')
  assert.equal(mergeOrderNotes('不要葱', '  '), '不要葱')
  assert.equal(mergeOrderNotes('A；A', '  '), 'A；A')
  assert.equal(mergeOrderNotes('不要葱；不要香菜', '不要葱'), '不要葱；不要香菜；不要葱')
})

test('does not rewrite pending duplicates when the same meal already has a delivered order', () => {
  assert.deepEqual(
    selectPendingOrdersForReconciliation([
      { id: 1, status: 'delivered' },
      { id: 2, status: 'pending' },
      { id: 3, status: 'pending' },
    ]),
    [],
  )
  assert.deepEqual(
    selectPendingOrdersForReconciliation([
      { id: 2, status: 'pending' },
      { id: 4, status: 'cancelled' },
      { id: 3, status: 'pending' },
    ]),
    [
      { id: 2, status: 'pending' },
      { id: 3, status: 'pending' },
    ],
  )
})

test('merges a card addition into an existing WeChat order', () => {
  assert.deepEqual(
    mergePaymentBreakdowns(
      {
        paymentMethod: 'wechat',
        mealCardQuantity: 0,
        moneyQuantity: 1,
        unitPrice: 15,
        amount: 15,
      },
      {
        paymentMethod: 'meal_card',
        mealCardQuantity: 1,
        moneyQuantity: 0,
        unitPrice: 15,
        amount: 0,
      },
    ),
    {
      paymentMethod: 'wechat',
      mealCardQuantity: 1,
      moneyQuantity: 1,
      unitPrice: 15,
      amount: 15,
      oldUnitPrice: 15,
      oldAmount: 15,
      priceChanged: false,
    },
  )
})

test('keeps the existing monetary price when a pure-card addition has another reference price', () => {
  assert.deepEqual(
    mergePaymentBreakdowns(
      {
        paymentMethod: 'wechat',
        mealCardQuantity: 0,
        moneyQuantity: 1,
        unitPrice: 25,
        amount: 25,
      },
      {
        paymentMethod: 'meal_card',
        mealCardQuantity: 1,
        moneyQuantity: 0,
        unitPrice: 15,
        amount: 0,
      },
    ),
    {
      paymentMethod: 'wechat',
      mealCardQuantity: 1,
      moneyQuantity: 1,
      unitPrice: 25,
      amount: 25,
      oldUnitPrice: 25,
      oldAmount: 25,
      priceChanged: false,
    },
  )
})

test('adopts a new monetary price without confirmation when the existing order is pure card', () => {
  assert.deepEqual(
    mergePaymentBreakdowns(
      {
        paymentMethod: 'meal_card',
        mealCardQuantity: 1,
        moneyQuantity: 0,
        unitPrice: 15,
        amount: 0,
      },
      {
        paymentMethod: 'cash',
        mealCardQuantity: 0,
        moneyQuantity: 1,
        unitPrice: 25,
        amount: 25,
      },
    ),
    {
      paymentMethod: 'cash',
      mealCardQuantity: 1,
      moneyQuantity: 1,
      unitPrice: 25,
      amount: 25,
      oldUnitPrice: 25,
      oldAmount: 25,
      priceChanged: false,
    },
  )
})

test('previews the old and new totals when a merged order changes price', () => {
  assert.deepEqual(
    mergePaymentBreakdowns(
      {
        paymentMethod: 'wechat',
        mealCardQuantity: 0,
        moneyQuantity: 1,
        unitPrice: 15,
        amount: 15,
      },
      {
        paymentMethod: 'wechat',
        mealCardQuantity: 0,
        moneyQuantity: 1,
        unitPrice: 18,
        amount: 18,
      },
    ),
    {
      paymentMethod: 'wechat',
      mealCardQuantity: 0,
      moneyQuantity: 2,
      unitPrice: 18,
      amount: 36,
      oldUnitPrice: 15,
      oldAmount: 30,
      priceChanged: true,
    },
  )
})

test('blocks a WeChat and cash conflict instead of silently merging it', () => {
  assert.throws(
    () =>
      mergePaymentBreakdowns(
        {
          paymentMethod: 'wechat',
          mealCardQuantity: 0,
          moneyQuantity: 1,
          unitPrice: 15,
          amount: 15,
        },
        {
          paymentMethod: 'cash',
          mealCardQuantity: 0,
          moneyQuantity: 1,
          unitPrice: 15,
          amount: 15,
        },
      ),
    /现金支付方式冲突/,
  )
})

test('builds the exact combined-payment order-list subtitle', () => {
  assert.equal(
    orderSubtitle({
      meal_type: 'lunch',
      quantity: 2,
      meal_card_quantity: 1,
      payment_method: 'wechat',
      amount: 25,
      note: '不要葱',
    }),
    '午餐 · 2份 · 次卡 1次 · 微信 ¥25.00 · 不要葱',
  )
})
