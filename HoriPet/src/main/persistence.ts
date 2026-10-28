import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync, copyFileSync, openSync, fsyncSync, closeSync } from 'node:fs'
import { dirname } from 'node:path'
import { decodeSave, freshData } from '../shared/settings'
import type { SaveData } from '../shared/types'

/** Atomic replacement, fsync, backup recovery and no renderer-controlled filesystem paths. */
export class LocalStore {
  private pending: ReturnType<typeof setTimeout> | undefined
  private latest: SaveData | undefined
  error = ''
  constructor(readonly path: string) {}
  load(): SaveData {
    for (const candidate of [this.path, `${this.path}.bak`]) {
      if (!existsSync(candidate)) continue
      try {
        const parsed: unknown = JSON.parse(readFileSync(candidate, 'utf8'))
        if (!parsed || typeof parsed !== 'object' || (parsed as {version?: unknown}).version !== 1) throw new Error('Unsupported save format')
        const data = decodeSave(parsed)
        if (candidate.endsWith('.bak')) this.error = 'Recovered local backup / 已恢复本地备份'
        return data
      } catch { this.error = 'Local data was damaged; recovered available fields / 本地数据异常，已尝试恢复' }
    }
    return freshData()
  }
  schedule(data: SaveData): void {
    this.latest = structuredClone(data)
    if (this.pending) clearTimeout(this.pending)
    this.pending = setTimeout(() => this.flush(), 700)
  }
  flush(): void {
    if (this.pending) clearTimeout(this.pending)
    this.pending = undefined
    if (!this.latest) return
    try {
      mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 })
      const temp = `${this.path}.tmp`
      writeFileSync(temp, JSON.stringify(this.latest, null, 2), { mode: 0o600 })
      // FlushFileBuffers on Windows requires a writable handle.
      const fd = openSync(temp, 'r+')
      try { fsyncSync(fd) } finally { closeSync(fd) }
      // Only rotate a parseable backup: a corrupt primary must not replace a good backup.
      if (existsSync(this.path)) {
        try { JSON.parse(readFileSync(this.path, 'utf8')); copyFileSync(this.path, `${this.path}.bak`) } catch { /* retain backup */ }
      }
      renameSync(temp, this.path)
      this.latest = undefined
    } catch (error) {
      this.error = `Could not save local data / 无法保存本地数据: ${error instanceof Error ? error.message : 'unknown error'}`
      console.error(this.error)
    }
  }
}
