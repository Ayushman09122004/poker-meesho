// Throwing tomatoes / roses / beers / chickens at other players — rate-limited so nobody can
// spam the table: at most THROW_LIMIT throws per THROW_WINDOW_MS per player (a rolling window).
import { ThrowItem } from '../../../shared/types';

export const THROW_ITEMS: ThrowItem[] = ['tomato', 'rose', 'beer', 'chicken'];
export const THROW_LIMIT = 5;
export const THROW_WINDOW_MS = 5 * 60_000;

export class ThrowLimiter {
  private history = new Map<string, number[]>();

  /** Records a throw if allowed; otherwise says how long until the next one is. */
  tryThrow(playerId: string, now = Date.now()): { ok: true } | { ok: false; retryInMs: number } {
    const recent = (this.history.get(playerId) ?? []).filter((t) => now - t < THROW_WINDOW_MS);
    if (recent.length >= THROW_LIMIT) {
      this.history.set(playerId, recent);
      return { ok: false, retryInMs: THROW_WINDOW_MS - (now - recent[0]) };
    }
    recent.push(now);
    this.history.set(playerId, recent);
    return { ok: true };
  }

  remaining(playerId: string, now = Date.now()): number {
    const recent = (this.history.get(playerId) ?? []).filter((t) => now - t < THROW_WINDOW_MS);
    return Math.max(0, THROW_LIMIT - recent.length);
  }
}
