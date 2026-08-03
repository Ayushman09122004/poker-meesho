export interface Point {
  left: number; // percentage
  top: number; // percentage
}

/**
 * Places `relIndex` (0 = self, increasing clockwise) around an oval table,
 * with self always anchored at the bottom-center.
 */
export function getSeatPosition(relIndex: number, maxPlayers: number): Point {
  const angleDeg = 90 + (relIndex * 360) / maxPlayers;
  const rad = (angleDeg * Math.PI) / 180;
  const rx = 43;
  const ry = 30;
  return {
    left: 50 + rx * Math.cos(rad),
    top: 50 + ry * Math.sin(rad),
  };
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
