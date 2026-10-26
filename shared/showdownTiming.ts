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
  /** Pause after the chips land, before the next hand is dealt (long enough for win effects). */
  afterAwardMs: 2800,
  /** All-in run-out: players flip quickly, then each remaining board card lands slowly. */
  allInRevealMs: 700,
  allInBoardCardMs: 1300,
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

export function showdownTimeline(opts: { runoutCards: number; revealCount: number; contested: boolean; allIn?: boolean }): ShowdownTimeline {
  const t = SHOWDOWN_TIMING;

  if (opts.allIn && opts.contested) {
    // All-in: like a real table, everyone flips first, then the rest of the board is dealt slowly
    // one card at a time while the tension builds.
    const revealAt = Array.from({ length: opts.revealCount }, (_, i) => t.firstRevealDelayMs + i * t.allInRevealMs);
    const boardStart = t.firstRevealDelayMs + opts.revealCount * t.allInRevealMs + 500;
    const boardCardAt = Array.from({ length: opts.runoutCards }, (_, i) => boardStart + i * t.allInBoardCardMs);
    const highlightAt = boardStart + opts.runoutCards * t.allInBoardCardMs + 400;
    const awardAt = highlightAt + t.highlightHoldMs;
    return { boardCardAt, revealAt, highlightAt, awardAt, nextHandAt: awardAt + t.chipFlightMs + t.afterAwardMs };
  }

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
export function runoutCardCount(snapshot: {
  communityCards: unknown[];
  allInRunoutFrom: number | null;
  revealedRunoutFrom: number | null;
  secondBoard?: unknown[] | null;
}): number {
  const from = snapshot.allInRunoutFrom ?? snapshot.revealedRunoutFrom;
  if (from === null) return 0;
  const first = Math.max(0, snapshot.communityCards.length - from);
  // Run it twice: the second board's new cards are dealt one by one after the first board's.
  const second = snapshot.secondBoard ? Math.max(0, snapshot.secondBoard.length - from) : 0;
  return first + second;
}
