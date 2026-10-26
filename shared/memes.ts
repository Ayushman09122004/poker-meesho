// Win-streak meme tickets: win 2 in a row → a tier-1 ticket, 3 → tier 2, 4 → tier 3, 5 → tier 4
// (and another tier-4 every 2 wins after that). Cash one in and the meme plays on everyone's
// screen before the next deal.

export interface MemeInfo {
  id: string;
  tier: 1 | 2 | 3 | 4;
  title: string;
  url: string;
  /** Optional sound effect played with it. */
  sound?: string;
}

export const MEME_PLAY_MS = 6000;

export function ticketTierForStreak(streak: number): number | null {
  if (streak >= 2 && streak <= 5) return streak - 1;
  if (streak > 5 && (streak - 5) % 2 === 0) return 4;
  return null;
}

export const TIER_LABEL: Record<number, string> = { 1: '2-win', 2: '3-win', 3: '4-win', 4: '5-win' };

/** The memes (public/memes — converted from Tenor GIFs), funnier as the streak grows. */
export const MEMES: MemeInfo[] = [
  { id: 'dancing-kid', tier: 1, title: 'Dancing kid', url: '/memes/dancing-kid.mp4', sound: '/sfx/airhorn.mp3' },
  { id: 'vibing-cat', tier: 1, title: 'Vibing cat', url: '/memes/vibing-cat.mp4' },
  { id: 'carlton', tier: 2, title: 'The Carlton', url: '/memes/carlton.mp4' },
  { id: 'shrek-dance', tier: 2, title: 'Shrek dance', url: '/memes/shrek-dance.mp4' },
  { id: 'coffin-dance', tier: 3, title: 'Coffin dance', url: '/memes/coffin-dance.mp4', sound: '/sfx/coffin-dance.mp3' },
  { id: 'gangnam', tier: 3, title: 'Gangnam Style', url: '/memes/gangnam.mp4' },
  { id: 'rickroll', tier: 4, title: 'Rickroll', url: '/memes/rickroll.mp4' },
  { id: 'leo-cheers', tier: 4, title: 'Leo says cheers', url: '/memes/leo-cheers.mp4' },
  { id: 'make-it-rain', tier: 4, title: 'Make it rain', url: '/memes/make-it-rain.mp4', sound: '/sfx/airhorn.mp3' },
];
