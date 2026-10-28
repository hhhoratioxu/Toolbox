export const STATES = ['idle', 'walk', 'run', 'sleep', 'wake', 'happy', 'touch', 'drag', 'eat', 'follow'] as const
export type PetState = typeof STATES[number]
export type Locale = 'zh-CN' | 'en'
export type Skin = 'snow' | 'peach' | 'storm'
export interface Point { x: number; y: number }
export interface Rect extends Point { width: number; height: number }
export interface Settings {
  name: string
  visible: boolean
  size: number
  animationSpeed: number
  moveSpeed: number
  autonomous: boolean
  followMouse: boolean
  alwaysOnTop: boolean
  launchAtLogin: boolean
  sound: boolean
  theme: 'system' | 'light' | 'dark'
  locale: Locale
  skin: Skin
}
export interface PetData { mood: number; hunger: number; bond: number; updatedAt: number }
export interface SaveData { version: 1; settings: Settings; pet: PetData; position: Point | null }
export interface Behavior { state: PetState; facing: -1 | 1; bubble: string; bubbleUntil: number; lowPower: boolean }
export interface Snapshot {
  settings: Settings
  pet: PetData
  behavior: Behavior
  platform: string
  version: string
  notice: string
  systemDark: boolean
  loginAvailable: boolean
}
export type Action = 'feed' | 'pet' | 'sleep' | 'wake' | 'celebrate' | 'reset-position' | 'show' | 'hide'
export interface DesktopAPI {
  getSnapshot(): Promise<Snapshot>
  updateSettings(patch: Partial<Settings>): Promise<Snapshot>
  action(action: Action): Promise<void>
  drag(phase: 'start' | 'end'): void
  openSettings(): void
  closeSettings(): void
  menu(): void
  quit(): void
  onSnapshot(callback: (snapshot: Snapshot) => void): () => void
}
export const IPC = {
  snapshot: 'horipet:snapshot', update: 'horipet:update', action: 'horipet:action',
  drag: 'horipet:drag', settings: 'horipet:settings', close: 'horipet:close',
  menu: 'horipet:menu', quit: 'horipet:quit', changed: 'horipet:changed'
} as const
