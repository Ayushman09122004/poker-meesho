import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, GameStateSnapshot, PlayerAction, PublicPlayer, WinnerAnnouncement } from '../../../shared/types';
import { EmoteEvent } from '../store/gameStore';
import { occupiedSeatOrder } from '../lib/seatLayout';
import { PlayingCard, CardSlot } from './PlayingCard';
import { AvatarBadge } from './AvatarBadge';
import { ChipBadge, formatChips } from './Chips';
import { TimerRing } from './TimerRing';

// The whole table is laid out in this fixed design space and uniformly scaled to fit its container,
// so seats, cards and bets never collide at odd viewport sizes.
const STAGE_W = 1200;
const STAGE_H = 790;
const CENTER = { x: STAGE_W / 2, y: 392 };
const TABLE_RX = 440;
const TABLE_RY = 225;
const SEAT_RX = 505;
const SEAT_RY = 282;

const THEME_FELT: Record<string, { light: string; dark: string; accent: string }> = {
  midnight: { light: '#24406e', dark: '#0b1530', accent: '#7aa2ff' },
  emerald: { light: '#16865f', dark: '#063322', accent: '#5fe3a8' },
  crimson: { light: '#8a1f36', dark: '#2e0710', accent: '#ff8aa0' },
  royal: { light: '#4a2f8a', dark: '#160b33', accent: '#c4a5ff' },
};

const ACTION_LABEL: Record<PlayerAction, { text: string; cls: string }> = {
  fold: { text: 'Fold', cls: 'bg-slate-600 text-slate-100' },
  check: { text: 'Check', cls: 'bg-sky-600 text-white' },
  call: { text: 'Call', cls: 'bg-emerald-600 text-white' },
  bet: { text: 'Bet', cls: 'bg-amber-500 text-ink-950' },
  raise: { text: 'Raise', cls: 'bg-orange-500 text-white' },
  all_in: { text: 'All-in', cls: 'bg-rose-600 text-white' },
};

interface PokerTable2DProps {
  snapshot: GameStateSnapshot;
  selfPlayerId: string | null;
  highlightedKeys?: Set<string>;
  winnersByPlayer: Map<string, WinnerAnnouncement>;
  emotes: EmoteEvent[];
}

const cardKey = (c: Card | undefined | null) => (c ? `${c.rank}${c.suit}` : '');

function seatPoint(relIndex: number, count: number) {
  // relIndex 0 (you) sits at the bottom centre; others go clockwise around the oval.
  const rad = ((90 + (relIndex * 360) / Math.max(1, count)) * Math.PI) / 180;
  return { x: CENTER.x + SEAT_RX * Math.cos(rad), y: CENTER.y + SEAT_RY * Math.sin(rad) };
}

function towardCenter(p: { x: number; y: number }, t: number) {
  return { x: p.x + (CENTER.x - p.x) * t, y: p.y + (CENTER.y - p.y) * t };
}

function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setScale(Math.min(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, scale };
}

