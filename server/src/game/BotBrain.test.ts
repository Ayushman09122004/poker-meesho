import { describe, it, expect } from 'vitest';
import { PokerEngine } from './PokerEngine';
import { decideBotAction } from './BotBrain';
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

const totalChips = (e: PokerEngine) => [...e.players.values()].reduce((s, p) => s + p.chips, 0);

/** Plays bots against each other through the real engine until the game ends or `hands` run out. */
function playBotGame(levels: number[], hands: number) {
  const engine = new PokerEngine('BOTS1', makeSettings());
  levels.forEach((lvl, i) => engine.addPlayer(`b${i}`, `Bot${i}`, `char:x${i}`, i === 0, { level: lvl }));
  const startTotal = totalChips(engine);
  let decisions = 0;
  let illegal = 0;
  let slowest = 0;
  let played = 0;

  for (let h = 0; h < hands; h++) {
    if (!engine.canStartHand()) break;
    expect(engine.startHand().ok).toBe(true);
    played++;
    let guard = 0;
    while (engine.phase === 'hand_in_progress' && engine.currentTurnPlayerId) {
      if (++guard > 400) throw new Error('hand never finished');
      const bot = engine.players.get(engine.currentTurnPlayerId)!;
      const t0 = performance.now();
      const d = decideBotAction(engine, bot);
      slowest = Math.max(slowest, performance.now() - t0);
      decisions++;
      const res = engine.applyAction(bot.id, d.action, d.amount);
      if (!res.ok) {
        illegal++;
        engine.forceTimeoutAction(bot.id);
      }
    }
    // Chips are only ever moved between players, never created or lost.
    expect(totalChips(engine)).toBe(startTotal);
    if (engine.phase === 'game_over') break;
  }
  return { engine, decisions, illegal, slowest, played };
}

describe('BotBrain', () => {
  it('only ever makes legal moves and conserves chips across many hands, at every level', () => {
    const { decisions, illegal, played } = playBotGame([1, 2, 3, 4, 5, 3], 60);
    expect(played).toBeGreaterThan(5);
    expect(decisions).toBeGreaterThan(50);
    expect(illegal).toBe(0);
  });

  it('decides quickly enough to feel instant even at a full table on the hardest level', () => {
    const { slowest } = playBotGame([5, 5, 5, 5, 5, 5, 5, 5, 5], 15);
    expect(slowest).toBeLessThan(400);
  });

  it('a Pro beats a Fish heads-up over a long session', () => {
    let proWins = 0;
    for (let g = 0; g < 6; g++) {
      const { engine } = playBotGame([5, 1], 300);
      const pro = engine.players.get('b0')!;
      const fish = engine.players.get('b1')!;
      if (pro.chips > fish.chips) proWins++;
    }
    expect(proWins).toBeGreaterThanOrEqual(4);
  });
});
