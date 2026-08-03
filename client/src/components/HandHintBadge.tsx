import { motion, AnimatePresence } from 'framer-motion';
import { HandHint } from '../lib/handHint';

export function HandHintBadge({ hint }: { hint: HandHint | null }) {
  return (
    <AnimatePresence>
      {hint && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-sm border border-gold/40 text-gold-light text-xs font-display font-semibold shadow-card"
        >
          Your hand: {hint.result.rankName}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
