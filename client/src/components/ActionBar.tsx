import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GameStateSnapshot, LegalActions } from '../../../shared/types';
import { sendPlayerAction, useTimeBankAction } from '../hooks/useGameConnection';
import { ChipStackIcon, formatChips } from './Chips';
import { sound } from '../lib/sound';

interface ActionBarProps {
  snapshot: GameStateSnapshot;
  legal: LegalActions;
  selfChips: number;
  timeBankMs: number;
  /**
   * 'full': roomy default. 'compact': small screens — sizing chips + slider + amount on one row, all
   * actions on another. 'side': short landscape screens, where the bar lives in a narrow column
   * beside the table — stacked controls with a 2x2 action grid.
   */
  variant?: 'full' | 'compact' | 'side';
}

export function ActionBar({ snapshot, legal, selfChips, timeBankMs, variant = 'full' }: ActionBarProps) {
  const compact = variant === 'compact';
  const side = variant === 'side';
  const [raiseAmount, setRaiseAmount] = useState(legal.minRaiseTo);

  useEffect(() => {
    setRaiseAmount(legal.minRaiseTo);
  }, [legal.minRaiseTo, snapshot.currentTurnPlayerId]);

  const pot = snapshot.totalPot;
  const showRaiseControls = legal.canBet || legal.canRaise;

  function act(action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in', amount?: number) {
    sendPlayerAction(action, amount);
  }

  function quickSize(fraction: number) {
    const target = Math.round((pot + (legal.callAmount ?? 0)) * fraction) + snapshot.currentBet;
    const clamped = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, target));
    setRaiseAmount(clamped);
  }

  // Lets the raw text diverge from the clamped numeric amount while typing (so "" or a
  // half-typed number doesn't get stomped back to the min every keystroke); clamps on blur/enter.
  const [raiseInputText, setRaiseInputText] = useState(String(legal.minRaiseTo));
  useEffect(() => {
    setRaiseInputText(String(raiseAmount));
  }, [raiseAmount]);

  function commitTypedAmount(text: string) {
    const parsed = Math.round(Number(text));
    if (!Number.isFinite(parsed)) {
      setRaiseInputText(String(raiseAmount));
      return;
    }
    const clamped = Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, parsed));
    setRaiseAmount(clamped);
  }

  const amountInput = (
    <div className="flex items-center gap-1 bg-ink-800 border border-white/10 rounded-lg px-2 py-0.5 focus-within:border-gold/60">
      <ChipStackIcon value={raiseAmount} size={10} />
      <input
        type="number"
        inputMode="numeric"
        min={legal.minRaiseTo}
        max={legal.maxRaiseTo}
        value={raiseInputText}
        onChange={(e) => setRaiseInputText(e.target.value)}
        onBlur={(e) => commitTypedAmount(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commitTypedAmount((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={`${compact ? 'w-14 text-sm' : 'w-20'} bg-transparent text-right font-display text-gold-light outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
      />
    </div>
  );
  const slider = (
    <input
      type="range"
      min={legal.minRaiseTo}
      max={Math.max(legal.minRaiseTo, legal.maxRaiseTo)}
      value={Math.min(raiseAmount, legal.maxRaiseTo)}
      onChange={(e) => setRaiseAmount(Number(e.target.value))}
      className="w-full min-w-0 accent-gold"
    />
  );
  const quickButtons = (
    <>
      <QuickBtn label="½ Pot" compact={compact || side} onClick={() => quickSize(0.5)} />
      <QuickBtn label="Pot" compact={compact || side} onClick={() => quickSize(1)} />
      <QuickBtn label="2x" compact={compact || side} onClick={() => quickSize(2)} />
      <QuickBtn label="Max" compact={compact || side} onClick={() => setRaiseAmount(legal.maxRaiseTo)} />
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className={`pointer-events-auto relative w-full max-w-2xl mx-auto bg-ink-900/95 backdrop-blur border border-gold/30 rounded-2xl shadow-glow ${
        compact || side ? 'p-2' : 'p-2.5 sm:p-4'
      }`}
    >
      {timeBankMs > 0 && (
        <button
          onClick={() => {
            sound.uiClick();
            useTimeBankAction();
          }}
          title="Add 20 seconds from your time bank"
          className="absolute -top-3 right-3 sm:right-4 px-2.5 py-1 rounded-full bg-ink-800 border border-gold/40 text-[11px] text-gold-light font-display hover:bg-ink-700 transition shadow-card"
        >
          ⏱ +20s ({Math.ceil(timeBankMs / 1000)}s left)
        </button>
      )}
      {showRaiseControls &&
        (compact ? (
          <div className="mb-2 flex items-center gap-1.5">
            {quickButtons}
            {slider}
            {amountInput}
          </div>
        ) : (
          <div className="mb-2">
            <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1">
              <span>Bet amount</span>
              {amountInput}
            </div>
            {slider}
            <div className={`flex mt-2 flex-wrap ${side ? 'gap-1' : 'gap-2'}`}>{quickButtons}</div>
          </div>
        ))}

      <div
        className={
          compact
            ? 'flex gap-1.5 [&>button]:flex-1 [&>button]:py-2 [&>button]:px-1.5 [&>button]:text-sm [&>button]:whitespace-nowrap'
            : side
              ? 'grid grid-cols-2 gap-1.5 [&>button]:py-2 [&>button]:px-1.5 [&>button]:text-sm [&>button]:whitespace-nowrap'
              : 'grid grid-cols-2 sm:flex gap-2'
        }
      >
        <ActionButton
          label="Fold"
          className="bg-ink-800 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300"
          onClick={() => act('fold')}
        />
        {legal.canCheck && (
          <ActionButton label="Check" className="bg-ink-800 hover:bg-ink-700 border border-white/10 text-slate-100" onClick={() => act('check')} />
        )}
        {legal.canCall && (
          <ActionButton
            label={`Call ${formatChips(legal.callAmount)}`}
            className="bg-ink-800 hover:bg-ink-700 border border-emerald-500/40 text-emerald-300"
            onClick={() => act('call')}
          />
        )}
        {legal.canBet && (
          <ActionButton
            label={`Bet ${formatChips(raiseAmount)}`}
            className="flex-1 bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-bold shadow-glow"
            onClick={() => act('bet', raiseAmount)}
          />
        )}
        {legal.canRaise && (
          <ActionButton
            label={`Raise to ${formatChips(raiseAmount)}`}
            className="flex-1 bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-bold shadow-glow"
            onClick={() => act('raise', raiseAmount)}
          />
        )}
        {legal.canAllIn && (
          <ActionButton
            label={`All In (${formatChips(selfChips)})`}
            className="bg-gradient-to-br from-rose-600 to-rose-800 text-white font-bold"
            onClick={() => act('all_in')}
          />
        )}
      </div>
    </motion.div>
  );
}

function ActionButton({ label, onClick, className }: { label: string; onClick: () => void; className: string }) {
  return (
    <button
      onClick={() => {
        sound.uiClick();
        onClick();
      }}
      className={`py-2.5 sm:py-3 px-4 rounded-xl transition active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

function QuickBtn({ label, onClick, compact }: { label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full bg-ink-800 border border-white/10 text-slate-300 hover:bg-ink-700 transition ${
        compact ? 'text-[11px] px-2 py-1' : 'text-xs px-2.5 py-1'
      }`}
    >
      {label}
    </button>
  );
}
