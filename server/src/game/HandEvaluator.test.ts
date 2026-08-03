import { describe, it, expect } from 'vitest';
import { evaluateHand, compareHands } from '../../../shared/HandEvaluator';
import { Card } from '../../../shared/types';

function c(spec: string): Card {
  // spec like "Ah" "Td" "2c" "Ks"
  const rank = spec.slice(0, -1) as Card['rank'];
  const suitChar = spec.slice(-1);
  const suitMap: Record<string, Card['suit']> = {
    s: 'spades',
    h: 'hearts',
    d: 'diamonds',
    c: 'clubs',
  };
  return { rank, suit: suitMap[suitChar] };
}

function cards(spec: string): Card[] {
  return spec.split(' ').map(c);
}

describe('HandEvaluator', () => {
  it('detects royal flush', () => {
    const r = evaluateHand(cards('Ah Kh Qh Jh Th 2c 3d'));
    expect(r.rankName).toBe('Royal Flush');
  });

  it('detects straight flush (non-royal)', () => {
    const r = evaluateHand(cards('9h 8h 7h 6h 5h Ac Kd'));
    expect(r.rankName).toBe('Straight Flush');
    expect(r.tiebreak[0]).toBe(9);
  });

  it('detects wheel straight flush (A-2-3-4-5)', () => {
    const r = evaluateHand(cards('Ah 2h 3h 4h 5h Kd Qc'));
    expect(r.rankName).toBe('Straight Flush');
    expect(r.tiebreak[0]).toBe(5);
  });

  it('detects four of a kind', () => {
    const r = evaluateHand(cards('9h 9s 9d 9c 2h 3d 4c'));
    expect(r.rankName).toBe('Four of a Kind');
    expect(r.tiebreak).toEqual([9, 4]);
  });

  it('detects full house', () => {
    const r = evaluateHand(cards('9h 9s 9d 2c 2h 3d 4c'));
    expect(r.rankName).toBe('Full House');
    expect(r.tiebreak).toEqual([9, 2]);
  });

  it('picks the better full house when two trips are available (7-card)', () => {
    // trips of 9s and trips of 2s -> full house should be 9s full of 2s
    const r = evaluateHand(cards('9h 9s 9d 2c 2h 2d 4c'));
    expect(r.rankName).toBe('Full House');
    expect(r.tiebreak).toEqual([9, 2]);
  });

  it('detects flush', () => {
    const r = evaluateHand(cards('2h 5h 9h Jh Kh 3d 4c'));
    expect(r.rankName).toBe('Flush');
    expect(r.tiebreak).toEqual([13, 11, 9, 5, 2]);
  });

  it('detects straight', () => {
    const r = evaluateHand(cards('5h 6d 7c 8s 9h 2c 2d'));
    expect(r.rankName).toBe('Straight');
    expect(r.tiebreak[0]).toBe(9);
  });

  it('detects wheel straight (A-2-3-4-5)', () => {
    const r = evaluateHand(cards('Ah 2d 3c 4s 5h Kd Qc'));
    expect(r.rankName).toBe('Straight');
    expect(r.tiebreak[0]).toBe(5);
  });

  it('detects three of a kind', () => {
    const r = evaluateHand(cards('9h 9s 9d 2c 5h 3d 4c'));
    expect(r.rankName).toBe('Three of a Kind');
    expect(r.tiebreak).toEqual([9, 5, 4]);
  });

  it('detects two pair, using best two pairs from more than two available', () => {
    const r = evaluateHand(cards('9h 9s 5d 5c 3h 3d 4c'));
    expect(r.rankName).toBe('Two Pair');
    expect(r.tiebreak).toEqual([9, 5, 4]);
  });

  it('detects one pair', () => {
    const r = evaluateHand(cards('9h 9s 5d 6c 3h Kd 2c'));
    expect(r.rankName).toBe('One Pair');
    expect(r.tiebreak).toEqual([9, 13, 6, 5]);
  });

  it('detects high card', () => {
    const r = evaluateHand(cards('9h 5d 6c 3h Jc Kd 2s'));
    expect(r.rankName).toBe('High Card');
  });

  it('compares hands correctly: flush beats straight', () => {
    const flush = evaluateHand(cards('2h 5h 9h Jh Kh 3d 4c'));
    const straight = evaluateHand(cards('5h 6d 7c 8s 9h 2c 2d'));
    expect(compareHands(flush, straight)).toBe(1);
  });

  it('compares equal hands as tied (split pot scenario)', () => {
    const board = cards('Ah Kd Qc Jd Ts');
    const p1 = evaluateHand([...board, ...cards('2c 3c')]);
    const p2 = evaluateHand([...board, ...cards('4d 5d')]);
    // both play the board straight (broadway)
    expect(compareHands(p1, p2)).toBe(0);
    expect(p1.rankName).toBe('Straight');
  });

  it('breaks ties correctly with kickers', () => {
    const board = cards('9h 9s 2c 5d 7h');
    const p1 = evaluateHand([...board, ...cards('Ac Kd')]); // pair of 9s, A K kickers
    const p2 = evaluateHand([...board, ...cards('Qc Jd')]); // pair of 9s, Q J kickers
    expect(compareHands(p1, p2)).toBe(1);
  });

  it('no duplicate cards produced by combos (sanity on bestFive length)', () => {
    const r = evaluateHand(cards('9h 9s 9d 9c 2h 3d 4c'));
    expect(r.bestFive.length).toBe(5);
    const unique = new Set(r.bestFive.map((c) => c.rank + c.suit));
    expect(unique.size).toBe(5);
  });
});
