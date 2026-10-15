import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FxKind } from '../lib/characterFx';

// The signature win move that plays over the table when a character takes a pot: a particle burst
// from their seat, a full-table overlay for the bigger moves, and their catchphrase. Everything is
// positioned in the table's design-space coordinates (it renders inside the scaled stage).

export interface FxEvent {
  id: number;
  x: number;
  y: number;
  /** Where the pot sat — laser beams and chains aim here. */
  potX: number;
  potY: number;
  kind: FxKind;
  color: string;
  line: string;
}

type Shape = 'spark' | 'shard' | 'drop' | 'puff' | 'confetti';
type Overlay = 'flash' | 'vignette' | 'lightning' | 'sharingan' | 'slashes' | 'laser' | 'frost' | 'code';

interface Spec {
  glyphs?: string[];
  shape?: Shape;
  colors?: string[];
  motion: 'explode' | 'rise' | 'fall';
  count: number;
  overlays?: Overlay[];
}

const SPEC: Record<FxKind, Spec> = {
  fire: { shape: 'spark', colors: ['#ffd27a', '#ff8a1a', '#ff4d00'], motion: 'rise', count: 46, overlays: ['flash'] },
  ice: { shape: 'shard', colors: ['#e0f7ff', '#7dd3fc', '#38bdf8'], motion: 'explode', count: 34, overlays: ['frost'] },
  lightning: { shape: 'spark', motion: 'explode', count: 26, overlays: ['lightning', 'flash'] },
  shadow: { shape: 'puff', colors: ['#0b0b12', '#1e1b2e', '#312e4a'], motion: 'explode', count: 22, overlays: ['vignette'] },
  blood: { shape: 'drop', colors: ['#7f1d1d', '#b91c1c', '#dc2626'], motion: 'explode', count: 30, overlays: ['vignette'] },
  sharingan: { shape: 'spark', colors: ['#dc2626', '#111'], motion: 'explode', count: 18, overlays: ['sharingan'] },
  gold: { glyphs: ['🪙', '💰', '✨'], motion: 'explode', count: 26 },
  slash: { shape: 'spark', motion: 'explode', count: 20, overlays: ['slashes'] },
  bullets: { glyphs: ['💥', '✨'], shape: 'spark', colors: ['#fde68a', '#facc15'], motion: 'explode', count: 22, overlays: ['flash'] },
  rage: { shape: 'spark', colors: ['#ef4444', '#f97316', '#fde047'], motion: 'explode', count: 36, overlays: ['vignette', 'flash'] },
  smoke: { shape: 'puff', colors: ['#6b7280', '#9ca3af', '#4b5563'], motion: 'rise', count: 20 },
  sakura: { glyphs: ['🌸', '🌸', '🍃'], motion: 'explode', count: 26 },
  matrix: { glyphs: ['0', '1', 'ｱ', 'ﾊ', 'ﾐ', 'ﾋ'], colors: ['#4ade80'], motion: 'fall', count: 40, overlays: ['code'] },
  laser: { shape: 'spark', colors: ['#fecaca', '#ef4444'], motion: 'explode', count: 18, overlays: ['laser', 'flash'] },
  crystal: { glyphs: ['💎', '💠'], motion: 'explode', count: 22 },
  cards: { glyphs: ['🃏', '♠️', '♥️', '♦️', '♣️'], motion: 'explode', count: 24 },
  slime: { shape: 'drop', colors: ['#84cc16', '#65a30d', '#a3e635'], motion: 'explode', count: 28 },
  bees: { glyphs: ['🐝'], motion: 'explode', count: 22 },
  confetti: { shape: 'confetti', colors: ['#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7'], motion: 'explode', count: 44 },
  donuts: { glyphs: ['🍩', '🍩', '🍺'], motion: 'explode', count: 20 },
  bears: { glyphs: ['🐻', '🧄', '🚀'], motion: 'explode', count: 18 },
  boom: { glyphs: ['💥', '🔥', '⭐'], motion: 'explode', count: 22, overlays: ['flash'] },
};

export const FX_DURATION_MS = 2900;

