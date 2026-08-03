import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

export function Toasts() {
  const toasts = useGameStore((s) => s.toasts);
  const dismiss = useGameStore((s) => s.dismissToast);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => dismiss(t.id)}
            className={`pointer-events-auto px-4 py-2 rounded-lg shadow-card text-sm font-medium cursor-pointer ${
              t.tone === 'error' ? 'bg-rose-600 text-white' : 'bg-ink-800 border border-white/10 text-slate-100'
            }`}
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
