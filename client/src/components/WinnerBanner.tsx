import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameStateSnapshot } from '../../../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { formatChips } from './Chips';

interface WinnerBannerProps {
  snapshot: GameStateSnapshot;
}

export function WinnerBanner({ snapshot }: WinnerBannerProps) {
  const winners = snapshot.winnersAnnouncement;
  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!winners || winners.length === 0) return;
    const key = `${snapshot.handNumber}`;
    if (firedFor.current === key) return;
    firedFor.current = key;

    const totalWon = winners.reduce((s, w) => s + w.amount, 0);
    if (totalWon >= snapshot.settings.bigBlind * 15) {
      confetti({
        particleCount: 140,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#e3b64f', '#f5d78a', '#ffffff'],
      });
    }
  }, [winners, snapshot.handNumber, snapshot.settings.bigBlind]);

  if (!winners || winners.length === 0) return null;

  const byPlayer = new Map<string, { name: string; amount: number; handName: string | null }>();
  for (const w of winners) {
    const existing = byPlayer.get(w.playerId);
    if (existing) existing.amount += w.amount;
    else byPlayer.set(w.playerId, { name: w.name, amount: w.amount, handName: w.handName });
  }
  const entries = [...byPlayer.entries()];

  return (
    // Outer plain div holds the static horizontal-centering transform — a motion.div's own
    // animate transform would silently override a class-based translate set on the same element.
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="bg-gradient-to-r from-gold-dark via-gold to-gold-dark text-ink-950 rounded-2xl shadow-glow px-5 py-3 flex items-center gap-3">
            {entries.map(([id, w]) => {
              const player = snapshot.players.find((p) => p.id === id);
              return (
                <div key={id} className="flex items-center gap-2">
                  {player && <AvatarBadge seed={player.avatarSeed} size={28} />}
                  <div className="text-left">
                    <p className="font-display font-bold text-sm leading-tight">{w.name} wins {formatChips(w.amount)}</p>
                    {w.handName && <p className="text-[11px] leading-tight opacity-80">{w.handName}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
