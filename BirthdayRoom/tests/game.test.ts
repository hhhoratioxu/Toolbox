import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canSolve, nextPuzzle, useGame } from '../src/game/store';

vi.stubGlobal('document', { pointerLockElement: null });
beforeEach(() => useGame.getState().reset());
describe('treasure hunt state machine', () => {
  it('prevents skipping every prerequisite and the final reveal', () => {
    for (const id of ['drawer', 'plant', 'pillow', 'record'] as const)
      expect(useGame.getState().solve(id)).toBe(false);
    useGame.getState().takeKey();
    useGame.getState().startGift();
    expect(useGame.getState().hasKey).toBe(false);
    expect(useGame.getState().phase).toBe('explore');
    expect(useGame.getState().solved).toEqual([]);
  });
  it('counts each puzzle once and puts the key in the inventory', () => {
    const s = () => useGame.getState();
    expect(s().solve('books')).toBe(true);
    expect(s().solve('books')).toBe(false);
    expect(s().solved).toHaveLength(1);
    s().solve('drawer');
    s().solve('plant');
    s().takeKey();
    expect(s().hasKey).toBe(true);
    expect(s().solved).toHaveLength(4);
    expect(s().solve('record')).toBe(true);
    expect(s().recordPlaying).toBe(true);
    expect(s().solved).toHaveLength(5);
    expect(nextPuzzle(s().solved)).toBe('gift');
  });
  it('transitions through reveal, wish, celebration, greeting, replay and reset', () => {
    const s = () => useGame.getState();
    s().solve('books');
    s().solve('drawer');
    s().solve('plant');
    s().takeKey();
    s().solve('record');
    s().startGift();
    expect(s().phase).toBe('opening');
    s().blow();
    expect(s().phase).toBe('opening');
    s().setPhase('wish');
    s().blow();
    expect(s().phase).toBe('celebrating');
    s().finish();
    expect(s().phase).toBe('greeting');
    s().replay();
    expect(s().phase).toBe('opening');
    expect(s().solved).toHaveLength(5);
    s().reset();
    expect(s().phase).toBe('explore');
    expect(s().solved).toHaveLength(0);
    expect(s().hasKey).toBe(false);
    expect(s().entered).toBe(false);
  });
  it('unlocks only the next story station', () => {
    expect(nextPuzzle([])).toBe('books');
    expect(canSolve('drawer', [])).toBe(false);
    expect(canSolve('drawer', ['books'])).toBe(true);
  });
  it('repairs incomplete or out-of-order saved progress', () => {
    const merge = useGame.persist.getOptions().merge!;
    const repaired = merge(
      { solved: ['books', 'plant', 'record'], hasKey: true, phase: 'wish' },
      useGame.getState(),
    );
    expect(repaired.solved).toEqual(['books']);
    expect(repaired.hasKey).toBe(false);
    expect(repaired.phase).toBe('explore');
    expect(merge({ solved: 'corrupt' }, useGame.getState()).solved).toEqual([]);
  });
  it('restores an interrupted finale to a replayable completed greeting', () => {
    const merge = useGame.persist.getOptions().merge!;
    const restored = merge(
      { solved: ['books', 'drawer', 'plant', 'pillow', 'record'], hasKey: true, phase: 'opening' },
      useGame.getState(),
    );
    expect(restored.phase).toBe('greeting');
    expect(restored.solved).toHaveLength(5);
    expect(restored.hasKey).toBe(true);
  });
});
