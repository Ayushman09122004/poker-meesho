import { useEffect, useMemo, useState } from 'react';
import { Card, GameStateSnapshot } from '../../../shared/types';
import { runoutCardCount, showdownTimeline } from '../../../shared/showdownTiming';
import { comboKeys } from '../lib/handHint';

export interface ShowdownState {
  /** True while the end-of-hand sequence for the hand just finished is playing (or holding at the end). */
  ended: boolean;
  /** Unique id of the finished hand this sequence belongs to (null while a hand is in play). */
  handId: string | null;
  /** How many community cards to show (run-out cards appear one at a time). */
  boardVisible: number;
  /** Run it twice: how many cards of the second board to show (0 when there isn't one). */
  secondBoardVisible: number;
  isRevealed: (playerId: string) => boolean;
  /** The winning hand is lit up. */
  highlight: boolean;
  /** The pot has been pushed to the winner(s). */
  awarded: boolean;
  winningKeys: Set<string>;
  wonBy: Map<string, number>;
  handNameFor: Map<string, string>;
  /** e.g. "Three of a Kind"; null when the pot was won uncontested. */
  winningHandName: string | null;
  winnerNames: string[];
}

export const cardKey = (c: Card | undefined | null) => (c ? `${c.rank}${c.suit}` : '');

/**
 * Drives the end-of-hand sequence on the client: run-out board cards one by one, flip each
 * contender's cards in turn, light up the winning five cards, then push the pot to the winner.
 * Timings come from shared/showdownTiming, which the server also uses to delay the next hand.
 */
export function useShowdownSequence(s: GameStateSnapshot): ShowdownState {
  const ended = (s.phase === 'between_hands' || s.phase === 'game_over') && !!s.winnersAnnouncement?.length;
  // Unique per finished hand (hand numbers restart at #1 when the host restarts the game).
  const key = ended ? `${s.handNumber}:${s.handHistory[0]?.timestamp ?? 0}` : null;
  const [start, setStart] = useState<{ key: string; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (key !== null && start?.key !== key) {
      const at = Date.now();
      setStart({ key, at });
      setNow(at);
    }
  }, [key, start?.key]);

  const contenders = s.showdown?.length ?? 0;
  const timeline = useMemo(
    () => showdownTimeline({ runoutCards: runoutCardCount(s), revealCount: contenders, contested: contenders > 1, allIn: s.allInRunoutFrom !== null }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [s.handNumber, contenders, s.allInRunoutFrom, s.revealedRunoutFrom, s.communityCards.length, s.secondBoard?.length]
  );

  const running = ended && start?.key === key;
  const elapsed = running ? now - start!.at : 0;

  useEffect(() => {
    if (!running || elapsed > timeline.nextHandAt) return;
    const id = setInterval(() => setNow(Date.now()), 80);
    return () => clearInterval(id);
  }, [running, timeline.nextHandAt, elapsed > timeline.nextHandAt]);

  // Last aggressor shows first, then clockwise from the dealer — like a real table.
  const revealOrder = useMemo(() => {
    if (!s.showdown) return [] as string[];
    const max = s.settings.maxPlayers;
    const seatOf = (id: string) => s.players.find((p) => p.id === id)?.seatIndex ?? 0;
    const fromDealer = (id: string) => (((seatOf(id) - s.dealerSeat - 1) % max) + max) % max;
    return [...s.showdown]
      .map((e) => e.playerId)
      .sort((a, b) => {
        if (a === s.lastAggressorId) return -1;
        if (b === s.lastAggressorId) return 1;
        return fromDealer(a) - fromDealer(b);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.handNumber, s.showdown]);

  const derived = useMemo(() => {
    const wonBy = new Map<string, number>();
    for (const w of s.winnersAnnouncement ?? []) wonBy.set(w.playerId, (wonBy.get(w.playerId) ?? 0) + w.amount);
    const winningKeys = new Set<string>();
    const handNameFor = new Map<string, string>();
    for (const e of s.showdown ?? []) {
      if (e.hand) handNameFor.set(e.playerId, e.hand.rankName);
      if (e.isWinner && e.hand) {
        const keys = comboKeys(e.hand);
        // A high-card win still shows which cards played.
        (keys.size > 0 ? [...keys] : e.hand.bestFive.map(cardKey)).forEach((k) => winningKeys.add(k));
      }
    }
    const winnerNames = [...new Set((s.winnersAnnouncement ?? []).map((w) => w.name))];
    const winningHandName = contenders > 1 ? (s.winnersAnnouncement?.[0]?.handName ?? null) : null;
    return { wonBy, winningKeys, handNameFor, winnerNames, winningHandName };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.handNumber, s.showdown, s.winnersAnnouncement]);

  if (!ended) {
    return {
      ended: false,
      handId: null,
      boardVisible: s.communityCards.length,
      secondBoardVisible: 0,
      isRevealed: () => true,
      highlight: false,
      awarded: false,
      winningKeys: new Set(),
      wonBy: new Map(),
      handNameFor: new Map(),
      winningHandName: null,
      winnerNames: [],
    };
  }

  const runoutFrom = s.allInRunoutFrom ?? s.revealedRunoutFrom;
  const dealtSoFar = timeline.boardCardAt.filter((t) => elapsed >= t).length;
  const boardVisible = runoutFrom === null ? s.communityCards.length : Math.min(s.communityCards.length, runoutFrom + dealtSoFar);
  // Run it twice: the second board's own cards are dealt after the first board is complete.
  const firstRunCards = runoutFrom === null ? 0 : s.communityCards.length - runoutFrom;
  const secondBoardVisible = s.secondBoard && runoutFrom !== null ? runoutFrom + Math.max(0, dealtSoFar - firstRunCards) : 0;

  return {
    ended: true,
    handId: key,
    boardVisible,
    secondBoardVisible,
    isRevealed: (id) => {
      const i = revealOrder.indexOf(id);
      return i >= 0 && elapsed >= timeline.revealAt[i];
    },
    highlight: elapsed >= timeline.highlightAt,
    awarded: elapsed >= timeline.awardAt,
    ...derived,
  };
}
