import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ActionBar } from './ActionBar';
import { WinnerBanner } from './WinnerBanner';
import { ChatDock } from './Chat';
import { StatsPanel } from './StatsPanel';
import { HandHistoryPanel } from './HandHistoryPanel';
import { HostControlsModal } from './HostControlsModal';
import { HandHintBadge } from './HandHintBadge';
import { PokerTable2D } from './PokerTable2D';
import { leaveRoom, requestRebuy } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';
import { computeHandHint } from '../lib/handHint';

// Fixed height for the bottom control strip, reserved at all times (even when empty) so the table
// above it never resizes as your turn comes and goes — sized to fit the tallest real content (hint
// badge + full bet-slider ActionBar, including the typed-amount input) without wasting more
// vertical space than necessary. Small screens get the compact ActionBar and a shorter strip so the
// table (and its cards) keep as much room as possible; short landscape screens (phones held
// sideways) move the controls into a column beside the table instead.
const BOTTOM_STRIP_HEIGHT = 250;
const BOTTOM_STRIP_HEIGHT_COMPACT = 150;
const SIDE_COLUMN_WIDTH = 290;

type ControlsLayout = 'full' | 'compact' | 'side';

function pickControlsLayout(): ControlsLayout {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (h < 520 && w > h * 1.3) return 'side';
  if (h < 780 || w < 700) return 'compact';
  return 'full';
}

function useControlsLayout() {
  const [layout, setLayout] = useState(pickControlsLayout);
  useEffect(() => {
    const onResize = () => setLayout(pickControlsLayout());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return layout;
}

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
  const controls = useControlsLayout();
  const compact = controls === 'compact';
  const side = controls === 'side';

  if (!snapshot) return null;

  const self = snapshot.players.find((p) => p.id === selfPlayerId);
  const winnersByPlayer = new Map(snapshot.winnersAnnouncement?.map((w) => [w.playerId, w]) ?? []);
  const isMyTurn = snapshot.currentTurnPlayerId === selfPlayerId && !!snapshot.legalActionsForViewer;
  const hint =
    snapshot.settings.gameMode === 'assisted' ? computeHandHint(self?.holeCards, snapshot.communityCards) : null;

  return (
    <div
      className={`w-full h-full relative overflow-hidden flex ${side ? 'flex-row' : 'flex-col'}`}
      style={{ background: 'radial-gradient(ellipse 90% 75% at 50% 38%, #1a2130 0%, #0b0e15 55%, #040507 100%)' }}
    >
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none table-noise" />
      {/* Table area — a flat 2D table (see PokerTable2D.tsx), laid out in a fixed design space
          and uniformly scaled to fit. */}
      <div className="relative flex-1 min-h-0 min-w-0">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
              Room <span className="font-display text-gold-light tracking-widest">{snapshot.roomCode}</span>
            </div>
            <div className="hidden sm:block bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
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

        {/* On small screens, keep the top seats clear of the top bar. */}
        <div className="absolute inset-x-0 bottom-0" style={{ top: compact || side ? 44 : 0 }}>
          <PokerTable2D
            snapshot={snapshot}
            selfPlayerId={selfPlayerId}
            highlightedKeys={hint?.highlightedKeys}
            winnersByPlayer={winnersByPlayer}
            emotes={emotes}
          />
        </div>
      </div>

      {/* Bottom control strip — fixed height, always reserved, so the table above never resizes. */}
      <div
        className={`shrink-0 z-20 flex flex-col items-center gap-2 p-3 pointer-events-none overflow-visible ${
          side ? 'h-full justify-center' : 'w-full justify-end'
        }`}
        style={
          side
            ? { width: SIDE_COLUMN_WIDTH, padding: 8 }
            : { height: compact ? BOTTOM_STRIP_HEIGHT_COMPACT : BOTTOM_STRIP_HEIGHT, padding: compact ? 8 : undefined }
        }
      >
        {snapshot.phase === 'hand_in_progress' && <HandHintBadge hint={hint} />}
        {isMyTurn && snapshot.legalActionsForViewer && self && (
          <ActionBar
            snapshot={snapshot}
            legal={snapshot.legalActionsForViewer}
            selfChips={self.chips}
            timeBankMs={self.timeBankMs}
            variant={controls}
          />
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

      {/* On compact screens the action bar spans the full width, so the chat button sits just
          above the bottom strip instead of on top of the All-in button. */}
      <div className="absolute right-3 z-20" style={{ bottom: compact ? BOTTOM_STRIP_HEIGHT_COMPACT + 4 : 12 }}>
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
