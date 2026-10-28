import * as THREE from 'three';

export const palette = {
  cream: '#eee5d3',
  wall: '#eee9dc',
  sage: '#8d9e79',
  sageDark: '#6c805e',
  sageLight: '#a8b696',
  wood: '#c89b72',
  woodLight: '#dfb88e',
  woodDark: '#99795d',
  blush: '#d8a392',
  pink: '#e6b9a6',
  yellow: '#e2c77f',
  ink: '#6b5b48',
  ivory: '#fff6df',
};
const cache = new Map<string, THREE.CanvasTexture>();
function random(seed: number) {
  let n = seed;
  return () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

export function paperTexture(kind: 'paper' | 'wood' | 'fabric' = 'paper'): THREE.CanvasTexture {
  if (cache.has(kind)) return cache.get(kind)!;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  const rand = random(42);
  const dots = kind === 'fabric' ? 3800 : 2400;
  for (let i = 0; i < dots; i++) {
    ctx.fillStyle = `rgba(92,72,44,${rand() * (kind === 'wood' ? 0.08 : 0.055)})`;
    ctx.fillRect(rand() * 256, rand() * 256, rand() * 2 + 0.3, rand() * 2 + 0.3);
  }
  if (kind === 'wood') {
    for (let i = 0; i < 35; i++) {
      const y = rand() * 256;
      ctx.strokeStyle = `rgba(105,70,30,${0.02 + rand() * 0.06})`;
      ctx.lineWidth = 0.3 + rand() * 0.6;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(64, y + rand() * 8, 170, y - rand() * 9, 256, y + rand() * 4);
      ctx.stroke();
    }
  }
  if (kind === 'fabric') {
    ctx.strokeStyle = 'rgba(92,72,44,.045)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 256; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  cache.set(kind, texture);
  return texture;
}
export function disposeTextures() {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
