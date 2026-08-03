import { motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { formatChips } from './Chips';

interface StatsPanelProps {
  snapshot: GameStateSnapshot;
  onClose: () => void;
}

export function StatsPanel({ snapshot, onClose }: StatsPanelProps) {
  const players = [...snapshot.players].sort((a, b) => b.stats.totalChipsWon - a.stats.totalChipsWon);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-ink-900 border border-white/10 rounded-2xl shadow-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-gold-light">Session Stats</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 text-xs uppercase">
                <th className="py-2 pr-2">Player</th>
                <th className="py-2 pr-2">Hands</th>
                <th className="py-2 pr-2">Won</th>
                <th className="py-2 pr-2">Win %</th>
                <th className="py-2 pr-2">Biggest pot</th>
                <th className="py-2 pr-2">Best hand</th>
                <th className="py-2 pr-2">Streak</th>
                <th className="py-2 pr-2">Net chips</th>
                <th className="py-2 pr-2">Bluffs</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const net = p.stats.totalChipsWon - p.stats.totalChipsLost;
                const winPct = p.stats.handsPlayed > 0 ? Math.round((p.stats.handsWon / p.stats.handsPlayed) * 100) : 0;
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <AvatarBadge seed={p.avatarSeed} size={24} />
                        <span className="truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-slate-300">{p.stats.handsPlayed}</td>
                    <td className="py-2 pr-2 text-slate-300">{p.stats.handsWon}</td>
                    <td className="py-2 pr-2 text-slate-300">{winPct}%</td>
                    <td className="py-2 pr-2 text-slate-300">{formatChips(p.stats.biggestPot)}</td>
                    <td className="py-2 pr-2 text-slate-300">{p.stats.bestHand ?? '—'}</td>
                    <td className="py-2 pr-2 text-slate-300">{p.stats.longestWinStreak}</td>
                    <td className={`py-2 pr-2 font-medium ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {net >= 0 ? '+' : ''}
                      {formatChips(net)}
                    </td>
                    <td className="py-2 pr-2 text-slate-300">{p.stats.bluffsWon}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
