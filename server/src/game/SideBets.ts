// For-fun flop predictions: each hand poses one yes/no question about the flop. Players pick
// before it's dealt; a correct guess earns a "prophet" point. No chips involved — bragging only.
import { Card, RANK_VALUE, SideBetView } from '../../../shared/types';
import type { PokerEngine } from './PokerEngine';

const isRed = (c: Card) => c.suit === 'hearts' || c.suit === 'diamonds';
const v = (c: Card) => RANK_VALUE[c.rank];

// Questions picked to land somewhere between ~20% and ~70%, so either answer feels live.
export const SIDE_BET_QUESTIONS: { text: string; test: (flop: Card[]) => boolean }[] = [
  { text: 'Will the flop have an Ace?', test: (f) => f.some((c) => c.rank === 'A') },
  { text: 'Will the flop have a face card (J, Q or K)?', test: (f) => f.some((c) => c.rank === 'J' || c.rank === 'Q' || c.rank === 'K') },
  { text: 'Will the flop be mostly red?', test: (f) => f.filter(isRed).length >= 2 },
  { text: 'Will the flop have a pair?', test: (f) => new Set(f.map((c) => c.rank)).size < 3 },
  { text: 'Will two flop cards share a suit?', test: (f) => new Set(f.map((c) => c.suit)).size < 3 },
  { text: 'Will the flop have a card from 2 to 5?', test: (f) => f.some((c) => v(c) <= 5) },
  { text: 'Will the highest flop card be a 10 or better?', test: (f) => Math.max(...f.map(v)) >= 10 },
  { text: 'Will the flop add up to more than 25? (J=11, Q=12, K=13, A=14)', test: (f) => f.reduce((s, c) => s + v(c), 0) > 25 },
  { text: 'Will the flop have a spade?', test: (f) => f.some((c) => c.suit === 'spades') },
  { text: 'Will the flop have a 7?', test: (f) => f.some((c) => c.rank === '7') },
];

interface Round {
  hand: number;
  question: number;
  picks: Map<string, boolean>;
  result: boolean | null;
}

export class SideBetBook {
  private round: Round | null = null;
  private scores = new Map<string, number>();
  private lastQuestion = -1;

  /** Keep up with the game: start a new question each hand, and settle it once the flop is out. */
  sync(engine: PokerEngine): void {
    if (engine.phase === 'hand_in_progress' && engine.handNumber > 0 && this.round?.hand !== engine.handNumber) {
      let q = Math.floor(Math.random() * SIDE_BET_QUESTIONS.length);
      if (q === this.lastQuestion) q = (q + 1) % SIDE_BET_QUESTIONS.length;
      this.lastQuestion = q;
      this.round = { hand: engine.handNumber, question: q, picks: new Map(), result: null };
    }
    const r = this.round;
    // The flop decides it — including the "what would have come" run-out when everyone folds.
    if (r && r.result === null && r.hand === engine.handNumber && engine.communityCards.length >= 3) {
      r.result = SIDE_BET_QUESTIONS[r.question].test(engine.communityCards.slice(0, 3));
      for (const [id, pick] of r.picks) if (pick === r.result) this.scores.set(id, (this.scores.get(id) ?? 0) + 1);
    }
  }

  /** A player's guess — only before the flop of the current hand. */
  pick(engine: PokerEngine, playerId: string, yes: boolean): boolean {
    const r = this.round;
    if (!r || r.hand !== engine.handNumber || engine.phase !== 'hand_in_progress' || engine.communityCards.length > 0) return false;
    r.picks.set(playerId, yes);
    return true;
  }

  view(viewerId: string, engine: PokerEngine): SideBetView | undefined {
    const r = this.round;
    if (!r) return undefined;
    const open = r.hand === engine.handNumber && engine.phase === 'hand_in_progress' && engine.communityCards.length === 0;
    return {
      question: SIDE_BET_QUESTIONS[r.question].text,
      pickCount: r.picks.size,
      myPick: r.picks.has(viewerId) ? r.picks.get(viewerId)! : null,
      open,
      result: r.result,
      picks: r.result === null ? [] : [...r.picks].map(([playerId, pick]) => ({ playerId, pick })),
      scores: Object.fromEntries(this.scores),
    };
  }

  reset(): void {
    this.round = null;
    this.scores.clear();
  }
}
