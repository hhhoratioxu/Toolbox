import { app } from 'electron'
import type { PlatformAdapter } from './index'
export const macPlatform: PlatformAdapter = {
  configurePet(win) {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true })
    win.setHiddenInMissionControl(true)
  },
  setLogin(enabled) {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  },
  getLogin: () => app.getLoginItemSettings().openAtLogin,
  showSettings() { void app.dock?.show() },
  hideSettings() { void app.dock?.hide() }
}
