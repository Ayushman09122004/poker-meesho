import { Card, HandRankName, HandResult, RANK_VALUE } from './types';

const RANK_NAMES: HandRankName[] = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
];

function combinations<T>(arr: T[], k: number): T[][] {
  const results: T[][] = [];
  const combo: T[] = [];
  function backtrack(start: number) {
    if (combo.length === k) {
      results.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      backtrack(i + 1);
      combo.pop();
    }
  }
  backtrack(0);
  return results;
}

/** Evaluates exactly 5 cards and returns the hand result. */
function evaluateFive(cards: Card[]): HandResult {
  const values = cards.map((c) => RANK_VALUE[c.rank]).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.suit === cards[0].suit);

  // Count occurrences of each rank value
  const countByValue = new Map<number, number>();
  for (const v of values) {
    countByValue.set(v, (countByValue.get(v) ?? 0) + 1);
  }

  // Determine straight (including wheel: A-2-3-4-5 -> straight high = 5)
  const distinctValuesDesc = [...new Set(values)].sort((a, b) => b - a);
  let straightHigh: number | null = null;
  if (distinctValuesDesc.length === 5) {
    if (distinctValuesDesc[0] - distinctValuesDesc[4] === 4) {
      straightHigh = distinctValuesDesc[0];
    } else if (
      distinctValuesDesc[0] === 14 &&
      distinctValuesDesc[1] === 5 &&
      distinctValuesDesc[2] === 4 &&
      distinctValuesDesc[3] === 3 &&
      distinctValuesDesc[4] === 2
    ) {
      straightHigh = 5; // wheel: 5-high straight
    }
  }

  // groups sorted by [count desc, value desc] -> e.g. [[13,2],[9,1],[4,1]]
  const groups = [...countByValue.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => (b.count !== a.count ? b.count - a.count : b.value - a.value));

  const countsPattern = groups.map((g) => g.count).join(''); // e.g. "2111" or "32" or "221"

  if (straightHigh !== null && isFlush) {
    const rankValue = straightHigh === 14 ? 9 : 8;
    return {
      rankValue,
      rankName: RANK_NAMES[rankValue],
      tiebreak: [straightHigh],
      bestFive: sortedByStraightOrder(cards, straightHigh),
    };
  }

  if (countsPattern === '41') {
    return {
      rankValue: 7,
      rankName: RANK_NAMES[7],
      tiebreak: [groups[0].value, groups[1].value],
      bestFive: orderByGroups(cards, groups),
    };
  }

  if (countsPattern === '32') {
    return {
      rankValue: 6,
      rankName: RANK_NAMES[6],
      tiebreak: [groups[0].value, groups[1].value],
      bestFive: orderByGroups(cards, groups),
    };
  }

  if (isFlush) {
    return {
      rankValue: 5,
      rankName: RANK_NAMES[5],
      tiebreak: [...values],
      bestFive: [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]),
    };
  }

  if (straightHigh !== null) {
    return {
      rankValue: 4,
      rankName: RANK_NAMES[4],
      tiebreak: [straightHigh],
      bestFive: sortedByStraightOrder(cards, straightHigh),
    };
  }

  if (countsPattern === '311') {
    return {
      rankValue: 3,
      rankName: RANK_NAMES[3],
      tiebreak: [groups[0].value, groups[1].value, groups[2].value],
      bestFive: orderByGroups(cards, groups),
    };
  }

  if (countsPattern === '221') {
    return {
      rankValue: 2,
      rankName: RANK_NAMES[2],
      tiebreak: [groups[0].value, groups[1].value, groups[2].value],
      bestFive: orderByGroups(cards, groups),
    };
  }

  if (countsPattern === '2111') {
    return {
      rankValue: 1,
      rankName: RANK_NAMES[1],
      tiebreak: [groups[0].value, groups[1].value, groups[2].value, groups[3].value],
      bestFive: orderByGroups(cards, groups),
    };
  }

  return {
    rankValue: 0,
    rankName: RANK_NAMES[0],
    tiebreak: [...values],
    bestFive: [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]),
  };
}

function orderByGroups(cards: Card[], groups: { value: number; count: number }[]): Card[] {
  const result: Card[] = [];
  for (const g of groups) {
    for (const c of cards) {
      if (RANK_VALUE[c.rank] === g.value) result.push(c);
    }
  }
  return result;
}

function sortedByStraightOrder(cards: Card[], high: number): Card[] {
  // For a wheel (5-high), ace counts low and displays after the 5,4,3,2.
  const order = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  const result: Card[] = [];
  for (const v of order) {
    const card = cards.find((c) => RANK_VALUE[c.rank] === v && !result.includes(c));
    if (card) result.push(card);
  }
  return result;
}

function compareHandResults(a: HandResult, b: HandResult): number {
  if (a.rankValue !== b.rankValue) return a.rankValue - b.rankValue;
  for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
    const av = a.tiebreak[i] ?? 0;
    const bv = b.tiebreak[i] ?? 0;
    if (av !== bv) return av - bv;
  }
  return 0;
}

/**
 * Evaluates the best possible 5-card hand from 5, 6, or 7 cards.
 */
export function evaluateHand(cards: Card[]): HandResult {
  if (cards.length < 5) throw new Error('Need at least 5 cards to evaluate a hand');
  if (cards.length === 5) return evaluateFive(cards);

  let best: HandResult | null = null;
  for (const combo of combinations(cards, 5)) {
    const result = evaluateFive(combo);
    if (!best || compareHandResults(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

/** Returns 1 if a beats b, -1 if b beats a, 0 if exactly tied. */
export function compareHands(a: HandResult, b: HandResult): number {
  const cmp = compareHandResults(a, b);
  return cmp > 0 ? 1 : cmp < 0 ? -1 : 0;
}
