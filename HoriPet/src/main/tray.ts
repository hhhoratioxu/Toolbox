import { app, Menu, nativeImage, Tray } from 'electron'
import { join } from 'node:path'
import type { DesktopController } from './desktop/controller'
export class PetTray {
  private tray: Tray
  constructor(private controller: DesktopController, private settings: () => void) {
    const file = process.platform === 'darwin' ? 'trayTemplate.png' : 'tray.png'
    const path = app.isPackaged ? join(process.resourcesPath, file) : join(app.getAppPath(), 'resources', file)
    const icon = nativeImage.createFromPath(path).resize({ width: process.platform === 'darwin' ? 20 : 24, height: process.platform === 'darwin' ? 20 : 24 })
    if (process.platform === 'darwin') icon.setTemplateImage(true)
    this.tray = new Tray(icon)
    this.tray.setToolTip('HoriPet · A little company')
    this.tray.on('double-click', () => { controller.action('show'); settings() })
    this.rebuild()
  }
  menu(): Electron.Menu {
    const c = this.controller, s = c.data.settings, en = s.locale === 'en'
    const t = (zh: string, english: string) => en ? english : zh
    return Menu.buildFromTemplate([
      { label: `HoriPet · ${s.name}`, enabled: false },
      { type: 'separator' },
      { label: t('显示宠物', 'Show companion'), type: 'checkbox', checked: s.visible, click: () => c.action(s.visible ? 'hide' : 'show') },
      { label: t('喂一口零食', 'Give a treat'), click: () => c.action('feed') },
      { label: t('摸摸头', 'Pet gently'), click: () => c.action('pet') },
      { label: c.brain.state === 'sleep' ? t('叫醒', 'Wake up') : t('睡个好觉', 'Take a nap'), click: () => c.action(c.brain.state === 'sleep' ? 'wake' : 'sleep') },
      { type: 'separator' },
      { label: t('跟随鼠标', 'Follow cursor'), type: 'checkbox', checked: s.followMouse, click: () => c.update({ followMouse: !s.followMouse }) },
      { label: t('自主活动', 'Wander freely'), type: 'checkbox', checked: s.autonomous, click: () => c.update({ autonomous: !s.autonomous }) },
      { label: t('始终置顶', 'Always on top'), type: 'checkbox', checked: s.alwaysOnTop, click: () => c.update({ alwaysOnTop: !s.alwaysOnTop }) },
      { label: t('找回宠物', 'Bring companion home'), click: () => c.action('reset-position') },
      { type: 'separator' },
      { label: t('偏好设置…', 'Preferences…'), click: () => this.settings() },
      { label: t('退出 HoriPet', 'Quit HoriPet'), click: () => app.quit() }
    ])
  }
  rebuild(): void { this.tray.setContextMenu(this.menu()) }
  popup(): void {
    this.controller.setMenuOpen(true)
    this.menu().popup({ callback: () => this.controller.setMenuOpen(false) })
  }
  destroy(): void { this.tray.destroy() }
}
