import { app, ipcMain, utilityProcess } from "electron";
import path from "path";

export function setupElectronBridge(
  electronApp: typeof app,
  electronIpcMain: typeof ipcMain,
): void {
  const dbProcessPath = path.join(__dirname, "db-process.cjs");
  const child = utilityProcess.fork(dbProcessPath);

  electronIpcMain.on("db:port", (event) => {
    child.postMessage({ type: "port" }, [event.ports[0]]);
  });

  electronApp.on("before-quit", () => child.kill());
}
