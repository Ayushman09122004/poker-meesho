import {
  Card,
  GameStateSnapshot,
  HandHistoryEntry,
  LegalActions,
  PlayerAction,
  PotInfo,
  PublicPlayer,
  RoomSettings,
  Seat,
  ShowdownEntry,
  Street,
  WinnerAnnouncement,
} from '../../../shared/types';
import { Deck } from './Deck';
import { evaluateHand, compareHands } from '../../../shared/HandEvaluator';
import { EnginePlayer, InternalPot, StreetActionRecord, emptyStats } from './types';

const HAND_HISTORY_LIMIT = 25;
const TIME_BANK_TOTAL_MS = 60_000;
const TIME_BANK_INCREMENT_MS = 20_000;

export class PokerEngine {
  players: Map<string, EnginePlayer> = new Map();
  settings: RoomSettings;
  hostId: string | null = null;
  roomCode: string;

  deck: Deck | null = null;
  communityCards: Card[] = [];
  street: Street = 'preflop';
  phase: GameStateSnapshot['phase'] = 'lobby';

  dealerSeat = 0;
  sbSeat = 0;
  bbSeat = 0;
  currentTurnPlayerId: string | null = null;
  turnExpiresAt: number | null = null;

  currentBet = 0;
  minRaiseIncrement = 0;
  lastAggressorId: string | null = null;

  handNumber = 0;
  handsSinceBlindIncrease = 0;

  pots: InternalPot[] = [];
  actionLog: StreetActionRecord[] = [];
  lastShowdown: ShowdownEntry[] | null = null;
  lastWinners: WinnerAnnouncement[] | null = null;
  handHistory: HandHistoryEntry[] = [];
  revealedRunoutFrom: number | null = null;

  constructor(roomCode: string, settings: RoomSettings) {
    this.roomCode = roomCode;
    this.settings = settings;
  }

  // ---------- Seating ----------

  occupiedSeats(): number[] {
    return [...this.players.values()].map((p) => p.seatIndex).sort((a, b) => a - b);
  }

  seatOf(playerId: string): number | undefined {
    return this.players.get(playerId)?.seatIndex;
  }

  firstOpenSeat(): number | null {
    const taken = new Set(this.occupiedSeats());
    for (let i = 0; i < this.settings.maxPlayers; i++) {
      if (!taken.has(i)) return i;
    }
    return null;
  }

  addPlayer(id: string, name: string, avatarSeed: string, isHost: boolean): { ok: boolean; error?: string } {
    if (this.players.has(id)) return { ok: true };
    if (this.players.size >= this.settings.maxPlayers) return { ok: false, error: 'Room is full' };
    const seatIndex = this.firstOpenSeat();
    if (seatIndex === null) return { ok: false, error: 'No open seats' };

    const player: EnginePlayer = {
      id,
      name,
      avatarSeed,
      seatIndex,
      chips: this.settings.startingChips,
      bet: 0,
      totalCommitted: 0,
      holeCards: [],
      status: 'waiting',
      isHost,
      isConnected: true,
      isReady: false,
      lastAction: null,
      hasActedThisRound: false,
      timeBankMs: TIME_BANK_TOTAL_MS,
      stats: emptyStats(),
      isInHand: false,
    };
    this.players.set(id, player);
    if (isHost) this.hostId = id;
    return { ok: true };
  }

  removePlayer(id: string): void {
    const player = this.players.get(id);
    if (!player) return;
    // If they're mid-hand, treat as a fold so pots resolve correctly.
    if (this.phase === 'hand_in_progress' && player.isInHand) {
      this.foldOut(player);
      this.maybeAdvanceAfterAction();
    }
    this.players.delete(id);
    if (this.hostId === id) {
      const next = [...this.players.values()][0];
      this.hostId = next ? next.id : null;
      if (next) next.isHost = true;
    }
  }

  setConnected(id: string, connected: boolean): void {
    const p = this.players.get(id);
    if (p) p.isConnected = connected;
  }

