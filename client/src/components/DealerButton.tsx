import { motion } from 'framer-motion';
import { Point } from '../lib/seatLayout';

/**
 * A single shared dealer marker that glides between seats as the button rotates, rather than
 * disappearing from one seat and popping up at the next.
 *
 * Positioning lives on a plain (non-motion) outer div: a motion component's own `animate`/`layout`
 * machinery fully owns and recomputes the `transform` CSS property every frame, so a static
 * translate(-50%,-50%) set via that same element's style prop gets silently discarded. The inner
 * motion.div uses `layout` instead of animating left/top directly — Framer Motion's FLIP technique
 * detects the position change (caused by the outer div's instant jump) and glides to it smoothly.
 */
export function DealerButton({ position }: { position: Point }) {
  return (
    <div className="absolute z-10" style={{ left: `${position.left}%`, top: `${position.top}%`, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-ink-950 text-xs sm:text-sm font-black flex items-center justify-center border-2 border-ink-900 shadow-card"
      >
        D
      </motion.div>
    </div>
  );
}
