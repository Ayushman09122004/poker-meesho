import { describe, it, expect } from 'vitest';
import type { Server } from 'socket.io';
import { Room } from './Room';
import { sanitizeSettings } from './settings';

// A socket.io stand-in that records what each player would have been sent.
function fakeIo() {
  const sent: { to: string; event: string; payload: any }[] = [];
  const io = { to: (to: string) => ({ emit: (event: string, payload: any) => sent.push({ to, event, payload }) }) };
  return { io: io as unknown as Server, sent };
}

function setup() {
  const { io, sent } = fakeIo();
  const room = new Room('TEST1', sanitizeSettings({ rebuyEnabled: true, startingChips: 1000 }), io);
  room.engine.addPlayer('host', 'Host', 'char:batman', true);
  room.bindSocket('host', 'sock-host');
  room.engine.addPlayer('bot', 'Shrek', 'char:shrek', false, { level: 1 });
  const bot = room.engine.players.get('bot')!;
  // The bot just lost everything.
  bot.chips = 0;
  bot.status = 'eliminated';
  room.engine.phase = 'between_hands';
  return { room, bot, sent };
}

const ask = (room: Room) => (room as any).askBotRebuys() as boolean;

describe('Bots ask the host before buying back in', () => {
  it('a busted bot asks instead of rebuying by itself', () => {
    const { room, bot, sent } = setup();
    expect(ask(room)).toBe(true);
    expect(bot.chips).toBe(0);
    room.broadcastState();
    const last = sent.filter((s) => s.event === 'game:state').pop()!;
    expect(last.payload.botRebuyRequests).toEqual(['bot']);
    // It only asks once.
    expect(ask(room)).toBe(false);
    room.destroy();
  });

  it('Allow gives the bot a fresh stack and clears the request', () => {
    const { room, bot, sent } = setup();
    ask(room);
    room.answerBotRebuy('bot', true);
    expect(bot.chips).toBe(1000);
    expect(bot.status).toBe('waiting');
    const last = sent.filter((s) => s.event === 'game:state').pop()!;
    expect(last.payload.botRebuyRequests).toEqual([]);
    room.destroy();
  });

  it('No keeps the bot out, and it does not keep asking — until the host lets it back in', () => {
    const { room, bot } = setup();
    ask(room);
    room.answerBotRebuy('bot', false);
    expect(bot.chips).toBe(0);
    expect(ask(room)).toBe(false);
    // Host changes their mind from Host Controls.
    room.answerBotRebuy('bot', true);
    expect(bot.chips).toBe(1000);
    room.destroy();
  });

  it('never asks when rebuys are turned off', () => {
    const { room, bot } = setup();
    room.engine.settings.rebuyEnabled = false;
    expect(ask(room)).toBe(false);
    expect(bot.chips).toBe(0);
    room.destroy();
  });
});