  setReady(id: string, ready: boolean): void {
    const p = this.players.get(id);
    if (p) p.isReady = ready;
  }

  activeSeatedPlayers(): EnginePlayer[] {
    return [...this.players.values()].filter((p) => p.status !== 'eliminated');
  }

  canStartHand(): boolean {
    const eligible = this.activeSeatedPlayers().filter((p) => p.chips > 0);
    return eligible.length >= 2 && this.phase !== 'hand_in_progress';
  }

  rebuy(playerId: string): { ok: boolean; error?: string } {
    if (!this.settings.rebuyEnabled) return { ok: false, error: 'Rebuys are disabled for this room' };
    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (this.phase === 'hand_in_progress' && player.isInHand) {
      return { ok: false, error: 'Cannot rebuy mid-hand' };
    }
    if (player.chips > 0) return { ok: false, error: 'You still have chips' };
    player.chips = this.settings.startingChips;
    player.status = 'waiting';
    if (this.phase === 'game_over') this.phase = 'between_hands';
    return { ok: true };
  }

  /** Resets every seated player's chips and starts a brand new game from scratch. */
  resetGame(): void {
    this.phase = 'lobby';
    this.street = 'preflop';
    this.communityCards = [];
    this.pots = [];
    this.handNumber = 0;
    this.handsSinceBlindIncrease = 0;
    this.lastShowdown = null;
    this.lastWinners = null;
    this.handHistory = [];
    this.revealedRunoutFrom = null;
    this.currentTurnPlayerId = null;
    this.turnExpiresAt = null;
    for (const p of this.players.values()) {
      p.chips = this.settings.startingChips;
      p.bet = 0;
      p.totalCommitted = 0;
      p.holeCards = [];
      p.status = 'waiting';
      p.isReady = false;
      p.lastAction = null;
      p.isInHand = false;
      p.stats = emptyStats();
      p.timeBankMs = TIME_BANK_TOTAL_MS;
    }
  }

  /** Spends up to one time-bank increment to extend the caller's own current turn. */
  useTimeBank(playerId: string): { ok: boolean; error?: string } {
    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (this.currentTurnPlayerId !== playerId) return { ok: false, error: 'Not your turn' };
    if (player.timeBankMs <= 0) return { ok: false, error: 'No time bank left' };

    const extension = Math.min(TIME_BANK_INCREMENT_MS, player.timeBankMs);
    player.timeBankMs -= extension;
    this.turnExpiresAt = (this.turnExpiresAt ?? Date.now()) + extension;
    return { ok: true };
  }

  // ---------- Hand lifecycle ----------

  private nextOccupiedSeat(fromSeat: number, predicate: (p: EnginePlayer) => boolean): number | null {
    const bySeat = new Map<number, EnginePlayer>();
    for (const p of this.players.values()) bySeat.set(p.seatIndex, p);
    for (let i = 1; i <= this.settings.maxPlayers; i++) {
      const seat = (fromSeat + i) % this.settings.maxPlayers;
      const p = bySeat.get(seat);
      if (p && predicate(p)) return seat;
    }
    return null;
  }

  private playerAtSeat(seat: number): EnginePlayer | undefined {
    return [...this.players.values()].find((p) => p.seatIndex === seat);
  }

