import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChipRequestKind, GameStateSnapshot, PublicPlayer } from '../../../shared/types';
import { buyInOptions } from '../../../shared/buyIn';
import { answerChipRequest, requestChips } from '../hooks/useGameConnection';
import { AvatarBadge } from './AvatarBadge';
import { formatChips } from './Chips';
import { sound } from '../lib/sound';

// Host-approval tables (virtual chips): players pick a buy-in and the host approves it — to take a
// seat, to re-buy after going bust, or to top up. Plus a ledger of who bought in for how much.

const KIND_LABEL: Record<ChipRequestKind, string> = { seat: 'Buy in', rebuy: 'Re-buy', topup: 'Top up' };

export function myRequest(snapshot: GameStateSnapshot, playerId: string | null | undefined) {
  return snapshot.chipRequests?.find((r) => r.playerId === playerId) ?? null;
}

/** Choose an amount and send the request to the host. */
export function BuyInPicker({ snapshot, kind, onSent }: { snapshot: GameStateSnapshot; kind: ChipRequestKind; onSent?: () => void }) {
  const options = buyInOptions(snapshot.settings.startingChips, snapshot.settings.tournament);
  const [amount, setAmount] = useState(options.includes(snapshot.settings.startingChips) ? snapshot.settings.startingChips : options[0]);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 justify-center">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => {
              sound.uiClick();
              setAmount(o);
            }}
            className={`px-4 py-2 rounded-xl border-2 font-display font-bold transition ${
              amount === o ? 'border-gold bg-gold/15 text-gold-light' : 'border-white/10 bg-ink-800 text-slate-200 hover:bg-ink-700'
            }`}
          >
            {formatChips(o)}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          sound.uiClick();
          requestChips(kind, amount);
          onSent?.();
        }}
        className="w-full py-2.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-display font-bold shadow-glow hover:brightness-110 transition"
      >
        Ask the host · {KIND_LABEL[kind]} {formatChips(amount)}
      </button>
      <p className="text-center text-[11px] text-slate-500">Virtual chips only — the host approves every buy-in.</p>
    </div>
  );
}

// Short anime "waiting…" loops (Naruto, Dragon Ball, etc. — converted from GIFs to tiny videos).
const WAITING_CLIPS = Array.from({ length: 11 }, (_, i) => `/waiting/w${i}.mp4`);
const randomClip = (not?: string) => {
  const pool = WAITING_CLIPS.filter((c) => c !== not);
  return pool[Math.floor(Math.random() * pool.length)];
};

