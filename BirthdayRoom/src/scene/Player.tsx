import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { clearInput, input } from '../game/input';
import { EYE_HEIGHT, START, interactables, moveWithCollision, objectById } from '../game/world';
import type { ObjectId } from '../game/types';
import { findPath } from '../game/navigation';

export function Player() {
  const { camera, gl, size } = useThree();
  const yaw = useRef(0.12),
    pitch = useRef(-0.06),
    keys = useRef(new Set<string>()),
    speed = useRef(new THREE.Vector2());
  const position = useRef(new THREE.Vector3(...START));
  const overview = useRef(new THREE.Vector3(10.8, 9.18, 12.6));
  const quaternion = useRef(new THREE.Quaternion()),
    targetQuaternion = useRef(new THREE.Quaternion());
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const direction = useRef(new THREE.Vector3()),
    deltaVector = useRef(new THREE.Vector3());
  const targetPosition = useRef(new THREE.Vector3()),
    lookMatrix = useRef(new THREE.Matrix4());
  const bookmark = useRef<{ position: THREE.Vector3; yaw: number; pitch: number } | null>(null);
  const lastMode = useRef('overview'),
    scanTime = useRef(0),
    transition = useRef(0);
  const dragging = useRef(false),
    pointer = useRef({ x: 0, y: 0, distance: 0 });
  const route = useRef<[number, number][]>([]),
    destination = useRef<ObjectId | null>(null);

  useEffect(() => {
    function interact(id?: ObjectId) {
      const s = useGame.getState();
      const selected = id ?? s.active;
      if (!selected || s.dialog || s.phase !== 'explore') return;
      const def = objectById[selected];
      if (camera.position.distanceTo(new THREE.Vector3(...def.position)) > def.range + 0.3) {
        s.notify('再走近一点，就能发现这里的心意。');
        return;
      }
      if (pointer.current.distance > 9 && id) return;
      s.interact(selected);
    }
    const onInteraction = (event: Event) => interact((event as CustomEvent<ObjectId>).detail);
    const navigate = (event: Event) => {
      const id = (event as CustomEvent<ObjectId>).detail;
      const s = useGame.getState();
      if (!s.entered || s.phase !== 'explore') return;
      s.close();
      const def = objectById[id];
      if (!def) return;
      route.current = findPath([position.current.x, position.current.z], [def.focus[0], def.focus[2]]);
      destination.current = id;
      s.setActive(null);
      if (!route.current.length) s.notify('这边有点拥挤，挪动几步再试试。');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (useGame.getState().dialog) useGame.getState().close();
        return;
      }
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code,
        ) &&
        useGame.getState().entered &&
        !useGame.getState().dialog
      )
        e.preventDefault();
      keys.current.add(e.code);
      if (e.code === 'KeyE' && !e.repeat) interact();
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => {
      keys.current.clear();
      speed.current.set(0, 0);
      clearInput();
      dragging.current = false;
    };
    const onLock = () => useGame.getState().setLocked(document.pointerLockElement === gl.domElement);
    const onMouseMove = (e: MouseEvent) => {
      const s = useGame.getState();
      if (!s.entered || s.dialog || s.phase !== 'explore') return;
      if (document.pointerLockElement === gl.domElement) {
        input.lookX += e.movementX * 0.0022;
        input.lookY += e.movementY * 0.0022;
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || useGame.getState().dialog) return;
      dragging.current = true;
      pointer.current = { x: e.clientX, y: e.clientY, distance: 0 };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (
        !dragging.current ||
        document.pointerLockElement ||
        !useGame.getState().entered ||
        useGame.getState().dialog
      )
        return;
      const dx = e.clientX - pointer.current.x,
        dy = e.clientY - pointer.current.y;
      pointer.current.distance += Math.abs(dx) + Math.abs(dy);
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      input.lookX += dx * 0.003;
      input.lookY += dy * 0.003;
    };
    const onPointerUp = () => {
      dragging.current = false;
    };
    const lock = () => {
      const s = useGame.getState();
      if (!s.entered || s.dialog || s.phase !== 'explore') return;
      if (matchMedia('(pointer: coarse)').matches || !gl.domElement.requestPointerLock) return;
      const request = gl.domElement.requestPointerLock();
      if (request && typeof request.catch === 'function')
        request.catch(() => s.notify('也可以按住鼠标拖动环顾，WASD 自由移动。'));
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('pointerlockchange', onLock);
    document.addEventListener('mousemove', onMouseMove);
    gl.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('room:interact', onInteraction);
    window.addEventListener('room:lock', lock);
    gl.domElement.addEventListener('dblclick', lock);
    window.addEventListener('room:navigate', navigate);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('pointerlockchange', onLock);
      document.removeEventListener('mousemove', onMouseMove);
      gl.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('room:interact', onInteraction);
      window.removeEventListener('room:lock', lock);
      gl.domElement.removeEventListener('dblclick', lock);
      onBlur();
      window.removeEventListener('room:navigate', navigate);
    };
  }, [camera, gl]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1),
      s = useGame.getState();
    const mode = !s.entered ? 'overview' : s.focus || s.phase !== 'explore' ? 'focus' : 'walk';
    if (mode !== lastMode.current) {
      if (mode === 'focus') {
        bookmark.current = { position: position.current.clone(), yaw: yaw.current, pitch: pitch.current };
        keys.current.clear();
        clearInput();
      }
      if (mode === 'walk' && lastMode.current === 'focus' && bookmark.current) {
        position.current.copy(bookmark.current.position);
        yaw.current = bookmark.current.yaw;
        pitch.current = bookmark.current.pitch;
      }
      if (mode === 'overview') {
        position.current.set(...START);
        yaw.current = 0.12;
        pitch.current = -0.06;
      }
      if (mode === 'overview') {
        route.current = [];
        destination.current = null;
      }
      speed.current.set(0, 0);
      transition.current = 0;
      lastMode.current = mode;
    }
    transition.current += dt;
    // Passive diagnostics also make movement and collision acceptance inspectable.
    scanTime.current += dt;
    if (scanTime.current > 0.1) {
      gl.domElement.dataset.playerX = position.current.x.toFixed(3);
      gl.domElement.dataset.playerZ = position.current.z.toFixed(3);
      gl.domElement.dataset.yaw = yaw.current.toFixed(3);
      gl.domElement.dataset.pitch = pitch.current.toFixed(3);
      gl.domElement.dataset.mode = mode;
    }
    if (mode === 'overview') {
      const aspect = size.width / size.height;
      const factor = aspect < 0.75 ? 1.65 : aspect < 1 ? 1.4 : aspect < 1.3 ? 1.1 : 1;
      overview.current.set(
        10.8 * factor + Math.sin(state.clock.elapsedTime * 0.12) * 0.16,
        9.18 * factor,
        12.6 * factor,
      );
      camera.position.lerp(overview.current, 1 - Math.exp(-2 * dt));
      targetPosition.current.set(aspect > 1.3 ? -2.2 : -0.15, aspect < 0.75 ? -1.4 : 1.0, 0);
      lookMatrix.current.lookAt(camera.position, targetPosition.current, camera.up);
      targetQuaternion.current.setFromRotationMatrix(lookMatrix.current);
      camera.quaternion.slerp(targetQuaternion.current, 1 - Math.exp(-2 * dt));
      if (camera instanceof THREE.PerspectiveCamera) camera.fov = THREE.MathUtils.damp(camera.fov, 40, 3, dt);
    } else if (mode === 'focus') {
      const def = objectById[s.focus ?? 'gift'];
      targetPosition.current.set(...def.focus);
      const isFinale = s.phase !== 'explore';
      if (isFinale) targetPosition.current.set(0.9, 1.8, 2.45);
      camera.position.lerp(targetPosition.current, 1 - Math.exp(-2.3 * dt));
      const at = new THREE.Vector3(...def.lookAt);
      if (isFinale) at.set(-0.3, 1.27, 0.05);
      lookMatrix.current.lookAt(camera.position, at, camera.up);
      targetQuaternion.current.setFromRotationMatrix(lookMatrix.current);
      camera.quaternion.slerp(targetQuaternion.current, 1 - Math.exp(-2.8 * dt));
      if (camera instanceof THREE.PerspectiveCamera)
        camera.fov = THREE.MathUtils.damp(camera.fov, isFinale ? 43 : 54, 2, dt);
      s.setActive(null);
    } else {
      if (!s.dialog) {
        const manual =
          keys.current.size > 0 ||
          Math.abs(input.moveX) + Math.abs(input.moveZ) + Math.abs(input.lookX) + Math.abs(input.lookY) >
            0.01;
        if (manual) {
          route.current = [];
          destination.current = null;
        }
        if (route.current.length) {
          const [tx, tz] = route.current[0],
            dx = tx - position.current.x,
            dz = tz - position.current.z,
            distance = Math.hypot(dx, dz);
          const [x, z] = moveWithCollision(
            position.current.x,
            position.current.z,
            (dx / Math.max(0.001, distance)) * Math.min(distance, dt * 2),
            (dz / Math.max(0.001, distance)) * Math.min(distance, dt * 2),
          );
          position.current.set(x, EYE_HEIGHT, z);
          const targetYaw = Math.atan2(-dx, -dz);
          yaw.current +=
            Math.atan2(Math.sin(targetYaw - yaw.current), Math.cos(targetYaw - yaw.current)) *
            (1 - Math.exp(-5 * dt));
          pitch.current = THREE.MathUtils.damp(pitch.current, -0.08, 5, dt);
          if (distance < 0.06) route.current.shift();
          if (!route.current.length && destination.current) {
            const at = objectById[destination.current].position;
            yaw.current = Math.atan2(position.current.x - at[0], position.current.z - at[2]);
            pitch.current = Math.atan2(
              at[1] - EYE_HEIGHT,
              Math.hypot(at[0] - position.current.x, at[2] - position.current.z),
            );
            s.notify('到了，轻轻与眼前的物体互动吧。');
            destination.current = null;
          }
        }
        yaw.current -= input.lookX;
        pitch.current = THREE.MathUtils.clamp(pitch.current - input.lookY, -1.2, 1.15);
        input.lookX = input.lookY = 0;
        const forward =
          Number(keys.current.has('KeyW') || keys.current.has('ArrowUp')) -
          Number(keys.current.has('KeyS') || keys.current.has('ArrowDown')) -
          input.moveZ;
        const side =
          Number(keys.current.has('KeyD') || keys.current.has('ArrowRight')) -
          Number(keys.current.has('KeyA') || keys.current.has('ArrowLeft')) +
          input.moveX;
        const len = Math.max(1, Math.hypot(forward, side));
        const vx = ((side * Math.cos(yaw.current) - forward * Math.sin(yaw.current)) / len) * 2.15;
        const vz = ((-side * Math.sin(yaw.current) - forward * Math.cos(yaw.current)) / len) * 2.15;
        speed.current.x = THREE.MathUtils.damp(speed.current.x, vx, forward || side ? 7 : 11, dt);
        speed.current.y = THREE.MathUtils.damp(speed.current.y, vz, forward || side ? 7 : 11, dt);
        const [x, z] = moveWithCollision(
          position.current.x,
          position.current.z,
          speed.current.x * dt,
          speed.current.y * dt,
        );
        position.current.set(
          x,
          EYE_HEIGHT +
            Math.sin(state.clock.elapsedTime * 8) * Math.min(0.012, speed.current.length() * 0.006),
          z,
        );
      } else {
        keys.current.clear();
        speed.current.set(0, 0);
        clearInput();
      }
      camera.position.lerp(position.current, 1 - Math.exp(-(transition.current < 1.8 ? 2.7 : 20) * dt));
      euler.current.set(pitch.current, yaw.current, 0, 'YXZ');
      quaternion.current.setFromEuler(euler.current);
      camera.quaternion.slerp(quaternion.current, 1 - Math.exp(-13 * dt));
      if (camera instanceof THREE.PerspectiveCamera) camera.fov = THREE.MathUtils.damp(camera.fov, 66, 3, dt);
      if (route.current.length) s.setActive(null);
      if (scanTime.current > 0.1 && !s.dialog && !route.current.length) {
        scanTime.current = 0;
        camera.getWorldDirection(direction.current);
        let best: ObjectId | null = null,
          score = -Infinity;
        for (const item of interactables) {
          deltaVector.current.set(...item.position).sub(camera.position);
          const dist = deltaVector.current.length(),
            dot = deltaVector.current.normalize().dot(direction.current);
          const value = dot * 4 - dist * 0.18;
          if (dist < item.range && dot > 0.78 && value > score) {
            best = item.id;
            score = value;
          }
        }
        s.setActive(best);
      }
    }
    camera.updateProjectionMatrix();
  });
  return null;
}
