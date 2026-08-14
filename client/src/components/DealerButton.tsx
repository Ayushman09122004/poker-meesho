import { motion } from 'framer-motion';
import { Point } from '../lib/seatLayout';

/**
 * Positioning lives on a plain (non-motion) outer div: a motion component's own `animate`/`layout`
 * machinery fully owns and recomputes the `transform` CSS property every frame, so a static
 * translate(-50%,-50%) set via that same element's style prop gets silently discarded.
 *
 * No `layout` prop on the inner motion.div — it used to glide between seats via Framer's FLIP
 * technique, but FLIP measures actual rendered (post-transform) boxes, which breaks badly under
 * the table's own ancestor scale() (it was computing a wildly wrong compensating scale to
 * "correct" what was really just the table's zoom-to-fit, not a real layout change). The button
 * now repositions instantly along with its outer div instead, which is a fair trade for never
 * rendering at the wrong size.
 */
export function DealerButton({ position }: { position: Point }) {
  return (
    <div className="absolute z-10" style={{ left: `${position.left}%`, top: `${position.top}%`, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="w-8 h-8 rounded-full bg-white text-ink-950 text-sm font-black flex items-center justify-center border-2 border-ink-900 shadow-card"
      >
        D
      </motion.div>
    </div>
  );
}
