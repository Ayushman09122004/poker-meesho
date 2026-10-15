import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameStateSnapshot, PlayerAction, PublicPlayer } from '../../../shared/types';
import { SHOWDOWN_TIMING } from '../../../shared/showdownTiming';
import { EmoteEvent } from '../store/gameStore';
import { occupiedSeatOrder } from '../lib/seatLayout';
import { PlayingCard, CardSlot } from './PlayingCard';
import { AvatarBadge } from './AvatarBadge';
import { ChipPile, formatChips } from './Chips';
import { TimerRing } from './TimerRing';
import { ShowdownState, cardKey, useShowdownSequence } from '../hooks/useShowdownSequence';

// The whole table is laid out in a fixed design space and uniformly scaled to fit its container,
// so seats, cards and bets never collide at odd viewport sizes. Tall containers (phones held
// upright) get a vertical oval instead of a squashed-down wide one.
interface Layout {
  w: number;
  h: number;
  cx: number;
  cy: number;
  tableRx: number;
  tableRy: number;
  seatRx: number;
  seatRy: number;
  portrait: boolean;
}

const LANDSCAPE: Layout = { w: 1200, h: 820, cx: 600, cy: 405, tableRx: 450, tableRy: 235, seatRx: 500, seatRy: 280, portrait: false };
// Widescreen monitors (e.g. 1920×1200): a longer table that uses the extra width.
const WIDE: Layout = { w: 1560, h: 820, cx: 780, cy: 405, tableRx: 600, tableRy: 240, seatRx: 665, seatRy: 282, portrait: false };
const PORTRAIT: Layout = { w: 860, h: 1540, cx: 430, cy: 725, tableRx: 275, tableRy: 430, seatRx: 320, seatRy: 505, portrait: true };

// Your own seat (bigger cards, laid out sideways) is pushed further below the table in the portrait
// layout so it clears the neighbouring seats on either side.
const SELF_DROP_PORTRAIT = 175;

// When the table is drawn small, seats/cards/chips are "zoomed" back up by up to this factor so
// they stay readable — like zooming the browser, but without shrinking the betting controls.
const MAX_BOOST = 1.45;
const TARGET_EFFECTIVE_SCALE = 0.8;

const THEME_FELT: Record<string, { light: string; dark: string; rail: [string, string] }> = {
  midnight: { light: '#3f86b8', dark: '#1d4f7a', rail: ['#8a9bb0', '#3c4a5c'] },
  emerald: { light: '#2fa776', dark: '#0f5c3d', rail: ['#8a6a48', '#3d2a17'] },
  crimson: { light: '#b0384f', dark: '#5c1225', rail: ['#7a6a5a', '#2e231a'] },
  royal: { light: '#6a4fb0', dark: '#2b1c5c', rail: ['#a39abf', '#3d3557'] },
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
  /** Assisted mode: your current best hand (name + the cards making it). */
  hint?: { name: string; keys: Set<string> } | null;
  emotes: EmoteEvent[];
}

type Point = { x: number; y: number };

interface Flight {
  id: number;
  from: Point;
  to: Point;
  amount: number;
  delay: number;
}

function seatPoint(L: Layout, relIndex: number, count: number): Point {
  // relIndex 0 (you) sits at the bottom centre; others go clockwise around the oval.
  const rad = ((90 + (relIndex * 360) / Math.max(1, count)) * Math.PI) / 180;
  return { x: L.cx + L.seatRx * Math.cos(rad), y: L.cy + L.seatRy * Math.sin(rad) };
}

/** Unit vector from a seat toward the table centre, and the perpendicular (clockwise side). */
function seatAxes(L: Layout, seat: Point) {
  const dx = L.cx - seat.x;
  const dy = L.cy - seat.y;
  const len = Math.hypot(dx, dy) || 1;
  const dir = { x: dx / len, y: dy / len };
  return { dir, perp: { x: -dir.y, y: dir.x } };
}

