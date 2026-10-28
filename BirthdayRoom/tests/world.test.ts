import { describe, expect, it } from 'vitest';
import {
  EYE_HEIGHT,
  ROOM,
  START,
  interactables,
  isWalkable,
  moveWithCollision,
  obstacles,
} from '../src/game/world';
import { findPath } from '../src/game/navigation';

describe('room collision and routes', () => {
  it('starts at a walkable human eye height', () => {
    expect(START[1]).toBe(EYE_HEIGHT);
    expect(isWalkable(START[0], START[2])).toBe(true);
  });
  it.each(obstacles)('blocks the interior of $name', ({ x, z }) => {
    expect(isWalkable(x, z)).toBe(false);
  });
  it('stops at every wall even under a huge movement step', () => {
    for (const [dx, dz] of [
      [100, 0],
      [-100, 0],
      [0, 100],
      [0, -100],
    ]) {
      const [x, z] = moveWithCollision(START[0], START[2], dx, dz);
      expect(isWalkable(x, z)).toBe(true);
      expect(x).toBeGreaterThan(ROOM.minX);
      expect(x).toBeLessThan(ROOM.maxX);
      expect(z).toBeGreaterThan(ROOM.minZ);
      expect(z).toBeLessThan(ROOM.maxZ);
    }
  });
  it('cannot tunnel through the coffee table', () => {
    const [x, z] = moveWithCollision(-0.3, 2.5, 0, -4);
    expect(z).toBeGreaterThan(1.2);
    expect(isWalkable(x, z)).toBe(true);
  });
  it('permits sliding along an obstacle', () => {
    const [x, z] = moveWithCollision(-0.3, 1.38, 0.5, -0.5);
    expect(x).toBeGreaterThan(0);
    expect(z).toBeGreaterThan(1.2);
  });
  it.each(interactables)('can guide visitors to $id without crossing a collider', (o) => {
    expect(isWalkable(o.focus[0], o.focus[2])).toBe(true);
    const path = findPath([START[0], START[2]], [o.focus[0], o.focus[2]]);
    expect(path.length).toBeGreaterThan(0);
    for (const [x, z] of path) expect(isWalkable(x, z)).toBe(true);
    let current: [number, number] = [START[0], START[2]];
    for (const point of path) {
      current = moveWithCollision(current[0], current[1], point[0] - current[0], point[1] - current[1]);
      expect(current[0]).toBeCloseTo(point[0], 1);
      expect(current[1]).toBeCloseTo(point[1], 1);
    }
  });
  it('keeps 3000 seeded random movements within free room space', () => {
    let x = START[0],
      z = START[2],
      seed = 321;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 3000; i++) {
      [x, z] = moveWithCollision(x, z, (rand() - 0.5) * 2, (rand() - 0.5) * 2);
      expect(isWalkable(x, z)).toBe(true);
    }
  });
});
