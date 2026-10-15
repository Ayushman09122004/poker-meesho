// "Player notes" that bots keep on everyone at the table — the way a real player sizes up
// opponents over a session. Built only from information every player at the table sees: the
// actions people take and the cards they show at showdown (never anyone's hidden cards).
import { HandHistoryEntry } from '../../../shared/types';

interface Counts {
  hands: number;
  /** Hands where they put money in voluntarily before the flop. */
  vpip: number;
  /** Hands where they raised before the flop. */
  pfr: number;
  /** Bets/raises vs calls, all streets. */
  aggressive: number;
  passive: number;
  /** Times they faced a bet, and how often they folded to it. */
  facedBet: number;
  foldedToBet: number;
  showdowns: number;
  /** Showed down a weak hand (high card / one pair) after betting the last street. */
  caughtBluffing: number;
}

export interface PlayerRead {
  /** 0–1: how much there is to go on (grows with hands observed). */
  confidence: number;
  /** Share of hands they play (typical ≈ 0.28). */
  looseness: number;
  /** Share of their actions that are bets/raises rather than calls (typical ≈ 0.4). */
  aggression: number;
  /** How often they fold when bet into (typical ≈ 0.45). */
  foldToBet: number;
  /** How often their showdown bets turn out to be weak (typical ≈ 0.12). */
  bluffRate: number;
  handsSeen: number;
}

/** Population averages — what a bot assumes about someone it hasn't seen play yet. */
export const TYPICAL: Omit<PlayerRead, 'confidence' | 'handsSeen'> = {
  looseness: 0.28,
  aggression: 0.4,
  foldToBet: 0.45,
  bluffRate: 0.12,
};

const empty = (): Counts => ({ hands: 0, vpip: 0, pfr: 0, aggressive: 0, passive: 0, facedBet: 0, foldedToBet: 0, showdowns: 0, caughtBluffing: 0 });

export class ProfileBook {
  private counts = new Map<string, Counts>();

  /** Learn from one finished hand. */
  recordHand(hand: HandHistoryEntry): void {
    const dealt = new Set<string>();
    const playedPre = new Set<string>();
    const raisedPre = new Set<string>();
    const lastBettor = new Map<string, string>(); // street -> last player to bet/raise
    let facingOnStreet = new Set<string>();
    let currentStreet = '';

    for (const a of hand.actions) {
      dealt.add(a.playerId);
      const c = this.get(a.playerId);
      // Posted blinds are logged as preflop "bet"s — they're forced, not a choice.
      if (a.street === 'preflop' && a.action === 'bet') continue;
      if (a.street !== currentStreet) {
        currentStreet = a.street;
        facingOnStreet = new Set();
      }
      // "Fold to a bet" is judged after the flop only (preflop, folding most hands is normal), and
      // only when someone else has bet into them on this street.
      const facing = a.street !== 'preflop' && [...facingOnStreet].some((id) => id !== a.playerId);
      if (facing) {
        c.facedBet++;
        if (a.action === 'fold') c.foldedToBet++;
      }
      if (a.action === 'raise' || a.action === 'bet' || a.action === 'all_in') {
        c.aggressive++;
        facingOnStreet.add(a.playerId);
        lastBettor.set(a.street, a.playerId);
        if (a.street === 'preflop') {
          playedPre.add(a.playerId);
          raisedPre.add(a.playerId);
        }
      } else if (a.action === 'call') {
        c.passive++;
        if (a.street === 'preflop') playedPre.add(a.playerId);
      }
    }

    for (const e of hand.showdown ?? []) dealt.add(e.playerId);
    for (const id of dealt) {
      const c = this.get(id);
      c.hands++;
      if (playedPre.has(id)) c.vpip++;
      if (raisedPre.has(id)) c.pfr++;
    }

    // Who bet the final street, then showed a weak hand?
    const lastStreetBettor = lastBettor.get('river') ?? lastBettor.get('turn') ?? lastBettor.get('flop');
    for (const e of hand.showdown ?? []) {
      if (!e.hand) continue;
      const c = this.get(e.playerId);
      c.showdowns++;
      if (e.playerId === lastStreetBettor && e.hand.rankValue <= 1) c.caughtBluffing++;
    }
  }

  /** What a bot believes about this player, blended toward "typical" until it has seen enough. */
  read(playerId: string): PlayerRead {
    const c = this.counts.get(playerId) ?? empty();
    const confidence = Math.min(1, c.hands / 15);
    const blend = (observed: number, typical: number) => typical + (observed - typical) * confidence;
    return {
      confidence,
      handsSeen: c.hands,
      looseness: blend(c.hands ? c.vpip / c.hands : TYPICAL.looseness, TYPICAL.looseness),
      aggression: blend(c.aggressive + c.passive ? c.aggressive / (c.aggressive + c.passive) : TYPICAL.aggression, TYPICAL.aggression),
      foldToBet: blend(c.facedBet ? c.foldedToBet / c.facedBet : TYPICAL.foldToBet, TYPICAL.foldToBet),
      bluffRate: blend(c.showdowns ? c.caughtBluffing / c.showdowns : TYPICAL.bluffRate, TYPICAL.bluffRate),
    };
  }

  forget(playerId: string): void {
    this.counts.delete(playerId);
  }

  private get(id: string): Counts {
    let c = this.counts.get(id);
    if (!c) {
      c = empty();
      this.counts.set(id, c);
    }
    return c;
  }
}

/** A short in-character remark about a strong read, or null if nothing stands out yet. */
export function describeRead(name: string, r: PlayerRead): string | null {
  if (r.confidence < 0.8) return null;
  if (r.bluffRate > 0.28) return `I've caught you bluffing before, ${name}. Not this time.`;
  if (r.foldToBet > 0.62) return `You fold too easily, ${name}. I've noticed.`;
  if (r.foldToBet < 0.25) return `${name} never folds… so I'll just bet my good hands.`;
  if (r.looseness > 0.5) return `${name} plays every hand, huh? Noted.`;
  if (r.looseness < 0.14) return `${name} only plays monsters. When you bet, I'm out.`;
  if (r.aggression > 0.62) return `${name} loves to bet. I'm calling you down.`;
  return null;
}
