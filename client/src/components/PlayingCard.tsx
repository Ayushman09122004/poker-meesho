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
}

// Mobile-first: the base (unprefixed) size is what phones get; sm:/md: bump it up on wider
// screens. This keeps a 5-card community row from ever overflowing a narrow phone viewport.
const SIZES = {
  sm: 'w-8 h-11 sm:w-11 sm:h-16 text-[10px] sm:text-sm rounded-md',
  md: 'w-11 h-16 sm:w-16 sm:h-[92px] text-sm sm:text-xl rounded-lg',
  lg: 'w-10 h-14 sm:w-16 sm:h-[92px] md:w-24 md:h-[136px] text-xs sm:text-xl md:text-3xl rounded-lg md:rounded-xl',
};

const CORNER_SIZES = {
  sm: 'text-[8px]',
  md: 'text-[9px] sm:text-xs',
  lg: 'text-[8px] sm:text-xs md:text-sm',
};

export function PlayingCard({ card, faceDown, size = 'md', delay = 0, highlighted, dimmed }: PlayingCardProps) {
  const dims = SIZES[size];
  const cornerSize = CORNER_SIZES[size];
  const isFaceDown = faceDown || !card;

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, rotate: -6, scale: 0.7 }}
      animate={{ opacity: dimmed ? 0.35 : 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={`relative ${dims} perspective-800 shrink-0`}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFaceDown ? 180 : 0 }}
        transition={{ duration: 0.4, delay: delay + 0.05 }}
      >
        {/* Face */}
        <div
          className={`card-face absolute inset-0 flex items-center justify-center border ${dims} bg-white shadow-card ${
            highlighted ? 'ring-[3px] ring-gold shadow-glow scale-105' : 'border-slate-300'
          }`}
        >
          {card && (
            <>
              <div className={`absolute top-0.5 left-1 sm:top-1 sm:left-1.5 flex flex-col items-center leading-none ${cornerSize} font-bold ${SUIT_COLOR[card.suit]}`}>
                <span>{card.rank}</span>
                <span>{SUIT_SYMBOL[card.suit]}</span>
              </div>
              <span className={`leading-none ${SUIT_COLOR[card.suit]}`}>{SUIT_SYMBOL[card.suit]}</span>
              <div className={`absolute bottom-0.5 right-1 sm:bottom-1 sm:right-1.5 flex flex-col items-center leading-none rotate-180 ${cornerSize} font-bold ${SUIT_COLOR[card.suit]}`}>
                <span>{card.rank}</span>
                <span>{SUIT_SYMBOL[card.suit]}</span>
              </div>
            </>
          )}
        </div>
        {/* Back */}
        <div
          className={`card-face absolute inset-0 ${dims} bg-gradient-to-br from-ink-700 to-ink-900 border border-gold-dark/60 flex items-center justify-center`}
          style={{ transform: 'rotateY(180deg)' }}
        >
          <div className="w-2/3 h-2/3 rounded-full border-2 border-gold/40 flex items-center justify-center">
            <span className="text-gold/70">♠</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function CardSlot({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`${SIZES[size]} rounded-lg border border-dashed border-white/10`} />;
}