/** A random anime waiting loop, switching to another one every few seconds. */
export function AnimeWaiting({ className = '' }: { className?: string }) {
  const [clip, setClip] = useState(() => randomClip());
  useEffect(() => {
    const t = setInterval(() => setClip((c) => randomClip(c)), 6000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={`relative aspect-[4/3] rounded-xl overflow-hidden bg-black border border-white/10 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.video
          key={clip}
          src={clip}
          autoPlay
          loop
          muted
          playsInline
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 w-full h-full object-contain"
        />
      </AnimatePresence>
    </div>
  );
}

/** Corner card while a re-buy / top-up request waits for the host (doesn't block the table). */
export function PendingRequestCard({ snapshot, selfId }: { snapshot: GameStateSnapshot; selfId: string | null }) {
  const req = myRequest(snapshot, selfId);
  return (
    <AnimatePresence>
      {req && req.kind !== 'seat' && (
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className="fixed left-3 bottom-24 z-40 w-[230px] rounded-2xl border border-gold/40 bg-ink-900/95 p-2.5 shadow-card pointer-events-none"
        >
          <AnimeWaiting />
          <p className="text-[12px] text-slate-200 text-center mt-2 leading-snug">
            Waiting for the host to approve your {req.kind === 'rebuy' ? 're-buy' : 'top-up'} of{' '}
            <span className="text-gold-light font-bold">{formatChips(req.amount)}</span>…
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Full-screen card for a player who has joined but isn't seated yet. */
export function AwaitingSeatCard({ snapshot, self }: { snapshot: GameStateSnapshot; self: PublicPlayer }) {
  const req = myRequest(snapshot, self.id);
  const [changing, setChanging] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-gold/40 bg-ink-900/95 p-6 shadow-card text-center"
      >
        <AvatarBadge seed={self.avatarSeed} size={72} />
        <p className="font-display text-2xl font-extrabold text-gold-light mt-3">Take a seat, {self.name}</p>
        {req && !changing ? (
          <>
            <p className="text-slate-300 mt-3">
              Waiting for the host to approve your buy-in of <span className="text-gold-light font-bold">{formatChips(req.amount)}</span> chips…
            </p>
            <AnimeWaiting className="mt-4 mx-auto w-full max-w-[340px]" />
            <button onClick={() => setChanging(true)} className="mt-4 text-xs text-slate-400 hover:text-slate-200 underline">
              Change amount
            </button>
          </>
        ) : (
          <>
            <p className="text-slate-400 text-sm mt-2 mb-4">Pick your buy-in. The host will approve it before you're dealt in.</p>
            <BuyInPicker snapshot={snapshot} kind="seat" onSent={() => setChanging(false)} />
          </>
        )}
      </motion.div>
    </div>
  );
}

/** Small modal for re-buys and top-ups. */
export function BuyInModal({ snapshot, kind, onClose }: { snapshot: GameStateSnapshot; kind: 'rebuy' | 'topup'; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-card"
      >
        <p className="font-display text-xl font-extrabold text-gold-light text-center mb-1">{kind === 'rebuy' ? 'Buy back in' : 'Add more chips'}</p>
        <p className="text-slate-400 text-sm text-center mb-4">
          {kind === 'rebuy' ? 'Pick an amount — the host approves it.' : 'Pick an amount — the host approves it, and it lands after the current hand.'}
        </p>
        <BuyInPicker snapshot={snapshot} kind={kind} onSent={onClose} />
      </motion.div>
    </div>
  );
}

/** The host's inbox: approve or decline seat / re-buy / top-up requests. */
export function HostChipRequests({ snapshot, inline = false }: { snapshot: GameStateSnapshot; inline?: boolean }) {
  const requests = (snapshot.chipRequests ?? [])
    .map((r) => ({ ...r, player: snapshot.players.find((p) => p.id === r.playerId) }))
    .filter((r): r is typeof r & { player: PublicPlayer } => !!r.player);
  return (
    <div className={inline ? 'flex flex-col gap-2 mb-4' : 'absolute top-14 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none'}>
      <AnimatePresence>
        {requests.map((r) => (
          <motion.div
            key={r.playerId + r.kind}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-gold/50 bg-ink-900/95 backdrop-blur px-4 py-2.5 shadow-card w-[min(94vw,540px)]"
          >
            <AvatarBadge seed={r.player.avatarSeed} size={40} />
            <div className="text-sm flex-1 min-w-0">
              <p className="text-white font-semibold truncate">
                🙋 {r.player.name} · {KIND_LABEL[r.kind]}
              </p>
              <p className="text-slate-400 text-xs">
                {formatChips(r.amount)} chips
                {r.player.buyInTotal > 0 && ` · bought in ${formatChips(r.player.buyInTotal)} so far`}
              </p>
            </div>
            <button
              onClick={() => {
                sound.uiClick();
                answerChipRequest(r.playerId, true);
              }}
              className="shrink-0 ml-2 px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 text-white text-sm font-bold"
            >
              Approve
            </button>
            <button
              onClick={() => {
                sound.uiClick();
                answerChipRequest(r.playerId, false);
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-ink-800 border border-white/15 text-slate-300 text-sm"
            >
              Decline
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Everyone's buy-ins, current chips and net result this session. */
export function LedgerModal({ snapshot, onClose }: { snapshot: GameStateSnapshot; onClose: () => void }) {
  const rows = snapshot.players
    .filter((p) => !p.awaitingSeat)
    .map((p) => {
      // Chips in the pot still count as yours until the hand is decided.
      const chips = p.chips + p.pendingChips + (snapshot.phase === 'hand_in_progress' ? p.totalCommitted : 0);
      return { p, chips, net: chips - p.buyInTotal };
    })
    .sort((a, b) => b.net - a.net);
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-card"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-display text-xl font-extrabold text-gold-light">📒 Ledger</p>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-xs uppercase tracking-wide">
              <th className="text-left font-medium pb-2">Player</th>
              <th className="text-right font-medium pb-2">Bought in</th>
              <th className="text-right font-medium pb-2">Chips now</th>
              <th className="text-right font-medium pb-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, chips, net }) => (
              <tr key={p.id} className="border-t border-white/5">
                <td className="py-2">
                  <span className="flex items-center gap-2">
                    <AvatarBadge seed={p.avatarSeed} size={26} />
                    <span className="text-slate-100 truncate">
                      {p.isBot && '🤖 '}
                      {p.name}
                    </span>
                  </span>
                </td>
                <td className="py-2 text-right text-slate-300">{formatChips(p.buyInTotal)}</td>
                <td className="py-2 text-right text-slate-100">{formatChips(chips)}</td>
                <td className={`py-2 text-right font-bold ${net > 0 ? 'text-emerald-400' : net < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {net > 0 ? '+' : net < 0 ? '−' : ''}
                  {formatChips(Math.abs(net))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-[11px] text-slate-500 mt-4 text-center">Virtual chips — just for bragging rights.</p>
      </motion.div>
    </div>
  );
}
