// The end-of-hand sequence, shared by the server (how long to wait before dealing the next hand) and
// the client (when to flip each player's cards, highlight the winner and move the chips), so the two
// stay in step.

export const SHOWDOWN_TIMING = {
  /** Board cards that were dealt all at once (all-in run-out, or the "for fun" run-out after a fold) appear one by one. */
  boardCardMs: 650,
  firstRevealDelayMs: 600,
  /** Gap between flipping one player's cards and the next player's. */
  perPlayerRevealMs: 1100,
  /** How long the winning hand stays highlighted before the chips move. */
  highlightHoldMs: 1800,
  uncontestedDelayMs: 700,
  chipFlightMs: 900,
  /** Pause after the chips land, before the next hand is dealt. */
  afterAwardMs: 2300,
} as const;

export interface ShowdownTimeline {
  /** ms at which each staggered board card appears, indexed from the first run-out card. */
  boardCardAt: number[];
  /** ms at which each showdown contender's cards flip, in reveal order. */
  revealAt: number[];
  highlightAt: number;
  awardAt: number;
  nextHandAt: number;
}

export function showdownTimeline(opts: { runoutCards: number; revealCount: number; contested: boolean }): ShowdownTimeline {
  const t = SHOWDOWN_TIMING;
  const boardCardAt = Array.from({ length: opts.runoutCards }, (_, i) => i * t.boardCardMs);
  const boardDone = opts.runoutCards * t.boardCardMs;

  if (!opts.contested) {
    // Nobody shows: the chips go to the last player standing, then any "for fun" run-out is shown.
    const awardAt = t.uncontestedDelayMs;
    const runoutStart = awardAt + t.chipFlightMs;
    return {
      boardCardAt: boardCardAt.map((ms) => runoutStart + ms),
      revealAt: [],
      highlightAt: awardAt,
      awardAt,
      nextHandAt: runoutStart + boardDone + t.afterAwardMs,
    };
  }

  const revealStart = boardDone + t.firstRevealDelayMs;
  const revealAt = Array.from({ length: opts.revealCount }, (_, i) => revealStart + i * t.perPlayerRevealMs);
  const highlightAt = revealStart + opts.revealCount * t.perPlayerRevealMs;
  const awardAt = highlightAt + t.highlightHoldMs;
  return { boardCardAt, revealAt, highlightAt, awardAt, nextHandAt: awardAt + t.chipFlightMs + t.afterAwardMs };
}

/** Number of board cards dealt in one go at the end of the hand (shown one by one). */
export function runoutCardCount(snapshot: { communityCards: unknown[]; allInRunoutFrom: number | null; revealedRunoutFrom: number | null }): number {
  const from = snapshot.allInRunoutFrom ?? snapshot.revealedRunoutFrom;
  return from === null ? 0 : Math.max(0, snapshot.communityCards.length - from);
}
