import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/types'
import type { DesktopAPI, Snapshot } from '../shared/types'
const api: DesktopAPI = {
  getSnapshot: () => ipcRenderer.invoke(IPC.snapshot),
  updateSettings: patch => ipcRenderer.invoke(IPC.update, patch),
  action: action => ipcRenderer.invoke(IPC.action, action),
  drag: phase => ipcRenderer.send(IPC.drag, phase),
  openSettings: () => ipcRenderer.send(IPC.settings),
  closeSettings: () => ipcRenderer.send(IPC.close),
  menu: () => ipcRenderer.send(IPC.menu),
  quit: () => ipcRenderer.send(IPC.quit),
  onSnapshot(callback) {
    const listener = (_event: Electron.IpcRendererEvent, data: Snapshot) => callback(data)
    ipcRenderer.on(IPC.changed, listener)
    return () => ipcRenderer.removeListener(IPC.changed, listener)
  }
}
contextBridge.exposeInMainWorld('horipet', Object.freeze(api))
