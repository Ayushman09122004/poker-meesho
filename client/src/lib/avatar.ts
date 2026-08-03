export const AVATAR_EMOJIS = [
  '🐯', '🦊', '🐺', '🦁', '🐻', '🐼', '🐨', '🐸', '🐵', '🦉',
  '🦅', '🐲', '🦈', '🐙', '🦂', '🐝', '🦄', '🐧', '🦩', '🦖',
  '🎩', '🕶️', '🎲', '🃏', '💎', '👑', '🚀', '🔥', '⚡', '🍀',
];

const GRADIENTS: [string, string][] = [
  ['#f59e0b', '#b45309'],
  ['#ef4444', '#991b1b'],
  ['#8b5cf6', '#5b21b6'],
  ['#06b6d4', '#0e7490'],
  ['#22c55e', '#15803d'],
  ['#ec4899', '#9d174d'],
  ['#3b82f6', '#1d4ed8'],
  ['#eab308', '#a16207'],
  ['#14b8a6', '#0f766e'],
  ['#f97316', '#c2410c'],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface AvatarInfo {
  emoji: string;
  gradient: [string, string];
}

export function getAvatar(seed: string): AvatarInfo {
  const h = hashString(seed || 'x');
  const emoji = AVATAR_EMOJIS[h % AVATAR_EMOJIS.length];
  const gradient = GRADIENTS[Math.floor(h / AVATAR_EMOJIS.length) % GRADIENTS.length];
  return { emoji, gradient };
}

export const PRESET_AVATAR_SEEDS = AVATAR_EMOJIS.map((_, i) => `preset-${i}-seat`);