function rnd(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export const WinFx = memo(function WinFx({ ev, stageW, stageH, cx, cy }: { ev: FxEvent; stageW: number; stageH: number; cx: number; cy: number }) {
  const spec = SPEC[ev.kind];
  // Speech bubble: above seats in the lower half, below seats along the top (so it never leaves the
  // screen), and nudged sideways for seats near the bottom centre so it clears the hand label.
  const upper = ev.y < cy - 80;
  const bubbleX = !upper && Math.abs(ev.x - cx) < 320 ? ev.x - 300 : ev.x;
  const bubbleY = upper ? ev.y + 150 : ev.y - 165;
  const particles = useMemo(
    () =>
      Array.from({ length: spec.count }, (_, i) => {
        const angle = rnd(0, Math.PI * 2);
        const dist = rnd(90, 260);
        const glyph = spec.glyphs && (!spec.shape || i % 2 === 0) ? spec.glyphs[i % spec.glyphs.length] : null;
        const color = spec.colors ? spec.colors[i % spec.colors.length] : ev.color;
        let dx = Math.cos(angle) * dist;
        let dy = Math.sin(angle) * dist;
        if (spec.motion === 'rise') {
          dx = rnd(-110, 110);
          dy = -rnd(140, 320);
        } else if (spec.motion === 'fall') {
          dx = rnd(-220, 220);
          dy = rnd(-260, -80);
        }
        return { i, glyph, color, dx, dy, size: rnd(8, 18), rot: rnd(-260, 260), delay: rnd(0, 0.25), dur: rnd(1.1, 1.9) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ev.id]
  );

  const overlays = spec.overlays ?? [];
  const angleToPot = Math.atan2(ev.potY - ev.y, ev.potX - ev.x);
  const potDist = Math.hypot(ev.potX - ev.x, ev.potY - ev.y);

  return (
    <div className="absolute inset-0 pointer-events-none z-40">
      {/* Full-table overlays */}
      {overlays.includes('flash') && (
        <motion.div
          className="absolute inset-0"
          style={{ background: `radial-gradient(circle at ${(ev.x / stageW) * 100}% ${(ev.y / stageH) * 100}%, ${ev.color}88, transparent 55%)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.9 }}
        />
      )}
      {overlays.includes('vignette') && (
        <motion.div
          className="absolute -inset-20"
          style={{ boxShadow: `inset 0 0 220px 90px ${ev.color}aa` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.2, times: [0, 0.15, 0.7, 1] }}
        />
      )}
      {overlays.includes('frost') && (
        <motion.div
          className="absolute -inset-20"
          style={{ boxShadow: 'inset 0 0 260px 110px rgba(186,230,253,0.75)', backdropFilter: 'saturate(0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 2.4, times: [0, 0.12, 0.7, 1] }}
        />
      )}
      {overlays.includes('code') && (
        <motion.div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,40,10,0.55), rgba(0,20,5,0.25))' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2.2 }}
        />
      )}
      {overlays.includes('lightning') && <Lightning ev={ev} />}
      {overlays.includes('sharingan') && <Sharingan stageW={stageW} stageH={stageH} />}
      {overlays.includes('slashes') &&
        [0, 1, 2].map((k) => (
          <motion.div
            key={k}
            className="absolute h-[5px] rounded-full"
            style={{
              left: ev.x - 330,
              top: ev.y - 60 + k * 60,
              width: 660,
              background: `linear-gradient(90deg, transparent, #fff, ${ev.color}, transparent)`,
              boxShadow: `0 0 18px 4px ${ev.color}`,
              rotate: -28 + k * 6,
              transformOrigin: 'left center',
            }}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 0.75, delay: 0.12 * k, times: [0, 0.35, 1] }}
          />
        ))}
      {overlays.includes('laser') &&
        [-10, 10].map((off) => (
          <motion.div
            key={off}
            className="absolute h-[7px] rounded-full"
            style={{
              left: ev.x + off * 0.4,
              top: ev.y - 20 + off * 0.3,
              width: potDist,
              rotate: (angleToPot * 180) / Math.PI,
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, #fff, #ef4444)',
              boxShadow: '0 0 24px 6px rgba(239,68,68,0.9)',
            }}
            initial={{ scaleX: 0, opacity: 1 }}
            animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
            transition={{ duration: 1.1, times: [0, 0.3, 1] }}
          />
        ))}

      {/* Particle burst from the winner's seat */}
      {particles.map((p) => (
        <motion.div
          key={p.i}
          className="absolute"
          style={{ left: ev.x, top: ev.y }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
          animate={{ x: p.dx, y: p.dy, opacity: [1, 1, 0], scale: [0.4, 1.2, 0.8], rotate: p.rot }}
          transition={{ duration: p.dur, delay: p.delay, ease: 'easeOut' }}
        >
          {p.glyph ? (
            <span style={{ fontSize: p.size * 2, color: p.color, textShadow: ev.kind === 'matrix' ? '0 0 8px #22c55e' : undefined }}>{p.glyph}</span>
          ) : (
            <Particle shape={spec.shape ?? 'spark'} color={p.color} size={p.size} />
          )}
        </motion.div>
      ))}

      {/* Catchphrase */}
      <motion.div
        className="absolute"
        style={{ left: bubbleX, top: bubbleY, x: '-50%' }}
        initial={{ opacity: 0, scale: 0.4, y: 20 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.12, 1, 1], y: [20, 0, 0, -10] }}
        transition={{ duration: FX_DURATION_MS / 1000, times: [0, 0.12, 0.8, 1] }}
      >
        <div
          className="relative max-w-[380px] px-5 py-2.5 rounded-2xl bg-white text-ink-950 font-display font-extrabold text-[22px] leading-tight text-center whitespace-normal"
          style={{ boxShadow: `0 0 0 4px ${ev.color}, 0 10px 30px rgba(0,0,0,0.6)` }}
        >
          {ev.line}
          <span
            className="absolute left-1/2 -bottom-3 w-6 h-6 bg-white rotate-45 -translate-x-1/2"
            style={{ boxShadow: `4px 4px 0 0 ${ev.color}` }}
          />
        </div>
      </motion.div>
    </div>
  );
});

function Particle({ shape, color, size }: { shape: Shape; color: string; size: number }) {
  if (shape === 'shard')
    return <span className="block" style={{ width: size * 0.6, height: size * 2, background: `linear-gradient(${color}, #fff)`, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)', boxShadow: `0 0 10px ${color}` }} />;
  if (shape === 'drop') return <span className="block rounded-full" style={{ width: size, height: size * 1.3, background: color, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }} />;
  if (shape === 'puff') return <span className="block rounded-full blur-[6px]" style={{ width: size * 4, height: size * 4, background: color, opacity: 0.8 }} />;
  if (shape === 'confetti') return <span className="block" style={{ width: size * 0.7, height: size * 1.2, background: color }} />;
  return <span className="block rounded-full" style={{ width: size * 0.7, height: size * 0.7, background: color, boxShadow: `0 0 12px 3px ${color}` }} />;
}

function Lightning({ ev }: { ev: FxEvent }) {
  const bolts = useMemo(
    () =>
      [0, 1, 2].map(() => {
        const pts: string[] = [];
        let x = ev.x + rnd(-260, 260);
        let y = -20;
        const steps = 9;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const tx = x + (ev.x - x) * t + rnd(-40, 40);
          const ty = y + (ev.y - 40 - y) * t;
          pts.push(`${tx},${ty}`);
        }
        return pts.join(' ');
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ev.id]
  );
  return (
    <motion.svg className="absolute inset-0 w-full h-full overflow-visible" initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.2, 1, 0] }} transition={{ duration: 1.1 }}>
      {bolts.map((pts, i) => (
        <polyline key={i} points={pts} fill="none" stroke={ev.color} strokeWidth={6} style={{ filter: `drop-shadow(0 0 10px ${ev.color})` }} />
      ))}
      {bolts.map((pts, i) => (
        <polyline key={`c${i}`} points={pts} fill="none" stroke="#fff" strokeWidth={2} />
      ))}
    </motion.svg>
  );
}

function Sharingan({ stageW, stageH }: { stageW: number; stageH: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        left: stageW / 2 - 170,
        top: stageH / 2 - 170,
        width: 340,
        height: 340,
        background: 'radial-gradient(circle, #111 0 13%, #b91c1c 14% 62%, #7f1d1d 63% 66%, #111 67% 70%, transparent 71%)',
        boxShadow: '0 0 80px 30px rgba(220,38,38,0.55)',
      }}
      initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
      animate={{ opacity: [0, 0.95, 0.95, 0], scale: [0.3, 1, 1.05, 1.3], rotate: 540 }}
      transition={{ duration: 2.4, times: [0, 0.2, 0.75, 1] }}
    >
      {[0, 120, 240].map((a) => (
        <span
          key={a}
          className="absolute w-8 h-8 rounded-full bg-[#111]"
          style={{ left: 170 - 16 + Math.cos((a * Math.PI) / 180) * 70, top: 170 - 16 + Math.sin((a * Math.PI) / 180) * 70, borderRadius: '50% 50% 50% 0' }}
        />
      ))}
    </motion.div>
  );
}