  startHand(): { ok: boolean; error?: string } {
    if (!this.canStartHand()) return { ok: false, error: 'Not enough players with chips to start' };

    const handPlayers = this.activeSeatedPlayers().filter((p) => p.chips > 0);
    for (const p of this.players.values()) {
      p.bet = 0;
      p.totalCommitted = 0;
      p.holeCards = [];
      p.lastAction = null;
      p.hasActedThisRound = false;
      p.isInHand = false;
      if (p.chips > 0 && p.status !== 'eliminated') {
        p.status = 'active';
        p.isInHand = true;
      } else if (p.chips <= 0) {
        p.status = 'eliminated';
      }
    }

    this.handNumber += 1;
    this.maybeIncreaseBlinds();

    // Move the dealer button to the next occupied seat that still has chips.
    const eligibleSeats = handPlayers.map((p) => p.seatIndex);
    if (this.handNumber === 1) {
      this.dealerSeat = eligibleSeats[0];
    } else {
      const found = this.nextOccupiedSeat(this.dealerSeat, (p) => p.isInHand);
      this.dealerSeat = found ?? eligibleSeats[0];
    }

    if (handPlayers.length === 2) {
      this.sbSeat = this.dealerSeat;
      const other = handPlayers.find((p) => p.seatIndex !== this.dealerSeat)!;
      this.bbSeat = other.seatIndex;
    } else {
      this.sbSeat = this.nextOccupiedSeat(this.dealerSeat, (p) => p.isInHand)!;
      this.bbSeat = this.nextOccupiedSeat(this.sbSeat, (p) => p.isInHand)!;
    }

    this.deck = new Deck();
    this.communityCards = [];
    this.street = 'preflop';
    this.phase = 'hand_in_progress';
    this.pots = [];
    this.actionLog = [];
    this.lastShowdown = null;
    this.lastWinners = null;
    this.revealedRunoutFrom = null;

    // Post blinds
    this.postBlind(this.playerAtSeat(this.sbSeat)!, this.settings.smallBlind);
    this.postBlind(this.playerAtSeat(this.bbSeat)!, this.settings.bigBlind);

    // Deal hole cards, two at a time starting left of the dealer.
    const dealOrder: EnginePlayer[] = [];
    let seat = this.dealerSeat;
    for (let i = 0; i < handPlayers.length; i++) {
      seat = this.nextOccupiedSeat(seat, (p) => p.isInHand)!;
      dealOrder.push(this.playerAtSeat(seat)!);
    }
    for (const p of dealOrder) p.holeCards.push(...this.deck.draw(1));
    for (const p of dealOrder) p.holeCards.push(...this.deck.draw(1));

    for (const p of handPlayers) {
      p.stats.handsPlayed += 1;
    }

    this.currentBet = this.settings.bigBlind;
    this.minRaiseIncrement = this.settings.bigBlind;
    this.lastAggressorId = this.playerAtSeat(this.bbSeat)!.id;

    const firstToAct = this.nextOccupiedSeat(this.bbSeat, (p) => p.isInHand && p.status === 'active');
    this.setCurrentTurn(firstToAct !== null ? this.playerAtSeat(firstToAct)!.id : null);

    this.resolveIfNoActionsPossible();
    return { ok: true };
  }

  private postBlind(player: EnginePlayer, amount: number): void {
    const pay = Math.min(amount, player.chips);
    player.chips -= pay;
    player.bet += pay;
    player.totalCommitted += pay;
    if (player.chips === 0) player.status = 'all_in';
    this.actionLog.push({ playerId: player.id, name: player.name, action: 'bet', amount: pay, street: 'preflop' });
  }

  private maybeIncreaseBlinds(): void {
    if (!this.settings.blindIncreaseIntervalHands || this.settings.blindIncreaseIntervalHands <= 0) return;
    this.handsSinceBlindIncrease += 1;
    if (this.handsSinceBlindIncrease >= this.settings.blindIncreaseIntervalHands) {
      this.handsSinceBlindIncrease = 0;
      const newBb = Math.max(this.settings.bigBlind + 2, Math.ceil((this.settings.bigBlind * 1.5) / 5) * 5);
      this.settings.bigBlind = newBb;
      this.settings.smallBlind = Math.max(1, Math.floor(newBb / 2));
    }
  }

  private setCurrentTurn(playerId: string | null): void {
    this.currentTurnPlayerId = playerId;
    this.turnExpiresAt = playerId ? Date.now() + this.settings.turnTimerSeconds * 1000 : null;
  }

  // ---------- Legal action computation ----------

