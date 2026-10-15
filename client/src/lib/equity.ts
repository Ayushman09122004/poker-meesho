// Coach mode: your rough chance of winning the hand from here, estimated the way the bots do it —
// deal out the unknown cards many times against the number of opponents still in. Uses only your
// own cards and the board.
import { Card, RANKS, SUITS } from '../../../shared/types';
import { compareHands, evaluateHand } from '../../../shared/HandEvaluator';

const FULL_DECK: Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
const key = (c: Card) => `${c.rank}${c.suit}`;

export function winChance(hole: Card[], board: Card[], opponents: number, trials = 700): number {
  if (hole.length < 2 || opponents < 1) return 1;
  const known = new Set([...hole, ...board].map(key));
  const pool = FULL_DECK.filter((c) => !known.has(key(c)));
  const needBoard = 5 - board.length;
  const opp = Math.min(opponents, 6);
  let score = 0;
  for (let t = 0; t < trials; t++) {
    const need = needBoard + opp * 2;
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const full = board.concat(pool.slice(0, needBoard));
    const mine = evaluateHand(hole.concat(full));
    let lost = false;
    let ties = 0;
    for (let o = 0; o < opp; o++) {
      const cmp = compareHands(mine, evaluateHand(pool.slice(needBoard + o * 2, needBoard + o * 2 + 2).concat(full)));
      if (cmp < 0) {
        lost = true;
        break;
      }
      if (cmp === 0) ties++;
    }
    if (!lost) score += ties > 0 ? 1 / (ties + 1) : 1;
  }
  return score / trials;
}
