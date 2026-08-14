/**
 * Maps each raw seatIndex (0..maxPlayers-1, sparse — most rooms never fill up) to a dense,
 * evenly-spaced order among only the seats that are actually occupied. Without this, a 9-seat
 * room with 4 players seated at indexes 0-3 would place them within a single arc instead of
 * spreading them around the full table. Used by the 3D seat layout (see ../three/layout3D.ts).
 */
export function occupiedSeatOrder(seatIndexes: number[]): Map<number, number> {
  const sorted = [...seatIndexes].sort((a, b) => a - b);
  const order = new Map<number, number>();
  sorted.forEach((seatIndex, i) => order.set(seatIndex, i));
  return order;
}
