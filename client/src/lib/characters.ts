// The persona roster for the avatar picker: popular characters players can sit at the table as.
// Portraits come from freely licensed Wikimedia Commons photos (cosplay for fictional characters),
// listed with their credits in ./personas.json; any persona without a photo falls back to an
// initials badge in its signature colours.
import personaImages from './personas.json';

export type PersonaGroup = 'villain' | 'icon' | 'anime' | 'wildcard';

export interface PersonaCredit {
  author: string;
  license: string;
  source: string;
}

export interface Character {
  id: string;
  name: string;
  /** Franchise / where they're from, shown as the subtitle. */
  title: string;
  group: PersonaGroup;
  /** Portrait image URL, or null when no freely licensed photo was found. */
  image: string | null;
  /** CSS object-position of the face inside the portrait. */
  focus: string;
  /** How far to zoom into `focus` so the face fills the circle. */
  zoom: number;
  credit: PersonaCredit | null;
  /** Fallback glyph (initials) when there is no image. */
  emoji: string;
  gradient: [string, string];
  ring: string;
}

export const PERSONA_GROUPS: { id: PersonaGroup; label: string }[] = [
  { id: 'villain', label: 'Villains & antiheroes' },
  { id: 'icon', label: 'Icons' },
  { id: 'anime', label: 'Anime' },
  { id: 'wildcard', label: 'Wildcards' },
];

