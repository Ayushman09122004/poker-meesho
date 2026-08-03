import { useState } from 'react';
import { motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { kickPlayer, restartGame } from '../hooks/useGameConnection';

interface HostControlsModalProps {
  snapshot: GameStateSnapshot;
  onClose: () => void;
}

export function HostControlsModal({ snapshot, onClose }: HostControlsModalProps) {
  const [confirmRestart, setConfirmRestart] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-ink-900 border border-white/10 rounded-2xl shadow-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-gold-light">Host Controls</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Players</p>
        <div className="flex flex-col gap-2 mb-5 max-h-56 overflow-y-auto">
          {snapshot.players.map((p) => (
            <div key={p.id} className="flex items-center justify-between bg-ink-800 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <AvatarBadge seed={p.avatarSeed} size={28} dimmed={!p.isConnected} />
                <div>
                  <p className="text-sm">{p.name}</p>
                  <p className="text-[11px] text-slate-500">{p.isConnected ? 'Connected' : 'Disconnected'}</p>
                </div>
              </div>
              {p.id !== snapshot.hostId && (
                <button
                  onClick={() => kickPlayer(p.id)}
                  className="text-xs px-2.5 py-1 rounded-full bg-rose-900/50 border border-rose-500/30 text-rose-300 hover:bg-rose-900 transition"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-4">
          {!confirmRestart ? (
            <button
              onClick={() => setConfirmRestart(true)}
              className="w-full py-2.5 rounded-xl bg-ink-800 border border-white/10 text-slate-200 hover:bg-ink-700 transition"
            >
              Restart game
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-amber-300">This resets everyone's chips to the starting stack. Are you sure?</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmRestart(false)} className="flex-1 py-2 rounded-xl bg-ink-800 border border-white/10 text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={() => {
                    restartGame();
                    setConfirmRestart(false);
                    onClose();
                  }}
                  className="flex-1 py-2 rounded-xl bg-rose-700 text-white font-semibold"
                >
                  Restart
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
