/**
 * SQLite 数据层入口（5+ API 风格）。
 *
 * 关键认知（来自 html5plus.org/doc/zh_cn/sqlite.html）：
 * 1. **所有 sqlite API 全是 async callback**（openDatabase / executeSql / selectSql / transaction）
 * 2. **回调在 options 对象里**：{name, path, success, fail}，success 无参数
 * 3. **用 `name` 引用当前打开的 DB**（不是 handle 对象）；所有后续操作传 name
 * 4. path 推荐用 `'_doc/xxx'` 这种相对路径
 * 5. SQLite 模块声明：manifest.json 的 `app-plus.permissions` 数组里加 `<uses-feature android:name="android.hardware.sqlite"/>`，
 *    且 `app-plus.modules.Sqlite` 也要勾上（HBuilderX 兼容做法）
 *
 * 关键点：
 * - 模块级状态只持有"DB name"（不是 handle）
 * - `init()` 用 callback + Promise 包装
 * - `tx(fn)` 用 `plus.sqlite.transaction` 包裹（operation 是 function 形式）
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

/** 5+ API error 对象 */
interface PlusSqliteError {
  code: number
  message: string
}

/** selectSql 回调返回的"行"：JSON 对象，键是列名，值是 number/string/null */
export type PlusSqliteRow = Record<string, number | string | null>

/**
 * Promise 化：把 5+ API 的 callback 形式包成 Promise。
 * 用法：`const rows = await pify('selectSql', {name, sql})`
 */
function pify<T>(
  method: 'openDatabase' | 'closeDatabase' | 'executeSql' | 'selectSql' | 'transaction',
  options: Record<string, unknown>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.sqlite) {
      reject(new Error(`[db] plus.sqlite unavailable (cannot call ${method})`))
      return
    }
    const sqlite = plus.sqlite as unknown as Record<string, (opts: Record<string, unknown>) => void>
    if (typeof sqlite[method] !== 'function') {
      reject(new Error(`[db] plus.sqlite.${method} is not a function`))
      return
    }
    const fn = sqlite[method] as (opts: Record<string, unknown>) => void
    fn({
      ...options,
      success: (res: T) => resolve(res),
      fail: (e: PlusSqliteError) =>
        reject(new Error(`[db] ${method} failed: code=${e.code} message=${e.message}`)),
    })
  })
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

  runMigrations()
  seedIfEmpty()
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
 * 用 plus.sqlite.transaction(operation, success, fail)：
 * - operation 是函数，**同步**地调多次 sqlite.executeSql
 * - operation 抛错 → 自动 ROLLBACK + fail 回调
 * - operation 正常返回 → 自动 COMMIT + success 回调
 */
export async function tx<T>(fn: () => T | Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (typeof plus === 'undefined' || !plus.sqlite) {
      reject(new Error('[db] plus.sqlite unavailable'))
      return
    }
    const sqlite = plus.sqlite as unknown as {
      transaction: (opts: Record<string, unknown>) => void
    }
    sqlite.transaction({
      name: DB_NAME,
      operation: () => {
        // operation 是同步函数；fn 可以是 async（但里面不能 await 真正异步的东西，
        // 因为 operation 不会被 await）。我们用同步风格的 fn。
        const result = fn()
        // 如果 fn 返回 Promise，会被 transaction 忽略；所以 fn 必须是同步
        if (result instanceof Promise) {
          throw new Error('[db] tx(fn) fn must be sync, not async')
        }
        return result
      },
      success: () => resolve(undefined as unknown as T),
      fail: (e: PlusSqliteError) =>
        reject(new Error(`[db] transaction failed: code=${e.code} message=${e.message}`)),
    })
  })
}

/* ───────── 给 api 层用的低层 helpers ───────── */

/** 执行 INSERT / UPDATE / DELETE，返回 affected rows */
export function exec(sql: string, args?: (number | string | null)[]): Promise<void> {
  return pify<void>('executeSql', { name: DB_NAME, sql, ...(args ? { args } : {}) })
}

/** 执行 SELECT，返回行数组（每行是 JSON 对象，列名 -> 值） */
export function select<T extends PlusSqliteRow = PlusSqliteRow>(
  sql: string,
  args?: (number | string | null)[],
): Promise<T[]> {
  return pify<T[]>('selectSql', {
    name: DB_NAME,
    sql,
    ...(args ? { args } : {}),
  })
}
