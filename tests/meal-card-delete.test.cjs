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

let state

function normalizeSql(sql) {
  return sql.replace(/\s+/g, ' ').trim()
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value))
}

async function select(sql, args = []) {
  const normalized = normalizeSql(sql)
  if (normalized.includes('FROM meal_cards WHERE id = ?')) {
    return state.cards.filter((card) => card.id === args[0])
  }
  if (normalized.includes('COUNT(*) AS count FROM meal_card_usages')) {
    return [{ count: state.usages.filter((usage) => usage.meal_card_id === args[0]).length }]
  }
  if (normalized.includes("meal_card_id = ? AND status = 'delivered'")) {
    return [
      {
        count: state.orders.filter(
          (order) => order.meal_card_id === args[0] && order.status === 'delivered',
        ).length,
      },
    ]
  }
  if (normalized.startsWith('SELECT COALESCE(SUM(total_meals - used_meals), 0)')) {
    const [customerId, excludedId] = args
    const total = state.cards
      .filter(
        (card) =>
          card.customer_id === customerId &&
          card.id !== excludedId &&
          card.status === 'active' &&
          card.used_meals < card.total_meals,
      )
      .reduce((sum, card) => sum + card.total_meals - card.used_meals, 0)
    return [{ total }]
  }
  if (normalized.startsWith('SELECT COALESCE(SUM(meal_card_quantity), 0)')) {
    const total = state.orders
      .filter((order) => order.customer_id === args[0] && order.status === 'pending')
      .reduce((sum, order) => sum + order.meal_card_quantity, 0)
    return [{ total }]
  }
  if (normalized.startsWith('SELECT id FROM meal_cards')) {
    const [customerId, excludedId] = args
    return state.cards
      .filter(
        (card) =>
          card.customer_id === customerId &&
          card.id !== excludedId &&
          card.status === 'active' &&
          card.used_meals < card.total_meals,
      )
      .sort((left, right) =>
        left.created_at === right.created_at
          ? left.id - right.id
          : left.created_at.localeCompare(right.created_at),
      )
      .slice(0, 1)
      .map((card) => ({ id: card.id }))
  }
  throw new Error(`unexpected select: ${normalized}`)
}

async function exec(sql, args = []) {
  const normalized = normalizeSql(sql)
  if (
    normalized.includes("status = 'pending' AND meal_card_quantity > 0") &&
    normalized.startsWith('UPDATE orders')
  ) {
    const [replacementId, updatedAt, deletedCardId] = args
    for (const order of state.orders) {
      if (
        order.meal_card_id === deletedCardId &&
        order.status === 'pending' &&
        order.meal_card_quantity > 0
      ) {
        order.meal_card_id = replacementId
        order.updated_at = updatedAt
      }
    }
    return
  }
  if (normalized.includes("status = 'cancelled' OR (status = 'pending'")) {
    const [updatedAt, deletedCardId] = args
    for (const order of state.orders) {
      if (
        order.meal_card_id === deletedCardId &&
        (order.status === 'cancelled' ||
          (order.status === 'pending' && order.meal_card_quantity === 0))
      ) {
        order.meal_card_id = null
        order.updated_at = updatedAt
      }
    }
    return
  }
  if (normalized === 'DELETE FROM meal_cards WHERE id = ?') {
    state.cards = state.cards.filter((card) => card.id !== args[0])
    return
  }
  throw new Error(`unexpected exec: ${normalized}`)
}

async function tx(work) {
  const snapshot = cloneState(state)
  try {
    return await work()
  } catch (error) {
    state = snapshot
    throw error
  }
}

const dbModulePath = require.resolve('../src/db/index.ts')
require.cache[dbModulePath] = {
  id: dbModulePath,
  filename: dbModulePath,
  loaded: true,
  exports: { exec, select, tx },
}

const {
  MealCardAlreadyUsedError,
  MealCardDeleteIntegrityError,
  MealCardReservationConflictError,
} = require('../src/api/errors.ts')
const { deleteCard } = require('../src/api/meal-cards.ts')

function card(id, totalMeals, usedMeals, createdAt) {
  return {
    id,
    customer_id: 1,
    total_meals: totalMeals,
    used_meals: usedMeals,
    amount: 100,
    status: usedMeals < totalMeals ? 'active' : 'depleted',
    created_at: createdAt,
  }
}

function order(id, status, mealCardId, mealCardQuantity) {
  return {
    id,
    customer_id: 1,
    status,
    meal_card_id: mealCardId,
    meal_card_quantity: mealCardQuantity,
    updated_at: 'before',
  }
}

test('deletes an unused card and rebinds pending orders to the oldest usable card', async () => {
  state = {
    cards: [
      card(1, 5, 0, '2026-01-01T00:00:00.000Z'),
      card(2, 10, 0, '2026-02-01T00:00:00.000Z'),
      card(3, 10, 0, '2026-03-01T00:00:00.000Z'),
    ],
    orders: [
      order(11, 'pending', 2, 8),
      order(12, 'cancelled', 2, 2),
      order(13, 'pending', 2, 0),
      order(14, 'pending', 3, 3),
    ],
    usages: [],
  }

  assert.equal(await deleteCard(2), true)
  assert.deepEqual(
    state.cards.map((item) => item.id),
    [1, 3],
  )
  assert.equal(state.orders.find((item) => item.id === 11).meal_card_id, 1)
  assert.equal(state.orders.find((item) => item.id === 12).meal_card_id, null)
  assert.equal(state.orders.find((item) => item.id === 13).meal_card_id, null)
  assert.equal(state.orders.find((item) => item.id === 14).meal_card_id, 3)
})

test('rolls back deletion when remaining cards cannot cover pending reservations', async () => {
  state = {
    cards: [card(1, 4, 0, '2026-01-01T00:00:00.000Z'), card(2, 10, 0, '2026-02-01T00:00:00.000Z')],
    orders: [order(11, 'pending', 2, 5)],
    usages: [],
  }
  const before = cloneState(state)

  await assert.rejects(
    deleteCard(2),
    (error) =>
      error instanceof MealCardReservationConflictError &&
      error.remainingAfterChange === 4 &&
      error.reservedMeals === 5,
  )
  assert.deepEqual(state, before)
})

test('rejects deletion after a card has consumed meals', async () => {
  state = {
    cards: [card(2, 10, 1, '2026-02-01T00:00:00.000Z')],
    orders: [],
    usages: [],
  }

  await assert.rejects(
    deleteCard(2),
    (error) => error instanceof MealCardAlreadyUsedError && error.usedMeals === 1,
  )
})

test('rejects deletion when an apparently unused card still has usage history', async () => {
  state = {
    cards: [card(2, 10, 0, '2026-02-01T00:00:00.000Z')],
    orders: [],
    usages: [{ order_id: 11, meal_card_id: 2, quantity: 1 }],
  }

  await assert.rejects(deleteCard(2), MealCardDeleteIntegrityError)
})

test('rejects deletion when a delivered order still references an unused card', async () => {
  state = {
    cards: [card(2, 10, 0, '2026-02-01T00:00:00.000Z')],
    orders: [order(11, 'delivered', 2, 1)],
    usages: [],
  }

  await assert.rejects(deleteCard(2), MealCardDeleteIntegrityError)
})
