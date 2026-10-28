import { app, BrowserWindow, nativeTheme, screen, session, powerMonitor } from 'electron'
import { join } from 'node:path'
import { LocalStore } from './persistence'
import { DesktopController } from './desktop/controller'
import { createPetWindow, createSettingsWindow, loadWindow } from './windows'
import { installIPC } from './ipc'
import { PetTray } from './tray'
import { platform, loginAvailable } from './platform'
import { IPC } from '../shared/types'

app.setName('HoriPet')
// Explicit profile override allows reproducible desktop tests without touching a real save.
if (process.env.HORIPET_PROFILE) app.setPath('userData', process.env.HORIPET_PROFILE)
const locked = app.requestSingleInstanceLock()
if (!locked) app.quit()
else {
  let controller: DesktopController | undefined
  let tray: PetTray | undefined
  let settingsWindow: BrowserWindow | undefined
  let quitting = false
  const windows = () => BrowserWindow.getAllWindows()
  const snapshot = () => controller!.snapshot(app.getVersion(), nativeTheme.shouldUseDarkColors)
  function changed() {
    for (const win of windows()) if (!win.webContents.isLoading()) win.webContents.send(IPC.changed, snapshot())
    tray?.rebuild()
  }
  function guardWindow(win: BrowserWindow) {
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', event => event.preventDefault())
    win.webContents.on('render-process-gone', (_event, details) => {
      console.error('HoriPet renderer exited', details.reason)
      if (!quitting) void loadWindow(win, win === controller?.win ? 'pet' : 'settings')
    })
  }
  function showSettings() {
    if (quitting) return
    if (settingsWindow && !settingsWindow.isDestroyed()) { platform.showSettings(); settingsWindow.show(); settingsWindow.focus(); return }
    platform.showSettings()
    settingsWindow = createSettingsWindow()
    guardWindow(settingsWindow)
    settingsWindow.on('closed', () => { settingsWindow = undefined; if (!quitting) platform.hideSettings() })
    void loadWindow(settingsWindow, 'settings').then(() => { settingsWindow?.show(); settingsWindow?.focus() }).catch(console.error)
  }
  app.on('second-instance', () => { controller?.action('show'); showSettings() })
  app.on('activate', () => { controller?.action('show'); showSettings() })
  // Tray keeps the application alive after Preferences closes.
  app.on('window-all-closed', () => {})
  app.on('before-quit', () => {
    quitting = true
    controller?.stop()
    tray?.destroy()
    // All durable state is flushed and our timers are stopped. A tray-only,
    // non-focusable macOS app must not wait on Cocoa activation/termination
    // callbacks to finish; exit closes Electron's windows and child processes.
    app.exit(0)
  })
  app.whenReady().then(async () => {
    if (process.platform === 'win32') app.setAppUserModelId('com.horipet.desktop')
    platform.hideSettings()
    session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
    session.defaultSession.setPermissionCheckHandler(() => false)
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => {
      const devOrigin = !app.isPackaged && process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).origin : ''
      const url = new URL(details.url)
      callback({ cancel: !devOrigin || url.origin.replace(/^ws/, 'http') !== devOrigin })
    })
    const store = new LocalStore(join(app.getPath('userData'), 'companion.json'))
    const data = store.load()
    if (loginAvailable()) data.settings.launchAtLogin = platform.getLogin()
    const pet = createPetWindow()
    controller = new DesktopController(pet, data, store, changed)
    guardWindow(pet)
    tray = new PetTray(controller, showSettings)
    installIPC(controller, showSettings, () => tray?.popup(), snapshot, windows)
    await loadWindow(pet, 'pet')
    changed()
    screen.on('display-added', () => controller?.recover())
    screen.on('display-removed', () => controller?.recover())
    screen.on('display-metrics-changed', () => controller?.recover())
    powerMonitor.on('resume', () => controller?.recover())
    nativeTheme.on('updated', changed)
    pet.on('close', event => { if (!quitting) { event.preventDefault(); controller?.action('hide') } })
  }).catch(error => { console.error('HoriPet startup failed', error); app.exit(1) })
}