function useFitLayout() {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{ layout: Layout; scale: number }>({ layout: LANDSCAPE, scale: 1 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const aspect = w / h;
      const layout = aspect < 0.9 ? PORTRAIT : aspect > 1.7 ? WIDE : LANDSCAPE;
      setFit({ layout, scale: Math.min(w / layout.w, h / layout.h) });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, ...fit };
}

export function PokerTable2D({ snapshot, selfPlayerId, hint, emotes }: PokerTable2DProps) {
  const { ref, layout: L, scale } = useFitLayout();
  const boost = Math.min(MAX_BOOST, Math.max(1, TARGET_EFFECTIVE_SCALE / scale));
  const boardSize: 'md' | 'lg' = L.portrait ? 'md' : 'lg';
  // Capped so revealed side-seat cards never run into the board.
  const boardBoost = Math.min(boost, L.portrait ? 1.25 : 1.1);
  const boardCardH = (boardSize === 'lg' ? 136 : 92) * boardBoost;
  const center = { x: L.cx, y: L.cy };
  const potPos = { x: L.cx, y: L.cy - boardCardH / 2 - 42 * boardBoost };

  const seq = useShowdownSequence(snapshot);
  const seatOrder = useMemo(() => occupiedSeatOrder(snapshot.players.map((p) => p.seatIndex)), [snapshot.players]);
  const count = snapshot.players.length;
  const selfPlayer = snapshot.players.find((p) => p.id === selfPlayerId);
  const selfOrder = selfPlayer ? seatOrder.get(selfPlayer.seatIndex) ?? 0 : 0;
  const relIndexFor = (seatIndex: number) => {
    const order = seatOrder.get(seatIndex) ?? 0;
    return (((order - selfOrder) % count) + count) % count;
  };
  const geometryFor = (seatIndex: number) => {
    const rel = relIndexFor(seatIndex);
    const seat = seatPoint(L, rel, count);
    const { dir, perp } = seatAxes(L, seat);
    const bet = {
      x: seat.x + (dir.x * 125 + perp.x * 85) * boost,
      y: seat.y + (dir.y * 125 + perp.y * 85) * boost,
    };
    // Beside the seat (opposite side from the bet), not pushed in far enough to reach the board.
    // Top-row seats keep their cards on that side, so their button drops below the cards instead.
    const top = dir.y > 0.45;
    const dealer = {
      x: seat.x + (top ? dir.x * 115 - perp.x * 60 : dir.x * 62 - perp.x * 92) * boost,
      y: seat.y + (top ? dir.y * 115 - perp.y * 60 : dir.y * 62 - perp.y * 92) * boost,
    };
    const pos = { ...seat };
    if (rel === 0 && L.portrait) pos.y += SELF_DROP_PORTRAIT;
    return { rel, pos, dir, bet, dealer };
  };

  const felt = THEME_FELT[snapshot.settings.tableTheme] ?? THEME_FELT.midnight;
  const seatScale = (count <= 6 ? 1 : 0.88) * boost;
  const inHand = snapshot.phase === 'hand_in_progress' || snapshot.phase === 'between_hands';

  // ---- Chip flights: bets sweeping into the pot, and the pot pushed to the winner ----
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightId = useRef(0);
  const addFlights = (list: Omit<Flight, 'id'>[]) => {
    if (list.length === 0) return;
    const withIds = list.map((f) => ({ ...f, id: ++flightId.current }));
    setFlights((cur) => [...cur, ...withIds]);
    const ids = new Set(withIds.map((f) => f.id));
    const longest = Math.max(...list.map((f) => f.delay)) + SHOWDOWN_TIMING.chipFlightMs + 150;
    setTimeout(() => setFlights((cur) => cur.filter((f) => !ids.has(f.id))), longest);
  };

  const prevSnap = useRef<GameStateSnapshot | null>(null);
  useEffect(() => {
    const prev = prevSnap.current;
    prevSnap.current = snapshot;
    if (!prev || prev.handNumber !== snapshot.handNumber) return;
    const roundOver = prev.street !== snapshot.street || prev.phase !== snapshot.phase;
    if (!roundOver) return;
    addFlights(
      prev.players
        .filter((p) => p.bet > 0)
        .map((p, i) => ({ from: geometryFor(p.seatIndex).bet, to: potPos, amount: p.bet, delay: i * 40 }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot]);

  const awardedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!seq.awarded || awardedFor.current === snapshot.handNumber) return;
    awardedFor.current = snapshot.handNumber;
    const list: Omit<Flight, 'id'>[] = [];
    let i = 0;
    for (const [id, amount] of seq.wonBy) {
      const p = snapshot.players.find((pl) => pl.id === id);
      if (p) list.push({ from: potPos, to: geometryFor(p.seatIndex).pos, amount, delay: i++ * 120 });
    }
    addFlights(list);
    const total = [...seq.wonBy.values()].reduce((s, v) => s + v, 0);
    if (total >= snapshot.settings.bigBlind * 15) {
      setTimeout(() => confetti({ particleCount: 120, spread: 75, origin: { y: 0.55 }, colors: ['#e3b64f', '#f5d78a', '#ffffff'] }), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq.awarded, snapshot.handNumber]);

  // The pot shown on the felt excludes chips still sitting in front of players this round.
  const liveBets = snapshot.players.reduce((s, p) => s + p.bet, 0);
  const potAmount = seq.ended ? (seq.awarded ? 0 : snapshot.totalPot) : Math.max(0, snapshot.totalPot - liveBets);
  const showLabel = seq.ended ? seq.highlight : snapshot.phase === 'hand_in_progress' && !!hint;

  const dealerPlayer = snapshot.players.find((p) => p.seatIndex === snapshot.dealerSeat);

  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div className="relative shrink-0" style={{ width: L.w, height: L.h, transform: `scale(${scale})` }}>
        <TableSurface L={L} felt={felt} />

        {/* Pot */}
        <div className="absolute z-10" style={{ left: potPos.x, top: potPos.y, transform: `translate(-50%, -50%) scale(${boardBoost})` }}>
          <AnimatePresence>
            {potAmount > 0 && (
              <motion.div key="pot" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
                <ChipPile amount={potAmount} size={38} label={`Pot ${formatChips(potAmount)}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Community cards */}
        <div
          className="absolute flex gap-2"
          style={{ left: center.x, top: center.y, transform: `translate(-50%, -50%) scale(${boardBoost})` }}
        >
          {Array.from({ length: 5 }).map((_, i) => {
            const card = i < seq.boardVisible ? snapshot.communityCards[i] : undefined;
            if (!card) return <CardSlot key={`slot-${i}`} size={boardSize} />;
            const runout = snapshot.revealedRunoutFrom !== null && i >= snapshot.revealedRunoutFrom;
            const isWinning = seq.highlight && seq.winningKeys.has(cardKey(card));
            const assistedHit = !seq.ended && !!hint?.keys.has(cardKey(card));
            return (
              <PlayingCard
                key={`c-${snapshot.handNumber}-${i}-${cardKey(card)}`}
                card={card}
                size={boardSize}
                delay={!seq.ended && i < 3 ? i * 0.12 : 0}
                highlighted={isWinning || assistedHit}
                dimmed={runout || (seq.highlight && seq.winningKeys.size > 0 && !isWinning)}
              />
            );
          })}
        </div>

        {/* Hand label under the board: your hand (assisted) during play, the winning hand at showdown */}
        <div
          className="absolute z-10 flex flex-col items-center gap-1.5"
          style={{ left: center.x, top: center.y + boardCardH / 2 + 12 * boardBoost, transform: `translateX(-50%) scale(${boardBoost})`, transformOrigin: 'top center' }}
        >
          <AnimatePresence mode="wait">
            {showLabel && (
              <motion.div
                key={seq.ended ? `win-${snapshot.handNumber}` : `hint-${hint?.name}`}
                initial={{ opacity: 0, y: -6, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-1"
              >
                {seq.ended ? (
                  <>
                    {seq.winningHandName && (
                      <span className="px-4 py-1 rounded-md bg-ink-950/80 text-white font-display font-bold tracking-wide uppercase text-[17px] whitespace-nowrap border border-gold/50 shadow-glow">
                        {seq.winningHandName}
                      </span>
                    )}
                    <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-gold-dark via-gold to-gold-dark text-ink-950 font-display font-extrabold text-[14px] whitespace-nowrap">
                      {seq.winnerNames.join(' & ')} {seq.winnerNames.length > 1 ? 'split the pot' : 'wins'}
                    </span>
                  </>
                ) : (
                  <span className="px-4 py-1 rounded-md bg-ink-950/70 text-white/90 font-display font-bold tracking-wide uppercase text-[15px] whitespace-nowrap">
                    {hint?.name}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bets in front of each player */}
        {snapshot.players.map((p) => {
          if (p.bet <= 0) return null;
          const { bet } = geometryFor(p.seatIndex);
          return (
            <div key={`bet-${p.id}`} className="absolute z-10" style={{ left: bet.x, top: bet.y, transform: `translate(-50%, -50%) scale(${boost})` }}>
              <motion.div key={`${snapshot.street}-${p.bet}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <ChipPile amount={p.bet} size={32} />
              </motion.div>
            </div>
          );
        })}

        {/* Chips in flight */}
        {flights.map((f) => (
          <motion.div
            key={f.id}
            className="absolute z-30 pointer-events-none"
            style={{ left: 0, top: 0 }}
            initial={{ x: f.from.x, y: f.from.y, opacity: 1, scale: boost }}
            animate={{ x: f.to.x, y: f.to.y, opacity: [1, 1, 0.9], scale: boost }}
            transition={{ duration: SHOWDOWN_TIMING.chipFlightMs / 1000, delay: f.delay / 1000, ease: [0.3, 0.7, 0.3, 1] }}
          >
            <div className="-translate-x-1/2 -translate-y-1/2">
              <ChipPile amount={f.amount} size={32} showLabel={false} />
            </div>
          </motion.div>
        ))}

        {/* Dealer button */}
        {dealerPlayer && inHand && (
          <motion.div
            className="absolute z-10 w-9 h-9 -ml-[18px] -mt-[18px] rounded-full flex items-center justify-center font-display font-extrabold text-ink-950 text-[15px]"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #ececec 55%, #b9b9b9 100%)',
              boxShadow: '0 3px 6px rgba(0,0,0,0.55), inset 0 -2px 3px rgba(0,0,0,0.2)',
              scale: boost,
            }}
            animate={{ left: geometryFor(dealerPlayer.seatIndex).dealer.x, top: geometryFor(dealerPlayer.seatIndex).dealer.y }}
            initial={false}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            D
          </motion.div>
        )}

        {/* Seats */}
        {snapshot.players.map((p) => {
          const g = geometryFor(p.seatIndex);
          return (
            <div
              key={p.id}
              className="absolute z-20"
              style={{ left: g.pos.x, top: g.pos.y, transform: `translate(-50%, -50%) scale(${seatScale})` }}
            >
              <SeatPod
                player={p}
                snapshot={snapshot}
                isSelf={p.id === selfPlayerId}
                seq={seq}
                hint={hint}
                dir={g.dir}
                emote={[...emotes].reverse().find((e) => e.playerId === p.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TableSurface({ L, felt }: { L: Layout; felt: (typeof THEME_FELT)[string] }) {
  return (
    <>
      <div
        className="absolute rounded-full"
        style={{
          left: L.cx - L.tableRx - 10,
          top: L.cy - L.tableRy + 30,
          width: (L.tableRx + 10) * 2,
          height: L.tableRy * 2,
          background: 'rgba(0,0,0,0.65)',
          filter: 'blur(30px)',
        }}
      />
      {/* Padded rail */}
      <div
        className="absolute rounded-full"
        style={{
          left: L.cx - L.tableRx,
          top: L.cy - L.tableRy,
          width: L.tableRx * 2,
          height: L.tableRy * 2,
          background: `linear-gradient(180deg, ${felt.rail[0]} 0%, ${felt.rail[1]} 100%)`,
          boxShadow: 'inset 0 4px 3px rgba(255,255,255,0.35), inset 0 -8px 12px rgba(0,0,0,0.55), 0 3px 0 rgba(0,0,0,0.6)',
        }}
      >
        {/* Felt */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            inset: 24,
            background: `radial-gradient(ellipse at 50% 42%, ${felt.light} 0%, ${felt.dark} 92%)`,
            boxShadow: 'inset 0 12px 32px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(0,0,0,0.3)',
          }}
        >
          <div className="absolute inset-0 opacity-[0.14] table-noise" />
          <div className="absolute rounded-full" style={{ inset: 40, border: '2px solid rgba(255,255,255,0.16)' }} />
          <div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-extrabold tracking-[0.25em] uppercase select-none italic"
            style={{ top: L.portrait ? '22%' : '20%', fontSize: L.portrait ? 30 : 40, color: 'rgba(255,255,255,0.10)' }}
          >
            Felt &amp; Friends
          </div>
        </div>
      </div>
    </>
  );
}

/** A number that counts up/down smoothly when it changes (winner's stack after the pot lands). */
function AnimatedChips({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = value;
    };
  }, [value]);
  return <>{formatChips(shown)}</>;
}

interface SeatPodProps {
  player: PublicPlayer;
  snapshot: GameStateSnapshot;
  isSelf: boolean;
  seq: ShowdownState;
  hint?: { name: string; keys: Set<string> } | null;
  dir: Point;
  emote?: EmoteEvent;
}

function SeatPod({ player: p, snapshot, isSelf, seq, hint, dir, emote }: SeatPodProps) {
  const isTurn = snapshot.currentTurnPlayerId === p.id;
  const folded = p.status === 'folded';
  const out = p.status === 'eliminated';
  const won = seq.wonBy.get(p.id) ?? 0;
  const isWinner = seq.awarded && won > 0;
  const avatarSize = isSelf ? 104 : 92;
  const totalMs = snapshot.settings.turnTimerSeconds * 1000;
  const isSB = snapshot.phase === 'hand_in_progress' && p.seatIndex === snapshot.smallBlindSeat;
  const isBB = snapshot.phase === 'hand_in_progress' && p.seatIndex === snapshot.bigBlindSeat;
  const action = p.lastAction ? ACTION_LABEL[p.lastAction] : null;
  // Before the pot is pushed, the stack shown excludes what this player is about to win.
  const displayChips = seq.ended && !seq.awarded ? p.chips - won : p.chips;

  const hasCards = p.holeCards ? p.holeCards.length > 0 : p.hasCards;
  const revealed = !isSelf && seq.ended && !!p.holeCards && seq.isRevealed(p.id);
  const showdownHand = revealed ? seq.handNameFor.get(p.id) : undefined;
  const loserAtShowdown = seq.highlight && seq.winningKeys.size > 0 && !won;

  const cardHighlighted = (key: string) =>
    (seq.highlight && won > 0 && seq.winningKeys.has(key)) || (isSelf && !seq.ended && !!hint?.keys.has(key));

  // Where the hole cards sit relative to the avatar centre. Seats along the top face down into the
  // table, where their own name box is — so their cards go beside the avatar instead (the bet and
  // dealer button use the other side). Everyone else's go toward the centre, far enough out to
  // clear the avatar.
  const cardOffset =
    dir.y > 0.45
      ? { x: 118, y: 0 }
      : (() => {
          const dist = Math.abs(dir.x) * 112 + (dir.y < 0 ? -dir.y * 104 : dir.y * 60);
          return { x: dir.x * dist, y: dir.y * dist };
        })();

  const opponentCards =
    !isSelf && hasCards ? (
      <div
        className={`absolute flex ${revealed ? 'z-20' : 'z-0'}`}
        style={{
          left: '50%',
          top: avatarSize / 2 + 6,
          transform: `translate(calc(-50% + ${cardOffset.x}px), calc(-50% + ${cardOffset.y}px))`,
        }}
      >
        {[0, 1].map((i) => {
          const card = revealed ? p.holeCards?.[i] ?? null : null;
          return (
            <div key={i} style={{ transform: `rotate(${i === 0 ? -7 : 7}deg)`, marginLeft: i === 1 ? (revealed ? -14 : -26) : 0 }}>
              <PlayingCard
                key={`h-${snapshot.handNumber}-${p.id}-${i}`}
                card={card}
                faceDown={!card}
                size={revealed ? 'md' : 'sm'}
                delay={i * 0.08}
                dimmed={folded || loserAtShowdown}
                highlighted={!!card && cardHighlighted(cardKey(card))}
              />
            </div>
          );
        })}
      </div>
    ) : null;

  const selfCards =
    isSelf && hasCards ? (
      <div className="flex items-end -ml-2">
        {[0, 1].map((i) => {
          const card = p.holeCards?.[i] ?? null;
          return (
            <div
              key={i}
              style={{ transform: `rotate(${i === 0 ? -6 : 7}deg) translateY(${i === 0 ? 4 : 0}px)`, marginLeft: i === 1 ? -34 : 0, zIndex: i }}
            >
              <PlayingCard
                key={`h-${snapshot.handNumber}-${p.id}-${i}`}
                card={card}
                faceDown={!card}
                size="lg"
                delay={i * 0.1}
                dimmed={folded}
                highlighted={!!card && cardHighlighted(cardKey(card))}
              />
            </div>
          );
        })}
      </div>
    ) : null;

  return (
    <motion.div className={`relative flex ${isSelf ? 'flex-row items-center gap-3' : 'flex-col items-center'}`} animate={{ opacity: out ? 0.45 : 1 }}>
      <div className="relative flex flex-col items-center">
        {opponentCards}

        <AnimatePresence>
          {emote && (
            <motion.div
              key={emote.id}
              className="absolute -top-12 text-5xl z-40 drop-shadow-lg"
              initial={{ opacity: 0, y: 10, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {emote.emoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar with turn timer */}
        <div className="relative z-10" style={{ width: avatarSize + 12, height: avatarSize + 12, opacity: folded && !seq.ended ? 0.55 : 1 }}>
          {isTurn && (
            <motion.div
              className="absolute -inset-1 rounded-full"
              style={{ boxShadow: '0 0 26px 6px rgba(227,182,79,0.6)' }}
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
          )}
          {isWinner && (
            <motion.div
              className="absolute -inset-3 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(245,215,138,0.55), transparent 70%)' }}
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          )}
          <div className="absolute inset-[6px]">
            <AvatarBadge seed={p.avatarSeed} size={avatarSize} ring={isWinner ? 'gold' : 'none'} dimmed={!p.isConnected} />
          </div>
          {isTurn && snapshot.turnExpiresAt && <TimerRing expiresAt={snapshot.turnExpiresAt} totalMs={totalMs} size={avatarSize + 12} />}
          {(isSB || isBB) && (
            <span
              className={`absolute -right-1 bottom-1 text-[11px] font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-ink-950 ${
                isBB ? 'bg-sky-400 text-ink-950' : 'bg-slate-200 text-ink-950'
              }`}
            >
              {isBB ? 'BB' : 'SB'}
            </span>
          )}
        </div>

        {/* Name + stack */}
        <div className="relative z-10 -mt-3 min-w-[118px] max-w-[160px] text-center">
          <div
            className={`rounded-lg px-3 py-1 border ${
              isTurn ? 'bg-ink-900/95 border-gold/80' : isWinner ? 'bg-gradient-to-b from-gold-dark to-ink-900 border-gold' : 'bg-ink-950/85 border-white/10'
            }`}
            style={{ boxShadow: '0 6px 14px rgba(0,0,0,0.5)' }}
          >
            <p className="text-[14px] font-semibold text-white truncate leading-tight">
              {p.isHost && <span className="mr-1">👑</span>}
              {p.name}
            </p>
            <p className="text-[14px] font-display font-bold text-gold-light leading-tight">
              <AnimatedChips value={displayChips} />
            </p>
          </div>
        </div>

        {/* Status line */}
        <div className="h-6 mt-1 flex items-center z-10">
          <AnimatePresence mode="wait">
            {isWinner ? (
              <motion.span
                key="win"
                initial={{ scale: 0.5, opacity: 0, y: 6 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="text-[13px] font-extrabold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-gold to-gold-light text-ink-950 whitespace-nowrap shadow-glow"
              >
                +{formatChips(won)}
              </motion.span>
            ) : showdownHand ? (
              <Tag key="hand" text={showdownHand} cls={loserAtShowdown ? 'bg-black/70 text-slate-300' : 'bg-black/70 text-white'} />
            ) : out ? (
              <Tag key="out" text="Out" cls="bg-black/60 text-slate-400" />
            ) : !p.isConnected ? (
              <Tag key="dc" text="Away" cls="bg-black/60 text-amber-300" />
            ) : p.status === 'all_in' ? (
              <Tag key="allin" text="All-in" cls={ACTION_LABEL.all_in.cls} />
            ) : action && !seq.ended ? (
              <Tag key={`a-${p.lastAction}`} text={action.text} cls={action.cls} />
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {selfCards}
    </motion.div>
  );
}

function Tag({ text, cls }: { text: string; cls: string }) {
  return (
    <motion.span
      initial={{ y: 4, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow whitespace-nowrap ${cls}`}
    >
      {text}
    </motion.span>
  );
}
