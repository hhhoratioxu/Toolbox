import { useLayoutEffect, useMemo, useRef } from 'react';
import { RoundedBox, Line, Edges } from '@react-three/drei';
import type { ThreeElements } from '@react-three/fiber';
import * as THREE from 'three';
import { palette as p, paperTexture } from './materials';
import type { Vec3 } from '../game/types';

type BoxProps = Omit<ThreeElements['mesh'], 'args' | 'ref' | 'scale' | 'material'> & {
  size: Vec3;
  color?: string;
  radius?: number;
  material?: 'wood' | 'paper' | 'fabric';
  roughness?: number;
  outline?: boolean;
};
export function SoftBox({
  size,
  color = p.cream,
  radius = 0.05,
  material = 'paper',
  roughness = 0.93,
  outline = false,
  ...props
}: BoxProps) {
  return (
    <RoundedBox
      args={size}
      radius={Math.min(radius, ...size.map((n) => n / 2 - 0.001))}
      smoothness={2}
      bevelSegments={2}
      castShadow
      receiveShadow
      {...props}
    >
      <meshStandardMaterial color={color} roughness={roughness} map={paperTexture(material)} />
      {outline && <Edges threshold={18} color="#776d53" transparent opacity={0.16} />}
    </RoundedBox>
  );
}
export function Box({ size, color = p.cream, material = 'paper', ...props }: BoxProps) {
  return (
    <mesh castShadow receiveShadow {...props}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} map={paperTexture(material)} />
    </mesh>
  );
}
export function Cylinder({
  position,
  rotation,
  radius = 0.2,
  top,
  height = 0.3,
  color = p.wood,
  segments = 32,
  material = 'paper',
}: {
  position?: Vec3;
  rotation?: Vec3;
  radius?: number;
  top?: number;
  height?: number;
  color?: string;
  segments?: number;
  material?: 'wood' | 'paper' | 'fabric';
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <cylinderGeometry args={[top ?? radius, radius, height, segments]} />
      <meshStandardMaterial color={color} roughness={0.9} map={paperTexture(material)} />
    </mesh>
  );
}
export function Stem({
  from,
  to,
  radius = 0.014,
  color = p.sageDark,
}: {
  from: Vec3;
  to: Vec3;
  radius?: number;
  color?: string;
}) {
  const data = useMemo(() => {
    const a = new THREE.Vector3(...from),
      b = new THREE.Vector3(...to),
      d = b.clone().sub(a);
    return {
      center: a.add(b).multiplyScalar(0.5),
      length: d.length(),
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()),
    };
  }, [from, to]);
  return (
    <mesh position={data.center} quaternion={data.q} castShadow>
      <cylinderGeometry args={[radius, radius, data.length, 7]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}
export function Plant({
  position,
  scale = 1,
  potColor = p.blush,
  kind = 'leaf',
}: {
  position?: Vec3;
  scale?: number;
  potColor?: string;
  kind?: 'leaf' | 'round' | 'tall';
}) {
  const leaves = kind === 'tall' ? 11 : 7;
  const leafMesh = useRef<THREE.InstancedMesh>(null),
    stemMesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!leafMesh.current || !stemMesh.current) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color(),
      up = new THREE.Vector3(0, 1, 0);
    function line(index: number, from: THREE.Vector3, to: THREE.Vector3, radius: number, tint: string) {
      const direction = to.clone().sub(from);
      dummy.position.copy(from).add(to).multiplyScalar(0.5);
      dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
      dummy.scale.set(radius, direction.length(), radius);
      dummy.updateMatrix();
      stemMesh.current!.setMatrixAt(index, dummy.matrix);
      stemMesh.current!.setColorAt(index, color.set(tint));
    }
    for (let i = 0; i < leaves; i++) {
      const angle = i * 2.399,
        h = 0.65 + (i % 3) * 0.18,
        r = 0.16 + (i % 2) * 0.1;
      const end = new THREE.Vector3(
        Math.sin(angle) * r,
        h * (kind === 'tall' ? 1.4 : 1),
        Math.cos(angle) * r,
      );
      dummy.position.copy(end);
      dummy.rotation.set(Math.cos(angle) * 0.5, angle, Math.sin(angle) * 0.6);
      dummy.scale.set(...((kind === 'round' ? [0.18, 0.2, 0.07] : [0.13, 0.29, 0.045]) as Vec3));
      dummy.updateMatrix();
      leafMesh.current.setMatrixAt(i, dummy.matrix);
      leafMesh.current.setColorAt(i, color.set([p.sage, p.sageDark, '#9cac77'][i % 3]));
      line(i * 2, new THREE.Vector3(0, 0.4, 0), end, 0.014, p.sageDark);
      line(
        i * 2 + 1,
        new THREE.Vector3(end.x, end.y - 0.13, end.z + 0.035),
        new THREE.Vector3(end.x, end.y + 0.14, end.z + 0.035),
        0.005,
        '#b4be8c',
      );
    }
    leafMesh.current.instanceMatrix.needsUpdate = true;
    stemMesh.current.instanceMatrix.needsUpdate = true;
    if (leafMesh.current.instanceColor) leafMesh.current.instanceColor.needsUpdate = true;
    if (stemMesh.current.instanceColor) stemMesh.current.instanceColor.needsUpdate = true;
  }, [leaves, kind]);
  return (
    <group position={position} scale={scale}>
      <Cylinder radius={0.22} top={0.28} height={0.38} position={[0, 0.21, 0]} color={potColor} />
      <Cylinder radius={0.289} height={0.055} position={[0, 0.4, 0]} color={potColor} />
      <Cylinder radius={0.25} height={0.015} position={[0, 0.425, 0]} color="#6d5a41" />
      <instancedMesh ref={leafMesh} args={[undefined, undefined, leaves]} castShadow receiveShadow>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial roughness={0.94} />
      </instancedMesh>
      <instancedMesh ref={stemMesh} args={[undefined, undefined, leaves * 2]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial roughness={0.94} />
      </instancedMesh>
    </group>
  );
}
export function Mug({
  position,
  color = p.ivory,
  rotation = 0,
  scale = 1,
}: {
  position: Vec3;
  color?: string;
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <Cylinder radius={0.12} top={0.145} height={0.23} position={[0, 0.115, 0]} color={color} />
      <Cylinder radius={0.125} height={0.008} position={[0, 0.235, 0]} color="#856a4d" />
      <mesh position={[0.16, 0.13, 0]}>
        <torusGeometry args={[0.08, 0.025, 8, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}
export function Picture({
  position,
  size = [1, 1.25],
  kind = 'flower',
  rotation = 0,
}: {
  position: Vec3;
  size?: [number, number];
  kind?: 'flower' | 'landscape';
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, -0.035]}>
      <SoftBox size={[size[0] + 0.13, size[1] + 0.13, 0.09]} color={p.wood} radius={0.025} material="wood" />
      <Box size={[size[0], size[1], 0.02]} position={[0, 0, 0.06]} color="#f7eedb" />
      {kind === 'flower' ? (
        <group position={[0, -0.15, 0.085]}>
          <Line
            points={[
              [0, -0.35, 0],
              [0.04, 0.07, 0],
              [-0.05, 0.3, 0],
            ]}
            color={p.sageDark}
            lineWidth={2}
          />
          <mesh position={[-0.12, -0.08, 0]} rotation={[0, 0, 0.7]} scale={[0.13, 0.06, 0.01]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color={p.sage} />
          </mesh>
          <mesh position={[0.12, 0.03, 0]} rotation={[0, 0, -0.6]} scale={[0.14, 0.06, 0.01]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color={p.sage} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh
              key={i}
              position={[
                -0.05 + Math.cos((i * Math.PI) / 3) * 0.11,
                0.29 + Math.sin((i * Math.PI) / 3) * 0.11,
                0.005,
              ]}
              scale={[0.1, 0.1, 0.015]}
            >
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color={p.blush} />
            </mesh>
          ))}
          <mesh position={[-0.05, 0.29, 0.025]}>
            <circleGeometry args={[0.065, 16]} />
            <meshBasicMaterial color={p.yellow} />
          </mesh>
        </group>
      ) : (
        <group position={[0, 0, 0.085]}>
          <mesh position={[0.15, 0.25, 0]}>
            <circleGeometry args={[0.15, 24]} />
            <meshBasicMaterial color={p.yellow} />
          </mesh>
          <mesh position={[-0.1, -0.15, 0.01]} scale={[0.45, 0.23, 0.01]}>
            <circleGeometry args={[1, 32, 0, Math.PI]} />
            <meshBasicMaterial color={p.sage} />
          </mesh>
          <mesh position={[0.2, -0.28, 0.02]} scale={[0.45, 0.25, 0.01]}>
            <circleGeometry args={[1, 32, 0, Math.PI]} />
            <meshBasicMaterial color={p.sageDark} />
          </mesh>
        </group>
      )}
    </group>
  );
}
