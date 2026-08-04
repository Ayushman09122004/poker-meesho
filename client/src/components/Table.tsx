import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Seat } from './Seat';
import { CommunityArea } from './CommunityArea';
import { ActionBar } from './ActionBar';
import { WinnerBanner } from './WinnerBanner';
import { EmoteOverlay } from './EmoteOverlay';
import { ChatDock } from './Chat';
import { StatsPanel } from './StatsPanel';
import { HandHistoryPanel } from './HandHistoryPanel';
import { HostControlsModal } from './HostControlsModal';
import { HandHintBadge } from './HandHintBadge';
import { DealerButton } from './DealerButton';
import { getSeatPosition, getDealerButtonPosition, occupiedSeatOrder, seatScaleForPlayerCount } from '../lib/seatLayout';
import { leaveRoom, requestRebuy } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';
import { computeHandHint } from '../lib/handHint';

const THEME_VARS: Record<string, { light: string; dark: string }> = {
  midnight: { light: '#1c2b52', dark: '#0a0f1f' },
  emerald: { light: '#125c44', dark: '#062a20' },
  crimson: { light: '#5c1225', dark: '#25060d' },
  royal: { light: '#2b1c52', dark: '#120a26' },
};

// Fixed height for the bottom control strip, reserved at all times (even when empty) so the table
// above it never resizes as your turn comes and goes — sized to fit the tallest real content (hint
// badge + full bet-slider ActionBar) without wasting more vertical space than necessary.
const BOTTOM_STRIP_HEIGHT = 220;

