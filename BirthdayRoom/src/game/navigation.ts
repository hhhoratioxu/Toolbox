import { isWalkable } from './world';

/** A small room grid, used only when a visitor asks for a guided walk. */
export function findPath(from: [number, number], to: [number, number]): [number, number][] {
  const step = 0.25,
    key = (x: number, z: number) => `${x},${z}`;
  const start = [Math.round(from[0] / step), Math.round(from[1] / step)];
  const end = [Math.round(to[0] / step), Math.round(to[1] / step)];
  const queue = [start],
    visited = new Set([key(...(start as [number, number]))]);
  const previous = new Map<string, number[]>();
  let found: number[] | null = null;
  for (let index = 0; index < queue.length && index < 3000; index++) {
    const current = queue[index];
    if (Math.hypot((current[0] - end[0]) * step, (current[1] - end[1]) * step) < 0.2) {
      found = current;
      break;
    }
    for (const [dx, dz] of [
      [0, 1],
      [1, 0],
      [-1, 0],
      [0, -1],
    ]) {
      const x = current[0] + dx,
        z = current[1] + dz,
        k = key(x, z);
      if (visited.has(k) || !isWalkable(x * step, z * step)) continue;
      visited.add(k);
      previous.set(k, current);
      queue.push([x, z]);
    }
  }
  if (!found) return [];
  const result: [number, number][] = [];
  let current: number[] | undefined = found;
  while (current && key(current[0], current[1]) !== key(start[0], start[1])) {
    result.unshift([current[0] * step, current[1] * step]);
    current = previous.get(key(current[0], current[1]));
  }
  result.push(to);
  return result;
}
