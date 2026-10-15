import { Card, PlayerAction, PlayerStatus, PlayerStats, Street } from '../../../shared/types';

export interface EnginePlayer {
  id: string;
  name: string;
  avatarSeed: string;
  seatIndex: number;
  chips: number;
  bet: number;
  totalCommitted: number;
  holeCards: Card[];
  status: PlayerStatus;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
  lastAction: PlayerAction | null;
  hasActedThisRound: boolean;
  timeBankMs: number;
  stats: PlayerStats;
  /** true once the player has folded or gone all-in this hand, used to know who's "in" the hand */
  isInHand: boolean;
  /** Computer-controlled seat (see BotBrain). */
  isBot: boolean;
  /** Bot difficulty, 1 (easiest) to 5 (hardest); 0 for humans. */
  botLevel: number;
  /** Chose to sit out: keeps the seat and chips but isn't dealt in. */
  sittingOut: boolean;
}

export interface InternalPot {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface StreetActionRecord {
  playerId: string;
  name: string;
  action: PlayerAction;
  amount: number;
  street: Street;
}

export function emptyStats(): PlayerStats {
  return {
    handsPlayed: 0,
    handsWon: 0,
    biggestPot: 0,
    totalChipsWon: 0,
    totalChipsLost: 0,
    bestHand: null,
    longestWinStreak: 0,
    currentWinStreak: 0,
    vpip: 0,
    bluffsWon: 0,
  };
}
