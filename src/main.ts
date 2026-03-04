import { app, ipcMain, utilityProcess, MessageChannelMain } from 'electron'
import path from 'path'

export function setupElectronBridge(
  electronApp: typeof app,
  electronIpcMain: typeof ipcMain,
): void {
  const dbProcessPath = path.join(__dirname, 'db-process.cjs')
  const child = utilityProcess.fork(dbProcessPath)

  const { port1, port2 } = new MessageChannelMain()

  // port2 goes to the UtilityProcess; port1 stays in main until renderer connects
  child.postMessage({ type: 'port' }, [port2])

  // When the renderer sends its MessagePort, forward it directly to the UtilityProcess.
  // This creates a direct renderer ↔ UtilityProcess channel without main process involvement.
  electronIpcMain.on('db:port', (event) => {
    const rendererPort = event.ports[0]
    child.postMessage({ type: 'port' }, [rendererPort])
    // port1 is no longer needed once we've wired up the renderer directly
    port1.close()
  })

  electronApp.on('before-quit', () => {
    child.kill()
  })
}
