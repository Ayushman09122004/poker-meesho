import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

/** A small canvas texture of a character's emoji "face", used on the plate in front of their head. */
export function getCharacterFaceTexture(emoji: string): THREE.CanvasTexture {
  const cached = cache.get(emoji);
  if (cached) return cached;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);
  ctx.font = `${size * 0.72}px "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size * 0.56);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(emoji, texture);
  return texture;
}
