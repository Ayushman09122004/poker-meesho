import { motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { PlayingCard } from './PlayingCard';
import { formatChips } from './Chips';

interface HandHistoryPanelProps {
  snapshot: GameStateSnapshot;
  onClose: () => void;
}

export function HandHistoryPanel({ snapshot, onClose }: HandHistoryPanelProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-ink-900 border border-white/10 rounded-2xl shadow-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-gold-light">Hand History</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        {snapshot.handHistory.length === 0 && <p className="text-slate-500 text-sm">No hands played yet.</p>}
        <div className="flex flex-col gap-3">
          {snapshot.handHistory.map((h) => (
            <div key={h.handNumber} className="border border-white/10 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-200">Hand #{h.handNumber}</span>
                <span className="text-xs text-gold-light">Pot: {formatChips(h.totalPot)}</span>
              </div>
              <div className="flex gap-1 mb-2">
                {h.communityCards.map((c, i) => (
                  <PlayingCard key={i} card={c} size="sm" />
                ))}
              </div>
              {h.showdown.length > 0 && (
                <div className="flex flex-col gap-1 mb-2">
                  {h.showdown.map((s) => (
                    <div key={s.playerId} className={`text-xs flex items-center gap-2 ${s.isWinner ? 'text-gold-light' : 'text-slate-400'}`}>
                      <div className="flex gap-1">
                        {s.holeCards.map((c, i) => (
                          <PlayingCard key={i} card={c} size="sm" />
                        ))}
                      </div>
                      <span>
                        {s.hand?.rankName ?? 'Mucked'} {s.won > 0 ? `(+${formatChips(s.won)})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-slate-500">
                {h.winners.map((w) => `${w.name} won ${formatChips(w.amount)}`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
