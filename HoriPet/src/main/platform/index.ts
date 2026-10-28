import { app, BrowserWindow } from 'electron'
import { macPlatform } from './mac'
import { windowsPlatform } from './windows'
export interface PlatformAdapter {
  configurePet(win: BrowserWindow): void
  setLogin(enabled: boolean): boolean
  getLogin(): boolean
  showSettings(): void
  hideSettings(): void
}
export const platform: PlatformAdapter = process.platform === 'darwin' ? macPlatform : windowsPlatform
export function loginAvailable(): boolean {
  return app.isPackaged && ['darwin', 'win32'].includes(process.platform) && !process.env.PORTABLE_EXECUTABLE_DIR
}
export function setClickThrough(win: BrowserWindow, ignore: boolean): void {
  // Forward only mouse moves. Click recovery never depends on forwarded events:
  // the main process polls screen.getCursorScreenPoint against the silhouette.
  win.setIgnoreMouseEvents(ignore, { forward: true })
}
