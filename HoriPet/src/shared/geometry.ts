import type { Point, Rect } from './types'
import { clamp } from './settings'
export const VIEW = { width: 260, height: 290 }
export const petSize = (size: number) => ({ width: Math.round(size), height: Math.round(size * VIEW.height / VIEW.width) })
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
export function nearestArea(point: Point, areas: Rect[]): Rect {
  if (!areas.length) throw new Error('No displays available')
  return areas.reduce((best, area) => {
    const distance = (a: Rect) => dist(point, { x: clamp(point.x, a.x, a.x + a.width), y: clamp(point.y, a.y, a.y + a.height) })
    return distance(area) < distance(best) ? area : best
  })
}
export function clampPosition(point: Point, size: { width: number; height: number }, areas: Rect[]): Point {
  const area = nearestArea({ x: point.x + size.width / 2, y: point.y + size.height / 2 }, areas)
  return { x: Math.round(clamp(point.x, area.x, area.x + Math.max(0, area.width - size.width))),
    y: Math.round(clamp(point.y, area.y, area.y + Math.max(0, area.height - size.height))) }
}
export function approach(from: Point, to: Point, maxDistance: number): Point {
  const length = dist(from, to)
  if (!length || length <= maxDistance) return { ...to }
  return { x: from.x + (to.x - from.x) / length * maxDistance, y: from.y + (to.y - from.y) / length * maxDistance }
}
const ellipse = (p: Point, x: number, y: number, rx: number, ry: number) => ((p.x - x) / rx) ** 2 + ((p.y - y) / ry) ** 2 <= 1
function polygon(p: Point, points: Point[]): boolean {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]!, b = points[j]!
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
/** Conservative silhouette of Cat.tsx, in viewBox coordinates. Decorative bubbles pass through. */
export function hitTestPet(local: Point, size: number, facing: -1 | 1 = 1): boolean {
  const scale = size / VIEW.width
  const p = { x: facing === 1 ? local.x / scale : VIEW.width - local.x / scale, y: local.y / scale }
  return ellipse(p, 128, 150, 76, 60) || ellipse(p, 128, 220, 55, 47)
    || ellipse(p, 96, 262, 26, 12) || ellipse(p, 157, 262, 26, 12)
    || polygon(p, [{ x: 58, y: 132 }, { x: 62, y: 65 }, { x: 104, y: 103 }])
    || polygon(p, [{ x: 150, y: 103 }, { x: 190, y: 65 }, { x: 198, y: 132 }])
    || ellipse(p, 200, 225, 26, 17)
}
