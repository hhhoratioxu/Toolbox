import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';

export function PlantMagic() {
  const solved = useGame((s) => s.solved.includes('plant'));
  const particles = useRef<THREE.InstancedMesh>(null),
    light = useRef<THREE.PointLight>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }, dt) => {
    if (light.current)
      light.current.intensity = THREE.MathUtils.damp(light.current.intensity, solved ? 1.4 : 0, 2, dt);
    if (!particles.current) return;
    for (let i = 0; i < 18; i++) {
      const t = (clock.elapsedTime * 0.18 + i / 18) % 1,
        a = i * 2.4 + t * 2;
      dummy.position.set(Math.sin(a) * 0.25, t * 0.9, Math.cos(a) * 0.2);
      dummy.scale.setScalar(solved ? Math.sin(t * Math.PI) * 0.015 : 0.0001);
      dummy.updateMatrix();
      particles.current.setMatrixAt(i, dummy.matrix);
    }
    particles.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[1.4, 1.85, -3.78]}>
      <pointLight ref={light} color="#cde6a2" intensity={0} distance={2} decay={2} />
      <instancedMesh ref={particles} args={[undefined, undefined, 18]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial color="#dce8ad" transparent opacity={0.85} />
      </instancedMesh>
    </group>
  );
}
