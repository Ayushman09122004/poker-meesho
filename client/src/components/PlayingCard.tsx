import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../../shared/types';

const SUIT_SYMBOL: Record<Card['suit'], string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLOR: Record<Card['suit'], string> = {
  spades: 'text-slate-900',
  clubs: 'text-slate-900',
  hearts: 'text-rose-600',
  diamonds: 'text-rose-600',
};

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: 'sm' | 'md' | 'lg';
  delay?: number;
  highlighted?: boolean;
  dimmed?: boolean;
  /** Pixel offset (in the table's fixed reference coordinate space) this card flies in from —
   * e.g. from the deck toward this card's final slot — instead of just fading in place. */
  flyFrom?: { x: number; y: number };
}

// Fixed reference sizes, in px, tuned for the table's fixed design coordinate space (see
// Table.tsx's TABLE_REF_WIDTH/HEIGHT) — the whole table is uniformly scaled to fit any viewport,
// so these no longer need Tailwind responsive breakpoints to adapt across devices.
const SIZES: Record<'sm' | 'md' | 'lg', { w: number; h: number; font: number; corner: number; radius: number }> = {
  sm: { w: 44, h: 64, font: 14, corner: 9, radius: 6 },
  md: { w: 64, h: 92, font: 20, corner: 11, radius: 8 },
  lg: { w: 96, h: 136, font: 30, corner: 14, radius: 10 },
};

// Hoisted so it's the same array reference on every render — Framer Motion treats a `transition`
// prop with a changed `ease` reference as a new animation to run, even when the values are
// identical, which matters here because this component re-renders often (e.g. on every snapshot
// broadcast that ticks the turn timer) while its deal-in animation is still playing.
const FLIGHT_EASE = [0.2, 0.8, 0.2, 1] as const;

export function PlayingCard({ card, faceDown, size = 'md', delay = 0, highlighted, dimmed, flyFrom }: PlayingCardProps) {
  const dims = SIZES[size];
  const isFaceDown = faceDown || !card;
  const flyX = flyFrom?.x;
  const flyY = flyFrom?.y;

  // Memoized on the actual numeric inputs (not the `flyFrom` object identity, which is fresh
  // every render) so a busy parent re-rendering mid-animation doesn't hand Framer Motion a "new"
  // initial/animate/transition target and restart the tween from scratch every time — the exact
  // bug that made dealt cards appear to fly partway in and freeze there forever.
  const initial = useMemo(
    () => ({ opacity: 0, x: flyX ?? 0, y: flyY ?? -24, rotate: flyFrom ? -55 : -6, scale: 0.6 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flyX, flyY, !!flyFrom]
  );
  const animate = useMemo(() => ({ opacity: dimmed ? 0.35 : 1, x: 0, y: 0, rotate: 0, scale: 1 }), [dimmed]);
  const transition = useMemo(
    () => ({ duration: flyFrom ? 0.5 : 0.35, delay, ease: FLIGHT_EASE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [!!flyFrom, delay]
  );

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition}
      className="relative shrink-0"
      style={{ width: dims.w, height: dims.h, perspective: dims.w * 8 }}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFaceDown ? 180 : 0 }}
        transition={{ duration: 0.4, delay: delay + 0.05 }}
      >
        {/* Face */}
        <div
          className={`card-face absolute inset-0 flex items-center justify-center border shadow-card ${
            highlighted ? 'ring-[3px] ring-gold shadow-glow' : 'border-black/10'
          }`}
          style={{
            borderRadius: dims.radius,
            fontSize: dims.font * 1.6,
            background: 'linear-gradient(160deg, #ffffff 0%, #f6f4ee 100%)',
          }}
        >
          {card && (
            <>
              <div
                className={`absolute flex flex-col items-center leading-[0.9] font-display font-extrabold ${SUIT_COLOR[card.suit]}`}
                style={{ fontSize: dims.corner * 1.45, top: dims.radius * 0.45, left: dims.radius * 0.55 }}
              >
                <span>{card.rank === 'T' ? '10' : card.rank}</span>
                <span style={{ fontSize: dims.corner * 1.1 }}>{SUIT_SYMBOL[card.suit]}</span>
              </div>
              <span className={`leading-none translate-x-[12%] translate-y-[14%] ${SUIT_COLOR[card.suit]}`}>
                {SUIT_SYMBOL[card.suit]}
              </span>
            </>
          )}
        </div>
        {/* Back */}
        <div
          className="card-face absolute inset-0 border-2 border-white shadow-card overflow-hidden"
          style={{ borderRadius: dims.radius, transform: 'rotateY(180deg)', background: '#b3203a' }}
        >
          <div
            className="absolute"
            style={{
              inset: Math.max(2, dims.w * 0.07),
              borderRadius: dims.radius * 0.6,
              border: '1px solid rgba(255,255,255,0.55)',
              background:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 7px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.16) 0 2px, transparent 2px 7px), linear-gradient(160deg, #d13250, #8c1229)',
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CardSlot({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = SIZES[size];
  return <div className="border border-dashed border-white/10" style={{ width: dims.w, height: dims.h, borderRadius: dims.radius }} />;
}
