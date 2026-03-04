import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import type { Database as DB } from 'better-sqlite3'

process.on('uncaughtException', (error) => {
  console.error('[DB Process] Uncaught Exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('[DB Process] Unhandled Rejection:', reason)
})

const dbConnections = new Map<string, DB>()

function getConnection(dbPath: string): DB {
  if (dbConnections.has(dbPath)) return dbConnections.get(dbPath)!
  const dir = path.dirname(dbPath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  dbConnections.set(dbPath, db)
  return db
}

if (!process.parentPort) {
  console.error('[DB Process] Must be run as UtilityProcess')
  process.exit(1)
}

let port: Electron.MessagePortMain | null = null

process.parentPort.on('message', (e) => {
  if (e.data?.type === 'port') {
    port = e.ports[0]
    port.on('message', handleMessage)
    port.start()
  }
})

function handleMessage(e: Electron.MessageEvent): void {
  const { id, method, args } = e.data
  try {
    const result = executeMethod(method, args)
    port?.postMessage({ id, success: true, ...result })
  } catch (error: any) {
    console.error(`[DB Process] Error in ${method}:`, error)
    port?.postMessage({ id, success: false, error: error.message })
  }
}

function executeMethod(method: string, args: Record<string, any>): Record<string, any> {
  const { dbPath, tableName, filePath, items, ids, field } = args

  switch (method) {
    case 'setup': {
      const db = getConnection(dbPath)
      db.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (id TEXT PRIMARY KEY, data TEXT)`)
      return {}
    }

    case 'readAll': {
      const db = getConnection(dbPath)
      const rows = db.prepare(`SELECT data FROM "${tableName}"`).all() as { data: string }[]
      return { data: rows.map((r) => JSON.parse(r.data)) }
    }

    case 'readIds': {
      const db = getConnection(dbPath)
      const placeholders = (ids as (string | number)[]).map(() => '?').join(', ')
      const rows = db
        .prepare(`SELECT data FROM "${tableName}" WHERE id IN (${placeholders})`)
        .all(...ids) as { data: string }[]
      return { data: rows.map((r) => JSON.parse(r.data)) }
    }

    case 'insert':
    case 'replace': {
      const db = getConnection(dbPath)
      const stmt = db.prepare(`INSERT OR REPLACE INTO "${tableName}" (id, data) VALUES (?, ?)`)
      const run = db.transaction((rows: any[]) => {
        for (const item of rows) stmt.run(String(item.id), JSON.stringify(item))
      })
      run(items)
      return {}
    }

    case 'remove': {
      const db = getConnection(dbPath)
      const stmt = db.prepare(`DELETE FROM "${tableName}" WHERE id = ?`)
      const run = db.transaction((rows: any[]) => {
        for (const item of rows) stmt.run(String(item.id))
      })
      run(items)
      return {}
    }

    case 'removeAll': {
      const db = getConnection(dbPath)
      db.prepare(`DELETE FROM "${tableName}"`).run()
      return {}
    }

    case 'createIndex': {
      const db = getConnection(dbPath)
      const colName = `idx_${field}`
      const existing = db.pragma(`table_xinfo("${tableName}")`) as { name: string }[]
      if (!existing.some((col) => col.name === colName)) {
        db.exec(
          `ALTER TABLE "${tableName}" ADD COLUMN "${colName}" TEXT GENERATED ALWAYS AS (json_extract(data, '$.${field}')) VIRTUAL`,
        )
      }
      db.exec(`CREATE INDEX IF NOT EXISTS "idx_${tableName}_${field}" ON "${tableName}" ("${colName}")`)
      return {}
    }

    case 'dropIndex': {
      const db = getConnection(dbPath)
      db.exec(`DROP INDEX IF EXISTS "idx_${tableName}_${field}"`)
      return {}
    }

    case 'readIndex': {
      const db = getConnection(dbPath)
      const rows = db
        .prepare(`SELECT id, json_extract(data, '$.${field}') as field_value FROM "${tableName}"`)
        .all() as { id: string; field_value: string | number | null }[]

      const index: Record<string, (string | number)[]> = {}
      for (const row of rows) {
        if (row.field_value == null) continue
        const key = String(row.field_value)
        if (!index[key]) index[key] = []
        index[key].push(row.id)
      }
      return { data: index }
    }

    case 'getMaxUpdatedAt': {
      const db = getConnection(dbPath)
      const cols = db.pragma(`table_xinfo("${tableName}")`) as { name: string }[]
      const hasColumn = cols.some((col) => col.name === 'idx_updated_at')
      if (!hasColumn) return { data: { maxUpdatedAt: null, hasColumn: false } }
      const row = db
        .prepare(`SELECT MAX(idx_updated_at) as maxUpdatedAt FROM "${tableName}"`)
        .get() as { maxUpdatedAt: string | null }
      return { data: { maxUpdatedAt: row.maxUpdatedAt, hasColumn: true } }
    }

    case 'checkFileExists': {
      return { data: { exists: fs.existsSync(filePath) } }
    }

    case 'deleteDbFile': {
      if (dbConnections.has(filePath)) {
        dbConnections.get(filePath)!.close()
        dbConnections.delete(filePath)
      }
      // filePath is the .db path; also remove WAL and SHM sidecar files
      const base = filePath.endsWith('.db') ? filePath.slice(0, -3) : filePath
      for (const p of [base + '.db', base + '.db-wal', base + '.db-shm']) {
        if (fs.existsSync(p)) fs.unlinkSync(p)
      }
      return {}
    }

    default:
      throw new Error(`Unknown method: ${method}`)
  }
}
