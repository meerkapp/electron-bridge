# @meerkapp/electron-bridge

Bridge between Electron main process and PWA renderer for the Meerk warehouse management system. Provides SQLite persistence via a UtilityProcess with a MessageChannel-based IPC API and a SignalDB storage adapter.

## Installation

```sh
pnpm add @meerkapp/electron-bridge
```

> **Note:** `better-sqlite3` requires native compilation. After installing, run:
> ```sh
> npx @electron/rebuild
> ```

## Usage

### Main process

```ts
import { app, ipcMain } from 'electron'
import { setupElectronBridge } from '@meerkapp/electron-bridge'

app.whenReady().then(() => {
  setupElectronBridge(app, ipcMain)
  // ...create BrowserWindow etc.
})
```

### Preload script

Point Electron's `webPreferences.preload` to the bundled preload file:

```ts
import { BrowserWindow } from 'electron'
import path from 'path'

new BrowserWindow({
  webPreferences: {
    preload: path.join(
      path.dirname(require.resolve('@meerkapp/electron-bridge')),
      'preload.cjs'
    ),
    contextIsolation: true,
    sandbox: false,
  },
})
```

### Renderer / PWA

```ts
import { createSQLiteIPCAdapter, isElectron } from '@meerkapp/electron-bridge'
import { Collection } from '@signaldb/core'

if (isElectron()) {
  const adapter = createSQLiteIPCAdapter<Product, string>(
    '/path/to/products.db',
    'products'
  )

  const products = new Collection({ persistence: adapter })
}
```

### Accessing `window.db` directly

`window.db` is exposed by the preload script and provides the full `DbApi`:

```ts
const result = await window.db.checkFileExists({ filePath: '/path/to/file.db' })
if (result.success && result.data?.exists) {
  // ...
}
```

## Native module rebuild

`better-sqlite3` is a native Node.js addon and must be compiled against the Electron version in use. Run after `pnpm install`:

```sh
npx @electron/rebuild -f -w better-sqlite3
```

Add this to your `postinstall` script to automate it:

```json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w better-sqlite3"
  }
}
```
