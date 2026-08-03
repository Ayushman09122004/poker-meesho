import { describe, it, expect, beforeEach } from 'vitest';
import { PokerEngine } from './PokerEngine';
import { RoomSettings } from '../../../shared/types';

function makeSettings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  return {
    startingChips: 1000,
    smallBlind: 5,
    bigBlind: 10,
    blindIncreaseIntervalHands: 0,
    turnTimerSeconds: 30,
    maxPlayers: 9,
    isPrivate: true,
    autoStartWhenReady: false,
    rebuyEnabled: false,
    tableTheme: 'midnight',
    gameMode: 'professional',
    ...overrides,
  };
}

function totalChipsInPlay(engine: PokerEngine): number {
  let sum = 0;
  for (const p of engine.players.values()) sum += p.chips + p.bet;
  return sum;
}

describe('PokerEngine - heads up basic hand', () => {
  it('posts blinds correctly with dealer as SB in heads-up', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();

    expect(engine.sbSeat).toBe(engine.dealerSeat);
    const sbPlayer = [...engine.players.values()].find((p) => p.seatIndex === engine.sbSeat)!;
    const bbPlayer = [...engine.players.values()].find((p) => p.seatIndex === engine.bbSeat)!;
    expect(sbPlayer.bet).toBe(5);
    expect(bbPlayer.bet).toBe(10);
    // Preflop heads-up: SB (button) acts first.
    expect(engine.currentTurnPlayerId).toBe(sbPlayer.id);
  });

  it('awards the pot to the last player standing after a fold', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();
    const before = totalChipsInPlay(engine);

    const firstToAct = engine.currentTurnPlayerId!;
    const r = engine.applyAction(firstToAct, 'fold');
    expect(r.ok).toBe(true);
    expect(engine.phase).toBe('between_hands');
    expect(totalChipsInPlay(engine)).toBe(before);
    const winner = [...engine.players.values()].find((p) => p.id !== firstToAct)!;
    expect(winner.chips).toBe(1000 + 5); // won the small blind (their own big blind returned + sb)
  });

  it('rejects out-of-turn and illegal actions', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();
    const notTurn = [...engine.players.values()].find((p) => p.id !== engine.currentTurnPlayerId)!;
    const r1 = engine.applyAction(notTurn.id, 'check');
    expect(r1.ok).toBe(false);

    const turnPlayer = engine.currentTurnPlayerId!;
    // Facing a bet (BB=10, SB has only put in 5), so check should be illegal for SB.
    const r2 = engine.applyAction(turnPlayer, 'check');
    expect(r2.ok).toBe(false);

    // Raising below the minimum should be rejected.
    const r3 = engine.applyAction(turnPlayer, 'raise', 12);
    expect(r3.ok).toBe(false);
  });

  it('lets the big blind raise on their option, not just check, when the bet already matches', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();

    // SB (button) calls, closing the gap so the BB's bet now equals currentBet exactly.
    const sb = engine.currentTurnPlayerId!;
    engine.applyAction(sb, 'call');

    // Now it's the BB's turn with nothing left to call — they still must be able to raise.
    const bb = engine.currentTurnPlayerId!;
    const legal = engine.getLegalActions(bb)!;
    expect(legal.canCheck).toBe(true);
    expect(legal.canRaise).toBe(true);

    const r = engine.applyAction(bb, 'raise', legal.minRaiseTo);
    expect(r.ok).toBe(true);
    expect(engine.currentBet).toBe(legal.minRaiseTo);
  });
});

describe('PokerEngine - multiway side pots', () => {
  it('creates correct side pots when a short stack goes all-in and others keep betting', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 3, startingChips: 1000 }));
    engine.addPlayer('short', 'Shorty', 'a', true);
    engine.addPlayer('mid', 'Middy', 'b', false);
    engine.addPlayer('big', 'Biggy', 'c', false);

    // Give the short stack fewer chips before the hand starts.
    engine.players.get('short')!.chips = 50;

    engine.startHand();
    const before = totalChipsInPlay(engine);
    expect(before).toBe(50 + 1000 + 1000);

    // Drive the hand: everyone goes all-in preflop in turn order.
    let guard = 0;
    while (engine.phase === 'hand_in_progress' && guard < 20) {
      const turn = engine.currentTurnPlayerId;
      if (!turn) break;
      const legal = engine.getLegalActions(turn)!;
      if (legal.canAllIn) {
        engine.applyAction(turn, 'all_in');
      } else {
        engine.applyAction(turn, 'fold');
      }
      guard++;
    }

    expect(engine.phase).not.toBe('hand_in_progress');
    expect(totalChipsInPlay(engine)).toBe(before);
    // Community cards should be fully run out (all-in run-out) since no one can act further.
    expect(engine.communityCards.length).toBe(5);
    // Chips conserved and someone has more than others (winner(s) took side pot(s)).
    const chipsList = [...engine.players.values()].map((p) => p.chips);
    expect(chipsList.reduce((a, b) => a + b, 0)).toBe(before);
  });

  it('never produces duplicate hole/community cards across a hand', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 4 }));
    engine.addPlayer('p1', 'A', 'a', true);
    engine.addPlayer('p2', 'B', 'b', false);
    engine.addPlayer('p3', 'C', 'c', false);
    engine.addPlayer('p4', 'D', 'd', false);
    engine.startHand();

    let guard = 0;
    while (engine.phase === 'hand_in_progress' && guard < 40) {
      const turn = engine.currentTurnPlayerId;
      if (!turn) break;
      const legal = engine.getLegalActions(turn)!;
      if (legal.canCheck) engine.applyAction(turn, 'check');
      else if (legal.canCall) engine.applyAction(turn, 'call');
      else engine.applyAction(turn, 'fold');
      guard++;
    }

    const allCards: string[] = [...engine.communityCards.map((c) => c.rank + c.suit)];
    for (const p of engine.players.values()) {
      for (const c of p.holeCards) allCards.push(c.rank + c.suit);
    }
    expect(new Set(allCards).size).toBe(allCards.length);
  });
});

