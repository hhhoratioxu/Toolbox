import { describe, expect, it } from 'vitest'
import { PetMachine } from '../src/main/behavior/machine'
import { STATES } from '../src/shared/types'
describe('Authoritative pet state machine', () => {
  it('gives dragging priority over follow, sleep, food and autonomous deadlines', () => {
    const m = new PetMachine(() => .1, 0)
    m.startDrag(1)
    m.interact('eat', 2)
    m.interact('sleep', 3)
    expect(m.tick(999999, true, true)).toBe('drag')
    m.endDrag(1000000)
    expect(m.state).toBe('happy')
    expect(m.tick(1001000, false, false)).toBe('idle')
  })
  it('wakes before accepting a treat, then returns to idle', () => {
    const m = new PetMachine(() => .5, 0)
    m.interact('sleep', 1)
    expect(m.tick(500000, true, true)).toBe('sleep')
    m.interact('eat', 500001)
    expect(m.state).toBe('wake')
    expect(m.tick(500652, true, true)).toBe('eat')
    expect(m.tick(503853, false, false)).toBe('idle')
  })
  it('respects direct interaction during follow and stops following after the cursor leaves', () => {
    const m = new PetMachine(() => .5, 0)
    expect(m.tick(1, false, true)).toBe('follow')
    m.interact('touch', 2)
    expect(m.tick(5, true, true)).toBe('touch')
    expect(m.tick(1600, false, true)).toBe('follow')
    expect(m.tick(1700, false, false)).toBe('idle')
  })
  it.each([[.1, 'walk'], [.35, 'run'], [.45, 'sleep'], [.6, 'happy'], [.9, 'idle']] as const)('selects autonomous activity %s → %s', (random, expected) => {
    const m = new PetMachine(() => random, 0)
    expect(m.tick(12001, true, false)).toBe(expected)
  })
  it('pausing cancels movement and future autonomous decisions', () => {
    const m = new PetMachine(() => .1, 0)
    m.tick(12001, true, false)
    expect(m.tick(12005, false, false)).toBe('idle')
    expect(m.tick(100000, false, false)).toBe('idle')
  })
  it('automatically wakes from an autonomous nap', () => {
    const m = new PetMachine(() => .45, 0)
    m.tick(12001, true, false)
    expect(m.tick(38002, true, false)).toBe('wake')
    expect(m.tick(38653, true, false)).toBe('idle')
  })
  it('holds exactly one valid state through repeated conflicting events', () => {
    const m = new PetMachine(() => .35, 0)
    for (let n = 1; n < 1000; n++) {
      if (n % 17 === 0) m.startDrag(n * 100)
      if (n % 19 === 0) m.endDrag(n * 100)
      if (n % 7 === 0) m.interact('eat', n * 100)
      expect(STATES).toContain(m.tick(n * 100, n % 2 === 0, n % 3 === 0))
    }
  })
})
