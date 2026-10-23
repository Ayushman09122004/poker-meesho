import { describe, it, expect } from 'vitest';
import type { Server } from 'socket.io';
import { Room } from './Room';
import { sanitizeSettings } from './settings';

function fakeIo() {
  const sent: { to: string; event: string; payload: any }[] = [];
  const io = { to: (to: string) => ({ emit: (event: string, payload: any) => sent.push({ to, event, payload }) }) };
  return { io: io as unknown as Server, sent };
}

/** A host-approval table: the host is seated, Alice has just joined and is waiting for a seat. */
function setup(overrides = {}) {
  const { io, sent } = fakeIo();
  const room = new Room('APPR1', sanitizeSettings({ hostApproval: true, startingChips: 1000, ...overrides }), io);
  room.engine.addPlayer('host', 'Host', 'char:batman', true);
  room.bindSocket('host', 'sock-host');
  room.engine.addPlayer('alice', 'Alice', 'char:joker', false, undefined, { awaitingSeat: true });
  room.bindSocket('alice', 'sock-alice');
  const lastState = () => sent.filter((s) => s.event === 'game:state' && s.to === 'sock-host').pop()!.payload;
  return { room, sent, lastState, engine: room.engine };
}

/** Plays one hand where everyone just checks/calls. */
function playHand(room: Room) {
  const e = room.engine;
  e.startHand();
  let guard = 0;
  while (e.phase === 'hand_in_progress' && e.currentTurnPlayerId && guard++ < 200) {
    const l = e.getLegalActions(e.currentTurnPlayerId)!;
    e.applyAction(e.currentTurnPlayerId, l.canCheck ? 'check' : 'call');
  }
}

describe('Host-approval buy-ins', () => {
  it('a new player is not dealt in until the host approves their buy-in', () => {
    const { room, engine, lastState } = setup();
    const alice = engine.players.get('alice')!;
    expect(alice.chips).toBe(0);
    expect(engine.canStartHand()).toBe(false); // only the host is seated

    expect(room.requestChips('alice', 'seat', 2000)).toBeNull();
    expect(lastState().chipRequests).toEqual([{ playerId: 'alice', kind: 'seat', amount: 2000 }]);
    expect(lastState().players.find((p: any) => p.id === 'alice').awaitingSeat).toBe(true);

    room.answerChipRequest('alice', true);
    expect(alice.awaitingSeat).toBe(false);
    expect(alice.chips).toBe(2000);
    expect(alice.buyInTotal).toBe(2000);
    expect(lastState().chipRequests).toEqual([]);
    expect(engine.canStartHand()).toBe(true);
    room.destroy();
  });

  it('a waiting player is never marked eliminated when a hand starts without them', () => {
    const { room, engine } = setup();
    engine.addPlayer('bob', 'Bob', 'char:shrek', false);
    engine.startHand();
    expect(engine.players.get('alice')!.status).toBe('waiting');
    expect(engine.players.get('alice')!.isInHand).toBe(false);
    room.destroy();
  });

  it('hands finishing around a waiting player never mark them as out', () => {
    const { room, engine } = setup();
    engine.addPlayer('bob', 'Bob', 'char:shrek', false);
    for (let i = 0; i < 3; i++) playHand(room);
    expect(engine.players.get('alice')!.status).toBe('waiting');
    expect(engine.players.get('alice')!.awaitingSeat).toBe(true);
    room.destroy();
  });

  it('only the allowed buy-in amounts can be requested', () => {
    const { room } = setup();
    expect(room.requestChips('alice', 'seat', 1234)).toMatch(/buy-in amounts/);
    expect(room.requestChips('alice', 'seat', 500)).toBeNull(); // half the starting stack
    room.destroy();
  });

  it('declining a seat request tells the socket layer to remove that player', () => {
    const { room } = setup();
    room.requestChips('alice', 'seat', 1000);
    expect(room.answerChipRequest('alice', false)).toBe('removeSeat');
    room.destroy();
  });

  it('a busted player asks for a re-buy and gets chips only after approval', () => {
    const { room, engine } = setup();
    room.requestChips('alice', 'seat', 1000);
    room.answerChipRequest('alice', true);
    const alice = engine.players.get('alice')!;
    alice.chips = 0;
    alice.status = 'eliminated';
    engine.phase = 'game_over';

    expect(room.requestChips('alice', 'rebuy', 1500)).toBeNull();
    expect(alice.chips).toBe(0);
    room.answerChipRequest('alice', true);
    expect(alice.chips).toBe(1500);
    expect(alice.status).toBe('waiting');
    expect(alice.buyInTotal).toBe(2500);
    expect(engine.phase).toBe('between_hands'); // the game can carry on
    room.destroy();
  });

  it('a top-up approved mid-hand waits until that hand is over', () => {
    const { room, engine } = setup();
    room.requestChips('alice', 'seat', 1000);
    room.answerChipRequest('alice', true);
    engine.startHand();
    const alice = engine.players.get('alice')!;
    const before = alice.chips;

    room.requestChips('alice', 'topup', 1000);
    room.answerChipRequest('alice', true);
    expect(alice.chips).toBe(before); // untouched during the hand
    expect(alice.pendingChips).toBe(1000);

    let guard = 0;
    while (engine.phase === 'hand_in_progress' && engine.currentTurnPlayerId && guard++ < 200) {
      const l = engine.getLegalActions(engine.currentTurnPlayerId)!;
      engine.applyAction(engine.currentTurnPlayerId, l.canCheck ? 'check' : 'call');
    }
    expect(alice.pendingChips).toBe(0);
    expect(alice.buyInTotal).toBe(2000);
    room.destroy();
  });

  it('the ledger adds up: total chips on the table equal total bought in', () => {
    const { room, engine } = setup();
    room.requestChips('alice', 'seat', 3000);
    room.answerChipRequest('alice', true);
    for (let i = 0; i < 5; i++) playHand(room);
    const players = [...engine.players.values()];
    const chips = players.reduce((s, p) => s + p.chips, 0);
    const bought = players.reduce((s, p) => s + p.buyInTotal, 0);
    expect(chips).toBe(bought);
    room.destroy();
  });

  it('declined re-buys and top-ups leave chips alone', () => {
    const { room, engine } = setup();
    room.requestChips('alice', 'seat', 1000);
    room.answerChipRequest('alice', true);
    room.requestChips('alice', 'topup', 1000);
    expect(room.answerChipRequest('alice', false)).toBeNull();
    expect(engine.players.get('alice')!.chips).toBe(1000);
    room.destroy();
  });

  it('tournaments: everyone buys in for the starting stack and there are no re-buys or top-ups', () => {
    const { room } = setup({ tournament: true });
    expect(room.requestChips('alice', 'seat', 2000)).toMatch(/buy-in amounts/);
    expect(room.requestChips('alice', 'seat', 1000)).toBeNull();
    room.answerChipRequest('alice', true);
    expect(room.requestChips('alice', 'topup', 1000)).toMatch(/tournament/);
    room.destroy();
  });

  it('tables without host approval are unchanged', () => {
    const { io } = fakeIo();
    const room = new Room('PLAIN', sanitizeSettings({ startingChips: 1000 }), io);
    room.engine.addPlayer('a', 'A', 'char:batman', true);
    room.engine.addPlayer('b', 'B', 'char:joker', false);
    expect(room.engine.players.get('b')!.chips).toBe(1000);
    expect(room.engine.canStartHand()).toBe(true);
    expect(room.requestChips('b', 'topup', 1000)).toMatch(/does not use/);
    room.destroy();
  });
});
