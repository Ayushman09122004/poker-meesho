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
          <motion.div
            key={e.id}
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -70, scale: 1.4 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
            className="absolute z-40 text-3xl pointer-events-none"
            style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: 'translate(-50%, -50%)' }}
          >
            {e.emoji}
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
