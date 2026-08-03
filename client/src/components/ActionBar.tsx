import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GameStateSnapshot, LegalActions } from '../../../shared/types';
import { sendPlayerAction } from '../hooks/useGameConnection';
import { formatChips } from './Chips';
import { sound } from '../lib/sound';

interface ActionBarProps {
  snapshot: GameStateSnapshot;
  legal: LegalActions;
  selfChips: number;
}

export function ActionBar({ snapshot, legal, selfChips }: ActionBarProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto w-full max-w-2xl mx-auto bg-ink-900/95 backdrop-blur border border-gold/30 rounded-2xl shadow-glow p-3 sm:p-4"
    >
      {showRaiseControls && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span>Bet amount</span>
            <span className="font-display text-gold-light">{formatChips(raiseAmount)}</span>
          </div>
          <input
            type="range"
            min={legal.minRaiseTo}
            max={Math.max(legal.minRaiseTo, legal.maxRaiseTo)}
            value={Math.min(raiseAmount, legal.maxRaiseTo)}
            onChange={(e) => setRaiseAmount(Number(e.target.value))}
            className="w-full accent-gold"
          />
          <div className="flex gap-2 mt-2 flex-wrap">
            <QuickBtn label="½ Pot" onClick={() => quickSize(0.5)} />
            <QuickBtn label="Pot" onClick={() => quickSize(1)} />
            <QuickBtn label="2x Pot" onClick={() => quickSize(2)} />
            <QuickBtn label="Max" onClick={() => setRaiseAmount(legal.maxRaiseTo)} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:flex gap-2">
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
      className={`py-3 px-4 rounded-xl transition active:scale-95 ${className}`}
    >
      {label}
    </button>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs px-2.5 py-1 rounded-full bg-ink-800 border border-white/10 text-slate-300 hover:bg-ink-700 transition">
      {label}
    </button>
  );
}
