import type { PetState } from '../../shared/types'

const duration: Record<PetState, number> = {
  idle: 0, walk: 4200, run: 2600, sleep: 26000, wake: 650,
  happy: 2400, touch: 1500, drag: Infinity, eat: 3200, follow: 0
}
const mobile = new Set<PetState>(['idle', 'walk', 'run', 'follow'])

/** One authoritative state, one deadline. Drag > direct interaction > follow > autonomy. */
export class PetMachine {
  state: PetState = 'idle'
  until = 0
  nextDecision: number
  private queued: PetState | null = null
  private manualSleep = false
  constructor(private random: () => number = Math.random, now = Date.now()) {
    this.nextDecision = now + 12000
  }
  private enter(state: PetState, now: number, time = duration[state]): void {
    this.state = state
    this.until = time ? now + time : 0
    this.nextDecision = now + 10000 + this.random() * 16000
  }
  interact(state: 'touch' | 'happy' | 'eat' | 'sleep' | 'wake', now: number): void {
    if (this.state === 'drag') return
    if (state === 'sleep') {
      this.manualSleep = true
      this.queued = null
      this.enter('sleep', now, Infinity)
    } else if (this.state === 'sleep' && state !== 'wake') {
      this.manualSleep = false
      this.queued = state
      this.enter('wake', now)
    } else {
      this.manualSleep = false
      this.queued = null
      this.enter(state, now)
    }
  }
  startDrag(now: number): void {
    this.manualSleep = false
    this.queued = null
    this.enter('drag', now)
  }
  endDrag(now: number): void {
    if (this.state === 'drag') this.enter('happy', now, 900)
  }
  stopMovement(now: number): void {
    if (['walk', 'run', 'follow'].includes(this.state)) this.enter('idle', now)
  }
  tick(now: number, autonomous: boolean, follow: boolean): PetState {
    if (this.state === 'drag') return this.state
    if (this.until && now >= this.until) {
      if (this.state === 'sleep' && !this.manualSleep) this.enter('wake', now)
      else {
        const next = this.queued ?? 'idle'
        this.queued = null
        this.enter(next, now)
      }
    }
    if (follow && mobile.has(this.state)) {
      if (this.state !== 'follow') this.enter('follow', now)
    } else if (this.state === 'follow') this.enter('idle', now)
    if (!autonomous && (this.state === 'walk' || this.state === 'run')) this.enter('idle', now)
    if (autonomous && !follow && this.state === 'idle' && now >= this.nextDecision) {
      const choice = this.random()
      this.enter(choice < .3 ? 'walk' : choice < .4 ? 'run' : choice < .49 ? 'sleep' : choice < .66 ? 'happy' : 'idle', now)
    }
    return this.state
  }
}
