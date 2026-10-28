import { describe, expect, it } from 'vitest'
import { agePet, decodeSave, freshData, validatePatch } from '../src/shared/settings'
describe('Settings boundary and offline care', () => {
  const invalid: unknown[] = [{ size: 159 }, { size: Infinity }, { animationSpeed: NaN }, { visible: 'false' }, { locale: 'xx' }, { theme: 'other' }, { name: '  ' }, { name: 'x'.repeat(25) }, { name: '\u0000' }, { apiKey: 'secret' }, { __proto__: null, constructor: 'bad' }]
  for (const [index, patch] of invalid.entries()) it(`rejects invalid or unknown renderer input ${index + 1}`, () => {
    expect(() => validatePatch(patch)).toThrow()
  })
  it('normalizes names and accepts bounded immediate preferences', () => {
    expect(validatePatch({ name: '  团子  ', size: 250, theme: 'dark' })).toEqual({ name: '团子', size: 250, theme: 'dark' })
  })
  it('recovers valid fields without trusting malformed saved values', () => {
    const decoded = decodeSave({ version: 1, settings: { size: -10, locale: 'en', sound: true }, pet: { mood: 300, hunger: NaN, updatedAt: 9000 }, position: { x: Infinity, y: 0 } }, 1000)
    expect(decoded.settings.size).toBe(240)
    expect(decoded.settings.locale).toBe('en')
    expect(decoded.settings.sound).toBe(true)
    expect(decoded.pet.mood).toBe(100)
    expect(decoded.pet.updatedAt).toBe(1000)
    expect(decoded.position).toBeNull()
  })
  it('does not punish long absences indefinitely or reverse time', () => {
    const pet = freshData(1000).pet
    expect(agePet(pet, -1, false).hunger).toBe(pet.hunger)
    expect(agePet(pet, 1000 + 30 * 86400000, false).hunger).toBe(100)
    expect(agePet(pet, 1000 + 3600000, true).mood).toBe(84)
  })
  it('ignores incompatible formats and uses a complete fresh schema', () => {
    expect(decodeSave({ version: 99, settings: { visible: false } }, 10)).toEqual(freshData(10))
  })
})
