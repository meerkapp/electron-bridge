import { contextBridge, ipcRenderer } from 'electron'

const { port1, port2 } = new MessageChannel()

// Send port2 to main process so it can be forwarded to the UtilityProcess
ipcRenderer.postMessage('db:port', null, [port2])

let requestId = 0
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>()

port1.onmessage = (e) => {
  const { id, success, error, ...data } = e.data
  const handler = pending.get(id)
  if (!handler) return
  pending.delete(id)
  if (success) handler.resolve(data)
  else handler.reject(new Error(error))
}

port1.start()

function invoke(method: string, args: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = ++requestId
    pending.set(id, { resolve, reject })
    port1.postMessage({ id, method, args })
  })
}

contextBridge.exposeInMainWorld('db', {
  setup: (args: any) => invoke('setup', args),
  readAll: (args: any) => invoke('readAll', args),
  readIds: (args: any) => invoke('readIds', args),
  insert: (args: any) => invoke('insert', args),
  replace: (args: any) => invoke('replace', args),
  remove: (args: any) => invoke('remove', args),
  removeAll: (args: any) => invoke('removeAll', args),
  createIndex: (args: any) => invoke('createIndex', args),
  dropIndex: (args: any) => invoke('dropIndex', args),
  readIndex: (args: any) => invoke('readIndex', args),
  getMaxUpdatedAt: (args: any) => invoke('getMaxUpdatedAt', args),
  checkFileExists: (args: any) => invoke('checkFileExists', args),
  deleteDbFile: (args: any) => invoke('deleteDbFile', args),
})