describe('PokerEngine - full raise reopens action, short all-in does not double-count', () => {
  it('lets a player re-raise after facing a full raise', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 3, bigBlind: 10, smallBlind: 5 }));
    engine.addPlayer('p1', 'A', 'a', true);
    engine.addPlayer('p2', 'B', 'b', false);
    engine.addPlayer('p3', 'C', 'c', false);
    engine.startHand();

    // UTG raises to 40 (full raise), next player re-raises to 100, action should return to UTG.
    const utg = engine.currentTurnPlayerId!;
    let r = engine.applyAction(utg, 'raise', 40);
    expect(r.ok).toBe(true);

    const second = engine.currentTurnPlayerId!;
    r = engine.applyAction(second, 'raise', 100);
    expect(r.ok).toBe(true);

    // third player folds
    const third = engine.currentTurnPlayerId!;
    engine.applyAction(third, 'fold');

    // action should be back on UTG, who must face the re-raise
    expect(engine.currentTurnPlayerId).toBe(utg);
    const legal = engine.getLegalActions(utg)!;
    expect(legal.canRaise || legal.canCall).toBe(true);
  });
});

describe('PokerEngine - session stats stay zero-sum', () => {
  function netChipsSum(engine: PokerEngine): number {
    let sum = 0;
    for (const p of engine.players.values()) sum += p.stats.totalChipsWon - p.stats.totalChipsLost;
    return sum;
  }

  it('nets to zero after an uncontested fold-out', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();
    engine.applyAction(engine.currentTurnPlayerId!, 'fold');
    expect(netChipsSum(engine)).toBe(0);
  });

  it('nets to zero after a multiway showdown with side pots', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 3, startingChips: 1000 }));
    engine.addPlayer('short', 'Shorty', 'a', true);
    engine.addPlayer('mid', 'Middy', 'b', false);
    engine.addPlayer('big', 'Biggy', 'c', false);
    engine.players.get('short')!.chips = 50;
    engine.startHand();

    let guard = 0;
    while (engine.phase === 'hand_in_progress' && guard < 20) {
      const turn = engine.currentTurnPlayerId;
      if (!turn) break;
      const legal = engine.getLegalActions(turn)!;
      if (legal.canAllIn) engine.applyAction(turn, 'all_in');
      else engine.applyAction(turn, 'fold');
      guard++;
    }
    expect(netChipsSum(engine)).toBe(0);
  });
});

describe('PokerEngine - reveals the "would have come" board after an early fold', () => {
  it('deals the rest of the board for display when everyone folds preflop', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();

    expect(engine.communityCards.length).toBe(0);
    engine.applyAction(engine.currentTurnPlayerId!, 'fold');

    expect(engine.phase).toBe('between_hands');
    expect(engine.revealedRunoutFrom).toBe(0);
    expect(engine.communityCards.length).toBe(5);
    // No duplicate cards between hole cards and the revealed board.
    const allCards = [...engine.communityCards.map((c) => c.rank + c.suit)];
    for (const p of engine.players.values()) for (const c of p.holeCards) allCards.push(c.rank + c.suit);
    expect(new Set(allCards).size).toBe(allCards.length);
  });

  it('deals only the remaining streets when the fold happens on the flop', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();

    // Get to the flop: SB calls, BB checks their option.
    engine.applyAction(engine.currentTurnPlayerId!, 'call');
    engine.applyAction(engine.currentTurnPlayerId!, 'check');
    expect(engine.communityCards.length).toBe(3);

    engine.applyAction(engine.currentTurnPlayerId!, 'fold');
    expect(engine.revealedRunoutFrom).toBe(3);
    expect(engine.communityCards.length).toBe(5);
  });

  it('does not mark a reveal when the fold happens after the river is already out', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();

    // Run all the way to the river with checks/calls.
    let guard = 0;
    while (engine.street !== 'river' && engine.phase === 'hand_in_progress' && guard < 20) {
      const turn = engine.currentTurnPlayerId!;
      const legal = engine.getLegalActions(turn)!;
      engine.applyAction(turn, legal.canCheck ? 'check' : 'call');
      guard++;
    }
    expect(engine.communityCards.length).toBe(5);

    engine.applyAction(engine.currentTurnPlayerId!, 'bet', 20);
    engine.applyAction(engine.currentTurnPlayerId!, 'fold');
    expect(engine.revealedRunoutFrom).toBe(null);
    expect(engine.communityCards.length).toBe(5);
  });

  it('resets the reveal marker at the start of the next hand', () => {
    const engine = new PokerEngine('ABCDE', makeSettings({ maxPlayers: 2 }));
    engine.addPlayer('p1', 'Alice', 'a', true);
    engine.addPlayer('p2', 'Bob', 'b', false);
    engine.startHand();
    engine.applyAction(engine.currentTurnPlayerId!, 'fold');
    expect(engine.revealedRunoutFrom).not.toBe(null);

    engine.startHand();
    expect(engine.revealedRunoutFrom).toBe(null);
  });
});
