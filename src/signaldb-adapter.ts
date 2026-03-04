import { createStorageAdapter } from '@signaldb/core'

export default function createSQLiteIPCAdapter<
  T extends { id: I } & Record<string, any>,
  I extends string | number,
>(dbPath: string, tableName: string) {
  return createStorageAdapter<T, I>({
    async setup() {
      const result = await window.db.setup({ dbPath, tableName })
      if (!result.success) throw new Error(result.error || 'Failed to setup table')
    },
    async teardown() {},
    async readAll() {
      const result = await window.db.readAll({ dbPath, tableName })
      if (!result.success) throw new Error(result.error || 'Failed to read data')
      return result.data as T[]
    },
    async readIds(ids: I[]) {
      const result = await window.db.readIds({ dbPath, tableName, ids })
      if (!result.success) throw new Error(result.error || 'Failed to read items by IDs')
      return result.data as T[]
    },
    async createIndex(field: string) {
      const result = await window.db.createIndex({ dbPath, tableName, field })
      if (!result.success) throw new Error(result.error || `Failed to create index for field: ${field}`)
    },
    async dropIndex(field: string) {
      const result = await window.db.dropIndex({ dbPath, tableName, field })
      if (!result.success) throw new Error(result.error || `Failed to drop index for field: ${field}`)
    },
    async readIndex(field: string) {
      const result = await window.db.readIndex({ dbPath, tableName, field })
      if (!result.success) throw new Error(result.error || `Failed to read index for field: ${field}`)
      const indexMap = new Map<any, Set<I>>()
      if (result.data) {
        for (const [key, ids] of Object.entries(result.data)) {
          indexMap.set(key, new Set(ids as I[]))
        }
      }
      return indexMap
    },
    async insert(items: T[]) {
      const result = await window.db.insert({ dbPath, tableName, items })
      if (!result.success) throw new Error(result.error || 'Failed to insert items')
    },
    async replace(items: T[]) {
      const result = await window.db.replace({ dbPath, tableName, items })
      if (!result.success) throw new Error(result.error || 'Failed to replace items')
    },
    async remove(items: T[]) {
      const result = await window.db.remove({ dbPath, tableName, items })
      if (!result.success) throw new Error(result.error || 'Failed to remove items')
    },
    async removeAll() {
      const result = await window.db.removeAll({ dbPath, tableName })
      if (!result.success) throw new Error(result.error || 'Failed to remove all items')
    },
  })
}
