import { describe, it, expect } from 'vitest';
import type { Server } from 'socket.io';
import { Room } from './Room';
import { sanitizeSettings } from './settings';
import { MEMES, ticketTierForStreak } from '../../../shared/memes';

function fakeIo() {
  const sent: { to: string; event: string; payload: any }[] = [];
  const io = { to: (to: string) => ({ emit: (event: string, payload: any) => sent.push({ to, event, payload }) }) };
  return { io: io as unknown as Server, sent };
}

function setup() {
  const { io, sent } = fakeIo();
  const room = new Room('FUN01', sanitizeSettings({ startingChips: 1000 }), io);
  room.engine.addPlayer('a', 'Alice', 'char:joker', true);
  room.engine.addPlayer('b', 'Bob', 'char:shrek', false);
  room.bindSocket('a', 'sock-a');
  room.bindSocket('b', 'sock-b');
  return { room, sent, e: room.engine };
}

/** Pretend Alice just won a hand on a streak of `streak`. */
function aliceWins(room: Room, streak: number) {
  const e = room.engine;
  e.players.get('a')!.stats.currentWinStreak = streak;
  e.lastWinners = [{ playerId: 'a', name: 'Alice', amount: 100, handName: null, potIndex: 0 }];
  e.handHistory.unshift({ timestamp: Date.now() + streak } as any);
  return (room as any).grantMemeTickets() as number;
}
const tickets = (room: Room, id: string) => ((room as any).memeTickets.get(id) ?? []) as number[];

describe('Meme tickets', () => {
  it('streaks of 2, 3, 4 and 5 earn tickets of rising tiers', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(ticketTierForStreak)).toEqual([null, 1, 2, 3, 4, null, 4, null, 4]);
    const { room } = setup();
    for (const s of [2, 3, 4, 5]) aliceWins(room, s);
    expect(tickets(room, 'a')).toEqual([1, 2, 3, 4]);
    expect(tickets(room, 'b')).toEqual([]);
    room.destroy();
  });

  it('a hand only hands out tickets once', () => {
    const { room } = setup();
    aliceWins(room, 2);
    expect((room as any).grantMemeTickets()).toBe(0);
    expect(tickets(room, 'a')).toEqual([1]);
    room.destroy();
  });

  it('cashing in a ticket plays the meme for everyone (right away when no hand is coming)', () => {
    const { room, sent } = setup();
    aliceWins(room, 2);
    const meme = MEMES.find((m) => m.tier === 1)!;
    expect(room.playMeme('a', meme.id)).toBeNull();
    const shown = sent.filter((s) => s.event === 'player:memeBroadcast');
    expect(shown.map((s) => s.to).sort()).toEqual(['sock-a', 'sock-b']);
    expect(shown[0].payload).toMatchObject({ playerId: 'a', memeId: meme.id });
    expect(tickets(room, 'a')).toEqual([]);
    room.destroy();
  });

  it("you can't play a meme above your ticket — but a higher ticket covers easier memes", () => {
    const { room } = setup();
    aliceWins(room, 2); // tier 1
    expect(room.playMeme('a', MEMES.find((m) => m.tier === 4)!.id)).toMatch(/5-win ticket/);
    expect(room.playMeme('b', MEMES[0].id)).toMatch(/ticket/);
    aliceWins(room, 5); // tier 4
    expect(room.playMeme('a', MEMES.find((m) => m.tier === 1)!.id)).toBeNull();
    expect(tickets(room, 'a')).toEqual([4]); // spent the tier-1 ticket, kept the tier-4 one
    room.destroy();
  });

  it('during a hand the meme waits to play before the next deal', () => {
    const { room, sent, e } = setup();
    e.startHand();
    aliceWins(room, 3);
    room.playMeme('a', MEMES.find((m) => m.tier === 2)!.id);
    expect(sent.some((s) => s.event === 'player:memeBroadcast')).toBe(false);
    expect((room as any).memeQueue).toHaveLength(1);
    expect((room as any).playNextMeme()).toBe(true);
    expect(sent.some((s) => s.event === 'player:memeBroadcast')).toBe(true);
    room.destroy();
  });

  it('a restart clears tickets', () => {
    const { room } = setup();
    aliceWins(room, 4);
    room.onRestart();
    expect(tickets(room, 'a')).toEqual([]);
    room.destroy();
  });
});

describe('Character entrances', () => {
  it('everyone gets the new player’s entrance with their name and character', () => {
    const { room, sent } = setup();
    room.announceEntrance('b');
    const ev = sent.filter((s) => s.event === 'player:entrance');
    expect(ev).toHaveLength(2);
    expect(ev[0].payload).toMatchObject({ playerId: 'b', name: 'Bob', avatarSeed: 'char:shrek' });
    room.destroy();
  });
});
