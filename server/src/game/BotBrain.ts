// Decision-making for computer players. A bot only ever *chooses* among the engine's legal actions
// (see getLegalActions), so it can never break the rules — difficulty just changes how well it
// plays:
//
//   1 Fish     — barely reads its cards, calls far too much, random bets
//   2 Rookie   — rough sense of hand strength, passive, chases draws
//   3 Regular  — solid: plays by real equity vs. pot odds
//   4 Shark    — sharper equity, value-bets well, bluffs sometimes
//   5 Pro      — near-accurate equity, balanced aggression, semi-bluffs, check-raises
//
// "Equity" is the bot's chance to win the pot, estimated by dealing out the unknown cards many
// times (Monte Carlo) against the number of opponents still in the hand.
import { Card, LegalActions, PlayerAction, RANKS, RANK_VALUE, SUITS } from '../../../shared/types';
import { compareHands, evaluateHand } from '../../../shared/HandEvaluator';
import type { PokerEngine } from './PokerEngine';
import type { EnginePlayer } from './types';

export const BOT_LEVEL_NAMES = ['', 'Fish', 'Rookie', 'Regular', 'Shark', 'Pro'] as const;

export interface BotDecision {
  action: PlayerAction;
  amount?: number;
}

interface LevelProfile {
  /** Monte Carlo trials (0 = guess from a simple rating instead). */
  sims: number;
  /** Random error added to the equity estimate. */
  noise: number;
  /** How readily it bets/raises with good hands (0–1). */
  aggression: number;
  /** How often it bets/raises with weak hands. */
  bluff: number;
  /** Extra equity it wants above pot odds before calling (negative = calls too loose). */
  callMargin: number;
}

const PROFILES: Record<number, LevelProfile> = {
  1: { sims: 0, noise: 0.25, aggression: 0.25, bluff: 0.06, callMargin: -0.15 },
  2: { sims: 120, noise: 0.14, aggression: 0.3, bluff: 0.03, callMargin: -0.06 },
  3: { sims: 220, noise: 0.07, aggression: 0.5, bluff: 0.05, callMargin: 0.02 },
  4: { sims: 400, noise: 0.035, aggression: 0.65, bluff: 0.09, callMargin: 0.03 },
  5: { sims: 600, noise: 0.015, aggression: 0.75, bluff: 0.12, callMargin: 0.02 },
};

const FULL_DECK: Card[] = SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
const key = (c: Card) => `${c.rank}${c.suit}`;

/** Quick 0–1 rating of two hole cards (used by Fish, and as a sanity floor preflop). */
function preflopRating(hole: Card[]): number {
  const [a, b] = hole.map((c) => RANK_VALUE[c.rank]).sort((x, y) => y - x);
  const pair = a === b;
  const suited = hole[0].suit === hole[1].suit;
  const gap = a - b;
  let score = (a + b) / 28; // 0.14 (2-2) … 1.0 (A-A)
  if (pair) score += 0.35;
  if (suited) score += 0.06;
  if (gap === 1) score += 0.04;
  if (gap >= 4) score -= 0.08;
  return Math.max(0, Math.min(1, score));
}

/** Chance (0–1) that `hole` wins against `opponents` random hands, ties counted as half. */
function estimateEquity(hole: Card[], board: Card[], opponents: number, sims: number): number {
  const known = new Set([...hole, ...board].map(key));
  const deck = FULL_DECK.filter((c) => !known.has(key(c)));
  // Keep the work bounded at full tables.
  const trials = Math.max(60, Math.floor(sims / Math.max(1, opponents * 0.6)));
  const needBoard = 5 - board.length;
  let score = 0;
  const pool = deck.slice();
  for (let t = 0; t < trials; t++) {
    // Partial Fisher–Yates: shuffle only as many cards as this trial needs.
    const need = needBoard + opponents * 2;
    for (let i = 0; i < need; i++) {
      const j = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const fullBoard = board.concat(pool.slice(0, needBoard));
    const mine = evaluateHand(hole.concat(fullBoard));
    let best = 1; // 1 = winning outright, 0.5 = tied, 0 = lost
    let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const oppHole = pool.slice(needBoard + o * 2, needBoard + o * 2 + 2);
      const cmp = compareHands(mine, evaluateHand(oppHole.concat(fullBoard)));
      if (cmp < 0) {
        best = 0;
        break;
      }
      if (cmp === 0) ties++;
    }
    score += best === 0 ? 0 : ties > 0 ? 1 / (ties + 1) : 1;
  }
  return score / trials;
}