  getLegalActions(playerId: string): LegalActions | null {
    const player = this.players.get(playerId);
    if (!player || this.currentTurnPlayerId !== playerId || player.status !== 'active') return null;

    const toCall = this.currentBet - player.bet;
    const canCheck = toCall <= 0;
    const canCall = toCall > 0 && player.chips > 0;
    const callAmount = Math.min(toCall, player.chips);

    const minRaiseTo = this.currentBet + this.minRaiseIncrement;
    const maxRaiseTo = player.bet + player.chips;
    const canRaiseFull = player.chips > toCall && maxRaiseTo >= minRaiseTo;
    const canBet = this.currentBet === 0 && player.chips > 0;
    const canAllIn = player.chips > 0;

    return {
      canFold: true,
      canCheck,
      canCall,
      callAmount,
      canBet: canBet && !canCall,
      // Note: > 0, not toCall > 0 — a player whose bet already matches currentBet (e.g. the big
      // blind checking their option) can still raise; they just aren't "calling" anything first.
      canRaise: canRaiseFull && this.currentBet > 0,
      minRaiseTo: Math.min(minRaiseTo, maxRaiseTo),
      maxRaiseTo,
      canAllIn,
    };
  }

  // ---------- Actions ----------

  applyAction(playerId: string, action: PlayerAction, amount?: number): { ok: boolean; error?: string } {
    const player = this.players.get(playerId);
    if (!player) return { ok: false, error: 'Player not found' };
    if (this.phase !== 'hand_in_progress') return { ok: false, error: 'No hand in progress' };
    if (this.currentTurnPlayerId !== playerId) return { ok: false, error: 'Not your turn' };
    if (player.status !== 'active') return { ok: false, error: 'You are not active in this hand' };

    const legal = this.getLegalActions(playerId);
    if (!legal) return { ok: false, error: 'No legal actions available' };

    switch (action) {
      case 'fold': {
        this.foldOut(player);
        break;
      }
      case 'check': {
        if (!legal.canCheck) return { ok: false, error: 'You cannot check' };
        player.hasActedThisRound = true;
        break;
      }
      case 'call': {
        if (!legal.canCall) return { ok: false, error: 'You cannot call' };
        this.commit(player, legal.callAmount);
        player.hasActedThisRound = true;
        break;
      }
      case 'bet': {
        if (!legal.canBet || amount === undefined) return { ok: false, error: 'You cannot bet' };
        if (amount < this.settings.bigBlind && amount < player.bet + player.chips) {
          return { ok: false, error: `Bet must be at least ${this.settings.bigBlind}` };
        }
        this.raiseTo(player, amount, true);
        break;
      }
      case 'raise': {
        if (amount === undefined) return { ok: false, error: 'Raise amount required' };
        const isAllIn = amount >= legal.maxRaiseTo;
        if (!legal.canRaise && !isAllIn) return { ok: false, error: 'You cannot raise' };
        if (amount < legal.minRaiseTo && !isAllIn) {
          return { ok: false, error: `Raise must be at least ${legal.minRaiseTo}` };
        }
        this.raiseTo(player, amount, amount - this.currentBet >= this.minRaiseIncrement);
        break;
      }
      case 'all_in': {
        if (!legal.canAllIn) return { ok: false, error: 'You cannot go all-in' };
        const allInTo = player.bet + player.chips;
        if (allInTo > this.currentBet) {
          this.raiseTo(player, allInTo, allInTo - this.currentBet >= this.minRaiseIncrement);
        } else {
          this.commit(player, player.chips);
          player.hasActedThisRound = true;
        }
        break;
      }
      default:
        return { ok: false, error: 'Unknown action' };
    }

    if (player.status === 'active' && action !== 'fold') {
      player.lastAction = action;
    } else if (action === 'fold') {
      player.lastAction = 'fold';
    }

    this.maybeAdvanceAfterAction();
    return { ok: true };
  }

  forceTimeoutAction(playerId: string): void {
    const legal = this.getLegalActions(playerId);
    if (!legal) return;
    if (legal.canCheck) {
      this.applyAction(playerId, 'check');
    } else {
      this.applyAction(playerId, 'fold');
    }
  }

