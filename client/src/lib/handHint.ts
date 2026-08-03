import { Card, HandResult } from '../../../shared/types';
import { evaluateHand } from '../../../shared/HandEvaluator';

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export interface HandHint {
  result: HandResult;
  highlightedKeys: Set<string>;
}

/** Computes the viewer's current best hand from their hole cards + the board, once at least 5 cards are out. */
export function computeHandHint(holeCards: Card[] | null | undefined, communityCards: Card[]): HandHint | null {
  if (!holeCards || holeCards.length < 2) return null;
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) return null;
  const result = evaluateHand(all);
  return { result, highlightedKeys: new Set(result.bestFive.map(cardKey)) };
}
