import { describe, it, expect } from 'vitest';
import { PokerEngine } from './PokerEngine';
import { RoomSettings } from '../../../shared/types';
import { sanitizeSettings } from './settings';

function settings(overrides: Partial<RoomSettings> = {}): RoomSettings {
  return sanitizeSettings({
    startingChips: 1000, smallBlind: 5, bigBlind: 10, turnTimerSeconds: 30, maxPlayers: 9, autoStartWhenReady: false,
    rebuyEnabled: false, gameMode: 'professional', ...overrides,
  });
}

/** Everyone just calls/checks to the end of the hand. */
function playPassively(e: PokerEngine) {
  let guard = 0;
  while (e.phase === 'hand_in_progress' && e.currentTurnPlayerId && guard++ < 200) {
    const l = e.getLegalActions(e.currentTurnPlayerId)!;
    e.applyAction(e.currentTurnPlayerId, l.canCheck ? 'check' : 'call');
  }
}

/** Plays hands where everyone shoves until somebody is knocked out. */
function shoveUntilKnockout(e: PokerEngine) {
  for (let h = 0; h < 60 && e.canStartHand(); h++) {
    const before = [...e.players.values()].filter((p) => p.chips > 0).length;
    e.startHand();
    let guard = 0;
    while (e.phase === 'hand_in_progress' && e.currentTurnPlayerId && guard++ < 200) {
      const l = e.getLegalActions(e.currentTurnPlayerId)!;
      e.applyAction(e.currentTurnPlayerId, l.canAllIn ? 'all_in' : l.canCall ? 'call' : 'check');
    }
    if ([...e.players.values()].filter((p) => p.chips > 0).length < before) return;
  }
  throw new Error('nobody was knocked out');
}

describe('Sit out', () => {
  it('a player sitting out keeps their seat and chips but is not dealt in, then comes back', () => {
    const e = new PokerEngine('SIT01', settings());
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.addPlayer('c', 'C', 'z', false);
    e.setSittingOut('c', true);
    expect(e.startHand().ok).toBe(true);
    const c = e.players.get('c')!;
    expect(c.isInHand).toBe(false);
    expect(c.holeCards.length).toBe(0);
    expect(c.status).toBe('sitting_out');
    expect(c.chips).toBe(1000);
    playPassively(e);

    e.setSittingOut('c', false);
    expect(e.startHand().ok).toBe(true);
    expect(e.players.get('c')!.isInHand).toBe(true);
    expect(e.players.get('c')!.holeCards.length).toBe(2);
  });

  it('no hand starts if sitting out leaves fewer than two players', () => {
    const e = new PokerEngine('SIT02', settings());
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.setSittingOut('b', true);
    expect(e.canStartHand()).toBe(false);
    e.setSittingOut('b', false);
    expect(e.canStartHand()).toBe(true);
  });

  it('bots cannot be made to sit out', () => {
    const e = new PokerEngine('SIT03', settings());
    e.addPlayer('bot', 'Bot', 'x', false, { level: 3 });
    e.setSittingOut('bot', true);
    expect(e.players.get('bot')!.sittingOut).toBe(false);
  });
});

