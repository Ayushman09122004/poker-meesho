import { Card, HandResult } from '../../../shared/types';
import { evaluateHand } from '../../../shared/HandEvaluator';

export function cardKey(card: Card): string {
  return `${card.rank}${card.suit}`;
}

export interface HandHint {
  result: HandResult;
  highlightedKeys: Set<string>;
}

/**
 * The cards that actually make the hand, for highlighting: just the paired/tripped ranks for
 * pair-type hands (not the kickers), nothing for a bare high card, all five otherwise.
 */
export function comboKeys(result: HandResult): Set<string> {
  const byRank = new Map<string, number>();
  for (const c of result.bestFive) byRank.set(c.rank, (byRank.get(c.rank) ?? 0) + 1);
  switch (result.rankName) {
    case 'High Card':
      return new Set();
    case 'One Pair':
    case 'Two Pair':
    case 'Three of a Kind':
    case 'Four of a Kind':
      return new Set(result.bestFive.filter((c) => (byRank.get(c.rank) ?? 0) >= 2).map(cardKey));
    default:
      return new Set(result.bestFive.map(cardKey));
  }
}

/** Computes the viewer's current best hand from their hole cards + the board (or just a pocket pair preflop). */
export function computeHandHint(holeCards: Card[] | null | undefined, communityCards: Card[]): HandHint | null {
  if (!holeCards || holeCards.length < 2) return null;
  const all = [...holeCards, ...communityCards];
  if (all.length < 5) {
    if (holeCards[0].rank !== holeCards[1].rank) return null;
    const pair = { rankValue: 1, rankName: 'One Pair', tiebreak: [], bestFive: holeCards } as HandResult;
    return { result: pair, highlightedKeys: new Set(holeCards.map(cardKey)) };
  }
  const result = evaluateHand(all);
  return { result, highlightedKeys: comboKeys(result) };
}
