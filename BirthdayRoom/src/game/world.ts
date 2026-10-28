import type { ObjectId, Vec3 } from './types';

export interface InteractableDefinition {
  id: ObjectId;
  name: string;
  position: Vec3;
  focus: Vec3;
  lookAt: Vec3;
  range: number;
}
export const interactables: InteractableDefinition[] = [
  {
    id: 'books',
    name: '书架上的三本书',
    position: [-4.3, 1.65, -2.45],
    focus: [-2.7, 1.65, -1.25],
    lookAt: [-4.3, 1.6, -2.45],
    range: 2.7,
  },
  {
    id: 'drawer',
    name: '窗边的抽屉',
    position: [2.65, 0.8, -3.55],
    focus: [2.55, 1.5, -1.9],
    lookAt: [2.65, 0.8, -3.55],
    range: 2.5,
  },
  {
    id: 'plant',
    name: '窗台上的小绿芽',
    position: [1.4, 1.75, -3.78],
    focus: [1.4, 1.65, -2.15],
    lookAt: [1.4, 1.9, -3.78],
    range: 2.5,
  },
  {
    id: 'pillow',
    name: '沙发上的抱枕',
    position: [-1.65, 0.95, -2.8],
    focus: [-1.65, 1.6, -1.35],
    lookAt: [-1.65, 1.0, -2.8],
    range: 2.5,
  },
  {
    id: 'record',
    name: '黑胶唱片机',
    position: [4.2, 1.05, -0.5],
    focus: [2.5, 1.6, -0.1],
    lookAt: [4.2, 1.05, -0.5],
    range: 2.6,
  },
  {
    id: 'gift',
    name: '给你的生日礼物',
    position: [-0.3, 1.0, 0.05],
    focus: [0.2, 1.65, 2.35],
    lookAt: [-0.3, 1.05, 0.05],
    range: 2.6,
  },
  {
    id: 'clock',
    name: '停在 4:20 的时钟',
    position: [-0.2, 3.0, -4.08],
    focus: [0, 1.7, -1.6],
    lookAt: [-0.2, 3, -4.08],
    range: 3.3,
  },
];
export const objectById = Object.fromEntries(interactables.map((o) => [o.id, o])) as Record<
  ObjectId,
  InteractableDefinition
>;
export interface Obstacle {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
  name: string;
}
export const obstacles: Obstacle[] = [
  { x: -1.9, z: -3.08, halfX: 1.84, halfZ: 0.74, name: 'sofa' },
  { x: -4.57, z: -2.1, halfX: 0.4, halfZ: 1.5, name: 'bookshelf' },
  { x: 2.8, z: -3.58, halfX: 1.14, halfZ: 0.5, name: 'drawer' },
  { x: 4.18, z: -0.55, halfX: 0.58, halfZ: 0.94, name: 'record console' },
  { x: -0.3, z: 0.05, halfX: 1.04, halfZ: 1.04, name: 'coffee table' },
  { x: 2.8, z: 2.0, halfX: 0.65, halfZ: 0.7, name: 'chair' },
  { x: -4.15, z: 1.6, halfX: 0.42, halfZ: 0.42, name: 'plant' },
  { x: 0.62, z: -3.7, halfX: 0.35, halfZ: 0.35, name: 'floor lamp' },
  { x: -3.96, z: -0.23, halfX: 0.38, halfZ: 0.38, name: 'side table' },
  { x: -3.8, z: 3.1, halfX: 0.44, halfZ: 0.44, name: 'basket' },
  { x: 3.95, z: 3.25, halfX: 0.45, halfZ: 0.45, name: 'plant stand' },
];
export const PLAYER_RADIUS = 0.25;
export const EYE_HEIGHT = 1.62;
export const ROOM = { minX: -4.82, maxX: 4.82, minZ: -3.97, maxZ: 3.97 };
export const START: Vec3 = [0.6, EYE_HEIGHT, 3.2];

export function isWalkable(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  if (x - radius < ROOM.minX || x + radius > ROOM.maxX || z - radius < ROOM.minZ || z + radius > ROOM.maxZ)
    return false;
  return !obstacles.some(
    (o) =>
      x + radius > o.x - o.halfX &&
      x - radius < o.x + o.halfX &&
      z + radius > o.z - o.halfZ &&
      z - radius < o.z + o.halfZ,
  );
}
/** Substeps prevent tunnelling on a slow frame; axis resolution permits sliding. */
export function moveWithCollision(x: number, z: number, dx: number, dz: number): [number, number] {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.09));
  for (let i = 0; i < steps; i++) {
    if (isWalkable(x + dx / steps, z)) x += dx / steps;
    if (isWalkable(x, z + dz / steps)) z += dz / steps;
  }
  return [x, z];
}
