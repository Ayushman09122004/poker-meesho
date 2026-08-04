// A roster of original poker personas for the avatar picker. Deliberately invented characters
// (not real people, brands, or copyrighted properties) so the game can ship publicly without any
// IP concerns, while still giving players something more fun and identity-driven than a bare emoji.

export interface Character {
  id: string;
  name: string;
  title: string;
  emoji: string;
  gradient: [string, string];
  ring: string;
}

export const CHARACTERS: Character[] = [
  { id: 'ace-mccool', name: 'Ace McCool', title: 'Never blinks first', emoji: '🕶️', gradient: ['#f59e0b', '#b45309'], ring: '#fbbf24' },
  { id: 'lucky-luna', name: 'Lucky Luna', title: 'Runs it twice, wins it thrice', emoji: '🍀', gradient: ['#22c55e', '#15803d'], ring: '#4ade80' },
  { id: 'big-slick-bill', name: 'Big Slick Bill', title: 'A gentleman with a mean river card', emoji: '🎩', gradient: ['#64748b', '#1e293b'], ring: '#cbd5e1' },
  { id: 'ivy-bluffer', name: 'Ivy the Bluffer', title: 'You can never tell', emoji: '🃏', gradient: ['#ec4899', '#9d174d'], ring: '#f472b6' },
  { id: 'midnight-rose', name: 'Midnight Rose', title: 'Cold hands, colder stare', emoji: '🌹', gradient: ['#8b5cf6', '#5b21b6'], ring: '#c4b5fd' },
  { id: 'the-shark', name: 'The Shark', title: 'Smells chips from a mile away', emoji: '🦈', gradient: ['#06b6d4', '#0e7490'], ring: '#67e8f9' },
  { id: 'foxy-nell', name: 'Foxy Nell', title: 'Sly on the river', emoji: '🦊', gradient: ['#f97316', '#c2410c'], ring: '#fdba74' },
  { id: 'ironclaw', name: 'Ironclaw', title: 'King of the felt', emoji: '🦁', gradient: ['#eab308', '#a16207'], ring: '#fde047' },
  { id: 'professor-chips', name: 'Professor Chips', title: 'Calculates pot odds in their sleep', emoji: '🧠', gradient: ['#3b82f6', '#1d4ed8'], ring: '#93c5fd' },
  { id: 'diamond-duchess', name: 'Diamond Duchess', title: 'Only plays the nuts', emoji: '💎', gradient: ['#06b6d4', '#4338ca'], ring: '#a5f3fc' },
  { id: 'neon-ninja', name: 'Neon Ninja', title: 'Strikes on the turn', emoji: '⚡', gradient: ['#a855f7', '#6b21a8'], ring: '#e9d5ff' },
  { id: 'grandma-grit', name: 'Grandma Grit', title: 'Do not let the cardigan fool you', emoji: '👵', gradient: ['#f472b6', '#be185d'], ring: '#fbcfe8' },
  { id: 'wildcard-wolf', name: 'Wildcard Wolf', title: 'Hunts in the dark hours', emoji: '🐺', gradient: ['#475569', '#0f172a'], ring: '#cbd5e1' },
  { id: 'sir-fold-a-lot', name: 'Sir Fold-a-Lot', title: 'Lives to fight another hand', emoji: '🎭', gradient: ['#14b8a6', '#0f766e'], ring: '#5eead4' },
  { id: 'baron-von-bluff', name: 'Baron von Bluff', title: 'Bets big, sleeps fine', emoji: '🧛', gradient: ['#7c3aed', '#312e81'], ring: '#c7d2fe' },
  { id: 'cosmic-kat', name: 'Cosmic Kat', title: 'Out of this world reads', emoji: '🐱', gradient: ['#0ea5e9', '#1e3a8a'], ring: '#7dd3fc' },
  { id: 'ember-dragon', name: 'Ember the Dragon', title: 'Sets the pot on fire', emoji: '🐲', gradient: ['#ef4444', '#7f1d1d'], ring: '#fca5a5' },
  { id: 'whiskers-mcfold', name: 'Whiskers McFold', title: 'Knows when to hop away', emoji: '🐰', gradient: ['#f5f5f4', '#a8a29e'], ring: '#e7e5e4' },
  { id: 'trickster-tanuki', name: 'Trickster Tanuki', title: 'Nothing is ever as it seems', emoji: '🦝', gradient: ['#78716c', '#292524'], ring: '#d6d3d1' },
  { id: 'sergeant-stacks', name: 'Sergeant Stacks', title: 'Never retreats from a raise', emoji: '🎖️', gradient: ['#16a34a', '#14532d'], ring: '#86efac' },
  { id: 'doctor-doubledown', name: 'Doctor Doubledown', title: 'Prescribes all-ins', emoji: '🥼', gradient: ['#0891b2', '#164e63'], ring: '#a5f3fc' },
  { id: 'empress-emerald', name: 'Empress Emerald', title: 'Rules the table with a glance', emoji: '👑', gradient: ['#10b981', '#065f46'], ring: '#6ee7b7' },
  { id: 'rowdy-rex', name: 'Rowdy Rex', title: 'A dinosaur with a big stack', emoji: '🦖', gradient: ['#84cc16', '#3f6212'], ring: '#bef264' },
  { id: 'captain-wildcard', name: 'Captain Wildcard', title: 'Sails into every pot', emoji: '⚓', gradient: ['#2563eb', '#1e3a8a'], ring: '#93c5fd' },
];

const CHARACTER_BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Resolves any avatar seed to a character. New seeds are "char:<id>"; old/random seeds hash deterministically. */
export function characterForSeed(seed: string): Character {
  if (seed?.startsWith('char:')) {
    const found = CHARACTER_BY_ID.get(seed.slice(5));
    if (found) return found;
  }
  const h = hashString(seed || 'x');
  return CHARACTERS[h % CHARACTERS.length];
}

export function seedForCharacter(id: string): string {
  return `char:${id}`;
}
