import { describe, it, expect } from 'vitest';
import { ProfileBook, TYPICAL } from './PlayerProfiles';
import { PokerEngine } from './PokerEngine';
import { decideBotAction } from './BotBrain';
import { Card, HandActionLog, HandHistoryEntry, RoomSettings } from '../../../shared/types';

let ts = 1;
function hand(actions: Omit<HandActionLog, 'name'>[]): HandHistoryEntry {
  return {
    handNumber: ts,
    timestamp: ts++,
    communityCards: [],
    showdown: [],
    winners: [],
    totalPot: 0,
    revealedRunoutFrom: null,
    actions: actions.map((a) => ({ ...a, name: a.playerId })),
  };
}

// Blinds are logged as preflop "bet"s; the hero then bets the flop into the villain.
function flopBetHand(villainResponse: 'fold' | 'call'): HandHistoryEntry {
  return hand([
    { playerId: 'hero', action: 'bet', amount: 5, street: 'preflop' },
    { playerId: 'villain', action: 'bet', amount: 10, street: 'preflop' },
    { playerId: 'hero', action: 'call', amount: 5, street: 'preflop' },
    { playerId: 'hero', action: 'raise', amount: 20, street: 'flop' },
    { playerId: 'villain', action: villainResponse, amount: villainResponse === 'call' ? 20 : 0, street: 'flop' },
  ]);
}

describe('ProfileBook', () => {
  it('starts from population averages for someone it has never seen', () => {
    const r = new ProfileBook().read('nobody');
    expect(r.confidence).toBe(0);
    expect(r.foldToBet).toBeCloseTo(TYPICAL.foldToBet);
  });

  it('learns who folds to bets and who never does', () => {
    const folder = new ProfileBook();
    const station = new ProfileBook();
    for (let i = 0; i < 20; i++) {
      folder.recordHand(flopBetHand('fold'));
      station.recordHand(flopBetHand('call'));
    }
    expect(folder.read('villain').confidence).toBe(1);
    expect(folder.read('villain').foldToBet).toBeGreaterThan(0.9);
    expect(station.read('villain').foldToBet).toBeLessThan(0.1);
  });

  it('does not count posted blinds as voluntary play', () => {
    const book = new ProfileBook();
    for (let i = 0; i < 20; i++) {
      // Villain only ever posts the big blind and folds to a raise.
      book.recordHand(
        hand([
          { playerId: 'hero', action: 'bet', amount: 5, street: 'preflop' },
          { playerId: 'villain', action: 'bet', amount: 10, street: 'preflop' },
          { playerId: 'hero', action: 'raise', amount: 30, street: 'preflop' },
          { playerId: 'villain', action: 'fold', amount: 0, street: 'preflop' },
        ])
      );
    }
    expect(book.read('villain').looseness).toBeLessThan(0.05);
    expect(book.read('hero').looseness).toBeGreaterThan(0.95);
  });
});

function settings(): RoomSettings {
  return {
    startingChips: 1000, smallBlind: 5, bigBlind: 10, blindIncreaseIntervalHands: 0, turnTimerSeconds: 30, maxPlayers: 9,
    isPrivate: true, autoStartWhenReady: false, rebuyEnabled: false, tableTheme: 'midnight', gameMode: 'professional',
  };
}

