import { CHARACTERS, characterForSeed, seedForCharacter } from './characters';

export interface AvatarInfo {
  emoji: string;
  gradient: [string, string];
  ring: string;
  name: string;
  title: string;
}

export function getAvatar(seed: string): AvatarInfo {
  const c = characterForSeed(seed);
  return { emoji: c.emoji, gradient: c.gradient, ring: c.ring, name: c.name, title: c.title };
}

export const PRESET_AVATAR_SEEDS = CHARACTERS.map((c) => seedForCharacter(c.id));

// Kept for anything still importing the raw emoji list directly.
export const AVATAR_EMOJIS = CHARACTERS.map((c) => c.emoji);
