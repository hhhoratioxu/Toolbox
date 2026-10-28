import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { birthday } from '../config/birthday';
import type { CameraBookmark, Dialog, ObjectId, Phase, PuzzleId } from './types';

interface GameState {
  solved: PuzzleId[];
  hasKey: boolean;
  recordPlaying: boolean;
  phase: Phase;
  entered: boolean;
  music: boolean;
  night: boolean;
  dialog: Dialog;
  active: ObjectId | null;
  hovered: ObjectId | null;
  focus: ObjectId | null;
  ready: boolean;
  locked: boolean;
  bookmark: CameraBookmark | null;
  lastBlessing: PuzzleId | null;
  toast: string;
  quality: 'auto' | 'high' | 'low';
  enter: () => void;
  interact: (id: ObjectId) => void;
  close: () => void;
  solve: (id: PuzzleId) => boolean;
  takeKey: () => void;
  startGift: () => void;
  blow: () => void;
  finish: () => void;
  setPhase: (phase: Phase) => void;
  setActive: (id: ObjectId | null) => void;
  setHovered: (id: ObjectId | null) => void;
  setReady: () => void;
  setLocked: (v: boolean) => void;
  open: (dialog: Dialog) => void;
  toggleMusic: () => void;
  toggleNight: () => void;
  setBookmark: (v: CameraBookmark | null) => void;
  setQuality: (v: GameState['quality']) => void;
  replay: () => void;
  reset: () => void;
  notify: (message: string) => void;
}
const puzzleOrder: PuzzleId[] = ['books', 'drawer', 'plant', 'pillow', 'record'];
const noStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      solved: [],
      hasKey: false,
      recordPlaying: false,
      phase: 'explore',
      entered: false,
      music: true,
      night: false,
      dialog: null,
      active: null,
      hovered: null,
      focus: null,
      ready: false,
      locked: false,
      bookmark: null,
      lastBlessing: null,
      toast: '',
      quality: 'auto',
      enter: () =>
        set((s) => ({ entered: true, dialog: null, phase: s.phase === 'greeting' ? 'greeting' : s.phase })),
      interact: (id) => {
        const s = get();
        if (!s.entered || s.phase !== 'explore' || s.dialog) return;
        if (id === 'gift' && s.solved.length < 5) {
          set({ toast: birthday.notes.locked });
          return;
        }
        if (document.pointerLockElement) document.exitPointerLock();
        set({
          dialog: id,
          focus: id,
          lastBlessing: s.solved.includes(id as PuzzleId) ? (id as PuzzleId) : null,
        });
      },
      close: () => set({ dialog: null, focus: null, lastBlessing: null }),
      solve: (id) => {
        const s = get();
        if (s.solved.includes(id)) {
          set({ lastBlessing: id });
          return false;
        }
        const index = puzzleOrder.indexOf(id);
        if (index > 0 && !s.solved.includes(puzzleOrder[index - 1])) return false;
        if (id === 'record' && !s.hasKey) return false;
        set({
          solved: [...s.solved, id],
          lastBlessing: id,
          ...(id === 'record' ? { recordPlaying: true } : {}),
        });
        return true;
      },
      takeKey: () => {
        if (!get().solved.includes('plant')) return;
        set({ hasKey: true });
        get().solve('pillow');
      },
      startGift: () => {
        if (get().solved.length < 5 || !get().hasKey) return;
        if (document.pointerLockElement) document.exitPointerLock();
        set({ phase: 'opening', dialog: null, focus: 'gift', night: birthday.enableDayNight });
      },
      blow: () => {
        if (get().phase === 'wish') set({ phase: 'celebrating' });
      },
      finish: () => {
        if (get().phase === 'celebrating') set({ phase: 'greeting' });
      },
      setPhase: (phase) => set({ phase }),
      setActive: (active) => {
        if (get().active !== active) set({ active });
      },
      setHovered: (hovered) => {
        if (get().hovered !== hovered) set({ hovered });
      },
      setReady: () => set({ ready: true }),
      setLocked: (locked) => set({ locked }),
      open: (dialog) => {
        if (document.pointerLockElement) document.exitPointerLock();
        set({ dialog });
      },
      toggleMusic: () => set((s) => ({ music: !s.music })),
      toggleNight: () => {
        if (birthday.enableDayNight && get().phase === 'explore') set((s) => ({ night: !s.night }));
      },
      setBookmark: (bookmark) => set({ bookmark }),
      setQuality: (quality) => set({ quality }),
      replay: () =>
        set({ phase: 'opening', dialog: null, focus: 'gift', night: birthday.enableDayNight, entered: true }),
      reset: () =>
        set({
          solved: [],
          hasKey: false,
          recordPlaying: false,
          phase: 'explore',
          entered: false,
          night: false,
          dialog: null,
          focus: null,
          active: null,
          hovered: null,
          bookmark: null,
          lastBlessing: null,
          toast: '',
        }),
      notify: (toast) => set({ toast }),
    }),
    {
      name: 'birthday-room-v1',
      version: 1,
      storage: createJSONStorage(() =>
        birthday.saveProgress && typeof window !== 'undefined' ? localStorage : noStorage,
      ),
      partialize: (s) => ({
        solved: s.solved,
        hasKey: s.hasKey,
        recordPlaying: s.recordPlaying,
        phase: s.phase,
        music: s.music,
        night: s.night,
        quality: s.quality,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<GameState>;
        // Accept only a valid sequential prefix; tolerate edited or old browser data.
        const solved: PuzzleId[] = [];
        for (const id of puzzleOrder) {
          if (Array.isArray(p.solved) && p.solved.includes(id)) solved.push(id);
          else break;
        }
        const complete = solved.length === 5 && p.hasKey === true;
        const phase: Phase = complete && p.phase !== 'explore' ? 'greeting' : 'explore';
        return {
          ...current,
          solved,
          hasKey: solved.includes('pillow'),
          recordPlaying: solved.includes('record'),
          phase,
          music: typeof p.music === 'boolean' ? p.music : true,
          night: birthday.enableDayNight && !!p.night,
          quality: p.quality === 'high' || p.quality === 'low' ? p.quality : 'auto',
        };
      },
    },
  ),
);

export function nextPuzzle(solved: readonly PuzzleId[]): PuzzleId | 'gift' {
  return puzzleOrder.find((id) => !solved.includes(id)) ?? 'gift';
}
export function canSolve(id: PuzzleId, solved: readonly PuzzleId[]): boolean {
  const index = puzzleOrder.indexOf(id);
  return index === 0 || solved.includes(puzzleOrder[index - 1]);
}