  private commit(player: EnginePlayer, amount: number): void {
    const pay = Math.min(amount, player.chips);
    player.chips -= pay;
    player.bet += pay;
    player.totalCommitted += pay;
    if (player.chips === 0) player.status = 'all_in';
    this.actionLog.push({
      playerId: player.id,
      name: player.name,
      action: pay === player.chips + pay && player.status === 'all_in' ? 'all_in' : 'call',
      amount: pay,
      street: this.street,
    });
  }

  private raiseTo(player: EnginePlayer, totalBetTo: number, isFullRaise: boolean): void {
    const target = Math.min(totalBetTo, player.bet + player.chips);
    const additional = target - player.bet;
    player.chips -= additional;
    player.bet = target;
    player.totalCommitted += additional;
    if (player.chips === 0) player.status = 'all_in';

    const raiseSize = target - this.currentBet;
    this.currentBet = target;
    if (isFullRaise && raiseSize > 0) {
      this.minRaiseIncrement = raiseSize;
    }
    this.lastAggressorId = player.id;

    // A full raise reopens the action for everyone else still in the hand.
    if (isFullRaise) {
      for (const p of this.players.values()) {
        if (p.id !== player.id && p.isInHand && p.status === 'active') p.hasActedThisRound = false;
      }
    }
    player.hasActedThisRound = true;

    this.actionLog.push({
      playerId: player.id,
      name: player.name,
      action: player.status === 'all_in' ? 'all_in' : this.currentBet === target && additional > 0 ? 'raise' : 'bet',
      amount: target,
      street: this.street,
    });
  }

  private foldOut(player: EnginePlayer): void {
    player.status = 'folded';
    player.isInHand = false;
    player.lastAction = 'fold';
    this.actionLog.push({ playerId: player.id, name: player.name, action: 'fold', amount: 0, street: this.street });
  }

  // ---------- Round / street progression ----------

  private playersStillInHand(): EnginePlayer[] {
    return [...this.players.values()].filter((p) => p.isInHand);
  }

  private playersWhoCanAct(): EnginePlayer[] {
    return this.playersStillInHand().filter((p) => p.status === 'active');
  }

  private bettingRoundComplete(): boolean {
    const actors = this.playersWhoCanAct();
    if (actors.length === 0) return true;
    return actors.every((p) => p.hasActedThisRound && p.bet === this.currentBet);
  }

  /** Called after a player's action has been applied. Advances the turn, or the street, or ends the hand. */
  private maybeAdvanceAfterAction(): void {
    const inHand = this.playersStillInHand();
    if (inHand.length <= 1) {
      this.awardUncontested(inHand[0] ?? null);
      return;
    }

    if (!this.bettingRoundComplete()) {
      // Find the next player (after whoever just acted) who still needs to act.
      const anchorSeat = this.players.get(this.currentTurnPlayerId ?? '')?.seatIndex ?? this.dealerSeat;
      const nextSeat = this.nextOccupiedSeat(
        anchorSeat,
        (p) => p.isInHand && p.status === 'active' && !(p.hasActedThisRound && p.bet === this.currentBet)
      );
      this.setCurrentTurn(nextSeat !== null ? this.playerAtSeat(nextSeat)!.id : null);
      return;
    }

    this.advanceStreetOrShowdown();
  }

  /** The current betting round is complete: move to the next street, or to showdown. */
  private advanceStreetOrShowdown(): void {
    const canStillAct = this.playersWhoCanAct();

    if (canStillAct.length <= 1) {
      // No more betting possible: run the board out completely, then showdown.
      this.setCurrentTurn(null);
      while (this.street !== 'river') {
        this.dealNextStreetCards();
      }
      this.settleShowdown();
      return;
    }

    if (this.street === 'river') {
      this.settleShowdown();
    } else {
      this.dealNextStreetCards();
      this.startBettingRound();
    }
  }

