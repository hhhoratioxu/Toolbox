import { app, BrowserWindow, ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { pathToFileURL } from 'node:url'
import { IPC } from '../shared/types'
import type { Action } from '../shared/types'
import type { DesktopController } from './desktop/controller'
import { rendererPath } from './windows'
const actions = new Set<Action>(['feed', 'pet', 'sleep', 'wake', 'celebrate', 'reset-position', 'show', 'hide'])
export function installIPC(controller: DesktopController, settings: () => void, menu: () => void,
  snapshot: () => ReturnType<DesktopController['snapshot']>, knownWindows: () => BrowserWindow[]): void {
  const last = new Map<number, { time: number; count: number }>()
  function trusted(event: IpcMainEvent | IpcMainInvokeEvent, rateLimit = true): boolean {
    if (!knownWindows().some(win => !win.isDestroyed() && win.webContents === event.sender) || event.senderFrame !== event.sender.mainFrame) return false
    const url = new URL(event.senderFrame.url)
    const allowed = !app.isPackaged && process.env.ELECTRON_RENDERER_URL
      ? url.origin === new URL(process.env.ELECTRON_RENDERER_URL).origin
      : url.protocol === 'file:' && url.pathname === new URL(pathToFileURL(rendererPath).href).pathname
    if (!allowed) return false
    if (!rateLimit) return true
    const now = Date.now(), rate = last.get(event.sender.id)
    if (!rate || now - rate.time > 1000) last.set(event.sender.id, { time: now, count: 1 })
    else if (++rate.count > 100) return false
    return true
  }
  ipcMain.handle(IPC.snapshot, event => { if (!trusted(event)) throw new Error('Untrusted sender'); return snapshot() })
  ipcMain.handle(IPC.update, (event, patch: unknown) => {
    if (!trusted(event)) throw new Error('Untrusted sender')
    controller.update(patch)
    return snapshot()
  })
  ipcMain.handle(IPC.action, (event, action: Action) => {
    if (!trusted(event) || !actions.has(action)) throw new Error('Invalid action')
    controller.action(action)
  })
  ipcMain.on(IPC.drag, (event, phase: unknown) => {
    if (!trusted(event) || event.sender !== controller.win.webContents) return
    if (phase === 'start') controller.startDrag()
    else if (phase === 'end') controller.endDrag()
  })
  ipcMain.on(IPC.settings, event => { if (trusted(event)) settings() })
  ipcMain.on(IPC.close, event => {
    if (trusted(event) && event.sender !== controller.win.webContents) BrowserWindow.fromWebContents(event.sender)?.close()
  })
  ipcMain.on(IPC.menu, event => { if (trusted(event)) menu() })
  ipcMain.on(IPC.quit, event => { if (trusted(event, false)) app.quit() })
}
