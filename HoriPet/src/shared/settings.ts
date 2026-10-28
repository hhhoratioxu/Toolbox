import type { SaveData, Settings, PetData } from './types'
export const DEFAULT_SETTINGS: Settings = {
  name: 'Mochi', visible: true, size: 240, animationSpeed: 1, moveSpeed: 1,
  autonomous: true, followMouse: false, alwaysOnTop: true, launchAtLogin: false,
  sound: false, theme: 'system', locale: 'zh-CN', skin: 'snow'
}
const ranges = { size: [160, 340], animationSpeed: [0.5, 2], moveSpeed: [0.4, 2] } as const
const enums = { theme: ['system', 'light', 'dark'], locale: ['zh-CN', 'en'], skin: ['snow', 'peach', 'storm'] }
export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

/** The main process validates again; renderer values are never trusted. */
export function validatePatch(input: unknown): Partial<Settings> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid settings')
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!Object.hasOwn(DEFAULT_SETTINGS, key)) throw new Error(`Unknown setting: ${key}`)
    if (key === 'name') {
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 24 || /[\x00-\x1f]/.test(value)) throw new Error('Name must contain 1–24 visible characters')
      result[key] = value.trim()
    } else if (key in ranges) {
      const [min, max] = ranges[key as keyof typeof ranges]
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}`)
      result[key] = key === 'size' ? Math.round(value) : value
    } else if (key in enums) {
      if (typeof value !== 'string' || !(enums[key as keyof typeof enums] as string[]).includes(value)) throw new Error(`Invalid ${key}`)
      result[key] = value
    } else {
      if (typeof value !== 'boolean') throw new Error(`Invalid ${key}`)
      result[key] = value
    }
  }
  return result as Partial<Settings>
}
export function freshData(now = Date.now()): SaveData {
  return { version: 1, settings: { ...DEFAULT_SETTINGS }, pet: { mood: 82, hunger: 24, bond: 12, updatedAt: now }, position: null }
}
export function decodeSave(input: unknown, now = Date.now()): SaveData {
  const data = freshData(now)
  if (!input || typeof input !== 'object') return data
  const value = input as Record<string, unknown>
  if (value.version !== 1) return data
  if (value.settings && typeof value.settings === 'object') {
    for (const [key, val] of Object.entries(value.settings)) {
      try { Object.assign(data.settings, validatePatch({ [key]: val })) } catch { /* Recover valid fields individually. */ }
    }
  }
  if (value.pet && typeof value.pet === 'object') {
    const pet = value.pet as Record<string, unknown>
    for (const key of ['mood', 'hunger', 'bond'] as const) {
      if (typeof pet[key] === 'number' && Number.isFinite(pet[key])) data.pet[key] = clamp(pet[key], 0, 100)
    }
    if (typeof pet.updatedAt === 'number' && Number.isFinite(pet.updatedAt)) data.pet.updatedAt = clamp(pet.updatedAt, 0, now)
  }
  if (value.position && typeof value.position === 'object') {
    const p = value.position as Record<string, unknown>
    if (typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)) data.position = { x: Math.round(p.x), y: Math.round(p.y) }
  }
  return data
}
export function agePet(pet: PetData, now: number, sleeping: boolean): PetData {
  const hours = clamp((now - pet.updatedAt) / 3_600_000, 0, 24)
  return { ...pet, hunger: clamp(pet.hunger + hours * 4, 0, 100),
    mood: clamp(pet.mood + hours * (sleeping ? 2 : -1.5), 0, 100), updatedAt: now }
}
