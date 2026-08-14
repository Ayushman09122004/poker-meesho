// 3D seat geometry — mirrors the angle math in ../lib/seatLayout.ts (same relIndex convention:
// 0 = self, increasing clockwise) but outputs world-space X/Z coordinates instead of CSS percentages.
// Self always sits nearest the camera (+Z), matching the old "bottom of the oval" convention.

export const TABLE_RADIUS_X = 3.4;
export const TABLE_RADIUS_Z = 2.1;
export const TABLE_SURFACE_Y = 0.78;

export interface Seat3DTransform {
  position: [number, number, number];
  /** Yaw (radians) so a seated character/nameplate faces the table center. */
  facingAngle: number;
}

function seatRadii(count: number) {
  const rx = Math.min(4.4, TABLE_RADIUS_X + (count - 2) * 0.16);
  const rz = Math.min(3.0, TABLE_RADIUS_Z + (count - 2) * 0.22);
  return { rx, rz };
}

export function getSeat3D(relIndex: number, count: number): Seat3DTransform {
  const angleDeg = 90 + (relIndex * 360) / count;
  const rad = (angleDeg * Math.PI) / 180;
  const { rx, rz } = seatRadii(count);
  const x = rx * Math.cos(rad);
  const z = rz * Math.sin(rad);
  // Rotation.y that turns local -Z ("forward") to point from this seat toward the table center —
  // i.e. applying Three's standard Y-rotation matrix to (0,0,-1) must yield normalize(-x,-z).
  const facingAngle = Math.atan2(x, z);
  return { position: [x, TABLE_SURFACE_Y, z], facingAngle };
}

/** Rotates a world-space (dx, dz) delta into the local frame of a group rotated by `angle` around
 * Y — the inverse of Three's rotation.y transform, used to place a card/prop correctly inside a
 * seat's own rotated "facing" group given a world-space source point (e.g. the deck). */
export function worldDeltaToLocalXZ(dx: number, dz: number, angle: number): [number, number] {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [dx * cos - dz * sin, dx * sin + dz * cos];
}

/** A point pulled in toward the table center — where a player's bet chips sit. */
export function getBetPosition3D(relIndex: number, count: number): [number, number, number] {
  const seat = getSeat3D(relIndex, count);
  return [seat.position[0] * 0.5, TABLE_SURFACE_Y + 0.02, seat.position[2] * 0.5];
}

/** A point just off the seat, pulled toward center — where the dealer button sits. */
export function getDealerButtonPosition3D(relIndex: number, count: number): [number, number, number] {
  const seat = getSeat3D(relIndex, count);
  return [seat.position[0] * 0.72, TABLE_SURFACE_Y + 0.03, seat.position[2] * 0.72];
}

export function seatScaleForCount(count: number): number {
  if (count <= 2) return 1;
  if (count <= 3) return 0.95;
  if (count <= 4) return 0.88;
  if (count <= 6) return 0.78;
  return 0.68;
}

/** Deck sits at the "head" of the table, opposite the usual dealer chatter spot. */
export const DECK_POSITION_3D: [number, number, number] = [0, TABLE_SURFACE_Y + 0.05, -1.55];

export const POT_POSITION_3D: [number, number, number] = [0, TABLE_SURFACE_Y + 0.01, -0.55];
export const COMMUNITY_CARDS_CENTER_3D: [number, number, number] = [0, TABLE_SURFACE_Y + 0.02, 0.15];
