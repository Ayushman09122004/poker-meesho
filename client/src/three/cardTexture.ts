import * as THREE from 'three';
import { Card } from '../../../shared/types';

const SUIT_SYMBOL: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLOR: Record<Card['suit'], string> = {
  spades: '#1a1a2e',
  clubs: '#1a1a2e',
  hearts: '#c81e3a',
  diamonds: '#c81e3a',
};

const faceCache = new Map<string, THREE.CanvasTexture>();
let backTexture: THREE.CanvasTexture | null = null;

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function getCardFaceTexture(card: Card): THREE.CanvasTexture {
  const key = `${card.rank}${card.suit}`;
  const cached = faceCache.get(key);
  if (cached) return cached;

  const w = 350;
  const h = 490;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  roundedRect(ctx, 0, 0, w, h, 28);
  ctx.fill();
  ctx.strokeStyle = '#c9c9d4';
  ctx.lineWidth = 4;
  ctx.stroke();

  const color = SUIT_COLOR[card.suit];
  const symbol = SUIT_SYMBOL[card.suit];
  ctx.fillStyle = color;

  // Corner indices (top-left, and bottom-right rotated 180°)
  ctx.textBaseline = 'top';
  ctx.font = 'bold 54px "Georgia", serif';
  ctx.fillText(card.rank, 22, 18);
  ctx.font = '46px serif';
  ctx.fillText(symbol, 26, 78);

  ctx.save();
  ctx.translate(w - 22, h - 18);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 54px "Georgia", serif';
  ctx.textBaseline = 'top';
  ctx.fillText(card.rank, 0, 0);
  ctx.font = '46px serif';
  ctx.fillText(symbol, 4, 60);
  ctx.restore();

  // Big center pip
  ctx.font = '190px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, w / 2, h / 2 + 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  faceCache.set(key, texture);
  return texture;
}

export function getCardBackTexture(): THREE.CanvasTexture {
  if (backTexture) return backTexture;

  const w = 350;
  const h = 490;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#1c2333');
  gradient.addColorStop(1, '#0a0f1a');
  ctx.fillStyle = gradient;
  roundedRect(ctx, 0, 0, w, h, 28);
  ctx.fill();

  ctx.strokeStyle = 'rgba(227,182,79,0.55)';
  ctx.lineWidth = 6;
  roundedRect(ctx, 16, 16, w - 32, h - 32, 20);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(227,182,79,0.25)';
  ctx.lineWidth = 2;
  roundedRect(ctx, 30, 30, w - 60, h - 60, 14);
  ctx.stroke();

  ctx.fillStyle = 'rgba(227,182,79,0.75)';
  ctx.font = '150px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', w / 2, h / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  backTexture = texture;
  return texture;
}
