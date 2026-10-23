import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ChatDock } from './Chat';
import { StatsPanel } from './StatsPanel';
import { HandHistoryPanel } from './HandHistoryPanel';
import { HostControlsModal } from './HostControlsModal';
import { PokerTable2D } from './PokerTable2D';
import { BettingBar } from './BettingBar';
import { BotRebuyRequests } from './BotControls';
import { AwaitingSeatCard, BuyInModal, HostChipRequests, LedgerModal, PendingRequestCard, myRequest } from './BuyIns';
import { SideBetCard, TournamentPill, TournamentPodium } from './GameModesUI';
import { setSittingOut } from '../hooks/useGameConnection';
import { leaveRoom } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';
import { computeHandHint } from '../lib/handHint';
import { themeLook } from '../lib/themes';
import { ThemeAmbience } from './ThemeAmbience';

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
  const [buyIn, setBuyIn] = useState<'rebuy' | 'topup' | null>(null);
  const [showLedger, setShowLedger] = useState(false);

  if (!snapshot) return null;

  const self = snapshot.players.find((p) => p.id === selfPlayerId);
  const handHint =
    (snapshot.settings.gameMode === 'assisted' || snapshot.settings.gameMode === 'coach') && self?.status !== 'folded'
      ? computeHandHint(self?.holeCards, snapshot.communityCards)
      : null;
  const hint = handHint ? { name: handHint.result.rankName, keys: handHint.highlightedKeys } : null;
  const look = themeLook(snapshot.settings.tableTheme);
  const tint = look.room;

  return (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col"
      style={{ background: `radial-gradient(ellipse 85% 70% at 50% 42%, ${tint} 0%, #0b111b 62%, #05070b 100%)` }}
    >
      {/* Carpet pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 50%, #fff 0 2px, transparent 3px), radial-gradient(circle at 0 0, transparent 14px, #fff 15px 16px, transparent 17px)',
          backgroundSize: '36px 36px, 36px 36px',
        }}
      />
      <ThemeAmbience kind={look.ambience} />
      <div className="relative flex-1 min-h-0">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2 sm:p-3 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
              Room <span className="font-display text-gold-light tracking-widest">{snapshot.roomCode}</span>
            </div>
            <div className="hidden sm:block bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-slate-300">
              Hand #{snapshot.handNumber} · Blinds {snapshot.settings.smallBlind}/{snapshot.settings.bigBlind}
            </div>
            <TournamentPill snapshot={snapshot} />
            {snapshot.settings.bounty && (
              <div className="hidden sm:block bg-black/50 backdrop-blur px-3 py-1.5 rounded-lg text-xs text-rose-200">🎯 Bounty mode</div>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
            {snapshot.settings.hostApproval && self && !self.awaitingSeat && !snapshot.settings.tournament && (
              <button
                onClick={() => {
                  sound.uiClick();
                  if (!myRequest(snapshot, self.id)) setBuyIn(self.chips + self.pendingChips > 0 ? 'topup' : 'rebuy');
                }}
                title={myRequest(snapshot, self.id) ? 'Waiting for the host to approve your request' : 'Ask the host for more chips'}
                className="h-8 sm:h-9 px-3 rounded-full text-xs sm:text-sm font-semibold backdrop-blur transition bg-black/50 text-slate-200 hover:bg-black/70"
              >
                {myRequest(snapshot, self.id) ? '⏳ Waiting for host' : '➕ Chips'}
              </button>
            )}
            {snapshot.settings.hostApproval && (
              <IconButton title="Ledger" onClick={() => setShowLedger(true)}>
                📒
              </IconButton>
            )}
            {self && self.status !== 'eliminated' && !self.awaitingSeat && (
              <button
                onClick={() => {
                  sound.uiClick();
                  setSittingOut(!self.sittingOut);
                }}
                title={self.sittingOut ? 'Get dealt back in from the next hand' : 'Skip hands until you come back (your chips stay)'}
                className={`h-8 sm:h-9 px-3 rounded-full text-xs sm:text-sm font-semibold backdrop-blur transition ${
                  self.sittingOut ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-black/50 text-slate-200 hover:bg-black/70'
                }`}
              >
                {self.sittingOut ? "▶ I'm back" : '☕ Sit out'}
              </button>
            )}
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
            <IconButton title={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(!muted)}>
              {muted ? '🔇' : '🔊'}
            </IconButton>
            <IconButton title="Leave table" onClick={() => setShowLeaveConfirm(true)}>
              🚪
            </IconButton>
          </div>
        </div>

        {/* The table, kept clear of the top bar. */}
        <div className="absolute inset-x-0 bottom-0 top-10">
          <PokerTable2D snapshot={snapshot} selfPlayerId={selfPlayerId} hint={hint} emotes={emotes} />
        </div>

        {/* For-fun flop prediction */}
        <div className="absolute left-2 sm:left-3 top-12 sm:top-14 z-20">
          <SideBetCard snapshot={snapshot} selfPlayerId={selfPlayerId} />
        </div>

        <div className="absolute right-2 sm:right-3 bottom-2 z-20">
          <ChatDock />
        </div>
      </div>

      {isHost && <BotRebuyRequests snapshot={snapshot} />}
      {isHost && <HostChipRequests snapshot={snapshot} />}
      <TournamentPodium snapshot={snapshot} isHost={isHost} />
      <BettingBar snapshot={snapshot} self={self} isHost={isHost} onRebuyRequest={() => setBuyIn('rebuy')} />
      {self?.awaitingSeat && <AwaitingSeatCard snapshot={snapshot} self={self} />}
      <PendingRequestCard snapshot={snapshot} selfId={selfPlayerId} />
      {buyIn && <BuyInModal snapshot={snapshot} kind={buyIn} onClose={() => setBuyIn(null)} />}
      {showLedger && <LedgerModal snapshot={snapshot} onClose={() => setShowLedger(false)} />}

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
      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-sm sm:text-base hover:bg-black/70 transition"
    >
      {children}
    </button>
  );
}
