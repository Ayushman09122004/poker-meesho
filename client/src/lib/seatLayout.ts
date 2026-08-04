export interface Point {
  left: number; // percentage
  top: number; // percentage
}

/**
 * Places `relIndex` (0 = self, increasing clockwise) around an oval table,
 * with self always anchored at the bottom-center.
 *
 * The angular gap between adjacent seats shrinks as more players join (360/maxPlayers), so at a
 * fixed radius, seats with a fixed pixel footprint start visually overlapping well before 9
 * players. Pushing the radius out a bit as the table fills up buys back some of that room; the
 * rest comes from shrinking the seat itself (see seatScaleForPlayerCount below).
 */
export function getSeatPosition(relIndex: number, maxPlayers: number): Point {
  const angleDeg = 90 + (relIndex * 360) / maxPlayers;
  const rad = (angleDeg * Math.PI) / 180;
  const rx = Math.min(47, 42 + (maxPlayers - 2) * 0.7);
  const ry = Math.min(38, 28 + (maxPlayers - 2) * 1.4);
  return {
    left: 50 + rx * Math.cos(rad),
    top: 50 + ry * Math.sin(rad),
  };
}

/** Shrinks the seat's whole visual footprint as more players join, so more of them fit without overlapping. */
export function seatScaleForPlayerCount(maxPlayers: number): number {
  if (maxPlayers <= 2) return 1;
  if (maxPlayers <= 3) return 0.94;
  if (maxPlayers <= 4) return 0.86;
  if (maxPlayers <= 6) return 0.76;
  return 0.66;
}

/** A point pulled in toward the table center, used to place a player's bet chips. */
export function getBetPosition(relIndex: number, maxPlayers: number): Point {
  const seat = getSeatPosition(relIndex, maxPlayers);
  return {
    left: 50 + (seat.left - 50) * 0.55,
    top: 50 + (seat.top - 50) * 0.55,
  };
}

/** A point just off the seat, pulled slightly toward center — where the dealer button sits. */
export function getDealerButtonPosition(relIndex: number, maxPlayers: number): Point {
  const seat = getSeatPosition(relIndex, maxPlayers);
  return {
    left: 50 + (seat.left - 50) * 0.78,
    top: 50 + (seat.top - 50) * 0.78,
  };
}

export function relativeSeatIndex(seatIndex: number, selfSeatIndex: number, maxPlayers: number): number {
  return (seatIndex - selfSeatIndex + maxPlayers) % maxPlayers;
}

/**
 * Maps each raw seatIndex (0..maxPlayers-1, sparse — most rooms never fill up) to a dense,
 * evenly-spaced order among only the seats that are actually occupied. Without this, a 9-seat
 * room with 4 players seated at indexes 0-3 would place them within a single 160° arc (since
 * getSeatPosition spaces seats by 360/maxPlayers) instead of spreading them around the full oval.
 */
export function occupiedSeatOrder(seatIndexes: number[]): Map<number, number> {
  const sorted = [...seatIndexes].sort((a, b) => a - b);
  const order = new Map<number, number>();
  sorted.forEach((seatIndex, i) => order.set(seatIndex, i));
  return order;
}
