// Famous match-ups among the personas. When both are fighting over a big pot, the table shows a
// RIVALRY banner and each says their line.
import { characterForSeed } from './characters';

const RIVALRIES: { a: string; b: string; title: string }[] = [
  { a: 'batman', b: 'joker', title: 'The Dark Knight vs The Clown Prince' },
  { a: 'scorpion', b: 'sub-zero', title: 'Fire vs Ice' },
  { a: 'vergil', b: 'dante', title: 'Sons of Sparda' },
  { a: 'homelander', b: 'billy-butcher', title: 'Supe vs Butcher' },
  { a: 'itachi', b: 'madara', title: 'Uchiha Clash' },
  { a: 'deadpool', b: 'wolverine', title: 'Merc with a Mouth vs Bub' },
  { a: 'shao-kahn', b: 'scorpion', title: 'Emperor vs Hellspawn' },
  { a: 'master-chief', b: 'doom-slayer', title: 'Super Soldier Showdown' },
  { a: 'walter-white', b: 'saul-goodman', title: 'Breaking Bad Business' },
  { a: 'michael-scott', b: 'dwight', title: 'Regional Manager Dispute' },
  { a: 'homer', b: 'peter-griffin', title: 'Battle of the Cartoon Dads' },
  { a: 'eren', b: 'levi', title: 'Survey Corps Grudge Match' },
  { a: 'sukuna', b: 'toji', title: 'Sorcerer Killer vs King of Curses' },
  { a: 'agent-47', b: 'john-wick', title: 'Hitman vs Baba Yaga' },
  { a: 'neo', b: 'agent-47', title: 'The One vs The Agent' },
  { a: 'jack-sparrow', b: 'tony-montana', title: 'Pirate vs Kingpin' },
];

export interface Rivalry {
  aId: string;
  bId: string;
  title: string;
}

/** The first rivalry between any two of these players (by player id), if there is one. */
export function findRivalry(players: { id: string; avatarSeed: string }[]): Rivalry | null {
  const byChar = new Map(players.map((p) => [characterForSeed(p.avatarSeed).id, p.id]));
  for (const r of RIVALRIES) {
    const aId = byChar.get(r.a);
    const bId = byChar.get(r.b);
    if (aId && bId && aId !== bId) return { aId, bId, title: r.title };
  }
  return null;
}
