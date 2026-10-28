import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { Interactive } from './Interactive';
import { SoftBox, Cylinder, Stem } from './Primitives';

const ease = (x: number) => {
  const t = THREE.MathUtils.clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};

export function LittleKey({
  position = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number];
  scale?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.elapsedTime * 0.65;
      ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.6) * 0.06;
    }
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.27, 0]}>
        <torusGeometry args={[0.11, 0.026, 10, 24]} />
        <meshStandardMaterial color="#e9bf66" metalness={0.6} roughness={0.3} />
      </mesh>
      <Cylinder radius={0.025} height={0.38} position={[0, 0.02, 0]} color="#e0b35b" />
      <SoftBox size={[0.11, 0.04, 0.045]} position={[0.04, -0.11, 0]} color="#e0b35b" radius={0.008} />
      <SoftBox size={[0.11, 0.04, 0.045]} position={[0.04, -0.05, 0]} color="#e0b35b" radius={0.008} />
    </group>
  );
}
function Strawberry({ angle }: { angle: number }) {
  return (
    <group position={[Math.sin(angle) * 0.36, 0.51, Math.cos(angle) * 0.36]} rotation={[0.08, angle, 0.12]}>
      <mesh scale={[0.105, 0.14, 0.1]} rotation={[0, 0, Math.PI]} castShadow>
        <sphereGeometry args={[1, 10, 9]} />
        <meshStandardMaterial color="#d98273" roughness={0.7} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = i * 2.4;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.087, -0.06 + (i % 3) * 0.06, Math.cos(a) * 0.087]}
            scale={[0.009, 0.015, 0.006]}
          >
            <sphereGeometry args={[1, 5, 4]} />
            <meshStandardMaterial color="#f3cd8f" />
          </mesh>
        );
      })}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh
          key={i}
          position={[Math.sin(i * 1.57) * 0.035, 0.125, Math.cos(i * 1.57) * 0.035]}
          rotation={[0.5, i * 1.57, 0.7]}
          scale={[0.03, 0.065, 0.013]}
        >
          <sphereGeometry args={[1, 6, 5]} />
          <meshStandardMaterial color="#8d9e70" />
        </mesh>
      ))}
    </group>
  );
}
function Cake({
  flame,
  candleLight,
}: {
  flame: React.RefObject<THREE.Group | null>;
  candleLight: React.RefObject<THREE.PointLight | null>;
}) {
  return (
    <group>
      <Cylinder radius={0.66} height={0.045} position={[0, 0.03, 0]} color="#eee2bc" segments={64} />
      <Cylinder radius={0.61} height={0.025} position={[0, 0.065, 0]} color="#f8efd9" segments={64} />
      <Cylinder radius={0.49} height={0.3} position={[0, 0.23, 0]} color="#e9cfa2" segments={48} />
      <Cylinder radius={0.495} height={0.065} position={[0, 0.22, 0]} color="#cf9a88" segments={48} />
      <Cylinder radius={0.51} height={0.1} position={[0, 0.4, 0]} color="#fff0d2" segments={48} />
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.474, 0.37 - (i % 3) * 0.018, Math.cos(a) * 0.474]}
            scale={[0.055, 0.08 + (i % 3) * 0.025, 0.055]}
            castShadow
          >
            <sphereGeometry args={[1, 9, 8]} />
            <meshStandardMaterial color="#fff0d2" roughness={0.8} />
          </mesh>
        );
      })}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.42, 0.46, Math.cos(a) * 0.42]}
            scale={[0.075, 0.07, 0.075]}
            castShadow
          >
            <sphereGeometry args={[1, 9, 8]} />
            <meshStandardMaterial color="#fff5df" />
          </mesh>
        );
      })}
      {Array.from({ length: 5 }, (_, i) => (
        <Strawberry key={i} angle={(i / 5) * Math.PI * 2} />
      ))}
      <Cylinder radius={0.035} height={0.4} position={[0, 0.65, 0]} color="#a0b18b" />
      {[0.51, 0.59, 0.67, 0.75, 0.83].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[0, 0, 0.25]}>
          <cylinderGeometry args={[0.036, 0.036, 0.018, 16]} />
          <meshStandardMaterial color="#e7e5be" />
        </mesh>
      ))}
      <Stem from={[0, 0.85, 0]} to={[0, 0.9, 0]} radius={0.008} color="#615443" />
      <group ref={flame} position={[0, 0.96, 0]}>
        <mesh scale={[0.048, 0.125, 0.048]}>
          <sphereGeometry args={[1, 12, 12]} />
          <meshBasicMaterial color="#ffd186" toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.025, 0.015]} scale={[0.024, 0.07, 0.025]}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial color="#fff8d4" toneMapped={false} />
        </mesh>
        <pointLight ref={candleLight} color="#ffc770" intensity={3.5} distance={5} decay={2} />
      </group>
    </group>
  );
}
function CelebrationParticles({ active }: { active: boolean }) {
  const inst = useRef<THREE.InstancedMesh>(null);
  const hearts = useRef<THREE.Group>(null);
  const elapsed = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const heartGeometry = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.03);
    s.bezierCurveTo(-0.12, 0.18, -0.22, 0.01, 0, -0.13);
    s.bezierCurveTo(0.22, 0.01, 0.12, 0.18, 0, 0.03);
    return new THREE.ShapeGeometry(s);
  }, []);
  useEffect(() => {
    elapsed.current = 0;
  }, [active]);
  useFrame((state, dt) => {
    elapsed.current += dt;
    const t = elapsed.current;
    if (inst.current) {
      for (let i = 0; i < 64; i++) {
        const a = i * 2.399;
        const cycle = (t * (active ? 0.3 : 0.16) + i / 64) % 1;
        const r = active ? 0.3 + cycle * 2.1 : 0.18 + Math.sin(i) * 0.4;
        dummy.position.set(
          Math.sin(a + t * 0.1) * r,
          0.8 + cycle * (active ? 3.2 : 1.5),
          Math.cos(a + t * 0.1) * r,
        );
        dummy.scale.setScalar((active ? 0.026 : 0.015) * Math.sin(cycle * Math.PI));
        dummy.rotation.set(t + i, a, t * 0.6);
        dummy.updateMatrix();
        inst.current.setMatrixAt(i, dummy.matrix);
      }
      inst.current.instanceMatrix.needsUpdate = true;
    }
    if (hearts.current)
      for (let i = 0; i < hearts.current.children.length; i++) {
        const child = hearts.current.children[i],
          f = (t * 0.14 + i / 10) % 1;
        child.position.set(Math.sin(i * 2.4) * (0.5 + f * 2.2), 0.7 + f * 3.1, Math.cos(i * 2.4) * (f * 1.5));
        child.quaternion.copy(state.camera.quaternion);
        child.scale.setScalar(Math.sin(f * Math.PI) * 0.7);
      }
  });
  return (
    <group>
      <instancedMesh ref={inst} args={[undefined, undefined, 64]}>
        <octahedronGeometry args={[1]} />
        <meshBasicMaterial color="#e5c585" transparent opacity={0.8} />
      </instancedMesh>
      {active && (
        <group ref={hearts}>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh key={i} geometry={heartGeometry}>
              <meshBasicMaterial
                color={i % 2 ? '#dbac98' : '#eed6aa'}
                side={THREE.DoubleSide}
                transparent
                opacity={0.8}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
export function Gift() {
  const phase = useGame((s) => s.phase),
    solved = useGame((s) => s.solved.length);
  const lid = useRef<THREE.Group>(null),
    shell = useRef<THREE.Group>(null),
    cake = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null),
    back = useRef<THREE.Group>(null),
    left = useRef<THREE.Group>(null),
    right = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Group>(null),
    candleLight = useRef<THREE.PointLight>(null),
    smoke = useRef<THREE.Group>(null);
  const timeline = useRef(0),
    blowTime = useRef(0);
  useEffect(() => {
    if (phase === 'opening' || phase === 'explore') {
      timeline.current = 0;
      blowTime.current = 0;
    }
  }, [phase]);
  useFrame(({ clock, gl }, dt) => {
    const s = useGame.getState();
    if (s.phase === 'opening') timeline.current = Math.min(8, timeline.current + dt);
    else if (s.phase !== 'explore') timeline.current = 8;
    const t = timeline.current,
      lift = ease((t - 0.8) / 2),
      unfold = ease((t - 2) / 2.7),
      grow = ease((t - 3.2) / 2.6);
    gl.domElement.dataset.giftProgress = t.toFixed(2);
    gl.domElement.dataset.cakeScale = grow.toFixed(3);
    gl.domElement.dataset.candleLit = String(blowTime.current < 1 && grow > 0.9);
    if (s.phase === 'celebrating' || s.phase === 'greeting') blowTime.current += dt;
    else blowTime.current = 0;
    if (shell.current) {
      shell.current.rotation.z = t < 1.1 && t > 0.1 ? Math.sin(t * 30) * 0.018 : 0;
      shell.current.position.y = 0;
    }
    if (lid.current) {
      lid.current.position.y = 0.88 + lift * 1.25;
      lid.current.rotation.set(lift * 0.25, lift * 0.28, lift * -0.3);
      lid.current.scale.setScalar(Math.max(0.001, 1 - ease((t - 2.2) / 1.4)));
    }
    if (front.current) front.current.rotation.x = (unfold * Math.PI) / 2;
    if (back.current) back.current.rotation.x = (-unfold * Math.PI) / 2;
    if (left.current) left.current.rotation.z = (unfold * Math.PI) / 2;
    if (right.current) right.current.rotation.z = (-unfold * Math.PI) / 2;
    if (cake.current) {
      cake.current.scale.setScalar(Math.max(0.001, grow));
      cake.current.position.y = 0.08 + (1 - grow) * -0.28;
    }
    if (flame.current) {
      const fade = 1 - ease(blowTime.current / 1.05);
      flame.current.scale.set(
        0.95 + Math.sin(clock.elapsedTime * 14) * 0.09,
        fade * (1 + Math.sin(clock.elapsedTime * 9) * 0.08),
        0.95,
      );
      flame.current.rotation.z = Math.sin(clock.elapsedTime * 6) * 0.07;
      flame.current.visible = fade > 0.01;
      if (candleLight.current)
        candleLight.current.intensity = fade * grow * (3.1 + Math.sin(clock.elapsedTime * 13) * 0.3);
    }
    if (smoke.current) {
      smoke.current.visible = blowTime.current > 0.3 && blowTime.current < 4;
      smoke.current.children.forEach((m, i) => {
        const f = THREE.MathUtils.clamp((blowTime.current - 0.35 - i * 0.12) / 2.3, 0, 1);
        m.position.set(Math.sin(f * 5 + i) * 0.1 * f, 1.03 + f * 0.65, Math.cos(i) * f * 0.08);
        m.scale.setScalar(0.02 + f * 0.12);
        ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.sin(f * Math.PI) * 0.15;
      });
    }
    if (s.phase === 'opening' && t >= 8) s.setPhase('wish');
    if (s.phase === 'celebrating' && blowTime.current > 4.8) s.finish();
  });
  return (
    <Interactive id="gift">
      <group position={[-0.3, 0.82, 0.05]}>
        <group ref={shell}>
          <SoftBox size={[1.0, 0.055, 1.0]} position={[0, 0.025, 0]} color="#789065" radius={0.025} />
          <group ref={front} position={[0, 0.05, 0.48]}>
            <SoftBox size={[0.98, 0.8, 0.045]} position={[0, 0.4, 0]} color="#95a77e" radius={0.015} />
            <SoftBox size={[0.14, 0.8, 0.012]} position={[0, 0.4, 0.03]} color="#e0cf9b" radius={0.006} />
          </group>
          <group ref={back} position={[0, 0.05, -0.48]}>
            <SoftBox size={[0.98, 0.8, 0.045]} position={[0, 0.4, 0]} color="#8fa478" radius={0.015} />
            <SoftBox size={[0.14, 0.8, 0.012]} position={[0, 0.4, -0.03]} color="#e0cf9b" radius={0.006} />
          </group>
          <group ref={left} position={[-0.48, 0.05, 0]}>
            <SoftBox size={[0.045, 0.8, 0.98]} position={[0, 0.4, 0]} color="#879e71" radius={0.015} />
            <SoftBox size={[0.012, 0.8, 0.14]} position={[-0.03, 0.4, 0]} color="#e0cf9b" radius={0.006} />
          </group>
          <group ref={right} position={[0.48, 0.05, 0]}>
            <SoftBox size={[0.045, 0.8, 0.98]} position={[0, 0.4, 0]} color="#95a77e" radius={0.015} />
            <SoftBox size={[0.012, 0.8, 0.14]} position={[0.03, 0.4, 0]} color="#e0cf9b" radius={0.006} />
          </group>
          <group ref={lid} position={[0, 0.88, 0]}>
            <SoftBox size={[1.075, 0.13, 1.075]} color="#a4b58e" radius={0.045} />
            <SoftBox size={[0.15, 0.014, 1.075]} position={[0, 0.073, 0]} color="#e7d5a2" radius={0.005} />
            <SoftBox size={[1.075, 0.014, 0.15]} position={[0, 0.075, 0]} color="#e7d5a2" radius={0.005} />
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[side * 0.17, 0.18, 0]}
                rotation={[Math.PI / 2, side * 0.5, side * 0.3]}
                scale={[1, 0.6, 1]}
                castShadow
              >
                <torusGeometry args={[0.16, 0.045, 8, 24]} />
                <meshStandardMaterial color="#e4cf99" roughness={0.75} />
              </mesh>
            ))}
            <SoftBox size={[0.11, 0.12, 0.12]} position={[0, 0.16, 0]} color="#e8d4a1" radius={0.04} />
            <SoftBox
              size={[0.26, 0.3, 0.017]}
              position={[0.26, -0.13, 0.552]}
              rotation={[0, 0, 0.16]}
              color="#f5e7c5"
              radius={0.012}
            />
            <mesh position={[0.26, -0.11, 0.565]} rotation={[0, 0, Math.PI / 4]}>
              <planeGeometry args={[0.055, 0.055]} />
              <meshBasicMaterial color="#a4ad8b" />
            </mesh>
          </group>
        </group>
        <group ref={cake} scale={0.001}>
          <Cake flame={flame} candleLight={candleLight} />
        </group>
        <group ref={smoke} visible={false}>
          {Array.from({ length: 9 }, (_, i) => (
            <mesh key={i}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color="#e7ddca" transparent opacity={0} depthWrite={false} />
            </mesh>
          ))}
        </group>
        {(phase !== 'explore' || solved === 5) && (
          <CelebrationParticles active={phase === 'celebrating' || phase === 'greeting'} />
        )}
      </group>
    </Interactive>
  );
}
