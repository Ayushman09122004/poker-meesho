import { HandRankName, PlayerStats } from '../../../shared/types';

const HAND_RANK_ORDER: HandRankName[] = [
  'High Card',
  'One Pair',
  'Two Pair',
  'Three of a Kind',
  'Straight',
  'Flush',
  'Full House',
  'Four of a Kind',
  'Straight Flush',
  'Royal Flush',
];

function handAtLeast(best: HandRankName | null, threshold: HandRankName): boolean {
  if (!best) return false;
  return HAND_RANK_ORDER.indexOf(best) >= HAND_RANK_ORDER.indexOf(threshold);
}

export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: (stats: PlayerStats) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-win',
    icon: '🥇',
    title: 'First Blood',
    description: 'Win your first hand',
    unlocked: (s) => s.handsWon >= 1,
  },
  {
    id: 'heater',
    icon: '🔥',
    title: 'On a Heater',
    description: 'Win 3 hands in a row',
    unlocked: (s) => s.longestWinStreak >= 3,
  },
  {
    id: 'unstoppable',
    icon: '⚡',
    title: 'Unstoppable',
    description: 'Win 5 hands in a row',
    unlocked: (s) => s.longestWinStreak >= 5,
  },
  {
    id: 'full-house',
    icon: '🏠',
    title: 'Full House Fanatic',
    description: 'Make at least a Full House',
    unlocked: (s) => handAtLeast(s.bestHand, 'Full House'),
  },
  {
    id: 'quads',
    icon: '🀄',
    title: 'Quad Squad',
    description: 'Make Four of a Kind',
    unlocked: (s) => handAtLeast(s.bestHand, 'Four of a Kind'),
  },
  {
    id: 'royal-flush',
    icon: '👑',
    title: 'Royal Flush Club',
    description: 'Hit a Royal Flush',
    unlocked: (s) => s.bestHand === 'Royal Flush',
  },
  {
    id: 'bluff',
    icon: '🎭',
    title: 'The Bluff',
    description: 'Win a big pot on a stone-cold bluff',
    unlocked: (s) => s.bluffsWon >= 1,
  },
  {
    id: 'serial-bluffer',
    icon: '🃏',
    title: 'Serial Bluffer',
    description: 'Land 3 successful bluffs',
    unlocked: (s) => s.bluffsWon >= 3,
  },
  {
    id: 'high-roller',
    icon: '💰',
    title: 'High Roller',
    description: 'Win a pot worth 500+ chips',
    unlocked: (s) => s.biggestPot >= 500,
  },
  {
    id: 'whale',
    icon: '🐋',
    title: 'Whale',
    description: 'Win a pot worth 2,000+ chips',
    unlocked: (s) => s.biggestPot >= 2000,
  },
  {
    id: 'grinder',
    icon: '⛏️',
    title: 'Grinder',
    description: 'Play 25 hands in a session',
    unlocked: (s) => s.handsPlayed >= 25,
  },
  {
    id: 'marathon',
    icon: '🏆',
    title: 'Marathon Player',
    description: 'Play 100 hands in a session',
    unlocked: (s) => s.handsPlayed >= 100,
  },
  {
    id: 'in-the-black',
    icon: '📈',
    title: 'In the Black',
    description: 'Finish a long session up in chips',
    unlocked: (s) => s.handsPlayed >= 15 && s.totalChipsWon - s.totalChipsLost > 0,
  },
];

export function unlockedAchievements(stats: PlayerStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.unlocked(stats));
}