/** Heads-up: play passively to the flop until it's the bot's turn with nothing to call. */
function botFirstToActOnFlop(): { engine: PokerEngine; bot: ReturnType<PokerEngine['players']['get']> & object } {
  for (;;) {
    const engine = new PokerEngine('READS', settings());
    engine.addPlayer('bot', 'Bot', 'char:x', true, { level: 5 });
    engine.addPlayer('villain', 'Villain', 'char:y', false);
    engine.startHand();
    let guard = 0;
    while (engine.street === 'preflop' && engine.currentTurnPlayerId && guard++ < 10) {
      const legal = engine.getLegalActions(engine.currentTurnPlayerId)!;
      engine.applyAction(engine.currentTurnPlayerId, legal.canCheck ? 'check' : 'call');
    }
    if (engine.street === 'flop' && engine.currentTurnPlayerId === 'villain') engine.applyAction('villain', 'check');
    const bot = engine.players.get('bot')!;
    if (engine.street === 'flop' && engine.currentTurnPlayerId === 'bot' && engine.getLegalActions('bot')!.canCheck) {
      // Give the bot air on a scary board so any bet it makes is a bluff.
      const c = (rank: Card['rank'], suit: Card['suit']): Card => ({ rank, suit });
      bot.holeCards = [c('2', 'clubs'), c('7', 'diamonds')];
      engine.communityCards = [c('A', 'spades'), c('K', 'hearts'), c('Q', 'diamonds')];
      return { engine, bot };
    }
  }
}

describe('Bots that study you', () => {
  it('a Pro bluffs a known folder far more than a known calling station', () => {
    const folderNotes = new ProfileBook();
    const stationNotes = new ProfileBook();
    for (let i = 0; i < 20; i++) {
      folderNotes.recordHand(flopBetHand('fold'));
      stationNotes.recordHand(flopBetHand('call'));
    }
    const { engine, bot } = botFirstToActOnFlop();
    const isAggro = (a: string) => a === 'bet' || a === 'raise' || a === 'all_in';
    let vsFolder = 0;
    let vsStation = 0;
    const N = 150;
    for (let i = 0; i < N; i++) {
      if (isAggro(decideBotAction(engine, bot, folderNotes).action)) vsFolder++;
      if (isAggro(decideBotAction(engine, bot, stationNotes).action)) vsStation++;
    }
    expect(vsFolder / N).toBeGreaterThan(0.2);
    expect(vsStation / N).toBeLessThan(0.1);
    expect(vsFolder).toBeGreaterThan(vsStation * 3);
  });

  it('a Fish ignores its notes entirely', () => {
    const folderNotes = new ProfileBook();
    for (let i = 0; i < 20; i++) folderNotes.recordHand(flopBetHand('fold'));
    const { engine, bot } = botFirstToActOnFlop();
    bot.botLevel = 1;
    // Same decision function with and without notes → same bluff rate within noise.
    let withNotes = 0;
    let without = 0;
    const N = 600;
    const isAggro = (a: string) => a === 'bet' || a === 'raise' || a === 'all_in';
    for (let i = 0; i < N; i++) {
      if (isAggro(decideBotAction(engine, bot, folderNotes).action)) withNotes++;
      if (isAggro(decideBotAction(engine, bot).action)) without++;
    }
    expect(Math.abs(withNotes - without) / N).toBeLessThan(0.08);
  });

  it('bots that take notes every hand still only make legal moves and conserve chips', () => {
    const engine = new PokerEngine('NOTES', settings());
    [5, 4, 3, 1].forEach((lvl, i) => engine.addPlayer(`b${i}`, `B${i}`, `char:z${i}`, i === 0, { level: lvl }));
    const notes = new ProfileBook();
    const total = [...engine.players.values()].reduce((s, p) => s + p.chips, 0);
    let illegal = 0;
    for (let h = 0; h < 40 && engine.canStartHand(); h++) {
      engine.startHand();
      let guard = 0;
      while (engine.phase === 'hand_in_progress' && engine.currentTurnPlayerId && guard++ < 400) {
        const bot = engine.players.get(engine.currentTurnPlayerId)!;
        const d = decideBotAction(engine, bot, notes);
        if (!engine.applyAction(bot.id, d.action, d.amount).ok) {
          illegal++;
          engine.forceTimeoutAction(bot.id);
        }
      }
      notes.recordHand(engine.handHistory[0]);
      expect([...engine.players.values()].reduce((s, p) => s + p.chips, 0)).toBe(total);
      if (engine.phase === 'game_over') break;
    }
    expect(illegal).toBe(0);
    const r = notes.read('b3');
    for (const v of [r.looseness, r.aggression, r.foldToBet, r.bluffRate]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});
