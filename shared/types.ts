// Shared types between server and client. Plain TS, no runtime deps.

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  rank: Rank;
  suit: Suit;
}

export type HandRankName =
  | 'High Card'
  | 'One Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush'
  | 'Royal Flush';

export interface HandResult {
  rankValue: number; // 0-9, higher is better
  rankName: HandRankName;
  /** tie-break kickers, most significant first, comparable lexicographically */
  tiebreak: number[];
  /** best 5 cards making up the hand, for display */
  bestFive: Card[];
}

export type PlayerStatus =
  | 'waiting' // in lobby, not yet seated/ready
  | 'sitting_out' // seated but sitting out a hand (e.g. joined mid-hand)
  | 'active' // in the current hand
  | 'folded'
  | 'all_in'
  | 'eliminated'
  | 'disconnected';

export type PlayerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all_in';

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface Seat {
  seatIndex: number;
  playerId: string | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatarSeed: string;
  seatIndex: number;
  chips: number;
  bet: number; // chips committed in the current betting round
  totalCommitted: number; // chips committed to the pot this whole hand
  status: PlayerStatus;
  isHost: boolean;
  hasCards: boolean;
  isConnected: boolean;
  isReady: boolean;
  lastAction: PlayerAction | null;
  holeCards: Card[] | null; // only populated for the requesting player, or at showdown
  timeBankMs: number;
  stats: PlayerStats;
}

export interface PotInfo {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface ShowdownEntry {
  playerId: string;
  holeCards: Card[];
  hand: HandResult | null; // null if mucked without showdown
  won: number;
  isWinner: boolean;
}

export interface ChatMessage {
  id: string;
  playerId: string | null; // null for system messages
  name: string;
  text: string;
  ts: number;
  isSystem?: boolean;
  emoji?: string;
}

export interface RoomSettings {
  startingChips: number;
  smallBlind: number;
  bigBlind: number;
  blindIncreaseIntervalHands: number; // 0 = disabled
  turnTimerSeconds: number;
  maxPlayers: number;
  isPrivate: boolean;
  autoStartWhenReady: boolean;
  rebuyEnabled: boolean;
  tableTheme: TableTheme;
  /** 'assisted' shows each player their own current best hand and highlights the cards making it up.
   *  'professional' shows nothing extra — just the cards, like a real table. */
  gameMode: GameMode;
}

export type GameMode = 'assisted' | 'professional';

export type TableTheme = 'midnight' | 'emerald' | 'crimson' | 'royal';

export interface PlayerStats {
  handsPlayed: number;
  handsWon: number;
  biggestPot: number;
  totalChipsWon: number;
  totalChipsLost: number;
  bestHand: HandRankName | null;
  longestWinStreak: number;
  currentWinStreak: number;
  vpip: number; // hands voluntarily put money in / handsPlayed, tracked as count
  bluffsWon: number; // won a hand at showdown-avoided with a big bet holding a weak hand (heuristic)
}

export interface GameStateSnapshot {
  roomCode: string;
  phase: 'lobby' | 'hand_in_progress' | 'between_hands' | 'game_over';
  street: Street;
  players: PublicPlayer[];
  seats: Seat[];
  communityCards: Card[];
  pots: PotInfo[];
  totalPot: number;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentTurnPlayerId: string | null;
  turnExpiresAt: number | null;
  minRaiseTo: number;
  currentBet: number;
  lastAggressorId: string | null;
  handNumber: number;
  settings: RoomSettings;
  hostId: string;
  showdown: ShowdownEntry[] | null;
  winnersAnnouncement: WinnerAnnouncement[] | null;
  legalActionsForViewer: LegalActions | null;
  handHistory: HandHistoryEntry[];
  /**
   * Index into communityCards where "for fun" reveal cards start, when a hand ended early (everyone
   * folded but one) before the board ran out. Cards from this index on never affected the outcome —
   * they're dealt purely so the table can see what would have come. Null if no such reveal happened
   * (hand went to a real showdown, or is still in progress).
   */
  revealedRunoutFrom: number | null;
}

export interface WinnerAnnouncement {
  playerId: string;
  name: string;
  amount: number;
  handName: HandRankName | null;
  potIndex: number;
}

export interface HandHistoryEntry {
  handNumber: number;
  timestamp: number;
  communityCards: Card[];
  showdown: ShowdownEntry[];
  winners: WinnerAnnouncement[];
  totalPot: number;
  actions: HandActionLog[];
  revealedRunoutFrom: number | null;
}

export interface HandActionLog {
  playerId: string;
  name: string;
  action: PlayerAction;
  amount: number;
  street: Street;
}

// ---------- Socket event payloads ----------

export interface CreateRoomPayload {
  name: string;
  avatarSeed: string;
  settings: Partial<RoomSettings>;
}

export interface JoinRoomPayload {
  roomCode: string;
  name: string;
  avatarSeed: string;
  reconnectToken?: string;
}

export interface JoinRoomResult {
  ok: boolean;
  error?: string;
  roomCode?: string;
  playerId?: string;
  reconnectToken?: string;
}

export interface ActionPayload {
  action: PlayerAction;
  amount?: number; // for bet/raise: total amount the player is putting their bet TO
}

export interface ChatPayload {
  text: string;
}

export interface EmotePayload {
  emoji: string;
}

export interface HostUpdateSettingsPayload {
  settings: Partial<RoomSettings>;
}

export interface LegalActions {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  callAmount: number;
  canBet: boolean;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  canAllIn: boolean;
}

export const RANKS: Rank[] =['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14,
};
