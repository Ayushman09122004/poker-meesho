import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PublicPlayer, WinnerAnnouncement } from '../../../shared/types';
import { AvatarBadge, AvatarBody, hasDrinkProp } from './AvatarBadge';
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
  isSB: boolean;
  isBB: boolean;
  winner?: WinnerAnnouncement;
  showdownRevealed: boolean;
  highlightedKeys?: Set<string>;
  seatScale: number;
  /** This player's position in deal order (0 = dealt first) — staggers the card-flight animation
   * so the whole table looks like it's being dealt around one player at a time, not all at once. */
  dealOrderIndex: number;
}

const ACTION_LABEL: Record<string, string> = {
  fold: 'Folded',
  check: 'Check',
  call: 'Call',
  bet: 'Bet',
  raise: 'Raise',
  all_in: 'All In',
};

// Fixed reference size, in the table's uniformly-scaled coordinate space (see Table.tsx) — no
// longer needs a separate mobile size since the whole table scales together as one unit.
const AVATAR_SIZE = 76;

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
  seatScale,
  dealOrderIndex,
}: SeatProps) {
  const folded = player.status === 'folded';
  const eliminated = player.status === 'eliminated';
  const isAllIn = player.status === 'all_in';

  // Replays a quick "playing a card" gesture on the avatar every time this player's action
  // changes (check/call/bet/raise/fold/all-in) — a lightweight stand-in for a full card-toss
  // animation that reads clearly at avatar size without needing new art assets.
  const prevActionRef = useRef<string | null>(null);
  const [gesturePulse, setGesturePulse] = useState(0);
  useEffect(() => {
    if (player.lastAction && player.lastAction !== prevActionRef.current) {
      setGesturePulse((n) => n + 1);
    }
    prevActionRef.current = player.lastAction;
  }, [player.lastAction]);
  const betChipTop = Math.round(AVATAR_SIZE * 1.55);
  const winnerCalloutY = -Math.round(AVATAR_SIZE * 1.55);

  // Unit vector from this seat toward the table center, used so bet chips slide toward the pot
  // (rather than just fading in place), won chips visibly arrive from the pot's direction, and
  // hole cards fly in from the center — as if dealt from the dealer's position at the table's heart.
  // Memoized on the seat's own position (stable for the whole hand) rather than recomputed as a
  // fresh object every render: Framer Motion restarts an in-flight animation whenever the
  // `animate`/`initial` target objects it's given change identity, even with identical values —
  // and this component re-renders often (every snapshot broadcast, e.g. from the turn timer
  // ticking), so an unmemoized flyFrom vector made the deal animation perpetually restart and
  // never finish.
  const geometry = useMemo(() => {
    const dx = position.left - 50;
    const dy = position.top - 50;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    return {
      towardCenter: { x: -(dx / dist) * 70, y: -(dy / dist) * 70 },
      fromCenter: { x: (dx / dist) * 70, y: (dy / dist) * 70 },
      cardFlyFrom: { x: (dx / dist) * 150, y: (dy / dist) * 150 },
    };
  }, [position.left, position.top]);
  const { towardCenter, fromCenter, cardFlyFrom } = geometry;
  const dealDelay = dealOrderIndex * 0.15;

  // Self keeps seeing their own hole cards after folding (darker), just to compare later —
  // everyone else's folded/mucked cards stay hidden per normal poker etiquette.
  const showCards = player.holeCards ? player.holeCards.length > 0 : player.hasCards;
  const showDrink = hasDrinkProp(player.avatarSeed) && !eliminated && player.isConnected;

  return (
    // Positioning lives on a plain div: a motion.div's own `animate` transform (used below for the
    // fold scale/opacity) completely overwrites any static `transform` set via its style prop, so
    // the centering translate(-50%,-50%) must live on a separate, non-animated wrapper.
    <div className="absolute" style={{ left: `${position.left}%`, top: `${position.top}%`, transform: 'translate(-50%, -50%)' }}>
      {/* No `layout` prop here: Framer's layout/FLIP projection measures actual rendered
          (post-transform) boxes, which breaks badly under the table's own ancestor scale() —
          it was computing a wildly wrong compensating scale (observed 3x+) to "correct" a size
          change that was really just the table's own zoom-to-fit, not a real layout change. */}
      <motion.div
        className="flex flex-col items-center gap-1.5"
        animate={{ opacity: eliminated ? 0.35 : folded && !isSelf ? 0.55 : 1, scale: (folded ? 0.94 : 1) * seatScale }}
        transition={{ duration: 0.35 }}
      >
      {/* Hole cards — fly in from the table center, staggered by deal order, like a real deal */}
      <div className="flex gap-1.5 mb-1" style={{ height: 92 }}>
        <AnimatePresence>
          {showCards && (
            <>
              <PlayingCard
                key={`${player.id}-c0`}
                card={player.holeCards?.[0] ?? undefined}
                faceDown={!player.holeCards}
                size="md"
                delay={dealDelay}
                flyFrom={cardFlyFrom}
                highlighted={!folded && (!!winner || !!highlightedKeys?.has(player.holeCards?.[0] ? cardKey(player.holeCards[0]) : ''))}
                dimmed={folded}
              />
              <PlayingCard
                key={`${player.id}-c1`}
                card={player.holeCards?.[1] ?? undefined}
                faceDown={!player.holeCards}
                size="md"
                delay={dealDelay + 0.08}
                flyFrom={cardFlyFrom}
                highlighted={!folded && (!!winner || !!highlightedKeys?.has(player.holeCards?.[1] ? cardKey(player.holeCards[1]) : ''))}
                dimmed={folded}
              />
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Seated avatar: a body/torso silhouette behind the head badge, plus timer ring on top */}
      <div className="relative" style={{ width: AVATAR_SIZE * 1.4, height: AVATAR_SIZE * 1.3 }}>
        <div className="absolute left-1/2" style={{ top: AVATAR_SIZE * 0.6, transform: 'translateX(-50%)', zIndex: 0 }}>
          <AvatarBody seed={player.avatarSeed} width={AVATAR_SIZE * 1.3} />
        </div>
        <div className="absolute left-1/2 top-0" style={{ width: AVATAR_SIZE, height: AVATAR_SIZE, transform: 'translateX(-50%)', zIndex: 10 }}>
          {isTurn && turnExpiresAt && <TimerRing expiresAt={turnExpiresAt} totalMs={turnTotalMs} size={AVATAR_SIZE} />}
          <div
            className={`absolute inset-[6px] rounded-full ${isTurn ? 'animate-pulseGlow' : ''} ${
              winner ? 'ring-4 ring-gold shadow-glow' : ''
            }`}
          >
            <AvatarBadge
              seed={player.avatarSeed}
              size={AVATAR_SIZE - 12}
              dimmed={!player.isConnected || eliminated}
              animated={!eliminated && !folded && player.isConnected}
              gesturePulse={gesturePulse}
            />
          </div>
          {(isSB || isBB) && (
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold text-ink-950 text-xs font-black flex items-center justify-center border-2 border-ink-900 z-20">
              {isSB ? 'SB' : 'BB'}
            </div>
          )}
          {showDrink && (
            <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full bg-ink-900 border border-white/20 flex items-center justify-center text-[11px] z-20">
              🍹
            </div>
          )}
        </div>
      </div>

      {/* Name + chips — no truncation: long names wrap onto a second line instead of being cut
          off, since a hidden/clipped name was a reported bug and this is a low-traffic label. */}
      <div className={`text-center px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm min-w-[108px] max-w-[180px] ${isTurn ? 'border border-gold/60' : 'border border-white/5'}`}>
        <p className="text-sm font-medium leading-tight break-words flex items-center gap-1 justify-center flex-wrap">
          {player.isHost && <span>👑</span>}
          <span>{player.name}</span>
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
