export interface DbResult<T = void> {
  success: boolean
  data?: T
  error?: string
}

export interface DbApi {
  setup(args: { dbPath: string; tableName: string }): Promise<DbResult>
  readAll(args: { dbPath: string; tableName: string }): Promise<DbResult<any[]>>
  readIds(args: { dbPath: string; tableName: string; ids: (string | number)[] }): Promise<DbResult<any[]>>
  insert(args: { dbPath: string; tableName: string; items: any[] }): Promise<DbResult>
  replace(args: { dbPath: string; tableName: string; items: any[] }): Promise<DbResult>
  remove(args: { dbPath: string; tableName: string; items: any[] }): Promise<DbResult>
  removeAll(args: { dbPath: string; tableName: string }): Promise<DbResult>
  createIndex(args: { dbPath: string; tableName: string; field: string }): Promise<DbResult>
  dropIndex(args: { dbPath: string; tableName: string; field: string }): Promise<DbResult>
  readIndex(args: {
    dbPath: string
    tableName: string
    field: string
  }): Promise<DbResult<Record<string, (string | number)[]>>>
  getMaxUpdatedAt(args: {
    dbPath: string
    tableName: string
  }): Promise<DbResult<{ maxUpdatedAt: string | null; hasColumn: boolean }>>
  checkFileExists(args: { filePath: string }): Promise<DbResult<{ exists: boolean }>>
  deleteDbFile(args: { filePath: string }): Promise<DbResult>
}

declare global {
  interface Window {
    db: DbApi
  }
}
