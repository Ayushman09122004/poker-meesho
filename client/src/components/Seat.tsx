import { AnimatePresence, motion } from 'framer-motion';
import { PublicPlayer, WinnerAnnouncement } from '../../../shared/types';
import { AvatarBadge } from './AvatarBadge';
import { PlayingCard } from './PlayingCard';
import { ChipBadge, formatChips } from './Chips';
import { TimerRing } from './TimerRing';
import { Point } from '../lib/seatLayout';
import { cardKey } from '../lib/handHint';
import { useIsMobile } from '../hooks/useIsMobile';

interface SeatProps {
  player: PublicPlayer;
  position: Point;
  isSelf: boolean;
  isTurn: boolean;
  turnExpiresAt: number | null;
  turnTotalMs: number;
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

const AVATAR_SIZE_DESKTOP = 76;
const AVATAR_SIZE_MOBILE = 56;

export function Seat({
  player,
  position,
  isSelf,
  isTurn,
  turnExpiresAt,
  turnTotalMs,
  isSB,
  isBB,
  winner,
  showdownRevealed,
  highlightedKeys,
}: SeatProps) {
  const folded = player.status === 'folded';
  const eliminated = player.status === 'eliminated';
  const isAllIn = player.status === 'all_in';
  const isMobile = useIsMobile();
  const AVATAR_SIZE = isMobile ? AVATAR_SIZE_MOBILE : AVATAR_SIZE_DESKTOP;
  const betChipTop = Math.round(AVATAR_SIZE * 1.55);
  const winnerCalloutY = -Math.round(AVATAR_SIZE * 1.55);

  // Unit vector from this seat toward the table center, used so bet chips slide toward the pot
  // (rather than just fading in place) and won chips visibly arrive from the pot's direction.
  const dx = position.left - 50;
  const dy = position.top - 50;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const towardCenter = { x: -(dx / dist) * 70, y: -(dy / dist) * 70 };
  const fromCenter = { x: (dx / dist) * 70, y: (dy / dist) * 70 };

  // Self keeps seeing their own hole cards after folding (darker), just to compare later —
  // everyone else's folded/mucked cards stay hidden per normal poker etiquette.
  const showCards = player.holeCards ? player.holeCards.length > 0 : player.hasCards;

  return (
    // Positioning lives on a plain div: a motion.div's own `animate` transform (used below for the
    // fold scale/opacity) completely overwrites any static `transform` set via its style prop, so
    // the centering translate(-50%,-50%) must live on a separate, non-animated wrapper.
    <div className="absolute" style={{ left: `${position.left}%`, top: `${position.top}%`, transform: 'translate(-50%, -50%)' }}>
      <motion.div
        layout
        className="flex flex-col items-center gap-1.5"
        animate={{ opacity: eliminated ? 0.35 : folded && !isSelf ? 0.55 : 1, scale: folded ? 0.94 : 1 }}
        transition={{ duration: 0.35 }}
      >
      {/* Hole cards */}
      <div className="flex gap-1 sm:gap-1.5 mb-1 h-16 sm:h-[92px]">
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
        {(isSB || isBB) && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-ink-950 text-xs font-black flex items-center justify-center border-2 border-ink-900">
            {isSB ? 'SB' : 'BB'}
          </div>
        )}
      </div>

      {/* Name + chips */}
      <div className={`text-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg bg-black/50 backdrop-blur-sm min-w-[80px] sm:min-w-[104px] ${isTurn ? 'border border-gold/60' : 'border border-white/5'}`}>
        <p className="text-xs sm:text-sm font-medium truncate max-w-[110px] sm:max-w-[130px] flex items-center gap-1 justify-center">
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

      {/* Bet chips in front of the seat — slide toward the pot as they're swept away */}
      <AnimatePresence>
        {player.bet > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, x: 0, y: 0 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, x: towardCenter.x, y: towardCenter.y }}
            transition={{ duration: 0.4 }}
            className="absolute"
            style={{ top: betChipTop, left: '50%', translateX: '-50%' }}
          >
            <ChipBadge amount={player.bet} size="sm" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner callout — a chip visibly arrives from the pot's direction alongside the amount */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.8, x: fromCenter.x }}
            animate={{ opacity: 1, y: winnerCalloutY, scale: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute whitespace-nowrap px-3 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-ink-950 font-display font-bold text-xs shadow-glow flex items-center gap-1"
          >
            <span>🪙</span>
            +{formatChips(winner.amount)} {winner.handName ? `· ${winner.handName}` : ''}
          </motion.div>
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
