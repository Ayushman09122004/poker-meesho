import { CHARACTERS, Character, characterForSeed, seedForCharacter } from './characters';

export interface AvatarInfo {
  emoji: string;
  gradient: [string, string];
  ring: string;
  name: string;
  title: string;
  image: string | null;
  focus: string;
  zoom: number;
}

export function getAvatar(seed: string): AvatarInfo {
  const c: Character = characterForSeed(seed);
  return {
    emoji: c.emoji,
    gradient: c.gradient,
    ring: c.ring,
    name: c.name,
    title: c.title,
    image: c.image,
    focus: c.focus,
    zoom: c.zoom,
  };
}

export const PRESET_AVATAR_SEEDS = CHARACTERS.map((c) => seedForCharacter(c.id));

// Kept for anything still importing the raw glyph list directly.
export const AVATAR_EMOJIS = CHARACTERS.map((c) => c.emoji);
