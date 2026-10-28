import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGame } from '../game/store';
import { palette as p, paperTexture } from './materials';
import { Box, SoftBox, Cylinder, Plant, Stem, Mug, Picture } from './Primitives';
import { Interactive } from './Interactive';
import type { Vec3 } from '../game/types';
import { LittleKey } from './Gift';

function Floor() {
  const instances = useRef<THREE.InstancedMesh>(null);
  const boards = useMemo(() => {
    const a: { position: Vec3; size: Vec3; color: string }[] = [];
    for (let row = 0; row < 17; row++) {
      const z = -4.05 + row * 0.5;
      const joints = row % 2 === 0 ? [-5, -2.5, 0, 2.5, 5] : [-5, -3.75, -1.25, 1.25, 3.75, 5];
      for (let i = 0; i < joints.length - 1; i++)
        a.push({
          position: [(joints[i] + joints[i + 1]) / 2, -0.045, z],
          size: [joints[i + 1] - joints[i] - 0.017, 0.13, 0.483],
          color: ['#d9b18a', '#dfb993', '#d8ad83', '#e2bd97', '#dcb38d'][(row + i * 3) % 5],
        });
    }
    return a;
  }, []);
  useLayoutEffect(() => {
    const mesh = instances.current;
    if (!mesh) return;
    const dummy = new THREE.Object3D(),
      color = new THREE.Color();
    boards.forEach((board, i) => {
      dummy.position.set(...board.position);
      dummy.scale.set(...board.size);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, color.set(board.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [boards]);
  return (
    <group>
      <SoftBox
        size={[10.4, 0.28, 8.8]}
        position={[0, -0.22, 0.05]}
        color="#ae8968"
        radius={0.09}
        material="wood"
      />
      <instancedMesh ref={instances} args={[undefined, undefined, boards.length]} castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.95} map={paperTexture('wood')} />
      </instancedMesh>
    </group>
  );
}
function Curtain({ x }: { x: number }) {
  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.76, 2.65, 16, 18),
      a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const u = (a.getX(i) + 0.38) / 0.76,
        v = (a.getY(i) + 1.325) / 2.65;
      a.setZ(i, Math.sin(u * Math.PI * 7) * 0.095 + Math.sin(v * Math.PI) * 0.06);
      a.setX(i, a.getX(i) * (0.68 + 0.32 * Math.abs(v - 0.42) * 1.4));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group>
      <mesh position={[x, 2.32, -3.84]} geometry={geom} castShadow>
        <meshStandardMaterial
          color="#dcb9a2"
          roughness={1}
          side={THREE.DoubleSide}
          map={paperTexture('fabric')}
        />
      </mesh>
      <SoftBox size={[0.5, 0.065, 0.22]} position={[x, 2.0, -3.81]} color="#bc956e" radius={0.025} />
    </group>
  );
}
function Window() {
  const sun = useRef<THREE.Mesh>(null),
    moon = useRef<THREE.Group>(null),
    stars = useRef<THREE.Group>(null),
    sky = useRef<THREE.Mesh>(null);
  const dayColor = useMemo(() => new THREE.Color('#c2d8d1'), []),
    nightColor = useMemo(() => new THREE.Color('#344a65'), []);
  const blend = useRef(0);
  useFrame((_, dt) => {
    const state = useGame.getState();
    const night = state.phase === 'celebrating' || state.phase === 'greeting' ? false : state.night;
    blend.current = THREE.MathUtils.damp(blend.current, night ? 1 : 0, 1.25, dt);
    if (sky.current)
      (sky.current.material as THREE.MeshBasicMaterial).color.copy(dayColor).lerp(nightColor, blend.current);
    if (sun.current) {
      (sun.current.material as THREE.MeshBasicMaterial).opacity = 1 - blend.current;
      sun.current.position.y = 3.0 - blend.current * 0.8;
    }
    if (moon.current) moon.current.scale.setScalar(Math.max(0.001, blend.current));
    if (stars.current) stars.current.visible = blend.current > 0.45;
  });
  return (
    <group>
      <mesh ref={sky} position={[2.5, 2.5, -4.3]}>
        <planeGeometry args={[3.65, 2.3]} />
        <meshBasicMaterial color="#c2d8d1" />
      </mesh>
      <mesh ref={sun} position={[3.35, 3.0, -4.25]}>
        <circleGeometry args={[0.29, 32]} />
        <meshBasicMaterial color="#fff0ba" transparent />
      </mesh>
      <group ref={moon} position={[3.35, 3.0, -4.24]} scale={0.001}>
        <mesh>
          <circleGeometry args={[0.28, 32]} />
          <meshBasicMaterial color="#fff0c5" />
        </mesh>
        <mesh position={[0.13, 0.08, 0.005]}>
          <circleGeometry args={[0.25, 32]} />
          <meshBasicMaterial color="#344a65" />
        </mesh>
      </group>
      <group ref={stars} visible={false}>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh
            key={i}
            position={[0.9 + ((i * 1.37) % 3.1), 1.65 + ((i * 0.73) % 1.85), -4.23]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <planeGeometry args={[0.025, 0.025]} />
            <meshBasicMaterial color="#fce7b0" />
          </mesh>
        ))}
      </group>
      {[1.0, 2.6, 4.1].map((x, i) => (
        <group key={i} position={[x, 1.54, -4.19]}>
          <mesh scale={[1.15, 0.58 + i * 0.06, 1]}>
            <circleGeometry args={[1, 32, 0, Math.PI]} />
            <meshBasicMaterial color={['#8ea68d', '#a4b79c', '#8ca193'][i]} />
          </mesh>
        </group>
      ))}
      {[0.68, 4.32].map((x) => (
        <Box
          key={x}
          size={[0.11, 2.35, 0.2]}
          position={[x, 2.5, -4.06]}
          color={p.woodLight}
          material="wood"
        />
      ))}
      {[1.35, 3.67].map((y) => (
        <Box
          key={y}
          size={[3.8, 0.12, 0.23]}
          position={[2.5, y, -4.06]}
          color={p.woodLight}
          material="wood"
        />
      ))}
      <Box size={[0.075, 2.2, 0.12]} position={[2.5, 2.5, -3.98]} color="#ead4b4" />
      <Box size={[3.6, 0.075, 0.12]} position={[2.5, 2.57, -3.98]} color="#ead4b4" />
      <SoftBox size={[4.1, 0.13, 0.48]} position={[2.5, 1.31, -3.95]} color="#e5c7a2" material="wood" />
      <Stem from={[0.3, 3.91, -3.85]} to={[4.7, 3.91, -3.85]} radius={0.035} color={p.woodDark} />
      <Curtain x={0.82} />
      <Curtain x={4.19} />
      <Interactive id="plant">
        <Plant position={[1.4, 1.39, -3.78]} scale={0.6} potColor="#a9b294" />
      </Interactive>
    </group>
  );
}
function Walls() {
  const entered = useGame((s) => s.entered);
  return (
    <group>
      <Box size={[5.68, 4.35, 0.18]} position={[-2.16, 2.15, -4.27]} color={p.wall} />
      <Box size={[0.69, 4.35, 0.18]} position={[4.66, 2.15, -4.27]} color={p.wall} />
      <Box size={[3.64, 1.38, 0.18]} position={[2.5, 0.67, -4.27]} color={p.wall} />
      <Box size={[3.64, 0.65, 0.18]} position={[2.5, 4.02, -4.27]} color={p.wall} />
      <Box size={[0.18, 4.35, 8.6]} position={[-5.09, 2.15, 0]} color="#e1ddce" />
      <Box size={[10, 0.9, 0.045]} position={[0, 0.44, -4.15]} color="#d8ddc8" />
      <Box size={[0.045, 0.9, 8.4]} position={[-4.98, 0.44, 0]} color="#ccd2bc" />
      <Box size={[10, 0.065, 0.075]} position={[0, 0.91, -4.1]} color="#acb599" />
      <Box size={[0.075, 0.065, 8.4]} position={[-4.94, 0.91, 0]} color="#a6af91" />
      <Box size={[10, 0.15, 0.1]} position={[0, 0.1, -4.1]} color="#c1b69c" />
      <Box size={[0.1, 0.15, 8.4]} position={[-4.94, 0.1, 0]} color="#b9ad94" />
      {Array.from({ length: 13 }, (_, i) => (
        <Box key={i} size={[0.022, 0.7, 0.018]} position={[-4.7 + i * 0.77, 0.47, -4.11]} color="#bdc7aa" />
      ))}
      {entered && (
        <group>
          <Box size={[0.18, 4.3, 8.6]} position={[5.1, 2.15, 0]} color={p.wall} />
          <Box size={[10.2, 4.3, 0.18]} position={[0, 2.15, 4.34]} color={p.wall} />
          <Box size={[10.2, 0.13, 8.6]} position={[0, 4.35, 0]} color="#efe8d8" />
          <Box size={[0.08, 0.9, 8.4]} position={[4.98, 0.45, 0]} color="#d8ddc8" />
          <Box size={[10, 0.9, 0.08]} position={[0, 0.45, 4.2]} color="#d8ddc8" />
          <SoftBox size={[1.25, 2.65, 0.09]} position={[-2.5, 1.34, 4.16]} color="#b5bfa1" radius={0.03} />
          <SoftBox size={[0.96, 1.9, 0.035]} position={[-2.5, 1.4, 4.1]} color="#cbd1b7" radius={0.03} />
          <mesh position={[-2.08, 1.25, 4.02]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color="#b39a65" metalness={0.6} roughness={0.45} />
          </mesh>
          <Picture position={[2.1, 2.6, 4.14]} rotation={Math.PI} kind="landscape" size={[1.3, 1]} />
        </group>
      )}
      <Window />
    </group>
  );
}
function Sofa() {
  const showKey = useGame((s) => s.dialog === 'pillow' && !s.hasKey && s.solved.includes('plant'));
  return (
    <group position={[-1.9, 0, -3.06]}>
      {[-1.38, 1.38].flatMap((x) =>
        [-0.43, 0.43].map((z) => (
          <Cylinder
            key={`${x}${z}`}
            position={[x, 0.16, z]}
            radius={0.075}
            top={0.06}
            height={0.29}
            color={p.woodDark}
          />
        )),
      )}
      <SoftBox
        size={[3.4, 0.4, 1.32]}
        position={[0, 0.43, 0]}
        color={p.sageDark}
        radius={0.16}
        material="fabric"
        outline
      />
      <SoftBox
        size={[3.1, 1.0, 0.38]}
        position={[0, 1.0, -0.5]}
        color={p.sage}
        radius={0.16}
        rotation={[-0.1, 0, 0]}
        material="fabric"
      />
      {[-0.74, 0.74].map((x) => (
        <group key={x}>
          <SoftBox
            size={[1.43, 0.24, 1.05]}
            position={[x, 0.69, 0.05]}
            color="#9bab84"
            radius={0.11}
            material="fabric"
          />
          <Line
            points={[
              [x - 0.65, 0.72, 0.57],
              [x + 0.65, 0.72, 0.57],
            ]}
            color="#758965"
            lineWidth={0.7}
          />
          <SoftBox
            size={[1.4, 0.66, 0.21]}
            position={[x, 1.11, -0.27]}
            color="#9eac88"
            radius={0.12}
            rotation={[-0.13, 0, 0]}
            material="fabric"
          />
        </group>
      ))}
      {[-1.63, 1.63].map((x) => (
        <SoftBox
          key={x}
          size={[0.35, 0.77, 1.4]}
          position={[x, 0.69, 0]}
          color={p.sage}
          radius={0.14}
          material="fabric"
          outline
        />
      ))}
      <Interactive id="pillow">
        <group position={[0.25, 1.05, 0.26]} rotation={[0.18, 0, -0.14]}>
          <SoftBox size={[0.65, 0.65, 0.21]} color={p.pink} radius={0.13} material="fabric" />
          <Line
            points={[
              [-0.25, -0.25, 0.12],
              [0.25, -0.25, 0.12],
              [0.25, 0.25, 0.12],
              [-0.25, 0.25, 0.12],
              [-0.25, -0.25, 0.12],
            ]}
            color="#c4937c"
            lineWidth={0.8}
          />
          <SoftBox size={[0.25, 0.19, 0.025]} position={[0, -0.12, 0.122]} color="#e6baa6" radius={0.02} />
          <Line
            points={[
              [-0.125, -0.03, 0.14],
              [0.125, -0.03, 0.14],
            ]}
            color="#b78369"
            lineWidth={1}
          />
        </group>
      </Interactive>
      {showKey && (
        <>
          <LittleKey position={[0.25, 1.65, 0.26]} scale={1.4} />
          <pointLight position={[0.25, 1.65, 0.26]} color="#e5c887" intensity={1} distance={2} />
        </>
      )}
      <SoftBox
        size={[0.62, 0.62, 0.22]}
        position={[-1.03, 1.02, 0.21]}
        rotation={[0.1, 0, 0.25]}
        color="#e8d9ac"
        radius={0.13}
        material="fabric"
      />
      <group position={[1.05, 0.82, 0.2]} rotation={[0, 0, -0.06]}>
        <SoftBox size={[0.62, 0.05, 0.95]} color="#d7b494" radius={0.02} material="fabric" />
        <SoftBox
          size={[0.6, 0.5, 0.05]}
          position={[0, -0.25, 0.47]}
          color="#d7b494"
          radius={0.02}
          material="fabric"
        />
        {Array.from({ length: 8 }, (_, i) => (
          <Stem
            key={i}
            from={[-0.25 + i * 0.07, -0.5, 0.48]}
            to={[-0.25 + i * 0.07, -0.58, 0.48]}
            radius={0.01}
            color="#c49d7a"
          />
        ))}
      </group>
    </group>
  );
}
function Bookshelf() {
  return (
    <Interactive id="books">
      <group position={[-4.57, 0, -2.1]} rotation={[0, Math.PI / 2, 0]}>
        <SoftBox size={[2.55, 2.65, 0.18]} position={[0, 1.43, -0.36]} color="#b8926e" material="wood" />
        {[-1.28, 1.28].map((x) => (
          <SoftBox
            key={x}
            size={[0.12, 2.85, 0.7]}
            position={[x, 1.44, -0.03]}
            color={p.woodLight}
            material="wood"
          />
        ))}
        {[0.16, 0.94, 1.72, 2.5, 2.88].map((y) => (
          <SoftBox
            key={y}
            size={[2.65, 0.105, 0.78]}
            position={[0, y, -0.02]}
            color={p.woodLight}
            material="wood"
          />
        ))}
        {[0.23, 1.01, 1.79].map((base, row) => (
          <group key={base}>
            {Array.from({ length: row === 0 ? 9 : 6 }, (_, i) => {
              const h = 0.43 + ((i * 7 + row) % 4) * 0.055,
                x = -1.04 + i * 0.22;
              return (
                <group key={i} position={[x, base + h / 2, 0.02]} rotation={[0, 0, i === 5 ? -0.12 : 0.015]}>
                  <SoftBox
                    size={[0.16, h, 0.41]}
                    color={['#869b7f', '#dbbf7f', '#d3a090', '#d8d4b7', '#80999b', '#b7a084'][(i + row) % 6]}
                    radius={0.012}
                  />
                  <Box size={[0.105, 0.018, 0.012]} position={[0, h / 2 - 0.08, 0.213]} color="#f0dec0" />
                  <Box size={[0.105, 0.018, 0.012]} position={[0, -h / 2 + 0.07, 0.213]} color="#f0dec0" />
                </group>
              );
            })}
            {row !== 0 && (
              <group position={[0.72, base + 0.03, 0.04]}>
                <SoftBox size={[0.57, 0.08, 0.46]} color="#b1b69b" radius={0.01} />
                <SoftBox
                  size={[0.51, 0.065, 0.43]}
                  position={[0.03, 0.072, 0]}
                  color="#d2a58a"
                  radius={0.01}
                />
                {row === 1 ? (
                  <Mug position={[0, 0.11, 0]} scale={0.7} color="#d4c29a" />
                ) : (
                  <Plant position={[0, 0.1, 0]} scale={0.42} potColor="#e6c9a7" />
                )}
              </group>
            )}
          </group>
        ))}
        <Plant position={[-0.7, 2.96, 0]} scale={0.6} potColor="#aeb899" kind="round" />
        <SoftBox size={[0.58, 0.22, 0.42]} position={[0.65, 3.06, -0.02]} color="#dec098" radius={0.03} />
        <SoftBox size={[0.6, 0.035, 0.44]} position={[0.65, 3.19, -0.02]} color="#cfad83" radius={0.015} />
      </group>
    </Interactive>
  );
}
function Drawer() {
  const drawer = useRef<THREE.Group>(null);
  const solved = useGame((s) => s.solved.includes('drawer'));
  useFrame((_, dt) => {
    if (drawer.current)
      drawer.current.position.z = THREE.MathUtils.damp(drawer.current.position.z, solved ? 0.36 : 0, 3, dt);
  });
  return (
    <Interactive id="drawer">
      <group position={[2.8, 0, -3.57]}>
        {[-0.87, 0.87].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <Cylinder
              key={`${x}${z}`}
              position={[x, 0.17, z]}
              radius={0.055}
              height={0.32}
              color={p.woodDark}
            />
          )),
        )}
        <SoftBox
          size={[2.15, 0.85, 0.89]}
          position={[0, 0.64, 0]}
          color="#bda17c"
          radius={0.035}
          material="wood"
        />
        <SoftBox
          size={[2.3, 0.1, 1.0]}
          position={[0, 1.1, 0]}
          color="#d2b28c"
          radius={0.035}
          material="wood"
        />
        <group ref={drawer}>
          <SoftBox
            size={[1.99, 0.34, 0.73]}
            position={[0, 0.86, 0.03]}
            color="#ac8f6b"
            radius={0.015}
            material="wood"
          />
          <SoftBox
            size={[2.02, 0.32, 0.08]}
            position={[0, 0.86, 0.48]}
            color="#d4ba92"
            radius={0.02}
            material="wood"
          />
          <SoftBox size={[0.48, 0.025, 0.35]} position={[0, 1.04, 0.03]} color="#efe2c7" radius={0.02} />
          <Cylinder
            radius={0.045}
            height={0.05}
            rotation={[Math.PI / 2, 0, 0]}
            position={[0, 0.86, 0.55]}
            color="#8a7452"
          />
        </group>
        <SoftBox
          size={[2.02, 0.32, 0.08]}
          position={[0, 0.47, 0.48]}
          color="#c8ac85"
          radius={0.02}
          material="wood"
        />
        <Cylinder
          radius={0.045}
          height={0.05}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.47, 0.55]}
          color="#8a7452"
        />
        <Plant position={[0.65, 1.16, -0.08]} scale={0.5} potColor="#c6b59a" />
        <Picture position={[-0.45, 1.48, 0.01]} size={[0.39, 0.52]} kind="landscape" />
        <Cylinder radius={0.11} height={0.15} position={[0.15, 1.24, 0.14]} color="#e6d7ad" />
      </group>
    </Interactive>
  );
}
function RecordPlayer() {
  const vinyl = useRef<THREE.Group>(null),
    arm = useRef<THREE.Group>(null);
  const playing = useGame((s) => s.recordPlaying);
  useFrame((_, dt) => {
    if (vinyl.current && playing) vinyl.current.rotation.y += dt * 1.8;
    if (arm.current)
      arm.current.rotation.y = THREE.MathUtils.damp(arm.current.rotation.y, playing ? -0.35 : 0.2, 3, dt);
  });
  return (
    <Interactive id="record">
      <group position={[4.18, 0, -0.55]} rotation={[0, -Math.PI / 2, 0]}>
        {[-0.65, 0.65].flatMap((x) =>
          [-0.3, 0.3].map((z) => (
            <Cylinder
              key={`${x}${z}`}
              position={[x, 0.26, z]}
              radius={0.06}
              height={0.5}
              color={p.woodDark}
            />
          )),
        )}
        <SoftBox
          size={[1.65, 0.5, 0.85]}
          position={[0, 0.69, 0]}
          color="#b69b77"
          material="wood"
          radius={0.035}
        />
        <SoftBox
          size={[1.77, 0.09, 0.94]}
          position={[0, 0.99, 0]}
          color={p.woodLight}
          material="wood"
          radius={0.03}
        />
        <SoftBox size={[1.42, 0.15, 0.72]} position={[0, 1.12, 0]} color="#98876a" radius={0.045} />
        <SoftBox
          size={[1.4, 0.75, 0.055]}
          position={[0, 1.52, -0.35]}
          rotation={[-0.18, 0, 0]}
          color="#8f9b7c"
          radius={0.05}
        />
        <SoftBox
          size={[1.2, 0.56, 0.018]}
          position={[0, 1.52, -0.305]}
          rotation={[-0.18, 0, 0]}
          color="#b7bca1"
          radius={0.04}
        />
        <group ref={vinyl} position={[-0.19, 1.215, 0.015]}>
          <Cylinder radius={0.285} height={0.016} color="#3d4037" />
          {[0.25, 0.22, 0.19].map((r) => (
            <mesh key={r} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
              <torusGeometry args={[r, 0.002, 4, 48]} />
              <meshStandardMaterial color="#626452" />
            </mesh>
          ))}
          <Cylinder radius={0.095} height={0.019} color={p.blush} />
          <Cylinder radius={0.022} height={0.026} color="#d6c9a3" />
          <Box size={[0.08, 0.002, 0.01]} position={[0.04, 0.02, 0]} color="#f3debb" />
        </group>
        <group ref={arm} position={[0.48, 1.23, -0.21]} rotation={[0, 0.2, 0]}>
          <Cylinder radius={0.05} height={0.055} color="#a99c7e" />
          <Stem from={[0, 0.04, 0]} to={[-0.19, 0.04, 0.38]} radius={0.018} color="#d3c9af" />
          <SoftBox size={[0.075, 0.04, 0.1]} position={[-0.19, 0.03, 0.38]} color="#52594b" radius={0.01} />
        </group>
        <SoftBox size={[0.6, 0.27, 0.025]} position={[-0.38, 0.7, 0.44]} color="#7f866e" radius={0.025} />
        {Array.from({ length: 5 }, (_, i) => (
          <Box
            key={i}
            size={[0.45, 0.012, 0.012]}
            position={[-0.38, 0.6 + i * 0.045, 0.458]}
            color="#555e4d"
          />
        ))}
        {[0.22, 0.48].map((x) => (
          <Cylinder
            key={x}
            radius={0.045}
            height={0.035}
            position={[x, 0.71, 0.46]}
            rotation={[Math.PI / 2, 0, 0]}
            color="#dac8a0"
          />
        ))}
        <SoftBox size={[0.52, 0.07, 0.46]} position={[0.38, 0.39, 0.02]} color="#c79b83" radius={0.01} />
      </group>
    </Interactive>
  );
}
function RugAndTable() {
  return (
    <group>
      <group position={[-0.5, 0.018, 0.1]} rotation={[-Math.PI / 2, 0, 0.03]}>
        <mesh receiveShadow>
          <circleGeometry args={[2.25, 64]} />
          <meshStandardMaterial color="#d6cba8" roughness={1} map={paperTexture('fabric')} />
        </mesh>
        {[2.17, 2.09, 1.98].map((r, i) => (
          <mesh key={r} position={[0, 0, 0.003 + i * 0.001]}>
            <ringGeometry args={[r - 0.018, r, 64]} />
            <meshStandardMaterial color={i === 1 ? '#a3aa88' : '#ece0bd'} />
          </mesh>
        ))}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          return (
            <Stem
              key={i}
              from={[Math.sin(a) * 2.24, Math.cos(a) * 2.24, 0.002]}
              to={[Math.sin(a) * 2.33, Math.cos(a) * 2.33, 0.002]}
              radius={0.012}
              color="#d5c8a4"
            />
          );
        })}
      </group>
      <group position={[-0.3, 0, 0.05]}>
        {[0, 2.094, 4.188].map((a) => (
          <Stem
            key={a}
            from={[Math.sin(a) * 0.65, 0.07, Math.cos(a) * 0.65]}
            to={[Math.sin(a) * 0.45, 0.69, Math.cos(a) * 0.45]}
            radius={0.065}
            color="#ae8761"
          />
        ))}
        <Cylinder
          radius={1.01}
          top={1.04}
          height={0.12}
          position={[0, 0.72, 0]}
          color="#d7b18a"
          material="wood"
          segments={64}
        />
        <Cylinder
          radius={0.99}
          height={0.025}
          position={[0, 0.795, 0]}
          color="#dfbd94"
          material="wood"
          segments={64}
        />
        <Mug position={[0.68, 0.81, 0.6]} color="#f3e3bf" rotation={2.4} scale={0.7} />
        <group position={[-0.65, 0.82, 0.64]} rotation={[0, 0.16, 0]}>
          <SoftBox size={[0.3, 0.045, 0.19]} color="#a5af8c" radius={0.008} />
          <SoftBox size={[0.28, 0.03, 0.17]} position={[0.01, 0.039, 0]} color="#f0dfb8" radius={0.008} />
        </group>
      </group>
    </group>
  );
}
function ClockAndDecor() {
  const flagGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.14, 0);
    shape.lineTo(0.14, 0);
    shape.lineTo(0, -0.36);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);
  return (
    <group>
      <Interactive id="clock">
        <group position={[-0.2, 3, -4.12]}>
          <Cylinder radius={0.4} height={0.09} rotation={[Math.PI / 2, 0, 0]} color="#ac8d68" />
          <mesh position={[0, 0, 0.052]}>
            <circleGeometry args={[0.349, 48]} />
            <meshStandardMaterial color="#f7eacb" roughness={1} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <Box
                key={i}
                size={[0.012, i % 3 === 0 ? 0.055 : 0.03, 0.01]}
                position={[Math.sin(a) * 0.29, Math.cos(a) * 0.29, 0.065]}
                rotation={[0, 0, -a]}
                color="#837357"
              />
            );
          })}
          <Stem
            from={[0, 0, 0.08]}
            to={[
              Math.sin((4.333 / 12) * Math.PI * 2) * 0.17,
              Math.cos((4.333 / 12) * Math.PI * 2) * 0.17,
              0.08,
            ]}
            radius={0.018}
            color="#6a705a"
          />
          <Stem
            from={[0, 0, 0.081]}
            to={[Math.sin((20 / 60) * Math.PI * 2) * 0.25, Math.cos((20 / 60) * Math.PI * 2) * 0.25, 0.081]}
            radius={0.012}
            color="#6a705a"
          />
          <mesh position={[0, 0, 0.09]}>
            <sphereGeometry args={[0.027, 10, 8]} />
            <meshStandardMaterial color="#be906e" />
          </mesh>
        </group>
      </Interactive>
      <Picture position={[-2.85, 2.65, -4.11]} size={[0.88, 1.16]} />
      <Picture position={[-1.67, 2.6, -4.11]} size={[0.68, 0.87]} kind="landscape" />
      <Picture position={[-4.92, 2.8, 0.7]} size={[1.3, 1.0]} kind="landscape" rotation={Math.PI / 2} />
      <Line
        points={Array.from({ length: 25 }, (_, i) => {
          const x = -4.6 + i * 0.38;
          return [x, 3.94 - Math.sin((i / 24) * Math.PI) * 0.35, -3.96] as Vec3;
        })}
        color="#9b8b6c"
        lineWidth={1}
      />
      {Array.from({ length: 19 }, (_, i) => {
        const x = -4.25 + i * 0.47,
          y = 3.94 - Math.sin(((x + 4.6) / 9.12) * Math.PI) * 0.35;
        return (
          <mesh
            key={i}
            geometry={flagGeo}
            position={[x, y, -3.95]}
            rotation={[0, 0.03, Math.cos(i) * 0.1]}
            castShadow
          >
            <meshStandardMaterial
              color={[p.sage, p.blush, p.yellow, '#bbc3a5'][i % 4]}
              side={THREE.DoubleSide}
              roughness={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}
function LightingFixtures() {
  const lamp = useRef<THREE.PointLight>(null),
    pendant = useRef<THREE.PointLight>(null);
  useFrame((_, dt) => {
    const s = useGame.getState(),
      dark = s.night || s.phase === 'opening' || s.phase === 'wish';
    if (lamp.current)
      lamp.current.intensity = THREE.MathUtils.damp(lamp.current.intensity, dark ? 8 : 1.3, 1.3, dt);
    if (pendant.current)
      pendant.current.intensity = THREE.MathUtils.damp(pendant.current.intensity, dark ? 10 : 2, 1.3, dt);
  });
  return (
    <group>
      <group position={[0.61, 0, -3.65]}>
        <Cylinder radius={0.3} height={0.06} position={[0, 0.05, 0]} color="#aa9877" />
        <Cylinder radius={0.025} height={2.1} position={[0, 1.1, 0]} color="#ad9370" />
        <mesh position={[0, 2.2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.47, 0.58, 32, 1, true]} />
          <meshStandardMaterial color="#f4dfb3" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <Cylinder radius={0.46} height={0.018} position={[0, 1.91, 0]} color="#e5c78d" />
        <pointLight
          ref={lamp}
          position={[0, 1.95, 0.12]}
          intensity={1.3}
          distance={6}
          decay={2}
          color="#ffdb99"
        />
      </group>
      <group position={[-0.4, 0, -0.15]}>
        <Cylinder radius={0.015} height={0.55} position={[0, 4.05, 0]} color="#9b8769" />
        <mesh position={[0, 3.6, 0]} scale={[0.7, 0.44, 0.7]}>
          <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#b3bb95" side={THREE.DoubleSide} roughness={1} />
        </mesh>
        <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.025, 8, 40]} />
          <meshStandardMaterial color="#8d9b73" />
        </mesh>
        <pointLight
          ref={pendant}
          position={[0, 3.4, 0]}
          intensity={2}
          distance={9}
          decay={2}
          color="#ffdfac"
        />
      </group>
    </group>
  );
}
function ChairAndDetails() {
  return (
    <group>
      <group position={[2.8, 0, 2.0]} rotation={[0, -0.5, 0]}>
        {[-0.43, 0.43].flatMap((x) =>
          [-0.43, 0.43].map((z) => (
            <Stem
              key={`${x}${z}`}
              from={[x * 1.14, 0.05, z * 1.14]}
              to={[x, 0.61, z]}
              radius={0.045}
              color={p.woodDark}
            />
          )),
        )}
        <SoftBox
          size={[1.13, 0.22, 1.07]}
          position={[0, 0.68, 0]}
          color="#b7bea0"
          radius={0.13}
          material="fabric"
        />
        <SoftBox
          size={[1.1, 0.88, 0.21]}
          position={[0, 1.07, 0.43]}
          rotation={[0.11, 0, 0]}
          color="#a4b08d"
          radius={0.12}
          material="fabric"
        />
        {[-0.54, 0.54].map((x) => (
          <group key={x}>
            <Stem from={[x, 0.67, -0.3]} to={[x, 1.02, -0.3]} radius={0.035} color={p.wood} />
            <SoftBox
              size={[0.1, 0.085, 0.85]}
              position={[x, 1.05, 0.02]}
              color={p.woodLight}
              radius={0.035}
              material="wood"
            />
          </group>
        ))}
        <SoftBox
          size={[0.52, 0.47, 0.16]}
          position={[0, 0.98, 0.2]}
          rotation={[0.2, 0, 0.13]}
          color="#e6c795"
          radius={0.12}
          material="fabric"
        />
      </group>
      <Plant position={[-4.14, 0.04, 1.6]} scale={1.5} potColor="#c7977e" kind="tall" />
      <group position={[-3.8, 0, 3.1]}>
        <Cylinder radius={0.4} top={0.44} height={0.45} position={[0, 0.25, 0]} color="#b5aa82" />
        {[0.09, 0.18, 0.27, 0.36, 0.45].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4 + y * 0.08, 0.012, 5, 32]} />
            <meshStandardMaterial color="#c9ba94" />
          </mesh>
        ))}
        <SoftBox
          size={[0.58, 0.17, 0.55]}
          position={[0, 0.51, 0]}
          color="#ddd4b6"
          radius={0.06}
          material="fabric"
        />
      </group>
      <group position={[3.95, 0, 3.25]}>
        <Cylinder radius={0.45} height={0.07} position={[0, 0.55, 0]} color={p.woodLight} />
        <Cylinder radius={0.045} height={0.5} position={[0, 0.27, 0]} color={p.woodDark} />
        <Cylinder radius={0.24} height={0.05} position={[0, 0.04, 0]} color={p.wood} />
        <Plant position={[0, 0.6, 0]} scale={0.52} potColor="#e2c9a2" kind="round" />
      </group>
      <group position={[-3.96, 0.73, -0.23]}>
        <Cylinder radius={0.38} height={0.055} color={p.woodLight} />
        <Cylinder radius={0.04} height={0.69} position={[0, -0.36, 0]} color={p.woodDark} />
        <Mug position={[0.02, 0.04, 0.02]} color="#b5bc9e" scale={0.8} />
      </group>
    </group>
  );
}
export function Room() {
  return (
    <group>
      <Floor />
      <Walls />
      <RugAndTable />
      <Sofa />
      <Bookshelf />
      <Drawer />
      <RecordPlayer />
      <ClockAndDecor />
      <LightingFixtures />
      <ChairAndDetails />
    </group>
  );
}
