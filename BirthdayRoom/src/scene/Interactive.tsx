import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { objectById } from '../game/world';
import type { ObjectId, Vec3 } from '../game/types';

export function Interactive({ id, children }: { id: ObjectId; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const hovered = useGame((s) => s.hovered === id || s.active === id);
  const entered = useGame((s) => s.entered);
  const dialog = useGame((s) => s.dialog);
  const phase = useGame((s) => s.phase);
  const solved = useGame((s) => s.solved.includes(id as never));
  const position = objectById[id].position;
  useEffect(() => {
    group.current?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((mat) => {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.emissive.set('#b6ba83');
          mat.emissiveIntensity = hovered && !dialog ? 0.075 : 0;
        }
      });
    });
  }, [hovered, dialog]);
  useFrame(({ clock }) => {
    if (glow.current) {
      glow.current.position.y = position[1] + 0.42 + Math.sin(clock.elapsedTime * 2) * 0.055;
    }
  });
  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (entered) useGame.getState().setHovered(id);
      }}
      onPointerOut={() => useGame.getState().setHovered(null)}
      onClick={(e) => {
        e.stopPropagation();
        if (!dialog) window.dispatchEvent(new CustomEvent('room:interact', { detail: id }));
      }}
    >
      {children}
      {entered && phase === 'explore' && !dialog && hovered && (
        <mesh ref={glow} position={[position[0], position[1] + 0.42, position[2]]}>
          <sphereGeometry args={[0.065, 12, 8]} />
          <meshBasicMaterial color={solved ? '#98b28a' : '#f9d782'} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}
export function SceneLabel({ position, children }: { position: Vec3; children: ReactNode }) {
  return (
    <Html
      position={position}
      center
      distanceFactor={12}
      zIndexRange={[3, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <span className="scene-label">{children}</span>
    </Html>
  );
}
