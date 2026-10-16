import { MadeBy } from './MadeBy';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameStateSnapshot } from '../../../shared/types';
import { pickSideBet, restartGame } from '../hooks/useGameConnection';
import { useShowdownSequence } from '../hooks/useShowdownSequence';
import { AvatarBadge } from './AvatarBadge';
import { sound } from '../lib/sound';

// ---------- Side bets ----------

/** The for-fun flop prediction for this hand, top-left of the table. */
export function SideBetCard({ snapshot, selfPlayerId }: { snapshot: GameStateSnapshot; selfPlayerId: string | null }) {
  const bet = snapshot.sideBet;
  const seq = useShowdownSequence(snapshot);
  if (!bet || snapshot.phase === 'lobby') return null;
  // Don't reveal the answer before the flop is actually on the table (e.g. during an all-in run-out).
  const flopShown = seq.boardVisible >= 3;
  const resolved = bet.result !== null && flopShown;
  const myScore = selfPlayerId ? bet.scores[selfPlayerId] ?? 0 : 0;
  const leader = Object.entries(bet.scores).sort((a, b) => b[1] - a[1])[0];
  const leaderName = leader ? snapshot.players.find((p) => p.id === leader[0])?.name : null;
  const right = resolved && bet.myPick !== null && bet.myPick === bet.result;

  return (
    <motion.div
      key={bet.question}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-[260px] rounded-xl border border-violet-400/40 bg-ink-950/80 backdrop-blur px-3 py-2 text-[12px] shadow-card"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-violet-300">🔮 Side bet</span>
        <span className="text-slate-400">
          You: <b className="text-violet-200">{myScore}</b>
          {leaderName && leader![1] > 0 ? ` · Top: ${leaderName} ${leader![1]}` : ''}
        </span>
      </div>
      <p className="text-slate-100 leading-snug">{bet.question}</p>
      {bet.open && bet.myPick === null ? (
        <div className="flex gap-1.5 mt-1.5">
          {[true, false].map((yes) => (
            <button
              key={String(yes)}
              onClick={() => {
                sound.uiClick();
                pickSideBet(yes);
              }}
              className={`flex-1 py-1 rounded-lg font-bold border transition ${
                yes ? 'bg-emerald-700/50 border-emerald-400/50 text-emerald-100 hover:bg-emerald-700' : 'bg-rose-800/50 border-rose-400/50 text-rose-100 hover:bg-rose-800'
              }`}
            >
              {yes ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      ) : resolved ? (
        <p className={`mt-1 font-bold ${bet.myPick === null ? 'text-slate-300' : right ? 'text-emerald-300' : 'text-rose-300'}`}>
          {bet.result ? 'Yes!' : 'No!'} {bet.myPick === null ? '' : right ? '✅ You called it (+1)' : '❌ Not this time'}
        </p>
      ) : (
        <p className="mt-1 text-slate-400">
          {bet.myPick === null ? 'Picks closed — wait for the flop.' : `You said ${bet.myPick ? 'YES' : 'NO'} · ${bet.pickCount} picked`}
        </p>
      )}
    </motion.div>
  );
}

// ---------- Tournament ----------

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "🏆 Level 2 · next 4:12" pill for the top bar. */
export function TournamentPill({ snapshot }: { snapshot: GameStateSnapshot }) {
  const t = snapshot.tournament;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!t) return null;
  const left = t.levelEndsAt ? t.levelEndsAt - now : null;
  return (
    <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-amber-200 whitespace-nowrap" title="Blinds go up at the next hand after the timer runs out">
      🏆 Level {t.level}
      {left !== null && <span className="text-slate-300"> · {left > 0 ? `next in ${fmt(left)}` : 'blinds up next hand'}</span>}
    </div>
  );
}

/** End of a tournament: 1st / 2nd / 3rd on a podium (after the final showdown has played out). */
export function TournamentPodium({ snapshot, isHost }: { snapshot: GameStateSnapshot; isHost: boolean }) {
  const seq = useShowdownSequence(snapshot);
  const t = snapshot.tournament;
  const show = !!t && snapshot.phase === 'game_over' && (!seq.ended || seq.awarded);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) {
      setVisible(false);
      return;
    }
    const id = setTimeout(() => {
      setVisible(true);
      sound.bigWin();
      confetti({ particleCount: 180, spread: 100, origin: { y: 0.4 }, colors: ['#e3b64f', '#f5d78a', '#ffffff', '#c0c0c0'] });
    }, 1800);
    return () => clearTimeout(id);
  }, [show]);

  if (!t) return null;
  const winner = snapshot.players.find((p) => p.chips > 0);
  const out = [...t.eliminations].reverse().map((id) => snapshot.players.find((p) => p.id === id)).filter(Boolean);
  const places = [winner, out[0], out[1]];
  const heights = [150, 110, 80];
  const order = [1, 0, 2]; // 2nd, 1st, 3rd left to right
  const medal = ['🥇', '🥈', '🥉'];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div className="fixed inset-0 z-[55] bg-black/70 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} className="rounded-3xl border border-gold/50 bg-ink-900/95 px-8 py-6 text-center shadow-glow">
            <p className="font-display font-black text-3xl text-gold-light mb-1">🏆 Tournament over!</p>
            <p className="text-slate-300 text-sm mb-6">{winner?.name ?? 'Someone'} takes it all.</p>
            <div className="flex items-end justify-center gap-4">
              {order.map((place) => {
                const p = places[place];
                if (!p) return <div key={place} className="w-32" />;
                return (
                  <motion.div key={place} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + (2 - place) * 0.25 }} className="w-32 flex flex-col items-center">
                    <AvatarBadge seed={p.avatarSeed} size={place === 0 ? 84 : 66} ring={place === 0 ? 'gold' : 'none'} />
                    <p className="text-white font-bold text-sm mt-1 truncate max-w-full">{p.name}</p>
                    <div
                      className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-2 text-3xl"
                      style={{ height: heights[place], background: place === 0 ? 'linear-gradient(#f5d78a,#a97e2b)' : place === 1 ? 'linear-gradient(#e5e7eb,#9ca3af)' : 'linear-gradient(#d6a26b,#8a5a2b)' }}
                    >
                      {medal[place]}
                    </div>
                  </motion.div>
                );
              })}
            </div>
            {isHost ? (
              <button onClick={() => restartGame()} className="mt-6 px-6 py-2.5 rounded-xl bg-gradient-to-b from-gold to-gold-dark text-ink-950 font-display font-bold shadow-glow">
                New tournament
              </button>
            ) : (
              <p className="mt-6 text-xs text-slate-400">Waiting for the host to start a new one…</p>
            )}
            <MadeBy className="mt-4" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