// [id, name, from, group, signature colour]
const ROSTER: [string, string, string, PersonaGroup, string][] = [
  ['scorpion', 'Scorpion', 'Mortal Kombat', 'villain', '#f5b301'],
  ['sukuna', 'Sukuna', 'Jujutsu Kaisen', 'villain', '#e11d48'],
  ['darth-vader', 'Darth Vader', 'Star Wars', 'villain', '#dc2626'],
  ['joker', 'The Joker', 'DC', 'villain', '#7c3aed'],
  ['venom', 'Venom', 'Marvel', 'villain', '#e5e7eb'],
  ['ghost-rider', 'Ghost Rider', 'Marvel', 'villain', '#f97316'],
  ['spawn', 'Spawn', 'Image Comics', 'villain', '#16a34a'],
  ['deadpool', 'Deadpool', 'Marvel', 'villain', '#dc2626'],
  ['doom-slayer', 'Doom Slayer', 'DOOM', 'villain', '#65a30d'],
  ['kratos', 'Kratos', 'God of War', 'villain', '#b91c1c'],
  ['vergil', 'Vergil', 'Devil May Cry', 'villain', '#3b82f6'],
  ['dante', 'Dante', 'Devil May Cry', 'villain', '#dc2626'],
  ['shao-kahn', 'Shao Kahn', 'Mortal Kombat', 'villain', '#a16207'],
  ['noob-saibot', 'Noob Saibot', 'Mortal Kombat', 'villain', '#475569'],
  ['sub-zero', 'Sub-Zero', 'Mortal Kombat', 'villain', '#38bdf8'],
  ['homelander', 'Homelander', 'The Boys', 'villain', '#2563eb'],
  ['billy-butcher', 'Billy Butcher', 'The Boys', 'villain', '#78716c'],
  ['negan', 'Negan', 'The Walking Dead', 'villain', '#991b1b'],
  ['hannibal', 'Hannibal Lecter', 'Hannibal', 'villain', '#a8a29e'],
  ['tyler-durden', 'Tyler Durden', 'Fight Club', 'villain', '#ec4899'],
  ['patrick-bateman', 'Patrick Bateman', 'American Psycho', 'villain', '#e5e7eb'],
  ['john-wick', 'John Wick', 'John Wick', 'villain', '#64748b'],
  ['punisher', 'The Punisher', 'Marvel', 'villain', '#f8fafc'],
  ['blade', 'Blade', 'Marvel', 'villain', '#b91c1c'],
  ['rorschach', 'Rorschach', 'Watchmen', 'villain', '#a16207'],
  ['batman', 'Batman', 'DC', 'icon', '#facc15'],
  ['wolverine', 'Wolverine', 'Marvel', 'icon', '#eab308'],
  ['geralt', 'Geralt of Rivia', 'The Witcher', 'icon', '#cbd5e1'],
  ['arthur-morgan', 'Arthur Morgan', 'Red Dead Redemption 2', 'icon', '#b45309'],
  ['jin-sakai', 'Jin Sakai', 'Ghost of Tsushima', 'icon', '#e11d48'],
  ['agent-47', 'Agent 47', 'Hitman', 'icon', '#dc2626'],
  ['leon-kennedy', 'Leon Kennedy', 'Resident Evil', 'icon', '#92400e'],
  ['solid-snake', 'Solid Snake', 'Metal Gear', 'icon', '#4d7c0f'],
  ['master-chief', 'Master Chief', 'Halo', 'icon', '#65a30d'],
  ['neo', 'Neo', 'The Matrix', 'icon', '#22c55e'],
  ['jack-sparrow', 'Jack Sparrow', 'Pirates of the Caribbean', 'icon', '#b45309'],
  ['thomas-shelby', 'Thomas Shelby', 'Peaky Blinders', 'icon', '#94a3b8'],
  ['walter-white', 'Walter White', 'Breaking Bad', 'icon', '#16a34a'],
  ['saul-goodman', 'Saul Goodman', 'Better Call Saul', 'icon', '#eab308'],
  ['tony-montana', 'Tony Montana', 'Scarface', 'icon', '#f8fafc'],
  ['sung-jin-woo', 'Sung Jin-Woo', 'Solo Leveling', 'anime', '#8b5cf6'],
  ['itachi', 'Itachi Uchiha', 'Naruto', 'anime', '#dc2626'],
  ['madara', 'Madara Uchiha', 'Naruto', 'anime', '#b91c1c'],
  ['toji', 'Toji Fushiguro', 'Jujutsu Kaisen', 'anime', '#64748b'],
  ['aizen', 'Aizen', 'Bleach', 'anime', '#a78bfa'],
  ['hisoka', 'Hisoka', 'Hunter × Hunter', 'anime', '#ec4899'],
  ['levi', 'Levi', 'Attack on Titan', 'anime', '#15803d'],
  ['eren', 'Eren Yeager', 'Attack on Titan', 'anime', '#16a34a'],
  ['danny-devito', 'Danny DeVito', 'Actor', 'wildcard', '#f59e0b'],
  ['mr-bean', 'Mr. Bean', 'Comedy', 'wildcard', '#a16207'],
  ['shrek', 'Shrek', 'DreamWorks', 'wildcard', '#84cc16'],
  ['homer', 'Homer Simpson', 'The Simpsons', 'wildcard', '#facc15'],
  ['peter-griffin', 'Peter Griffin', 'Family Guy', 'wildcard', '#22c55e'],
  ['michael-scott', 'Michael Scott', 'The Office', 'wildcard', '#3b82f6'],
  ['dwight', 'Dwight Schrute', 'The Office', 'wildcard', '#eab308'],
  ['the-mask', 'The Mask', 'The Mask', 'wildcard', '#65a30d'],
  ['nicolas-cage', 'Nicolas Cage', 'Actor', 'wildcard', '#f97316'],
  ['jack-black', 'Jack Black', 'Actor', 'wildcard', '#ef4444'],
];

interface PersonaImage {
  id: string;
  file: string | null;
  focus?: string;
  zoom?: number;
  credit: PersonaCredit | null;
}

const IMAGE_BY_ID = new Map((personaImages as PersonaImage[]).map((p) => [p.id, p]));

function initials(name: string): string {
  const words = name.replace(/^(The|Mr\.)\s+/, '').split(/[\s-]+/);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift: number) => Math.max(0, Math.round(((n >> shift) & 255) * (1 - amount)));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

export const CHARACTERS: Character[] = ROSTER.map(([id, name, title, group, color]) => {
  const img = IMAGE_BY_ID.get(id);
  return {
    id,
    name,
    title,
    group,
    image: img?.file ?? null,
    focus: img?.focus ?? '50% 30%',
    zoom: img?.zoom ?? 1,
    credit: img?.credit ?? null,
    emoji: initials(name),
    gradient: [darken(color, 0.25), darken(color, 0.7)],
    ring: color,
  };
});

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
