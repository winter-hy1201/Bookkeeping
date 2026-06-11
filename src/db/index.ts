/**
 * SQLite 数据层入口（5+ API 风格）。
 *
 * 关键认知（来自 html5plus.org/doc/zh_cn/sqlite.html）：
 * 1. **所有 sqlite API 全是 async callback**（openDatabase / executeSql / selectSql / transaction）
 * 2. **回调在 options 对象里**：{name, path, success, fail}，success 无参数
 * 3. **用 `name` 引用当前打开的 DB**（不是 handle 对象）；所有后续操作传 name
 * 4. path 推荐用 `'_doc/xxx'` 这种相对路径
 * 5. executeSql 官方只支持 `sql` 字符串/字符串数组，没有参数数组；参数绑定在本文件统一转义
 *
 * 关键点：
 * - 模块级状态只持有"DB name"（不是 handle）
 * - `init()` 用 callback + Promise 包装
 * - `tx(fn)` 用 `plus.sqlite.transaction({ operation: 'begin' | 'commit' | 'rollback' })`
 *
 * ⚠️ 平台限制：plus.sqlite 只在**真机/模拟器 Android 端**可用；H5 / 小程序 不可用。
 * HBuilderX 标准版基座的 sqlite native 是 stub，selectSql 等都返回 undefined；
 * 真要工作需 HBuilderX App 开发版 + 自定义基座勾 Sqlite 模块。
 */

import { runMigrations } from './migrations'
import { seedIfEmpty } from './seed'

/** 当前打开的 DB 的 name（5+ API 用 name 引用，不是 handle） */
const DB_NAME = 'bookkeeping.db'
/** path 用相对路径（_doc/），HBuilderX 官方推荐 */
const DB_PATH = `_doc/${DB_NAME}`
const CALLBACK_TIMEOUT_MS = 8000

let txDepth = 0

/** 5+ API error 对象 */
interface PlusSqliteError {
  code: number
  message: string
}

/** selectSql 回调返回的"行"：JSON 对象，键是列名，值是 number/string/null */
export type PlusSqliteRow = Record<string, number | string | null>

type SqlArg = number | string | null
type SqliteMethod = 'openDatabase' | 'closeDatabase' | 'executeSql' | 'selectSql' | 'transaction'
type SqliteOptions = Record<string, unknown>

function normalizeError(e: unknown, method: string): Error {
  if (e instanceof Error) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const sqliteError = e as Partial<PlusSqliteError>
    return new Error(
      `[db] ${method} failed: code=${sqliteError.code ?? 'unknown'} message=${
        sqliteError.message ?? 'unknown'
      }`,
    )
  }
  return new Error(`[db] ${method} failed: ${String(e)}`)
}

/**
 * Promise 化：把 5+ API 的 callback 形式包成 Promise。
 * 用法：`const rows = await pify('selectSql', {name, sql})`
 */
function pify<T>(method: SqliteMethod, options: SqliteOptions): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.sqlite) {
      reject(new Error(`[db] plus.sqlite unavailable (cannot call ${method})`))
      return
    }
    const sqlite = plus.sqlite as unknown as Record<string, (opts: SqliteOptions) => void>
    const fn = sqlite[method]
    if (typeof fn !== 'function') {
      reject(new Error(`[db] plus.sqlite.${method} is not a function`))
      return
    }
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      reject(
        new Error(
          `[db] ${method} timed out after ${CALLBACK_TIMEOUT_MS}ms; SQLite native bridge may be unavailable`,
        ),
      )
    }, CALLBACK_TIMEOUT_MS)

    const settle = (cb: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      cb()
    }

    try {
      fn.call(sqlite, {
        ...options,
        success: (res: T) => settle(() => resolve(res)),
        fail: (e: PlusSqliteError) => settle(() => reject(normalizeError(e, method))),
      })
    } catch (e) {
      settle(() => reject(normalizeError(e, method)))
    }
  })
}

function quoteSqlValue(value: SqlArg): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`[db] invalid SQL number: ${value}`)
    }
    return String(value)
  }
  return `'${value.replace(/'/g, "''")}'`
}