describe('Tournament mode', () => {
  it('turns rebuys off', () => {
    expect(settings({ tournament: true, rebuyEnabled: true }).rebuyEnabled).toBe(false);
    expect(settings({ tournament: false, rebuyEnabled: true }).rebuyEnabled).toBe(true);
  });

  it('raises the blinds when a level runs out, and restart restores the original blinds', () => {
    const e = new PokerEngine('TRN01', settings({ tournament: true, blindLevelMinutes: 5 }));
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.startHand();
    expect(e.blindLevel).toBe(1);
    expect(e.settings.bigBlind).toBe(10);
    playPassively(e);
    // Pretend the level started six minutes ago.
    e.levelStartedAt = Date.now() - 6 * 60_000;
    e.startHand();
    expect(e.blindLevel).toBe(2);
    expect(e.settings.bigBlind).toBeGreaterThan(10);
    expect(e.getSnapshot('a').tournament?.level).toBe(2);
    playPassively(e);
    e.resetGame();
    expect(e.settings.bigBlind).toBe(10);
    expect(e.settings.smallBlind).toBe(5);
    expect(e.blindLevel).toBe(1);
  });

  it('records the knock-out order for the podium', () => {
    const e = new PokerEngine('TRN02', settings({ tournament: true }));
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.addPlayer('c', 'C', 'z', false);
    shoveUntilKnockout(e);
    const out = e.getSnapshot('a').tournament!.eliminations;
    expect(out.length).toBeGreaterThan(0);
    for (const id of out) expect(e.players.get(id)!.chips).toBe(0);
  });

  it('a normal (non-tournament) game reports no tournament info', () => {
    const e = new PokerEngine('TRN03', settings());
    e.addPlayer('a', 'A', 'x', true);
    expect(e.getSnapshot('a').tournament).toBeNull();
  });
});

describe('Bounty mode', () => {
  it('the winner of the hand that knocks someone out collects a bounty', () => {
    const e = new PokerEngine('BTY01', settings({ bounty: true }));
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.addPlayer('c', 'C', 'z', false);
    shoveUntilKnockout(e);
    const snap = e.getSnapshot('a');
    expect(snap.lastBounties.length).toBeGreaterThan(0);
    for (const b of snap.lastBounties) {
      expect(e.players.get(b.victimId)!.chips).toBe(0);
      expect(e.players.get(b.hunterId)!.chips).toBeGreaterThan(0);
      expect(snap.players.find((p) => p.id === b.hunterId)!.bounties).toBeGreaterThan(0);
    }
  });

  it('no bounties are awarded when bounty mode is off', () => {
    const e = new PokerEngine('BTY02', settings({ bounty: false }));
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    shoveUntilKnockout(e);
    expect(e.getSnapshot('a').lastBounties).toEqual([]);
    expect(e.getSnapshot('a').players.every((p) => p.bounties === 0)).toBe(true);
  });
});

describe('Table themes', () => {
  it('accepts every pop-culture theme and falls back to midnight for unknown ones', () => {
    for (const t of ['hogwarts', 'galaxy', 'upsidedown', 'arkham', 'leaf', 'vicecity', 'frost', 'swamp', 'springfield', 'heisenberg', 'matrix'] as const) {
      expect(settings({ tableTheme: t }).tableTheme).toBe(t);
    }
    expect(settings({ tableTheme: 'nope' as never }).tableTheme).toBe('midnight');
  });
});