export function Table() {
  const snapshot = useGameStore((s) => s.snapshot);
  const selfPlayerId = useGameStore((s) => s.selfPlayerId);
  const isHost = useGameStore((s) => s.isHost);
  const emotes = useGameStore((s) => s.emotes);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const showStats = useGameStore((s) => s.showStats);
  const toggleStats = useGameStore((s) => s.toggleStats);
  const showHandHistory = useGameStore((s) => s.showHandHistory);
  const toggleHandHistory = useGameStore((s) => s.toggleHandHistory);
  const showHostSettings = useGameStore((s) => s.showHostSettings);
  const toggleHostSettings = useGameStore((s) => s.toggleHostSettings);

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Seats spread evenly across the full oval based on how many players are actually seated, not
  // the room's configured max capacity — a 9-seat room with 4 people shouldn't bunch them into a
  // 160° arc just because 5 seats happen to be empty.
  const seatOrder = useMemo(() => {
    if (!snapshot) return { order: new Map<number, number>(), count: 0 };
    const order = occupiedSeatOrder(snapshot.players.map((p) => p.seatIndex));
    return { order, count: snapshot.players.length };
  }, [snapshot]);

  const positions = useMemo(() => {
    if (!snapshot) return new Map<string, { left: number; top: number }>();
    const { order, count } = seatOrder;
    const selfPlayer = snapshot.players.find((p) => p.id === selfPlayerId);
    const selfOrder = selfPlayer ? order.get(selfPlayer.seatIndex) ?? 0 : 0;
    const map = new Map<string, { left: number; top: number }>();
    for (const p of snapshot.players) {
      const playerOrder = order.get(p.seatIndex) ?? 0;
      const rel = ((playerOrder - selfOrder) % count + count) % count;
      map.set(p.id, getSeatPosition(rel, count));
    }
    return map;
  }, [snapshot, selfPlayerId, seatOrder]);

  const dealerButtonPosition = useMemo(() => {
    if (!snapshot) return null;
    const { order, count } = seatOrder;
    if (count === 0) return null;
    const selfPlayer = snapshot.players.find((p) => p.id === selfPlayerId);
    const selfOrder = selfPlayer ? order.get(selfPlayer.seatIndex) ?? 0 : 0;
    const dealerOrder = order.get(snapshot.dealerSeat) ?? 0;
    const rel = ((dealerOrder - selfOrder) % count + count) % count;
    return getDealerButtonPosition(rel, count);
  }, [snapshot, selfPlayerId, seatOrder]);

  if (!snapshot) return null;

  const self = snapshot.players.find((p) => p.id === selfPlayerId);
  const theme = THEME_VARS[snapshot.settings.tableTheme] ?? THEME_VARS.midnight;
  const winnersByPlayer = new Map(snapshot.winnersAnnouncement?.map((w) => [w.playerId, w]) ?? []);
  const isMyTurn = snapshot.currentTurnPlayerId === selfPlayerId && !!snapshot.legalActionsForViewer;
  const hint =
    snapshot.settings.gameMode === 'assisted' ? computeHandHint(self?.holeCards, snapshot.communityCards) : null;

  return (
    <div
      className="w-full h-full relative bg-felt-radial overflow-hidden flex flex-col"
      style={{ ['--felt-light' as any]: theme.light, ['--felt-dark' as any]: theme.dark }}
    >
      {/* Table area — takes all remaining space (minus the fixed bottom strip), so the oval is
          never squashed regardless of viewport height. The top bar floats over its top edge
          rather than claiming its own row, to leave maximum room for the seats. */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-3 sm:p-6">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
              Room <span className="font-display text-gold-light tracking-widest">{snapshot.roomCode}</span>
            </div>
            <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
              Hand #{snapshot.handNumber} · Blinds {snapshot.settings.smallBlind}/{snapshot.settings.bigBlind}
            </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            <IconButton title="Hand history" onClick={() => toggleHandHistory(true)}>
              📜
            </IconButton>
            <IconButton title="Stats" onClick={() => toggleStats(true)}>
              📊
            </IconButton>
            {isHost && (
              <IconButton title="Host controls" onClick={() => toggleHostSettings(true)}>
                🛠️
              </IconButton>
            )}
            <IconButton
              title={muted ? 'Unmute' : 'Mute'}
              onClick={() => {
                setMuted(!muted);
              }}
            >
              {muted ? '🔇' : '🔊'}
            </IconButton>
            <IconButton title="Leave table" onClick={() => setShowLeaveConfirm(true)}>
              🚪
            </IconButton>
          </div>
        </div>

        <WinnerBanner snapshot={snapshot} />

        <div className="relative w-full h-full max-w-5xl">
          <div className="absolute inset-[6%] rounded-[50%] border-[10px] border-ink-900/80 shadow-[inset_0_0_60px_rgba(0,0,0,0.5)]" />
          <div className="absolute inset-[6%] rounded-[50%] border border-gold/10" />

          <div className="absolute inset-0 flex items-center justify-center">
            <CommunityArea snapshot={snapshot} highlightedKeys={hint?.highlightedKeys} />
          </div>

          {snapshot.players.map((p) => {
            const pos = positions.get(p.id);
            if (!pos) return null;
            const isSelf = p.id === selfPlayerId;
            return (
              <Seat
                key={p.id}
                player={p}
                position={pos}
                isSelf={isSelf}
                isTurn={snapshot.currentTurnPlayerId === p.id}
                turnExpiresAt={snapshot.currentTurnPlayerId === p.id ? snapshot.turnExpiresAt : null}
                turnTotalMs={snapshot.settings.turnTimerSeconds * 1000}
                isSB={snapshot.smallBlindSeat === p.seatIndex}
                isBB={snapshot.bigBlindSeat === p.seatIndex}
                winner={winnersByPlayer.get(p.id)}
                showdownRevealed={snapshot.street === 'showdown'}
                highlightedKeys={isSelf ? hint?.highlightedKeys : undefined}
                seatScale={seatScaleForPlayerCount(seatOrder.count)}
              />
            );
          })}

          {dealerButtonPosition && snapshot.phase !== 'lobby' && <DealerButton position={dealerButtonPosition} />}

          <EmoteOverlay emotes={emotes} positionFor={(pid) => positions.get(pid) ?? null} />
        </div>
      </div>

      {/* Bottom control strip — fixed height, always reserved, so the table above never resizes. */}
      <div
        className="shrink-0 z-20 w-full flex flex-col items-center justify-end gap-2 p-3 pointer-events-none overflow-visible"
        style={{ height: BOTTOM_STRIP_HEIGHT }}
      >
        {snapshot.phase === 'hand_in_progress' && <HandHintBadge hint={hint} />}
        {isMyTurn && snapshot.legalActionsForViewer && self && (
          <ActionBar snapshot={snapshot} legal={snapshot.legalActionsForViewer} selfChips={self.chips} timeBankMs={self.timeBankMs} />
        )}
        {self?.status === 'eliminated' && (
          <div className="pointer-events-auto bg-ink-900/90 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-slate-300">You're out of chips. Spectating the table.</span>
            {snapshot.settings.rebuyEnabled && (
              <button onClick={requestRebuy} className="px-3 py-1.5 rounded-lg bg-gold text-ink-950 text-sm font-semibold hover:brightness-110 transition">
                Buy back in
              </button>
            )}
          </div>
        )}
        {snapshot.phase === 'game_over' && (
          <div className="pointer-events-auto bg-ink-900/90 border border-gold/30 rounded-xl px-4 py-3 text-center">
            <p className="text-gold-light font-display font-bold">
              🏆 {snapshot.players.find((p) => p.chips > 0)?.name ?? 'A player'} takes the whole table!
            </p>
            {isHost && <p className="text-xs text-slate-400 mt-1">Open host controls to restart the game.</p>}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 z-20">
        <ChatDock />
      </div>

      {showStats && <StatsPanel snapshot={snapshot} selfPlayerId={selfPlayerId} onClose={() => toggleStats(false)} />}
      {showHandHistory && <HandHistoryPanel snapshot={snapshot} onClose={() => toggleHandHistory(false)} />}
      {showHostSettings && isHost && <HostControlsModal snapshot={snapshot} onClose={() => toggleHostSettings(false)} />}

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowLeaveConfirm(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-ink-900 border border-white/10 rounded-2xl p-6 max-w-sm shadow-card">
            <p className="text-slate-200 mb-4">Leave the table? You'll keep your seat if you rejoin before the host removes you.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowLeaveConfirm(false)} className="flex-1 py-2 rounded-xl bg-ink-800 border border-white/10 text-slate-300">
                Stay
              </button>
              <button onClick={leaveRoom} className="flex-1 py-2 rounded-xl bg-rose-700 text-white font-semibold">
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      title={title}
      onClick={() => {
        sound.uiClick();
        onClick();
      }}
      className="w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-base hover:bg-black/70 transition"
    >
      {children}
    </button>
  );
}
