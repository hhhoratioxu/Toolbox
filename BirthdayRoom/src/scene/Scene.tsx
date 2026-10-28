import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Preload, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { Room } from './Room';
import { Gift } from './Gift';
import { Player } from './Player';
import { useGame } from '../game/store';
import { PlantMagic } from './PlantMagic';

function Atmosphere({ low, onSlow }: { low: boolean; onSlow: () => void }) {
  const ambient = useRef<THREE.AmbientLight>(null),
    sun = useRef<THREE.DirectionalLight>(null),
    hemi = useRef<THREE.HemisphereLight>(null);
  const { gl, scene } = useThree();
  const day = useMemo(() => new THREE.Color('#f2eddf'), []),
    night = useMemo(() => new THREE.Color('#aaa69e'), []),
    blend = useRef(0);
  const frames = useRef({ time: 0, count: 0 });
  const total = useRef(0);
  const shadowState = useRef({ entered: false, drawer: false, timer: 2 });
  useFrame((_, dt) => {
    const s = useGame.getState();
    if (
      shadowState.current.entered !== s.entered ||
      shadowState.current.drawer !== s.solved.includes('drawer')
    ) {
      shadowState.current = { entered: s.entered, drawer: s.solved.includes('drawer'), timer: 2 };
    }
    shadowState.current.timer -= dt;
    if (sun.current) sun.current.shadow.needsUpdate = shadowState.current.timer > 0 || s.phase === 'opening';
    const dark = s.phase === 'opening' || s.phase === 'wish' || (s.night && s.phase === 'explore');
    blend.current = THREE.MathUtils.damp(blend.current, dark ? 1 : 0, 0.85, dt);
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(0.6, 0.28, blend.current);
    if (sun.current) sun.current.intensity = THREE.MathUtils.lerp(2.7, 0.35, blend.current);
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(1.15, 0.45, blend.current);
    (scene.background as THREE.Color).copy(day).lerp(night, blend.current);
    gl.toneMappingExposure = THREE.MathUtils.lerp(1.0, 0.83, blend.current);
    frames.current.time += dt;
    frames.current.count++;
    total.current += dt;
    if (frames.current.time > 2) {
      gl.domElement.dataset.fps = String(Math.round(frames.current.count / frames.current.time));
      gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
      if (
        total.current > 8 &&
        frames.current.count / frames.current.time < 34 &&
        s.quality === 'auto' &&
        !low
      )
        onSlow();
      window.dispatchEvent(
        new CustomEvent('room:metrics', {
          detail: {
            fps: Math.round(frames.current.count / frames.current.time),
            calls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
          },
        }),
      );
      frames.current = { time: 0, count: 0 };
    }
  });
  return (
    <>
      <ambientLight ref={ambient} intensity={0.8} color="#f3e6cc" />
      <hemisphereLight ref={hemi} args={['#f1eada', '#c1ab82', 1.45]} />
      <directionalLight
        ref={sun}
        position={[3, 9, 5]}
        color="#fff0d2"
        intensity={3.4}
        castShadow
        shadow-autoUpdate={false}
        shadow-mapSize={low ? [1024, 1024] : [2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
      />
      <directionalLight position={[-3, 5, -1]} intensity={0.6} color="#d4ddc1" />
      {!low && <SoftShadows size={16} samples={8} focus={0.45} />}
    </>
  );
}
function Ready() {
  const { gl } = useThree();
  useEffect(() => {
    // Give the renderer real frames before removing the loading curtain.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => useGame.getState().setReady()));
    const lost = (e: Event) => {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('room:webgl-lost'));
    };
    gl.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(id);
      gl.domElement.removeEventListener('webglcontextlost', lost);
    };
  }, [gl]);
  return null;
}
export default function Scene() {
  const quality = useGame((s) => s.quality);
  const [mobile] = useState(
    () => matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency <= 4,
  );
  const [adaptiveLow, setAdaptiveLow] = useState(false);
  const low = quality === 'low' || (quality === 'auto' && (mobile || adaptiveLow));
  return (
    <Canvas
      shadows
      dpr={low ? [1, 1.25] : [1, 1.75]}
      camera={{ position: [12, 10.2, 14], fov: 40, near: 0.06, far: 75 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: low ? 'low-power' : 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      performance={{ min: 0.55 }}
      aria-label="可以自由探索的三维生日小屋"
      onCreated={({ scene }) => {
        scene.background = new THREE.Color('#f2eddf');
      }}
    >
      <Suspense fallback={null}>
        <Atmosphere low={low} onSlow={() => setAdaptiveLow(true)} />
        <Room />
        <Gift />
        <PlantMagic />
        <Player />
        <Ready />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.39, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <shadowMaterial transparent opacity={0.12} />
        </mesh>
        <AdaptiveDpr pixelated />
        <Preload all />
      </Suspense>
    </Canvas>
  );
}
