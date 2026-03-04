import type {} from './types'

export { default as createSQLiteIPCAdapter } from './signaldb-adapter'
export { setupElectronBridge } from './main'
export type { DbApi, DbResult } from './types'

export const isElectron = (): boolean => typeof window !== 'undefined' && !!window.db