function clampTo(amount: number, legal: LegalActions): number {
  return Math.round(Math.min(legal.maxRaiseTo, Math.max(legal.minRaiseTo, amount)));
}

export function decideBotAction(engine: PokerEngine, bot: EnginePlayer): BotDecision {
  const legal = engine.getLegalActions(bot.id);
  if (!legal) return { action: 'fold' };
  const level = Math.min(5, Math.max(1, Math.round(bot.botLevel || 3)));
  const p = PROFILES[level];
  const rand = Math.random;

  const players = [...engine.players.values()];
  const opponents = players.filter((o) => o.id !== bot.id && o.isInHand && o.status !== 'folded').length;
  const board = engine.communityCards;
  const pot = players.reduce((s, o) => s + o.totalCommitted, 0);
  const toCall = legal.callAmount ?? 0;
  const bb = engine.settings.bigBlind;

  // How likely we are to win, as this bot perceives it.
  let equity: number;
  if (p.sims === 0 || bot.holeCards.length < 2) {
    equity = preflopRating(bot.holeCards) * (board.length === 0 ? 1 : 0.85) + (rand() - 0.5) * 0.3;
  } else {
    equity = estimateEquity(bot.holeCards, board, Math.max(1, opponents), p.sims);
  }
  equity = Math.max(0, Math.min(1, equity + (rand() * 2 - 1) * p.noise));

  const fairShare = 1 / (Math.max(1, opponents) + 1);
  const edge = equity - fairShare; // > 0 means better than an average hand here
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;

  const betSize = (fraction: number) => {
    const size = Math.max(bb, Math.round((pot * fraction) / bb) * bb);
    return clampTo(engine.currentBet + size, legal);
  };
  const aggressive = (): BotDecision => {
    // Strength-scaled sizing: bigger with monsters, smaller with thin value or bluffs.
    const fraction = edge > 0.35 ? 0.9 + rand() * 0.4 : edge > 0.15 ? 0.6 + rand() * 0.3 : 0.45 + rand() * 0.25;
    const to = betSize(fraction);
    // Shoving range: huge edge, or the bet would commit most of the stack anyway.
    if (legal.canAllIn && (to >= legal.maxRaiseTo * 0.85 || (edge > 0.45 && level >= 4 && rand() < 0.3))) {
      return { action: 'all_in' };
    }
    if (legal.canBet) return { action: 'bet', amount: to };
    if (legal.canRaise) return { action: 'raise', amount: to };
    if (legal.canCall) return { action: 'call' };
    return legal.canCheck ? { action: 'check' } : { action: 'fold' };
  };
  const passive = (): BotDecision => {
    if (legal.canCheck) return { action: 'check' };
    if (legal.canCall) return { action: 'call' };
    if (legal.canAllIn) return { action: 'all_in' };
    return { action: 'fold' };
  };

  // Nothing to call: bet for value, bluff sometimes, otherwise check.
  if (toCall === 0) {
    const valueBar = 0.12 - p.aggression * 0.08;
    if (edge > valueBar && rand() < 0.45 + p.aggression * 0.5) return aggressive();
    // Bluffs and semi-bluffs land more on later streets for stronger bots.
    if (rand() < p.bluff * (board.length >= 3 ? 1.3 : 0.7)) return aggressive();
    return passive();
  }

  // Facing a bet.
  const raiseBar = 0.3 - p.aggression * 0.12;
  if (edge > raiseBar && rand() < 0.35 + p.aggression * 0.55) return aggressive();
  // Pros occasionally check-raise / re-bluff.
  if (level >= 4 && rand() < p.bluff * 0.35 && toCall <= pot * 0.6) return aggressive();

  const callable = equity >= potOdds + p.callMargin;
  if (callable) return passive();

  // Weak bots get "sticky": call small bets with almost anything.
  if (level <= 2 && toCall <= bb * (level === 1 ? 8 : 3) && rand() < (level === 1 ? 0.7 : 0.35)) return passive();
  return { action: 'fold' };
}

/** How long a bot "thinks" before acting — longer for bigger decisions, so it feels human. */
export function botThinkMs(engine: PokerEngine, bot: EnginePlayer): number {
  const legal = engine.getLegalActions(bot.id);
  const big = legal && legal.callAmount > engine.settings.bigBlind * 6;
  const base = 900 + Math.random() * 1300;
  return Math.round(base + (big ? 900 + Math.random() * 1200 : 0));
}
