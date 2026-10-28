import { BrowserWindow, powerMonitor, screen } from 'electron'
import type { Action, Behavior, Point, SaveData, Snapshot } from '../../shared/types'
import { agePet, clamp, validatePatch } from '../../shared/settings'
import { approach, clampPosition, hitTestPet, nearestArea, petSize } from '../../shared/geometry'
import { PetMachine } from '../behavior/machine'
import { LocalStore } from '../persistence'
import { loginAvailable, platform, setClickThrough } from '../platform'

export class DesktopController {
  readonly brain = new PetMachine()
  behavior: Behavior = { state: 'idle', facing: 1, bubble: '', bubbleUntil: 0, lowPower: false }
  private timer: ReturnType<typeof setTimeout> | undefined
  private statsTimer: ReturnType<typeof setInterval> | undefined
  private position: Point
  private target: Point | null = null
  private dragOffset: Point | null = null
  private dragStart: Point | null = null
  private dragged = false
  private dragSince = 0
  private ignored = false
  private lastTime = Date.now()
  private lastCursor: Point = { x: -99999, y: -99999 }
  private cursorMovedAt = 0
  private lastSavedAt = Date.now()
  private stopped = false
  private menuOpen = false
  private rewardAt = { feed: 0, pet: 0 }
  constructor(readonly win: BrowserWindow, readonly data: SaveData, readonly store: LocalStore,
    private changed: () => void) {
    const size = petSize(data.settings.size)
    const area = screen.getPrimaryDisplay().workArea
    this.position = clampPosition(data.position ?? { x: area.x + area.width - size.width - 64, y: area.y + area.height - size.height - 28 }, size, this.areas())
    data.pet = agePet(data.pet, Date.now(), false)
    this.applyWindow()
    this.statsTimer = setInterval(() => {
      data.pet = agePet(data.pet, Date.now(), this.brain.state === 'sleep')
      this.persist()
      changed()
    }, 60000)
    this.timer = setTimeout(this.tick, 0)
  }
  private areas() { return screen.getAllDisplays().map(d => d.workArea) }
  private persist() {
    this.data.position = { x: Math.round(this.position.x), y: Math.round(this.position.y) }
    this.store.schedule(this.data)
  }
  private applyWindow(): void {
    const size = petSize(this.data.settings.size)
    this.position = clampPosition(this.position, size, this.areas())
    this.win.setBounds({ ...this.position, ...size }, false)
    this.win.setAlwaysOnTop(this.data.settings.alwaysOnTop, 'floating')
    if (this.data.settings.visible) this.win.showInactive()
    else this.win.hide()
    this.persist()
  }
  recover(): void {
    this.target = null
    this.applyWindow()
    this.changed()
  }
  update(input: unknown): void {
    const patch = validatePatch(input)
    if (patch.launchAtLogin !== undefined) {
      if (!loginAvailable()) throw new Error('Login startup is available in an installed build / 请先安装应用再设置开机启动')
      const actual = platform.setLogin(patch.launchAtLogin)
      if (actual !== patch.launchAtLogin) throw new Error('The system did not accept login startup / 系统未接受开机启动设置')
    }
    Object.assign(this.data.settings, patch)
    if (patch.autonomous === false || patch.followMouse === false) {
      this.brain.stopMovement(Date.now())
      this.target = null
    }
    if (patch.visible === false) this.endDrag()
    this.applyWindow()
    this.changed()
  }
  bubble(key: string, duration = 2500): void {
    this.behavior.bubble = key
    this.behavior.bubbleUntil = Date.now() + duration
  }
  action(action: Action): void {
    const now = Date.now()
    const pet = this.data.pet = agePet(this.data.pet, now, this.brain.state === 'sleep')
    if (action === 'feed') {
      if (now - this.rewardAt.feed >= 2500) {
        pet.hunger = clamp(pet.hunger - 22, 0, 100)
        pet.mood = clamp(pet.mood + 5, 0, 100)
        pet.bond = clamp(pet.bond + 1, 0, 100)
        this.rewardAt.feed = now
      }
      this.brain.interact('eat', now)
      this.bubble('yum', 3500)
    } else if (action === 'pet' || action === 'celebrate') {
      if (now - this.rewardAt.pet >= 1200) {
        pet.mood = clamp(pet.mood + 3, 0, 100)
        pet.bond = clamp(pet.bond + .5, 0, 100)
        this.rewardAt.pet = now
      }
      this.brain.interact(action === 'celebrate' || Math.random() < .35 ? 'happy' : 'touch', now)
      this.bubble(action === 'celebrate' ? 'love' : Math.random() < .5 ? 'purr' : 'hello')
    } else if (action === 'sleep') {
      this.brain.interact('sleep', now)
      this.bubble('goodnight')
    } else if (action === 'wake') {
      this.brain.interact('wake', now)
      this.bubble('morning')
    } else if (action === 'reset-position') {
      this.endDrag()
      const area = screen.getPrimaryDisplay().workArea
      const size = petSize(this.data.settings.size)
      this.position = { x: area.x + area.width - size.width - 64, y: area.y + area.height - size.height - 28 }
      this.data.settings.visible = true
      this.applyWindow()
    } else if (action === 'show' || action === 'hide') {
      this.update({ visible: action === 'show' })
    }
    this.behavior.state = this.brain.state
    this.target = null
    this.persist()
    this.changed()
  }
  startDrag(): void {
    if (!this.data.settings.visible) return
    const cursor = screen.getCursorScreenPoint()
    this.dragStart = cursor
    this.dragged = false
    this.dragOffset = { x: cursor.x - this.position.x, y: cursor.y - this.position.y }
    this.dragSince = Date.now()
    this.brain.startDrag(this.dragSince)
    this.behavior.state = 'drag'
    this.target = null
    this.setIgnore(false)
    this.changed()
  }
  endDrag(): void {
    if (!this.dragOffset) return
    this.dragOffset = null
    this.dragStart = null
    this.brain.endDrag(Date.now())
    // A click is resolved by the renderer after the double-click interval.
    if (!this.dragged) { this.brain.until = Date.now(); this.brain.tick(Date.now(), false, false) }
    this.behavior.state = this.brain.state
    this.position = clampPosition(this.position, petSize(this.data.settings.size), this.areas())
    this.persist()
    this.changed()
  }
  setMenuOpen(open: boolean): void { this.menuOpen = open; if (open) { this.endDrag(); this.setIgnore(false) } }
  private setIgnore(ignore: boolean) {
    if (this.ignored !== ignore && !this.win.isDestroyed()) {
      setClickThrough(this.win, ignore)
      this.ignored = ignore
    }
  }
  private tick = (): void => {
    if (this.stopped || this.win.isDestroyed()) return
    const now = Date.now(), dt = Math.min((now - this.lastTime) / 1000, .12)
    this.lastTime = now
    const settings = this.data.settings
    const cursor = screen.getCursorScreenPoint()
    if (Math.hypot(cursor.x - this.lastCursor.x, cursor.y - this.lastCursor.y) > 2) this.cursorMovedAt = now
    this.lastCursor = cursor
    const lowPower = powerMonitor.getSystemIdleTime() > 120 || !settings.visible
    let notify = lowPower !== this.behavior.lowPower
    this.behavior.lowPower = lowPower
    if (settings.visible && !this.menuOpen) {
      const oldState = this.brain.state
      const size = petSize(settings.size)
      if (this.dragOffset) {
        if (now - this.dragSince > 20000) this.endDrag()
        else {
          if (this.dragStart && Math.hypot(cursor.x - this.dragStart.x, cursor.y - this.dragStart.y) > 4) this.dragged = true
          this.position = clampPosition({ x: cursor.x - this.dragOffset.x, y: cursor.y - this.dragOffset.y }, size, this.areas())
        }
      } else {
        const near = Math.hypot(cursor.x - this.position.x - size.width / 2, cursor.y - this.position.y - size.height / 2) < 650
        const follow = settings.followMouse && !lowPower && now - this.cursorMovedAt < 6500 && near
        const state = this.brain.tick(now, settings.autonomous && !lowPower, follow)
        if (state !== oldState) {
          notify = true
          this.target = null
          if (state === 'happy') this.bubble('happy')
        }
        if (state === 'follow') this.target = clampPosition({ x: cursor.x + 40, y: cursor.y - size.height * .45 }, size, this.areas())
        else if ((state === 'walk' || state === 'run') && !this.target) {
          const area = nearestArea(this.position, this.areas())
          this.target = clampPosition({ x: this.position.x + (Math.random() - .5) * area.width * .45,
            y: this.position.y + (Math.random() - .5) * 120 }, size, this.areas())
        }
        if (this.target && ['walk', 'run', 'follow'].includes(state)) {
          const next = approach(this.position, this.target, (state === 'run' ? 160 : state === 'follow' ? 145 : 55) * settings.moveSpeed * dt)
          if (Math.abs(next.x - this.position.x) > .2) {
            const facing = next.x > this.position.x ? 1 : -1
            if (facing !== this.behavior.facing) { this.behavior.facing = facing; notify = true }
          }
          this.position = clampPosition(next, size, this.areas())
          if (state !== 'follow' && Math.hypot(next.x - this.target.x, next.y - this.target.y) < 2) { this.brain.stopMovement(now); this.target = null; notify = true }
        }
      }
      this.behavior.state = this.brain.state
      const [x, y] = this.win.getPosition()
      if (Math.round(this.position.x) !== x || Math.round(this.position.y) !== y) this.win.setPosition(Math.round(this.position.x), Math.round(this.position.y), false)
      this.setIgnore(!this.dragOffset && !hitTestPet({ x: cursor.x - this.position.x, y: cursor.y - this.position.y }, settings.size, this.behavior.facing))
    }
    if (this.behavior.bubble && now > this.behavior.bubbleUntil) { this.behavior.bubble = ''; notify = true }
    if (now - this.lastSavedAt > 5000) {
      if (this.data.position?.x !== Math.round(this.position.x) || this.data.position?.y !== Math.round(this.position.y)) this.persist()
      this.lastSavedAt = now
    }
    if (notify) this.changed()
    const moving = !!this.dragOffset || ['walk', 'run', 'follow'].includes(this.brain.state)
    this.timer = setTimeout(this.tick, !settings.visible ? 1000 : moving && !lowPower ? 33 : lowPower ? 300 : 100)
  }
  snapshot(version: string, systemDark: boolean): Snapshot {
    return { settings: { ...this.data.settings }, pet: { ...this.data.pet }, behavior: { ...this.behavior },
      version, platform: process.platform, systemDark, notice: this.store.error, loginAvailable: loginAvailable() }
  }
  stop(): void {
    this.stopped = true
    if (this.timer) clearTimeout(this.timer)
    if (this.statsTimer) clearInterval(this.statsTimer)
    this.persist()
    this.store.flush()
  }
}
