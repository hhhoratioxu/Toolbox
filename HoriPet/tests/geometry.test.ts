import { describe, expect, it } from 'vitest'
import { approach, clampPosition, hitTestPet, petSize } from '../src/shared/geometry'
import type { Rect } from '../src/shared/types'
const displays: Rect[] = [{ x: 0, y: 30, width: 1440, height: 830 }, { x: -1920, y: -200, width: 1920, height: 1080 }]
describe('Recoverable desktop positions in device-independent pixels', () => {
  it.each([{ x: 99999, y: 99999 }, { x: -90000, y: -90000 }, { x: 0, y: 0 }, { x: -100, y: 700 }, { x: 1420, y: 800 }])('keeps the entire window in a connected work area: %j', point => {
    const size = petSize(240), safe = clampPosition(point, size, displays)
    expect(displays.some(d => safe.x >= d.x && safe.y >= d.y && safe.x + size.width <= d.x + d.width && safe.y + size.height <= d.y + d.height)).toBe(true)
  })
  it('recovers a saved position after unplugging its monitor', () => {
    expect(clampPosition({ x: -1800, y: 100 }, petSize(240), [displays[0]!])).toEqual({ x: 0, y: 100 })
  })
  it('clamps disconnected gaps to a display and supports a scaled portrait monitor', () => {
    const p = clampPosition({ x: 1400, y: 400 }, petSize(340), [{ x: 0, y: 0, width: 1200, height: 800 }, { x: 2000, y: -500, width: 900, height: 1440 }])
    expect(p).toEqual({ x: 860, y: 400 })
  })
  it('never overshoots a motion target', () => {
    expect(approach({ x: 0, y: 0 }, { x: 3, y: 4 }, 2.5)).toEqual({ x: 1.5, y: 2 })
    expect(approach({ x: 0, y: 0 }, { x: 3, y: 4 }, 8)).toEqual({ x: 3, y: 4 })
  })
  it.each([160, 240, 340])('scales the interaction silhouette at size %s', size => {
    const k = size / 260
    expect(hitTestPet({ x: 128 * k, y: 153 * k }, size)).toBe(true)
    expect(hitTestPet({ x: 64 * k, y: 90 * k }, size)).toBe(true)
    expect(hitTestPet({ x: 10 * k, y: 15 * k }, size)).toBe(false)
    expect(hitTestPet({ x: 240 * k, y: 280 * k }, size)).toBe(false)
    expect(hitTestPet({ x: 196 * k, y: 90 * k }, size, -1)).toBe(true)
  })
})
