import { describe, it, expect } from 'vitest';
import { ThrowLimiter, THROW_LIMIT, THROW_WINDOW_MS } from './Throwables';
import { SideBetBook, SIDE_BET_QUESTIONS } from './SideBets';
import { PokerEngine } from './PokerEngine';
import { sanitizeSettings } from './settings';
import { Card } from '../../../shared/types';

describe('Throw limit', () => {
  it('allows 5 throws per 5 minutes, then makes you wait', () => {
    const lim = new ThrowLimiter();
    const t0 = 1_000_000;
    for (let i = 0; i < THROW_LIMIT; i++) expect(lim.tryThrow('p', t0 + i * 1000).ok).toBe(true);
    const blocked = lim.tryThrow('p', t0 + 10_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryInMs).toBeGreaterThan(0);
    expect(lim.remaining('p', t0 + 10_000)).toBe(0);
    // Once the oldest throw is 5 minutes old, one slot frees up.
    expect(lim.tryThrow('p', t0 + THROW_WINDOW_MS + 1).ok).toBe(true);
  });

  it('counts each player separately', () => {
    const lim = new ThrowLimiter();
    for (let i = 0; i < THROW_LIMIT; i++) lim.tryThrow('a', 1000 + i);
    expect(lim.tryThrow('a', 2000).ok).toBe(false);
    expect(lim.tryThrow('b', 2000).ok).toBe(true);
  });
});

function engineAtPreflop() {
  const e = new PokerEngine('SB001', sanitizeSettings({ startingChips: 1000, smallBlind: 5, bigBlind: 10 }));
  e.addPlayer('a', 'A', 'x', true);
  e.addPlayer('b', 'B', 'y', false);
  e.startHand();
  return e;
}

describe('Side bets', () => {
  it('takes picks before the flop, settles on the flop, and awards a point for a right guess', () => {
    const e = engineAtPreflop();
    const book = new SideBetBook();
    book.sync(e);
    expect(book.view('a', e)!.open).toBe(true);
    expect(book.pick(e, 'a', true)).toBe(true);
    expect(book.pick(e, 'b', false)).toBe(true);
    // Picks stay hidden until the flop.
    expect(book.view('a', e)!.picks).toEqual([]);
    expect(book.view('a', e)!.pickCount).toBe(2);
    expect(book.view('a', e)!.myPick).toBe(true);

    // Deal the flop by calling/checking preflop.
    let guard = 0;
    while (e.street === 'preflop' && e.currentTurnPlayerId && guard++ < 10) {
      const l = e.getLegalActions(e.currentTurnPlayerId)!;
      e.applyAction(e.currentTurnPlayerId, l.canCheck ? 'check' : 'call');
    }
    expect(e.communityCards.length).toBeGreaterThanOrEqual(3);
    book.sync(e);
    const view = book.view('a', e)!;
    expect(view.open).toBe(false);
    expect(view.result).not.toBeNull();
    expect(view.picks.length).toBe(2);
    // Exactly one of the two opposite guesses was right.
    expect((view.scores.a ?? 0) + (view.scores.b ?? 0)).toBe(1);
    // No more picks once the flop is out.
    expect(book.pick(e, 'a', false)).toBe(false);
  });

  it('every question gives a yes/no answer for any flop', () => {
    const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });
    const flops: Card[][] = [
      [c('A', 'spades'), c('A', 'hearts'), c('2', 'clubs')],
      [c('7', 'diamonds'), c('8', 'diamonds'), c('9', 'diamonds')],
      [c('K', 'hearts'), c('Q', 'clubs'), c('3', 'spades')],
    ];
    for (const q of SIDE_BET_QUESTIONS) for (const f of flops) expect(typeof q.test(f)).toBe('boolean');
  });
});