  /**
   * Called right when a hand or a betting round begins, before anyone has had a chance to act.
   * Handles the edge case where blinds/antes already left ≤1 player able to act voluntarily.
   * Leaves currentTurnPlayerId untouched when there IS a valid actor to move on.
   */
  private resolveIfNoActionsPossible(): void {
    const inHand = this.playersStillInHand();
    if (inHand.length <= 1) {
      this.awardUncontested(inHand[0] ?? null);
      return;
    }
    const canStillAct = this.playersWhoCanAct();
    if (canStillAct.length <= 1) {
      this.advanceStreetOrShowdown();
    }
  }

  private dealNextStreetCards(): void {
    if (!this.deck) return;
    if (this.street === 'preflop') {
      this.communityCards.push(...this.deck.draw(3));
      this.street = 'flop';
    } else if (this.street === 'flop') {
      this.communityCards.push(...this.deck.draw(1));
      this.street = 'turn';
    } else if (this.street === 'turn') {
      this.communityCards.push(...this.deck.draw(1));
      this.street = 'river';
    }
  }

  private startBettingRound(): void {
    this.currentBet = 0;
    this.minRaiseIncrement = this.settings.bigBlind;
    for (const p of this.players.values()) {
      p.bet = 0;
      p.hasActedThisRound = false;
    }
    const firstSeat = this.nextOccupiedSeat(this.dealerSeat, (p) => p.isInHand && p.status === 'active');
    this.setCurrentTurn(firstSeat !== null ? this.playerAtSeat(firstSeat)!.id : null);
    this.resolveIfNoActionsPossible();
  }

  // ---------- Pots & showdown ----------

  private computeSidePots(): InternalPot[] {
    const contributors = [...this.players.values()].filter((p) => p.totalCommitted > 0);
    const levels = [...new Set(contributors.map((p) => p.totalCommitted))].sort((a, b) => a - b);
    const pots: InternalPot[] = [];
    let prevLevel = 0;
    for (const level of levels) {
      const atOrAbove = contributors.filter((p) => p.totalCommitted >= level);
      const amount = (level - prevLevel) * atOrAbove.length;
      const eligible = atOrAbove.filter((p) => p.status !== 'folded').map((p) => p.id);
      if (amount > 0 && eligible.length > 0) {
        pots.push({ amount, eligiblePlayerIds: eligible });
      }
      prevLevel = level;
    }
    return pots;
  }

  private awardUncontested(winner: EnginePlayer | null): void {
    this.setCurrentTurn(null);
    const pots = this.computeSidePots();
    const totalPot = pots.reduce((s, p) => s + p.amount, 0);
    // All committed chips have now been swept into the pot(s); clear the "in front of player" bet markers.
    for (const p of this.players.values()) p.bet = 0;

    if (winner) {
      // Heuristic "bluff" detection: won without showdown, holding a weak hand, after aggression.
      if (this.communityCards.length >= 3) {
        const hand = evaluateHand([...winner.holeCards, ...this.communityCards]);
        if (hand.rankValue <= 1 && this.lastAggressorId === winner.id && totalPot >= this.settings.bigBlind * 6) {
          winner.stats.bluffsWon += 1;
        }
      }
      winner.chips += totalPot;
      winner.stats.handsWon += 1;
      winner.stats.currentWinStreak += 1;
      winner.stats.longestWinStreak = Math.max(winner.stats.longestWinStreak, winner.stats.currentWinStreak);
      // Net profit, not the gross pot — the pot includes the winner's own contribution coming back to them.
      winner.stats.totalChipsWon += totalPot - winner.totalCommitted;
      winner.stats.biggestPot = Math.max(winner.stats.biggestPot, totalPot);
    }
    for (const p of this.players.values()) {
      if (p.id !== winner?.id) {
        p.stats.currentWinStreak = 0;
        if (p.totalCommitted > 0) p.stats.totalChipsLost += p.totalCommitted;
      }
    }

    // The hand ended by fold before the board ran out — deal the rest anyway, purely so the table
    // can see what would have come. These cards never affect the pot or anyone's stats above.
    if (this.communityCards.length < 5 && this.deck) {
      this.revealedRunoutFrom = this.communityCards.length;
      while (this.street !== 'river') {
        this.dealNextStreetCards();
      }
    }

    this.lastWinners = winner
      ? [{ playerId: winner.id, name: winner.name, amount: totalPot, handName: null, potIndex: 0 }]
      : [];
    this.lastShowdown = null;
    this.pots = pots;
    this.finishHand();
  }

