import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { sound } from '../lib/sound';
import { saveMuted, getMuted } from '../lib/storage';

export function useSoundEffects() {
  const snapshot = useGameStore((s) => s.snapshot);
  const prevSnapshot = useGameStore((s) => s.prevSnapshot);
  const selfPlayerId = useGameStore((s) => s.selfPlayerId);
  const muted = useGameStore((s) => s.muted);
  const setMuted = useGameStore((s) => s.setMuted);
  const initializedMute = useRef(false);

  useEffect(() => {
    if (initializedMute.current) return;
    initializedMute.current = true;
    const m = getMuted();
    setMuted(m);
    sound.setMuted(m);
  }, [setMuted]);

  useEffect(() => {
    sound.setMuted(muted);
    saveMuted(muted);
  }, [muted]);

  useEffect(() => {
    if (!snapshot) return;
    const prev = prevSnapshot;

    if (!prev || prev.roomCode !== snapshot.roomCode) return;

    // New hand started
    if (snapshot.handNumber !== prev.handNumber && snapshot.phase === 'hand_in_progress') {
      sound.shuffle();
      setTimeout(() => sound.cardDeal(), 300);
      return;
    }

    // Street advanced (new community cards revealed)
    if (snapshot.communityCards.length > prev.communityCards.length) {
      sound.cardFlip();
    }

    // Someone's last action changed to fold/call/bet/raise/all_in/check
    for (const p of snapshot.players) {
      const prevP = prev.players.find((pp) => pp.id === p.id);
      if (!prevP) continue;
      if (p.lastAction && p.lastAction !== prevP.lastAction) {
        switch (p.lastAction) {
          case 'fold':
            sound.fold();
            break;
          case 'check':
            sound.check();
            break;
          case 'call':
          case 'bet':
          case 'raise':
            sound.callOrBet();
            break;
          case 'all_in':
            sound.allIn();
            break;
        }
      }
    }

    // It's now my turn
    if (snapshot.currentTurnPlayerId === selfPlayerId && prev.currentTurnPlayerId !== selfPlayerId && selfPlayerId) {
      sound.turnNotify();
    }

    // Showdown / winners announced
    if (snapshot.winnersAnnouncement && snapshot.winnersAnnouncement.length > 0 && (!prev.winnersAnnouncement || prev.winnersAnnouncement.length === 0)) {
      const totalWon = snapshot.winnersAnnouncement.reduce((s, w) => s + w.amount, 0);
      if (totalWon >= snapshot.settings.bigBlind * 20) sound.bigWin();
      else sound.win();
    }
  }, [snapshot, prevSnapshot, selfPlayerId]);
}