export function PokerTable2D({ snapshot, selfPlayerId, highlightedKeys, winnersByPlayer, emotes }: PokerTable2DProps) {
  const { ref, scale } = useFitScale();
  const seatOrder = useMemo(() => occupiedSeatOrder(snapshot.players.map((p) => p.seatIndex)), [snapshot.players]);
  const count = snapshot.players.length;
  const selfPlayer = snapshot.players.find((p) => p.id === selfPlayerId);
  const selfOrder = selfPlayer ? seatOrder.get(selfPlayer.seatIndex) ?? 0 : 0;
  const relIndexFor = (seatIndex: number) => {
    const order = seatOrder.get(seatIndex) ?? 0;
    return (((order - selfOrder) % count) + count) % count;
  };
  const felt = THEME_FELT[snapshot.settings.tableTheme] ?? THEME_FELT.emerald;
  const seatScale = count <= 6 ? 1 : 0.88;
  const inHand = snapshot.phase === 'hand_in_progress' || snapshot.phase === 'between_hands';

  const dealerPlayer = snapshot.players.find((p) => p.seatIndex === snapshot.dealerSeat);
  const dealerPos = dealerPlayer
    ? (() => {
        const seat = seatPoint(relIndexFor(dealerPlayer.seatIndex), count);
        const p = towardCenter(seat, 0.36);
        // Nudge sideways so the button doesn't sit on top of the bet chips.
        const dx = CENTER.x - seat.x;
        const dy = CENTER.y - seat.y;
        const len = Math.hypot(dx, dy) || 1;
        return { x: p.x + (-dy / len) * 62, y: p.y + (dx / len) * 62 };
      })()
    : null;

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      {/* Soft spotlight over the table; the room backdrop itself lives on Table's root so it also
          runs behind the action bar. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 60% 55% at 50% 50%, ${felt.dark}55 0%, transparent 70%)` }}
      />

      <div className="relative shrink-0" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})` }}>
        {/* Table: shadow, rail, felt */}
        <div
          className="absolute rounded-full"
          style={{
            left: CENTER.x - TABLE_RX - 10,
            top: CENTER.y - TABLE_RY + 28,
            width: (TABLE_RX + 10) * 2,
            height: TABLE_RY * 2,
            background: 'rgba(0,0,0,0.7)',
            filter: 'blur(28px)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            left: CENTER.x - TABLE_RX,
            top: CENTER.y - TABLE_RY,
            width: TABLE_RX * 2,
            height: TABLE_RY * 2,
            background: 'linear-gradient(180deg, #7a4a2a 0%, #4e2c16 45%, #2b170a 100%)',
            boxShadow: 'inset 0 3px 2px rgba(255,220,180,0.35), inset 0 -6px 10px rgba(0,0,0,0.6), 0 2px 0 #1a0d05',
          }}
        >
          {/* Leather padding highlight */}
          <div
            className="absolute rounded-full"
            style={{ inset: 6, border: '1px solid rgba(255,210,160,0.18)' }}
          />
          {/* Felt */}
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              inset: 26,
              background: `radial-gradient(ellipse at 50% 40%, ${felt.light} 0%, ${felt.dark} 85%)`,
              boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(0,0,0,0.35)',
            }}
          >
            <div className="absolute inset-0 opacity-[0.12] table-noise" />
            {/* Betting line */}
            <div
              className="absolute rounded-full"
              style={{ inset: 34, border: '2px solid rgba(227,182,79,0.28)' }}
            />
            {/* Watermark */}
            <div
              className="absolute left-1/2 -translate-x-1/2 font-display font-extrabold tracking-[0.35em] uppercase select-none"
              style={{ top: 292, fontSize: 22, color: 'rgba(255,255,255,0.07)' }}
            >
              Felt &amp; Friends
            </div>
          </div>
        </div>

        {/* Pot */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: CENTER.x, top: CENTER.y - 95 }}>
          <AnimatePresence>
            {snapshot.totalPot > 0 && (
              <motion.div
                key="pot"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                className="flex flex-col items-center gap-1"
              >
                <ChipBadge amount={snapshot.totalPot} label={`Pot ${snapshot.totalPot.toLocaleString()}`} size="lg" />
                {snapshot.pots.length > 1 && snapshot.players.some((pl) => pl.status === 'all_in') && (
                  <div className="flex gap-1">
                    {snapshot.pots.map((pot, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-black/45 text-slate-200">
                        {i === 0 ? 'Main' : `Side ${i}`}: {formatChips(pot.amount)}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Community cards */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 flex gap-2.5" style={{ left: CENTER.x, top: CENTER.y + 5 }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const card = snapshot.communityCards[i];
            if (!card) return <CardSlot key={`slot-${i}`} size="md" />;
            const dimmed = snapshot.revealedRunoutFrom !== null && i >= snapshot.revealedRunoutFrom;
            return (
              <PlayingCard
                key={`c-${snapshot.handNumber}-${i}-${cardKey(card)}`}
                card={card}
                size="md"
                delay={i < 3 ? i * 0.1 : 0}
                highlighted={!!highlightedKeys?.has(cardKey(card))}
                dimmed={dimmed}
              />
            );
          })}
        </div>

        {/* Street label */}
        {snapshot.phase === 'hand_in_progress' && (
          <div
            className="absolute -translate-x-1/2 text-[11px] uppercase tracking-[0.3em] text-white/45 font-semibold"
            style={{ left: CENTER.x, top: CENTER.y + 62 }}
          >
            {snapshot.street}
          </div>
        )}

        {/* Bets in front of each player */}
        {snapshot.players.map((p) => {
          if (p.bet <= 0) return null;
          const pos = towardCenter(seatPoint(relIndexFor(p.seatIndex), count), 0.47);
          return (
            <div key={`bet-${p.id}`} className="absolute -translate-x-1/2 -translate-y-1/2 z-10" style={{ left: pos.x, top: pos.y }}>
              <ChipBadge key={`${snapshot.street}-${p.bet}`} amount={p.bet} size="sm" />
            </div>
          );
        })}

        {/* Dealer button */}
        {dealerPos && inHand && (
          <motion.div
            className="absolute z-10 w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center font-display font-extrabold text-ink-950 text-sm"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #e8e8e8 55%, #b9b9b9 100%)',
              boxShadow: '0 3px 6px rgba(0,0,0,0.55), inset 0 -2px 3px rgba(0,0,0,0.2)',
            }}
            animate={{ left: dealerPos.x, top: dealerPos.y }}
            initial={false}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            D
          </motion.div>
        )}

        {/* Seats */}
        {snapshot.players.map((p) => {
          const pos = seatPoint(relIndexFor(p.seatIndex), count);
          return (
            <div
              key={p.id}
              className="absolute z-20"
              style={{ left: pos.x, top: pos.y, transform: `translate(-50%, -50%) scale(${seatScale})` }}
            >
              <SeatPod
                player={p}
                snapshot={snapshot}
                isSelf={p.id === selfPlayerId}
                winner={winnersByPlayer.get(p.id)}
                highlightedKeys={highlightedKeys}
                emote={[...emotes].reverse().find((e) => e.playerId === p.id)}
                accent={felt.accent}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface SeatPodProps {
  player: PublicPlayer;
  snapshot: GameStateSnapshot;
  isSelf: boolean;
  winner?: WinnerAnnouncement;
  highlightedKeys?: Set<string>;
  emote?: EmoteEvent;
  accent: string;
}

function SeatPod({ player: p, snapshot, isSelf, winner, highlightedKeys, emote }: SeatPodProps) {
  const isTurn = snapshot.currentTurnPlayerId === p.id;
  const folded = p.status === 'folded';
  const out = p.status === 'eliminated';
  const showCards = p.holeCards ? p.holeCards.length > 0 : p.hasCards;
  const avatarSize = isSelf ? 72 : 64;
  const totalMs = snapshot.settings.turnTimerSeconds * 1000;
  const isSB = snapshot.phase === 'hand_in_progress' && p.seatIndex === snapshot.smallBlindSeat;
  const isBB = snapshot.phase === 'hand_in_progress' && p.seatIndex === snapshot.bigBlindSeat;
  const action = p.lastAction ? ACTION_LABEL[p.lastAction] : null;

  const cards = showCards ? (
    <div className={`flex ${isSelf ? 'gap-1.5' : '-space-x-5'}`}>
      {[0, 1].map((i) => {
        const card = p.holeCards?.[i] ?? null;
        return (
          <div key={i} style={isSelf ? undefined : { transform: `rotate(${i === 0 ? -8 : 8}deg) translateY(${i === 0 ? 0 : 2}px)` }}>
            <PlayingCard
              key={`h-${snapshot.handNumber}-${p.id}-${i}`}
              card={card}
              faceDown={!card}
              size={isSelf ? 'md' : 'sm'}
              delay={i * 0.08}
              dimmed={folded}
              highlighted={!folded && !!card && (!!winner || !!highlightedKeys?.has(cardKey(card)))}
            />
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <motion.div
      className={`relative flex items-center ${isSelf ? 'flex-row gap-3' : 'flex-col'}`}
      animate={{ opacity: out ? 0.4 : folded ? 0.6 : 1 }}
    >
      {/* Opponents' cards peek out above their avatar */}
      {!isSelf && <div className="h-[52px] flex items-end justify-center -mb-3 relative z-0">{cards}</div>}

      <div className="relative flex flex-col items-center z-10">
        {/* Emote */}
        <AnimatePresence>
          {emote && (
            <motion.div
              key={emote.id}
              className="absolute -top-12 text-4xl z-30 drop-shadow-lg"
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {emote.emoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar with turn timer */}
        <div className="relative" style={{ width: avatarSize + 10, height: avatarSize + 10 }}>
          {isTurn && (
            <motion.div
              className="absolute -inset-1.5 rounded-full"
              style={{ boxShadow: '0 0 24px 4px rgba(227,182,79,0.55)' }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          {winner && <div className="absolute -inset-2 rounded-full bg-gold/30 blur-md" />}
          <div className="absolute inset-[5px]">
            <AvatarBadge seed={p.avatarSeed} size={avatarSize} ring={winner ? 'gold' : 'none'} dimmed={!p.isConnected} />
          </div>
          {isTurn && snapshot.turnExpiresAt && (
            <TimerRing expiresAt={snapshot.turnExpiresAt} totalMs={totalMs} size={avatarSize + 10} />
          )}
          {(isSB || isBB) && (
            <span
              className={`absolute -right-1 bottom-0 text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-ink-950 ${
                isBB ? 'bg-sky-400 text-ink-950' : 'bg-slate-200 text-ink-950'
              }`}
            >
              {isBB ? 'BB' : 'SB'}
            </span>
          )}
        </div>

        {/* Nameplate */}
        <div
          className={`-mt-2 min-w-[124px] max-w-[150px] rounded-xl px-3 py-1.5 text-center border backdrop-blur-sm ${
            isTurn
              ? 'bg-gradient-to-b from-ink-700 to-ink-900 border-gold/80'
              : winner
                ? 'bg-gradient-to-b from-gold-dark/80 to-ink-900 border-gold'
                : 'bg-gradient-to-b from-ink-800/95 to-ink-950/95 border-white/10'
          }`}
          style={{ boxShadow: '0 6px 14px rgba(0,0,0,0.5)' }}
        >
          <p className="text-[13px] font-semibold text-white truncate leading-tight">
            {p.isHost && <span className="mr-1">👑</span>}
            {p.name}
            {isSelf && <span className="text-gold-light font-normal"> · you</span>}
          </p>
          <p className="text-[13px] font-display font-bold text-gold-light leading-tight">{formatChips(p.chips)}</p>
        </div>

        {/* Status / last action */}
        <div className="h-5 mt-1 flex items-center">
          <AnimatePresence mode="wait">
            {winner ? (
              <motion.span
                key="win"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-ink-950 whitespace-nowrap shadow-glow"
              >
                +{formatChips(winner.amount)}
                {winner.handName ? ` · ${winner.handName}` : ''}
              </motion.span>
            ) : out ? (
              <Tag key="out" text="Out" cls="bg-black/60 text-slate-400" />
            ) : !p.isConnected ? (
              <Tag key="dc" text="Away" cls="bg-black/60 text-amber-300" />
            ) : p.status === 'all_in' ? (
              <Tag key="allin" text="All-in" cls={ACTION_LABEL.all_in.cls} />
            ) : action ? (
              <Tag key={`a-${p.lastAction}`} text={action.text} cls={action.cls} />
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Your own cards sit beside your seat, large and readable */}
      {isSelf && cards}
    </motion.div>
  );
}

function Tag({ text, cls }: { text: string; cls: string }) {
  return (
    <motion.span
      initial={{ y: 4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow ${cls}`}
    >
      {text}
    </motion.span>
  );
}
