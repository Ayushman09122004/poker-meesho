import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GameStateSnapshot, PublicPlayer } from '../../../shared/types';
import { winChance } from '../lib/equity';
import { findRivalry, Rivalry } from '../lib/rivalries';
import { fxForSeed } from '../lib/characterFx';
import { sound } from '../lib/sound';
import { AvatarBadge } from './AvatarBadge';

// ---------- Coach mode: live win chance ----------

/** Your chance of winning from here (0–1), or null when Coach mode is off / you're not in the hand. */
export function useWinChance(s: GameStateSnapshot, selfId: string | null): number | null {
  const self = s.players.find((p) => p.id === selfId);
  const active = s.settings.gameMode === 'coach' && s.phase === 'hand_in_progress' && !!self?.isConnected;
  const hole = self?.holeCards ?? [];
  const inHand = !!self && self.status !== 'folded' && hole.length === 2 && self.hasCards;
  const opponents = s.players.filter((p) => p.id !== selfId && p.hasCards && p.status !== 'folded').length;
  const key = active && inHand ? `${hole.map((c) => c.rank + c.suit).join('')}|${s.communityCards.map((c) => c.rank + c.suit).join('')}|${opponents}` : '';
  const [result, setResult] = useState<{ key: string; pct: number } | null>(null);

  useEffect(() => {
    if (!key) return;
    // Off the render path so the table never stutters.
    const t = setTimeout(() => setResult({ key, pct: winChance(hole, s.communityCards, Math.max(1, opponents)) }), 30);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return key && result?.key === key ? result.pct : null;
}

export function CoachMeter({ pct }: { pct: number }) {
  const p = Math.round(pct * 100);
  const color = p >= 60 ? '#22c55e' : p >= 35 ? '#facc15' : '#ef4444';
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 px-3 py-1 rounded-full bg-ink-950/75 border border-white/10">
      <span className="text-[12px] text-slate-300 whitespace-nowrap">Win chance</span>
      <span className="relative block w-28 h-2 rounded-full bg-white/10 overflow-hidden">
        <motion.span className="absolute inset-y-0 left-0 rounded-full" style={{ background: color }} animate={{ width: `${p}%` }} transition={{ duration: 0.5 }} />
      </span>
      <span className="text-[13px] font-display font-bold w-10 text-right" style={{ color }}>
        {p}%
      </span>
    </motion.div>
  );
}

// ---------- Character rivalries ----------

export interface ActiveRivalry extends Rivalry {
  key: string;
}

/**
 * Spots two famous rivals fighting over a big pot (they're both still in, at most one other
 * player left, and the pot is at least 8 big blinds) — once per hand — and has each say their line.
 */
export function useRivalry(s: GameStateSnapshot): ActiveRivalry | null {
  const [active, setActive] = useState<ActiveRivalry | null>(null);
  const shown = useRef(new Set<string>());
  // Timers live outside the effect's cleanup: the snapshot updates constantly, and cancelling on
  // every update would cut off the second voice and leave the banner up.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (s.phase !== 'hand_in_progress') return;
    const live = s.players.filter((p) => p.hasCards && p.status !== 'folded');
    if (live.length > 3 || s.totalPot < s.settings.bigBlind * 8) return;
    const r = findRivalry(live);
    if (!r) return;
    const key = `${s.handNumber}:${s.handHistory[0]?.timestamp ?? 0}:${r.aId}:${r.bId}`;
    if (shown.current.has(key)) return;
    shown.current.add(key);
    setActive({ ...r, key });
    // Each rival says their line, one after the other.
    const a = s.players.find((p) => p.id === r.aId);
    const b = s.players.find((p) => p.id === r.bId);
    const va = a ? fxForSeed(a.avatarSeed).voice : undefined;
    const vb = b ? fxForSeed(b.avatarSeed).voice : undefined;
    sound.playVoicesInTurn([va, vb].filter((v): v is NonNullable<typeof v> => !!v));
    timers.current.push(setTimeout(() => setActive((cur) => (cur?.key === key ? null : cur)), 4200));
  }, [s]);

  return active;
}

export function RivalryBanner({ rivalry, players, stageW, stageH }: { rivalry: ActiveRivalry; players: PublicPlayer[]; stageW: number; stageH: number }) {
  const a = players.find((p) => p.id === rivalry.aId);
  const b = players.find((p) => p.id === rivalry.bId);
  if (!a || !b) return null;
  return (
    <motion.div
      className="absolute z-[44] pointer-events-none flex flex-col items-center"
      style={{ left: stageW / 2, top: stageH * 0.08, x: '-50%' }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="flex items-center gap-5 px-6 py-3 rounded-3xl bg-ink-950/85 border-2 border-rose-500/70" style={{ boxShadow: '0 0 40px rgba(244,63,94,0.5)' }}>
        <motion.div initial={{ x: -80 }} animate={{ x: 0 }} className="flex flex-col items-center">
          <AvatarBadge seed={a.avatarSeed} size={70} />
          <span className="text-white text-sm font-bold mt-1">{a.name}</span>
        </motion.div>
        <div className="flex flex-col items-center">
          <span className="text-[13px] tracking-[0.35em] text-rose-300 font-bold">⚔️ RIVALRY ⚔️</span>
          <motion.span
            className="font-display font-black italic text-[54px] leading-none text-white"
            style={{ textShadow: '0 0 24px rgba(244,63,94,0.9)' }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            VS
          </motion.span>
          <span className="text-[13px] text-slate-200 mt-1 whitespace-nowrap">{rivalry.title}</span>
        </div>
        <motion.div initial={{ x: 80 }} animate={{ x: 0 }} className="flex flex-col items-center">
          <AvatarBadge seed={b.avatarSeed} size={70} />
          <span className="text-white text-sm font-bold mt-1">{b.name}</span>
        </motion.div>
      </div>
    </motion.div>
  );
}
