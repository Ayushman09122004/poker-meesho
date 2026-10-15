import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameStateSnapshot, LegalActions, PublicPlayer } from '../../../shared/types';
import { requestRebuy, sendPlayerAction, useTimeBankAction } from '../hooks/useGameConnection';
import { formatChips } from './Chips';
import { sound } from '../lib/sound';

/** What to do automatically when your turn comes, ticked while waiting (like real poker apps). */
type PreAction = 'check_fold' | 'check' | 'call_any';

export const BETTING_BAR_HEIGHT = 64;

interface BettingBarProps {
  snapshot: GameStateSnapshot;
  self: PublicPlayer | undefined;
  isHost: boolean;
}

/**
 * Full-width bar along the bottom of the table. On your turn: Fold / Check-or-Call / Raise (raise
 * opens a sizing panel). While waiting in a hand: pre-action toggles. Otherwise: a status line.
 */
export function BettingBar({ snapshot, self, isHost }: BettingBarProps) {
  const legal = snapshot.legalActionsForViewer;
  const isMyTurn = !!self && snapshot.currentTurnPlayerId === self.id && !!legal;
  const inHandWaiting =
    !!self && snapshot.phase === 'hand_in_progress' && self.status === 'active' && self.hasCards && !isMyTurn;

  const [pre, setPre] = useState<PreAction | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);

  // Pre-actions only hold for the betting round they were ticked in.
  useEffect(() => {
    setPre(null);
  }, [snapshot.handNumber, snapshot.street]);

  useEffect(() => {
    if (!isMyTurn) setRaiseOpen(false);
  }, [isMyTurn]);

  // Fire a ticked pre-action as soon as the turn arrives.
  const firedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isMyTurn || !legal || !pre) return;
    const turnKey = `${snapshot.handNumber}-${snapshot.street}-${snapshot.currentBet}`;
    if (firedFor.current === turnKey) return;
    firedFor.current = turnKey;
    const choice = pre;
    setPre(null);
    const t = setTimeout(() => {
      if (choice === 'check_fold') sendPlayerAction(legal.canCheck ? 'check' : 'fold');
      else if (choice === 'check') {
        if (legal.canCheck) sendPlayerAction('check');
      } else if (choice === 'call_any') {
        if (legal.canCheck) sendPlayerAction('check');
        else if (legal.canCall) sendPlayerAction('call');
        else if (legal.canAllIn) sendPlayerAction('all_in');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [isMyTurn, legal, pre, snapshot.handNumber, snapshot.street, snapshot.currentBet]);

  return (
    <div className="relative z-30 w-full shrink-0 pointer-events-auto" style={{ height: BETTING_BAR_HEIGHT }}>
      <AnimatePresence>
        {raiseOpen && isMyTurn && legal && self && (
          <RaisePanel snapshot={snapshot} legal={legal} selfChips={self.chips} onClose={() => setRaiseOpen(false)} />
        )}
      </AnimatePresence>

      <div
        className="h-full w-full border-t border-white/10"
        style={{ background: 'linear-gradient(180deg, rgba(20,28,40,0.96), rgba(8,11,17,0.98))' }}
      >
      <div className="h-full w-full max-w-[1280px] mx-auto flex items-stretch gap-1.5 sm:gap-2 px-2 sm:px-4 py-2">
        {isMyTurn && legal && self ? (
          <>
            {self.timeBankMs > 0 && (
              <BarButton
                tone="ghost"
                narrow
                title="Add 20 seconds from your time bank"
                onClick={() => useTimeBankAction()}
              >
                ⏱ +20s
              </BarButton>
            )}
            <BarButton tone="fold" onClick={() => sendPlayerAction('fold')}>
              Fold
            </BarButton>
            {legal.canCheck && (
              <BarButton tone="neutral" onClick={() => sendPlayerAction('check')}>
                Check
              </BarButton>
            )}
            {legal.canCall && (
              <BarButton tone="call" onClick={() => sendPlayerAction('call')}>
                Call {formatChips(legal.callAmount)}
              </BarButton>
            )}
            {legal.canBet || legal.canRaise ? (
              <BarButton tone="raise" active={raiseOpen} onClick={() => setRaiseOpen((o) => !o)}>
                {legal.canBet ? 'Bet' : 'Raise'} ▴
              </BarButton>
            ) : (
              legal.canAllIn && (
                <BarButton tone="allin" onClick={() => sendPlayerAction('all_in')}>
                  All-in {formatChips(self.chips)}
                </BarButton>
              )
            )}
          </>
        ) : inHandWaiting ? (
          <>
            <PreToggle label="Check / Fold" on={pre === 'check_fold'} onClick={() => setPre(pre === 'check_fold' ? null : 'check_fold')} />
            <PreToggle label="Check" on={pre === 'check'} onClick={() => setPre(pre === 'check' ? null : 'check')} />
            <PreToggle label="Call any" on={pre === 'call_any'} onClick={() => setPre(pre === 'call_any' ? null : 'call_any')} />
          </>
        ) : (
          <StatusLine snapshot={snapshot} self={self} isHost={isHost} />
        )}
      </div>
      </div>
    </div>
  );
}

function StatusLine({ snapshot, self, isHost }: { snapshot: GameStateSnapshot; self: PublicPlayer | undefined; isHost: boolean }) {
  let text = 'Waiting for the next hand…';
  if (snapshot.phase === 'game_over') {
    const champ = snapshot.players.find((p) => p.chips > 0)?.name ?? 'A player';
    text = `🏆 ${champ} takes the whole table!${isHost ? ' Open host controls to restart.' : ''}`;
  } else if (self?.status === 'eliminated') text = "You're out of chips — spectating.";
  else if (self?.status === 'folded') text = 'You folded — watching this hand.';
  else if (self?.status === 'all_in') text = "You're all-in — good luck!";
  else if (snapshot.phase === 'hand_in_progress' && self && !self.hasCards) text = 'You’ll be dealt in next hand.';

  return (
    <div className="flex-1 flex items-center justify-center gap-3 text-sm text-slate-300">
      <span className="truncate">{text}</span>
      {self?.status === 'eliminated' && snapshot.settings.rebuyEnabled && (
        <button
          onClick={requestRebuy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-gold text-ink-950 text-sm font-semibold hover:brightness-110 transition"
        >
          Buy back in
        </button>
      )}
    </div>
  );
}

const TONES: Record<string, string> = {
  fold: 'from-[#5b2330] to-[#3a1520] border-rose-400/40 text-rose-100',
  neutral: 'from-[#2a4f7a] to-[#1a3352] border-sky-300/40 text-white',
  call: 'from-[#1f6b4d] to-[#124331] border-emerald-300/40 text-white',
  raise: 'from-[#e3b64f] to-[#a97e2b] border-gold-light/70 text-ink-950',
  allin: 'from-[#c0263d] to-[#7d1426] border-rose-300/50 text-white',
  ghost: 'from-[#1b232e] to-[#11161e] border-white/10 text-gold-light',
};

function BarButton({
  children,
  onClick,
  tone,
  active,
  narrow,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: keyof typeof TONES;
  active?: boolean;
  narrow?: boolean;
  title?: string;
}) {
  return (
    <motion.button
      title={title}
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => {
        sound.uiClick();
        onClick();
      }}
      className={`${narrow ? 'shrink-0 px-3' : 'flex-1 min-w-0 px-2'} rounded-lg border bg-gradient-to-b font-display font-bold text-[15px] sm:text-base whitespace-nowrap truncate shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition ${TONES[tone]} ${
        active ? 'ring-2 ring-white/70' : 'hover:brightness-110'
      }`}
    >
      {children}
    </motion.button>
  );
}

function PreToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        sound.uiClick();
        onClick();
      }}
      className={`flex-1 min-w-0 flex items-center justify-center gap-2 rounded-lg border px-2 text-sm sm:text-[15px] font-semibold transition ${
        on ? 'bg-sky-900/70 border-sky-300/70 text-white' : 'bg-white/[0.04] border-white/10 text-slate-400 hover:text-slate-200'
      }`}
    >
      <span
        className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center text-[11px] ${
          on ? 'bg-sky-400 border-sky-300 text-ink-950' : 'border-slate-500'
        }`}
      >
        {on ? '✓' : ''}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function RaisePanel({
  snapshot,
  legal,
  selfChips,
  onClose,
}: {
  snapshot: GameStateSnapshot;
  legal: LegalActions;
  selfChips: number;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(legal.minRaiseTo);
  const [text, setText] = useState(String(legal.minRaiseTo));
  useEffect(() => setText(String(amount)), [amount]);
  const clamp = (v: number) => Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, Math.round(v)));
  const potSize = (f: number) => clamp(Math.round((snapshot.totalPot + legal.callAmount) * f) + snapshot.currentBet);
  const isAllIn = amount >= legal.maxRaiseTo;
  const verb = legal.canBet ? 'Bet' : 'Raise to';

  function confirm() {
    if (isAllIn && legal.canAllIn) sendPlayerAction('all_in');
    else sendPlayerAction(legal.canBet ? 'bet' : 'raise', amount);
    onClose();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="absolute bottom-full right-2 left-2 sm:left-auto sm:right-[max(1rem,calc(50%_-_624px))] mb-2 sm:w-[380px] rounded-2xl border border-gold/40 shadow-glow p-3"
      style={{ background: 'linear-gradient(180deg, rgba(24,32,46,0.98), rgba(10,13,20,0.98))' }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400">{legal.canBet ? 'Bet amount' : 'Raise to'}</span>
        <input
          type="number"
          inputMode="numeric"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => setAmount(clamp(Number(text) || legal.minRaiseTo))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setAmount(clamp(Number(text) || legal.minRaiseTo));
          }}
          className="w-28 bg-ink-800 border border-white/15 rounded-lg px-2 py-1 text-right font-display text-xl text-gold-light outline-none focus:border-gold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <input
        type="range"
        min={legal.minRaiseTo}
        max={Math.max(legal.minRaiseTo, legal.maxRaiseTo)}
        value={Math.min(amount, legal.maxRaiseTo)}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full accent-gold h-2"
      />
      <div className="grid grid-cols-4 gap-1.5 mt-2.5">
        {[
          ['Min', legal.minRaiseTo],
          ['½ Pot', potSize(0.5)],
          ['Pot', potSize(1)],
          ['All-in', legal.maxRaiseTo],
        ].map(([label, v]) => (
          <button
            key={label as string}
            onClick={() => setAmount(v as number)}
            className={`text-xs py-1.5 rounded-lg border transition ${
              amount === v ? 'bg-gold/20 border-gold text-gold-light' : 'bg-ink-800 border-white/10 text-slate-300 hover:bg-ink-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-ink-800 border border-white/10 text-slate-300">
          Cancel
        </button>
        <button
          onClick={() => {
            sound.uiClick();
            confirm();
          }}
          className={`flex-1 py-2.5 rounded-xl font-display font-bold text-lg ${
            isAllIn ? 'bg-gradient-to-b from-rose-600 to-rose-800 text-white' : 'bg-gradient-to-b from-gold to-gold-dark text-ink-950'
          }`}
        >
          {isAllIn ? `All-in ${formatChips(selfChips)}` : `${verb} ${formatChips(amount)}`}
        </button>
      </div>
    </motion.div>
  );
}
