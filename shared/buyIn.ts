// Buy-in amounts a player can ask for in host-approval rooms, as multiples of the starting stack.
const MULTIPLES = [0.5, 1, 1.5, 2, 3];

export function buyInOptions(startingChips: number, tournament: boolean): number[] {
  // Tournaments are a level playing field: everyone buys in for the starting stack.
  if (tournament) return [startingChips];
  return MULTIPLES.map((m) => Math.round(startingChips * m));
}