function bindSql(sql: string, args?: SqlArg[]): string {
  if (!args || args.length === 0) return sql
  let index = 0
  const bound = sql.replace(/\?/g, () => {
    if (index >= args.length) {
      throw new Error('[db] not enough SQL bind args')
    }
    const arg = args[index]
    if (arg === undefined) {
      throw new Error('[db] SQL bind arg is undefined')
    }
    const value = quoteSqlValue(arg)
    index += 1
    return value
  })
  if (index !== args.length) {
    throw new Error('[db] too many SQL bind args')
  }
  return bound
}

/* ───────── 公开 API ───────── */

/**
 * 启动初始化（幂等）。
 * - 第一次调：openDatabase → runMigrations → seedIfEmpty
 * - 之后调：直接返回（依赖 isOpenDatabase 判定）
 */
export async function init(): Promise<void> {
  if (typeof plus === 'undefined' || !plus.sqlite) {
    throw new Error('[db] plus.sqlite unavailable (only works in Android app context)')
  }

  const sqlite = plus.sqlite as unknown as {
    isOpenDatabase: (opts: { name: string; path: string }) => boolean
  }

  // 已打开则直接走 migrations（用于 App 重启场景）
  const alreadyOpen = sqlite.isOpenDatabase({ name: DB_NAME, path: DB_PATH })
  if (!alreadyOpen) {
    await pify<void>('openDatabase', { name: DB_NAME, path: DB_PATH })
  }

  // 启用外键约束（必须在每条连接上 PRAGMA）
  await pify<void>('executeSql', {
    name: DB_NAME,
    sql: 'PRAGMA foreign_keys = ON;',
  })

  await runMigrations()
  await seedIfEmpty()
  await checkIntegrity()
}

/**
 * 启动时跑一次轻量 integrity_check(1)，失败抛 [db] integrity failed 错。
 * 失败场景：用户从老版本升级、手动破坏 DB、意外断电导致文件不完整。
 * 上层（App.vue onError）会捕获并提示用备份恢复。
 */
async function checkIntegrity(): Promise<void> {
  const rows = await select<PlusSqliteRow>('PRAGMA integrity_check(1)')
  const ok = rows.length === 1 && rows[0]?.integrity_check === 'ok'
  if (!ok) {
    throw new Error(`[db] integrity_check failed: ${JSON.stringify(rows)}`)
  }
}

/**
 * 关闭连接（一般 App 退出时调用）
 */
export function close(): Promise<void> {
  if (typeof plus === 'undefined' || !plus.sqlite) {
    return Promise.resolve()
  }
  return pify<void>('closeDatabase', { name: DB_NAME })
}

/**
 * 事务包裹：fn() 内的多次操作要么全成功、要么全回滚。
 *
 * 5+ API 的 transaction 不是函数包裹，而是显式 begin / commit / rollback。
 * 这里允许 fn 内 await 多条 exec/select；失败时回滚并重抛原始错误。
 */
export async function tx<T>(fn: () => T | Promise<T>): Promise<T> {
  if (txDepth > 0) {
    return fn()
  }

  await pify<void>('transaction', { name: DB_NAME, operation: 'begin' })
  txDepth += 1
  try {
    const result = await fn()
    await pify<void>('transaction', { name: DB_NAME, operation: 'commit' })
    return result
  } catch (e) {
    try {
      await pify<void>('transaction', { name: DB_NAME, operation: 'rollback' })
    } catch (rollbackError) {
      console.error('[db] rollback failed', rollbackError)
    }
    throw e
  } finally {
    txDepth -= 1
  }
}

/* ───────── 给 api 层用的低层 helpers ───────── */

/** 执行 INSERT / UPDATE / DELETE，返回 affected rows */
export function exec(sql: string | string[], args?: SqlArg[]): Promise<void> {
  if (Array.isArray(sql)) {
    if (args && args.length > 0) {
      throw new Error('[db] args are not supported with SQL arrays')
    }
    return pify<void>('executeSql', { name: DB_NAME, sql })
  }
  return pify<void>('executeSql', { name: DB_NAME, sql: bindSql(sql, args) })
}

/** 执行 SELECT，返回行数组（每行是 JSON 对象，列名 -> 值） */
export function select<T extends PlusSqliteRow = PlusSqliteRow>(
  sql: string,
  args?: SqlArg[],
): Promise<T[]> {
  return pify<T[]>('selectSql', {
    name: DB_NAME,
    sql: bindSql(sql, args),
  })
}