  private settleShowdown(): void {
    this.setCurrentTurn(null);
    this.street = 'showdown';
    const pots = this.computeSidePots();
    for (const p of this.players.values()) p.bet = 0;
    const contenders = this.playersStillInHand();

    const handByPlayer = new Map<string, ReturnType<typeof evaluateHand>>();
    for (const p of contenders) {
      handByPlayer.set(p.id, evaluateHand([...p.holeCards, ...this.communityCards]));
    }

    const winnings = new Map<string, number>();
    const winnerAnnouncements: WinnerAnnouncement[] = [];

    pots.forEach((pot, potIndex) => {
      const eligible = pot.eligiblePlayerIds.filter((id) => handByPlayer.has(id));
      if (eligible.length === 0) return;
      let best = handByPlayer.get(eligible[0])!;
      let winners = [eligible[0]];
      for (let i = 1; i < eligible.length; i++) {
        const h = handByPlayer.get(eligible[i])!;
        const cmp = compareHands(h, best);
        if (cmp > 0) {
          best = h;
          winners = [eligible[i]];
        } else if (cmp === 0) {
          winners.push(eligible[i]);
        }
      }
      const share = Math.floor(pot.amount / winners.length);
      let remainder = pot.amount - share * winners.length;
      // Odd chips go to winners closest to the left of the dealer button, in seat order.
      const sortedBySeat = [...winners].sort((a, b) => {
        const seatA = ((this.players.get(a)!.seatIndex - this.dealerSeat - 1) % this.settings.maxPlayers + this.settings.maxPlayers) % this.settings.maxPlayers;
        const seatB = ((this.players.get(b)!.seatIndex - this.dealerSeat - 1) % this.settings.maxPlayers + this.settings.maxPlayers) % this.settings.maxPlayers;
        return seatA - seatB;
      });
      for (const id of winners) {
        winnings.set(id, (winnings.get(id) ?? 0) + share);
      }
      for (let i = 0; i < remainder; i++) {
        const id = sortedBySeat[i % sortedBySeat.length];
        winnings.set(id, (winnings.get(id) ?? 0) + 1);
      }
      for (const id of winners) {
        winnerAnnouncements.push({
          playerId: id,
          name: this.players.get(id)!.name,
          amount: winnings.get(id) ?? 0,
          handName: best.rankName,
          potIndex,
        });
      }
    });

    const showdown: ShowdownEntry[] = contenders.map((p) => {
      const won = winnings.get(p.id) ?? 0;
      return {
        playerId: p.id,
        holeCards: p.holeCards,
        hand: handByPlayer.get(p.id) ?? null,
        won,
        isWinner: won > 0,
      };
    });

    const totalPot = pots.reduce((s, p) => s + p.amount, 0);
    for (const p of this.players.values()) {
      const won = winnings.get(p.id) ?? 0;
      p.chips += won;
      // Net delta this hand — summing (won - totalCommitted) across every player is always exactly
      // zero, since every chip paid into a pot is paid back out to someone. Track wins/losses off
      // that delta, not the gross pot amount, so session "net chips" stays zero-sum.
      const delta = won - p.totalCommitted;
      if (delta > 0) p.stats.totalChipsWon += delta;
      else if (delta < 0) p.stats.totalChipsLost += -delta;

      if (won > 0) {
        p.stats.handsWon += 1;
        p.stats.currentWinStreak += 1;
        p.stats.longestWinStreak = Math.max(p.stats.longestWinStreak, p.stats.currentWinStreak);
        p.stats.biggestPot = Math.max(p.stats.biggestPot, won);
        const handName = handByPlayer.get(p.id)?.rankName ?? null;
        if (handName && rankOrder(handName) > rankOrder(p.stats.bestHand)) {
          p.stats.bestHand = handName;
        }
      } else {
        p.stats.currentWinStreak = 0;
      }
    }

    this.pots = pots;
    this.lastShowdown = showdown;
    this.lastWinners = winnerAnnouncements;
    this.finishHand();
  }

