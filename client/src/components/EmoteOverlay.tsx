import { AnimatePresence, motion } from 'framer-motion';
import { EmoteEvent } from '../store/gameStore';
import { Point } from '../lib/seatLayout';

interface EmoteOverlayProps {
  emotes: EmoteEvent[];
  positionFor: (playerId: string) => Point | null;
}

export function EmoteOverlay({ emotes, positionFor }: EmoteOverlayProps) {
  return (
    <AnimatePresence>
      {emotes.map((e) => {
        const pos = positionFor(e.playerId);
        if (!pos) return null;
        return (
          // Positioning lives on a plain div — a motion.div's own animate/exit transform
          // fully owns the `transform` CSS property and would silently drop a static centering
          // translate set alongside it, so the two responsibilities are split across two elements.
          <div
            key={e.id}
            className="absolute z-40 pointer-events-none"
            style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: 'translate(-50%, -50%)' }}
          >
            <motion.div
              initial={{ opacity: 0, y: 0, scale: 0.5 }}
              animate={{ opacity: 1, y: -70, scale: 1.4 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="text-3xl"
            >
              {e.emoji}
            </motion.div>
          </div>
        );
      })}
    </AnimatePresence>
  );
}
