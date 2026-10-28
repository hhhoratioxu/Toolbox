import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LocalStore } from '../src/main/persistence'
import { freshData } from '../src/shared/settings'
const folders: string[] = []
function store() { const dir = mkdtempSync(join(tmpdir(), 'horipet-test-')); folders.push(dir); return new LocalStore(join(dir, 'companion.json')) }
afterEach(() => { vi.useRealTimers(); for (const dir of folders.splice(0)) rmSync(dir, { recursive: true, force: true }) })
describe('Crash-resistant local persistence', () => {
  it('round trips preferences, statistics and a negative-monitor position', () => {
    const s = store(), data = freshData()
    data.settings.name = '团子'; data.settings.theme = 'dark'; data.position = { x: -400, y: 50 }
    s.schedule(data); s.flush()
    expect(s.load()).toEqual(data)
  })
  it('coalesces writes and retains the last complete save', () => {
    vi.useFakeTimers()
    const s = store(), data = freshData()
    s.schedule(data); data.settings.name = 'Second'; s.schedule(data)
    vi.advanceTimersByTime(701)
    expect(JSON.parse(readFileSync(s.path, 'utf8')).settings.name).toBe('Second')
  })
  it('recovers from a corrupt primary using the previous complete backup', () => {
    const s = store(), data = freshData()
    s.schedule(data); s.flush()
    data.settings.name = 'Second'; s.schedule(data); s.flush()
    writeFileSync(s.path, '{unfinished')
    expect(s.load().settings.name).toBe('Mochi')
    expect(s.error).toContain('backup')
    s.schedule(data); s.flush()
    expect(JSON.parse(readFileSync(`${s.path}.bak`, 'utf8')).settings.name).toBe('Mochi')
  })
  it('can quit immediately without losing a pending edit', () => {
    const s = store(), data = freshData()
    data.settings.size = 320; s.schedule(data); s.flush()
    expect(new LocalStore(s.path).load().settings.size).toBe(320)
  })
})
