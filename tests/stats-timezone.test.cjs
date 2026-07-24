const assert = require('node:assert/strict')
const test = require('node:test')
const ts = require('typescript')

process.env.TZ = 'Asia/Shanghai'

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

const targetDate = '2026-07-24'
const cardFixture = {
  amount: 460,
  created_at: '2026-07-23T16:39:15.912Z',
}

function localDate(isoText) {
  const value = new Date(isoText)
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function queriedCardDate(sql, createdAt) {
  if (/date\(created_at,\s*'localtime'\)/.test(sql)) {
    return localDate(createdAt)
  }
  if (/substr\(created_at,\s*1,\s*10\)/.test(sql)) {
    return createdAt.slice(0, 10)
  }
  throw new Error(`unexpected meal-card date expression: ${sql}`)
}

global.plus = {
  sqlite: {
    selectSql(options) {
      const sql = options.sql
      let rows = []

      if (sql.includes('AS cardIncome')) {
        const cardIncome = queriedCardDate(sql, cardFixture.created_at) === targetDate
          ? cardFixture.amount
          : 0
        rows = [{ orderCount: 0, orderQuantity: 0, orderIncome: 0, cardIncome, expense: 0 }]
      } else if (sql.includes('FROM meal_cards')) {
        const date = queriedCardDate(sql, cardFixture.created_at)
        rows = date === targetDate ? [{ date, income: cardFixture.amount }] : []
      }

      queueMicrotask(() => options.success(rows))
    },
  },
}

const { getDailyTrend, getDashboardSummary } = require('../src/api/stats.ts')

test('dashboard counts a UTC timestamp in the device local day', async () => {
  const summary = await getDashboardSummary(targetDate)

  assert.equal(summary.income, 460)
  assert.equal(summary.profit, 460)
})

test('daily trend groups a UTC timestamp into the device local day', async () => {
  const trend = await getDailyTrend({ startDate: targetDate, endDate: targetDate })

  assert.deepEqual(trend, [{ date: targetDate, income: 460, expense: 0, profit: 460 }])
})
