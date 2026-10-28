import { create } from 'zustand'
import type { Action, Settings, Snapshot } from '../shared/types'
interface UIStore {
  snapshot: Snapshot | null
  error: string
  receive(snapshot: Snapshot): void
  update(patch: Partial<Settings>): Promise<void>
  act(action: Action): Promise<void>
  clearError(): void
}
export const useCompanion = create<UIStore>((set, get) => ({
  snapshot: null, error: '',
  receive: snapshot => set({ snapshot }),
  clearError: () => set({ error: '' }),
  async update(patch) {
    try { const snapshot = await window.horipet.updateSettings(patch); set({ snapshot, error: '' }) }
    catch (e) { set({ error: e instanceof Error ? e.message.replace(/^Error invoking remote method '[^']+': Error: /, '') : String(e) }) }
  },
  async act(action) {
    try {
      await window.horipet.action(action)
      if (get().snapshot?.settings.sound && ['pet', 'feed', 'celebrate'].includes(action)) chime(action === 'feed' ? 620 : 820)
      set({ error: '' })
    } catch (e) { set({ error: String(e) }) }
  }
}))
function chime(frequency: number) {
  const context = new AudioContext()
  const oscillator = context.createOscillator(), gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, context.currentTime + .12)
  gain.gain.setValueAtTime(0, context.currentTime)
  gain.gain.linearRampToValueAtTime(.045, context.currentTime + .018)
  gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .26)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + .28)
  oscillator.onended = () => { void context.close() }
}
