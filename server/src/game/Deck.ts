import { Card, RANKS, SUITS } from '../../../shared/types';
import { secureShuffle } from '../utils/rng';

export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        this.cards.push({ rank, suit });
      }
    }
    secureShuffle(this.cards);
  }

  /** Draws n cards from the top of the deck. Throws if the deck runs out. */
  draw(n = 1): Card[] {
    if (n > this.cards.length) {
      throw new Error('Not enough cards left in the deck');
    }
    return this.cards.splice(0, n);
  }

  remaining(): number {
    return this.cards.length;
  }
}
