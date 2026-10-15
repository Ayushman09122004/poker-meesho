import { memo, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ThrowItem } from '../../../shared/types';
import { throwAt } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';

// Throwables: an item arcs from the thrower's seat to the target's avatar, then lands with its
// own impact (tomato splat, rose petals, beer splash, chicken feathers). Positions are in the
// table's design-space coordinates (rendered inside the scaled stage).

export const THROW_INFO: Record<ThrowItem, { icon: string; label: string; impact: string[]; word: string; color: string }> = {
  tomato: { icon: '🍅', label: 'Tomato', impact: ['🔴', '🍅', '💦'], word: 'SPLAT!', color: '#ef4444' },
  rose: { icon: '🌹', label: 'Rose', impact: ['🌹', '💕', '🌸'], word: 'Aww!', color: '#f472b6' },
  beer: { icon: '🍺', label: 'Beer', impact: ['🍺', '🫧', '💦'], word: 'Cheers!', color: '#facc15' },
  chicken: { icon: '🐔', label: 'Chicken', impact: ['🪶', '🪶', '🐔'], word: 'BAWK!', color: '#fbbf24' },
};

type Point = { x: number; y: number };

const FLIGHT_S = 0.75;

export const ThrowFlight = memo(function ThrowFlight({ from, to, item, scale }: { from: Point; to: Point; item: ThrowItem; scale: number }) {
  const info = THROW_INFO[item];
  // Arc height grows with distance so long throws loop up nicely.
  const lift = Math.min(260, Math.hypot(to.x - from.x, to.y - from.y) * 0.35 + 60);
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - lift;

  useEffect(() => {
    sound.throwWhoosh();
    const t = setTimeout(() => sound.splat(item), FLIGHT_S * 1000);
    return () => clearTimeout(t);
  }, [item]);

  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
        const d = 40 + Math.random() * 60;
        return { i, dx: Math.cos(a) * d, dy: Math.sin(a) * d + (item === 'chicken' ? 30 : 0), glyph: info.impact[i % info.impact.length], rot: Math.random() * 360 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-[45]">
      {/* The item in flight */}
      <motion.div
        className="absolute"
        style={{ left: 0, top: 0, fontSize: 44 * scale }}
        initial={{ x: from.x, y: from.y, rotate: 0, opacity: 1 }}
        animate={{ x: [from.x, midX, to.x], y: [from.y, midY, to.y], rotate: item === 'rose' ? [0, 20, -10] : [0, 300, 620], opacity: [1, 1, 0] }}
        transition={{ duration: FLIGHT_S, ease: 'easeIn', times: [0, 0.5, 1], opacity: { times: [0, 0.97, 1], duration: FLIGHT_S } }}
      >
        <span className="block -translate-x-1/2 -translate-y-1/2">{info.icon}</span>
      </motion.div>

      {/* Impact on the target's avatar */}
      <div className="absolute" style={{ left: to.x, top: to.y }}>
        {item === 'tomato' && (
          <motion.div
            className="absolute rounded-full"
            style={{
              width: 120 * scale,
              height: 104 * scale,
              left: -60 * scale,
              top: -52 * scale,
              background: 'radial-gradient(circle at 45% 40%, #ff5a4a 0%, #d61f1f 45%, rgba(170,10,10,0.85) 62%, transparent 70%)',
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.15, 1, 1], opacity: [0, 1, 0.95, 0], y: [0, 0, 8, 26] }}
            transition={{ delay: FLIGHT_S, duration: 1.8, times: [0, 0.12, 0.6, 1] }}
          />
        )}
        {particles.map((p) => (
          <motion.span
            key={p.i}
            className="absolute"
            style={{ fontSize: 22 * scale, left: -11 * scale, top: -11 * scale }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
            animate={{ x: p.dx * scale, y: p.dy * scale, opacity: [0, 1, 0], scale: [0.4, 1.1, 0.8], rotate: p.rot }}
            transition={{ delay: FLIGHT_S, duration: 1.3, ease: 'easeOut' }}
          >
            {p.glyph}
          </motion.span>
        ))}
        <motion.div
          className="absolute font-display font-black whitespace-nowrap"
          style={{ fontSize: 30 * scale, color: info.color, left: 0, top: -80 * scale, x: '-50%', textShadow: '0 3px 0 rgba(0,0,0,0.6)' }}
          initial={{ opacity: 0, scale: 0.4, rotate: -10 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 1], rotate: [-10, 6, 0, 0], y: [0, 0, 0, -16] }}
          transition={{ delay: FLIGHT_S, duration: 1.6, times: [0, 0.15, 0.75, 1] }}
        >
          {info.word}
        </motion.div>
      </div>
    </div>
  );
});

/** The little "what do you want to throw?" menu that pops up over the player you clicked. */
export function ThrowMenu({ at, targetId, targetName, left, onClose, scale }: { at: Point; targetId: string; targetName: string; left: number; onClose: () => void; scale: number }) {
  return (
    <motion.div
      className="absolute z-50"
      style={{ left: at.x, top: at.y, transform: `translate(-50%, -100%) scale(${scale})`, transformOrigin: 'bottom center' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="rounded-2xl border border-white/15 bg-ink-900/95 backdrop-blur px-3 py-2 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <span className="text-[12px] text-slate-300 whitespace-nowrap">
            Throw at <b className="text-white">{targetName}</b>
          </span>
          <span className={`text-[11px] whitespace-nowrap ${left > 0 ? 'text-gold-light' : 'text-rose-300'}`}>{left} left</span>
        </div>
        <div className="flex gap-1.5">
          {(Object.keys(THROW_INFO) as ThrowItem[]).map((item) => (
            <button
              key={item}
              disabled={left <= 0}
              title={THROW_INFO[item].label}
              onClick={() => {
                throwAt(targetId, item);
                onClose();
              }}
              className="w-12 h-12 rounded-xl bg-ink-800 border border-white/10 text-2xl hover:bg-ink-700 hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 transition"
            >
              {THROW_INFO[item].icon}
            </button>
          ))}
        </div>
        {left <= 0 && <p className="text-[10px] text-slate-400 mt-1.5">Limit: 5 throws per 5 minutes.</p>}
      </div>
    </motion.div>
  );
}
