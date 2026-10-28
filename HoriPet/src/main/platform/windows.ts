import { app } from 'electron'
import type { PlatformAdapter } from './index'
export const windowsPlatform: PlatformAdapter = {
  configurePet(win) { win.setSkipTaskbar(true) },
  setLogin(enabled) {
    app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath, args: [] })
    return app.getLoginItemSettings({ path: process.execPath, args: [] }).openAtLogin
  },
  getLogin: () => app.getLoginItemSettings({ path: process.execPath, args: [] }).openAtLogin,
  showSettings() {},
  hideSettings() {}
}
