import { defineConfig } from 'tsup'

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      preload: 'src/preload.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    external: ['electron', '@signaldb/core'],
  },
  {
    entry: {
      'db-process': 'src/db-process.ts',
    },
    format: ['cjs'],
    dts: false,
    external: ['electron', 'better-sqlite3'],
  },
])