  private finishHand(): void {
    this.handHistory.unshift({
      handNumber: this.handNumber,
      timestamp: Date.now(),
      communityCards: [...this.communityCards],
      showdown: this.lastShowdown ?? [],
      winners: this.lastWinners ?? [],
      totalPot: this.pots.reduce((s, p) => s + p.amount, 0),
      actions: [...this.actionLog],
      revealedRunoutFrom: this.revealedRunoutFrom,
    });
    if (this.handHistory.length > HAND_HISTORY_LIMIT) this.handHistory.pop();

    for (const p of this.players.values()) {
      if (p.chips <= 0) {
        p.status = 'eliminated';
      }
    }

    this.phase = 'between_hands';

    const remaining = this.activeSeatedPlayers().filter((p) => p.chips > 0);
    if (remaining.length <= 1) {
      this.phase = 'game_over';
    }
  }

  // ---------- Snapshot ----------

  getSnapshot(viewerId?: string): GameStateSnapshot {
    const seats: Seat[] = [];
    for (let i = 0; i < this.settings.maxPlayers; i++) seats.push({ seatIndex: i, playerId: null });
    for (const p of this.players.values()) seats[p.seatIndex].playerId = p.id;

    const showRevealed = this.street === 'showdown';
    const players: PublicPlayer[] = [...this.players.values()].map((p) => {
      const revealToViewer = p.id === viewerId || (showRevealed && p.isInHand);
      return {
        id: p.id,
        name: p.name,
        avatarSeed: p.avatarSeed,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        totalCommitted: p.totalCommitted,
        status: p.status,
        isHost: p.isHost,
        hasCards: p.holeCards.length > 0 && p.isInHand,
        isConnected: p.isConnected,
        isReady: p.isReady,
        lastAction: p.lastAction,
        holeCards: revealToViewer ? p.holeCards : null,
        timeBankMs: p.timeBankMs,
        stats: p.stats,
      };
    });

    const pots: PotInfo[] = this.pots.length > 0 ? this.pots : this.liveEstimatedPots();

    return {
      roomCode: this.roomCode,
      phase: this.phase,
      street: this.street,
      players,
      seats,
      communityCards: this.communityCards,
      pots,
      totalPot: pots.reduce((s, p) => s + p.amount, 0),
      dealerSeat: this.dealerSeat,
      smallBlindSeat: this.sbSeat,
      bigBlindSeat: this.bbSeat,
      currentTurnPlayerId: this.currentTurnPlayerId,
      turnExpiresAt: this.turnExpiresAt,
      minRaiseTo: this.currentBet + this.minRaiseIncrement,
      currentBet: this.currentBet,
      lastAggressorId: this.lastAggressorId,
      handNumber: this.handNumber,
      settings: this.settings,
      hostId: this.hostId ?? '',
      showdown: this.lastShowdown,
      winnersAnnouncement: this.lastWinners,
      legalActionsForViewer: viewerId ? this.getLegalActions(viewerId) : null,
      handHistory: this.handHistory,
      revealedRunoutFrom: this.revealedRunoutFrom,
    };
  }

  private liveEstimatedPots(): PotInfo[] {
    if (this.phase !== 'hand_in_progress') return [];
    return this.computeSidePots();
  }
}

function rankOrder(name: import('../../../shared/types').HandRankName | null): number {
  const order = [
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
  if (!name) return -1;
  return order.indexOf(name as string);
}
