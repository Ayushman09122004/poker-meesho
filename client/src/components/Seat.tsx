import { AnimatePresence, motion } from 'framer-motion';
import { PublicPlayer, WinnerAnnouncement } from '../../../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { PlayingCard } from './PlayingCard';
import { ChipBadge, formatChips } from './Chips';
import { TimerRing } from './TimerRing';
import { Point } from '../lib/seatLayout';
import { cardKey } from '../lib/handHint';

interface SeatProps {
  player: PublicPlayer;
  position: Point;
  isSelf: boolean;
  isTurn: boolean;
  turnExpiresAt: number | null;
  turnTotalMs: number;
  isDealer: boolean;
  isSB: boolean;
  isBB: boolean;
  winner?: WinnerAnnouncement;
  showdownRevealed: boolean;
  highlightedKeys?: Set<string>;
}

const ACTION_LABEL: Record<string, string> = {
  fold: 'Folded',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
  all_in: 'All In',
};

const AVATAR_SIZE = 76;

export function Seat({
  player,
  position,
  isSelf,
  isTurn,
  turnExpiresAt,
  turnTotalMs,
  isDealer,
  isSB,
  isBB,
  winner,
  showdownRevealed,
  highlightedKeys,
}: SeatProps) {
  const folded = player.status === 'folded';
  const eliminated = player.status === 'eliminated';
  const isAllIn = player.status === 'all_in';

  // Self keeps seeing their own hole cards after folding (darker), just to compare later —
  // everyone else's folded/mucked cards stay hidden per normal poker etiquette.
  const showCards = player.holeCards ? player.holeCards.length > 0 : player.hasCards;

  return (
    <motion.div
      layout
      className="absolute flex flex-col items-center gap-1.5"
      style={{ left: `${position.left}%`, top: `${position.top}%`, transform: 'translate(-50%, -50%)' }}
      animate={{ opacity: eliminated ? 0.35 : folded && !isSelf ? 0.55 : 1, scale: folded ? 0.94 : 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Hole cards */}
      <div className="flex gap-1.5 mb-1 h-[92px]">
        <AnimatePresence>
          {showCards && (
            <>
              <PlayingCard
                key={`${player.id}-c0`}
                card={player.holeCards?.[0] ?? undefined}
                faceDown={!player.holeCards}
                size="md"
                delay={0}
                highlighted={!folded && (!!winner || !!highlightedKeys?.has(player.holeCards?.[0] ? cardKey(player.holeCards[0]) : ''))}
                dimmed={folded}
              />
              <PlayingCard
                key={`${player.id}-c1`}
                card={player.holeCards?.[1] ?? undefined}
                faceDown={!player.holeCards}
                size="md"
                delay={0.06}
                highlighted={!folded && (!!winner || !!highlightedKeys?.has(player.holeCards?.[1] ? cardKey(player.holeCards[1]) : ''))}
                dimmed={folded}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Avatar + timer ring */}
      <div className="relative" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
        {isTurn && turnExpiresAt && <TimerRing expiresAt={turnExpiresAt} totalMs={turnTotalMs} size={AVATAR_SIZE} />}
        <div
          className={`absolute inset-[6px] rounded-full ${isTurn ? 'animate-pulseGlow' : ''} ${
            winner ? 'ring-4 ring-gold shadow-glow' : ''
          }`}
        >
          <AvatarBadge seed={player.avatarSeed} size={AVATAR_SIZE - 12} dimmed={!player.isConnected || eliminated} />
        </div>
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white text-ink-950 text-sm font-black flex items-center justify-center border-2 border-ink-900 shadow-card">
            D
          </div>
        )}
        {(isSB || isBB) && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-ink-950 text-xs font-black flex items-center justify-center border-2 border-ink-900">
            {isSB ? 'SB' : 'BB'}
          </div>
        )}
      </div>

      {/* Name + chips */}
      <div className={`text-center px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm min-w-[104px] ${isTurn ? 'border border-gold/60' : 'border border-white/5'}`}>
        <p className="text-sm font-medium truncate max-w-[130px] flex items-center gap-1 justify-center">
          {player.isHost && <span>👑</span>}
          {player.name}
          {isSelf && <span className="text-gold-light">(you)</span>}
        </p>
        <p className="text-xs text-gold-light font-display">{formatChips(player.chips)}</p>
      </div>

      {/* Status / last action bubble */}
      <AnimatePresence>
        {(player.lastAction || eliminated || !player.isConnected) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              eliminated
                ? 'bg-slate-700 text-slate-300'
                : !player.isConnected
                ? 'bg-slate-700 text-amber-300'
                : folded
                ? 'bg-slate-800 text-slate-400'
                : isAllIn
                ? 'bg-rose-600/80 text-white'
                : 'bg-ink-800 text-emerald-300'
            }`}
          >
            {eliminated ? 'Eliminated' : !player.isConnected ? 'Disconnected' : player.lastAction ? ACTION_LABEL[player.lastAction] : ''}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet chips in front of the seat */}
      <AnimatePresence>
        {player.bet > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute"
            style={{ top: 118, left: '50%', transform: 'translateX(-50%)' }}
          >
            <ChipBadge amount={player.bet} size="sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner callout */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8 }}
            animate={{ opacity: 1, y: -118, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute whitespace-nowrap px-3 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-ink-950 font-display font-bold text-xs shadow-glow"
          >
            +{formatChips(winner.amount)} {winner.handName ? `· ${winner.handName}` : ''}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
