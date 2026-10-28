import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { platform } from './platform'
const here = fileURLToPath(new URL('.', import.meta.url))
export const rendererPath = join(here, '../renderer/index.html')
const preload = join(here, '../preload/index.cjs')
const webPreferences = { preload, sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, spellcheck: false }
export async function loadWindow(win: BrowserWindow, kind: 'pet' | 'settings'): Promise<void> {
  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) await win.loadURL(`${process.env.ELECTRON_RENDERER_URL}?window=${kind}`)
  else await win.loadFile(rendererPath, { query: { window: kind } })
}
export function createPetWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: 'HoriPet', width: 240, height: 268, frame: false, transparent: true,
    backgroundColor: '#00000000', hasShadow: false, resizable: false, minimizable: false,
    maximizable: false, fullscreenable: false, skipTaskbar: true, focusable: false,
    acceptFirstMouse: true, show: false, webPreferences
  })
  platform.configurePet(win)
  return win
}
export function createSettingsWindow(): BrowserWindow {
  const mac = process.platform === 'darwin'
  const win = new BrowserWindow({
    title: 'HoriPet — Settings', width: 920, height: 760, minWidth: 800, minHeight: 640,
    show: false, frame: mac, titleBarStyle: mac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: { x: 19, y: 17 },
    transparent: mac, vibrancy: mac ? 'sidebar' : undefined,
    visualEffectState: 'active', backgroundColor: mac ? '#00000000' : '#17221f',
    backgroundMaterial: process.platform === 'win32' ? 'mica' : undefined,
    autoHideMenuBar: true, webPreferences
  })
  win.setMenuBarVisibility(false)
  return win
}