describe('Run it twice', () => {
  function headsUp(runItTwice: boolean, players = 2) {
    const e = new PokerEngine('RIT01', settings({ runItTwice }));
    const ids = ['a', 'b', 'c'].slice(0, players);
    ids.forEach((id, i) => e.addPlayer(id, id.toUpperCase(), 'x' + i, i === 0));
    e.startHand();
    return e;
  }
  /** Everyone shoves (or calls a shove), then optionally waits until a street. */
  function allIn(e: PokerEngine) {
    let guard = 0;
    while (e.phase === 'hand_in_progress' && e.currentTurnPlayerId && guard++ < 50) {
      const l = e.getLegalActions(e.currentTurnPlayerId)!;
      e.applyAction(e.currentTurnPlayerId, l.canAllIn ? 'all_in' : l.canCall ? 'call' : 'check');
    }
  }
  const key = (c: { rank: string; suit: string }) => c.rank + c.suit;

  it('a heads-up preflop all-in deals two complete, different boards and splits the pot', () => {
    for (let n = 0; n < 20; n++) {
      const e = headsUp(true);
      allIn(e);
      expect(e.secondBoard).toHaveLength(5);
      const used = [...e.communityCards, ...e.secondBoard!, ...[...e.players.values()].flatMap((p) => p.holeCards)].map(key);
      expect(new Set(used).size).toBe(used.length); // no card appears twice
      const total = [...e.players.values()].reduce((s, p) => s + p.chips, 0);
      expect(total).toBe(2000); // chips are conserved
      const runs = new Set((e.getSnapshot().winnersAnnouncement ?? []).map((w) => w.run));
      expect(runs.has(1) && runs.has(2)).toBe(true);
    }
  });

  it('an all-in on the flop shares the flop between both boards', () => {
    const e = headsUp(true);
    // Call/check to the flop, then shove.
    let guard = 0;
    while (e.street === 'preflop' && e.currentTurnPlayerId && guard++ < 10) {
      const l = e.getLegalActions(e.currentTurnPlayerId)!;
      e.applyAction(e.currentTurnPlayerId, l.canCheck ? 'check' : 'call');
    }
    const flop = e.communityCards.slice(0, 3).map(key);
    allIn(e);
    expect(e.secondBoard!.slice(0, 3).map(key)).toEqual(flop);
    expect(e.secondBoard!.slice(3).map(key)).not.toEqual(e.communityCards.slice(3).map(key));
  });

  it('is off unless the table turns it on, and never runs twice three-way', () => {
    const off = headsUp(false);
    allIn(off);
    expect(off.secondBoard).toBeNull();
    const threeWay = headsUp(true, 3);
    allIn(threeWay);
    expect(threeWay.secondBoard).toBeNull();
  });

  it('the next hand clears the second board', () => {
    const e = headsUp(true);
    allIn(e);
    if (e.canStartHand()) {
      e.startHand();
      expect(e.secondBoard).toBeNull();
    }
  });
});

describe('Show cards', () => {
  function threeHanded() {
    const e = new PokerEngine('SHOW1', settings());
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    e.addPlayer('c', 'C', 'z', false);
    e.startHand();
    return e;
  }

  it('a folded player can ask to show, but nothing is revealed until the hand is over', () => {
    const e = threeHanded();
    const folder = e.currentTurnPlayerId!;
    e.applyAction(folder, 'fold');
    expect(e.showCards(folder, 'both')).toBe(true);
    const other = [...e.players.keys()].find((id) => id !== folder)!;
    expect(e.getSnapshot(other).players.find((p) => p.id === folder)!.shownCards).toBeNull();
    expect(e.getSnapshot(folder).players.find((p) => p.id === folder)!.showRequested).toEqual([true, true]);
    playPassively(e);
    expect(e.phase).not.toBe('hand_in_progress');
    expect(e.getSnapshot(other).players.find((p) => p.id === folder)!.shownCards).toEqual(e.players.get(folder)!.holeCards);
  });

  it('the winner of an uncontested pot can show just one card', () => {
    const e = threeHanded();
    e.applyAction(e.currentTurnPlayerId!, 'fold');
    e.applyAction(e.currentTurnPlayerId!, 'fold');
    const winner = [...e.players.values()].find((p) => p.status !== 'folded')!;
    expect(e.showCards(winner.id, 1)).toBe(true);
    const loser = [...e.players.values()].find((p) => p.id !== winner.id)!;
    expect(e.getSnapshot(loser.id).players.find((p) => p.id === winner.id)!.shownCards).toEqual([null, winner.holeCards[1]]);
    expect(e.showCards(winner.id, 1)).toBe(false);
    e.startHand();
    expect(e.getSnapshot(loser.id).players.every((p) => p.shownCards === null)).toBe(true);
  });

  it('someone who was not dealt in has nothing to show', () => {
    const e = new PokerEngine('SHOW2', settings());
    e.addPlayer('a', 'A', 'x', true);
    e.addPlayer('b', 'B', 'y', false);
    expect(e.showCards('a', 'both')).toBe(false);
  });
});
