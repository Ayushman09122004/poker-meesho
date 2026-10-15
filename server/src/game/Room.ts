import { Server } from 'socket.io';
import { ChatMessage, RoomSettings } from '../../../shared/types';
import { ServerEvents } from '../../../shared/events';
import { runoutCardCount, showdownTimeline } from '../../../shared/showdownTiming';
import { PokerEngine } from './PokerEngine';
import { generateId } from '../utils/rng';
import { botThinkMs, decideBotAction } from './BotBrain';
import { ProfileBook, describeRead } from './PlayerProfiles';

const NEXT_HAND_DELAY_MS = 4500;
const CHAT_HISTORY_LIMIT = 100;

export class Room {
  code: string;
  engine: PokerEngine;
  io: Server;

  private playerSocket = new Map<string, string>(); // playerId -> active socketId
  private socketPlayer = new Map<string, string>(); // socketId -> playerId
  private reconnectTokens = new Map<string, string>(); // token -> playerId
  private tokenByPlayer = new Map<string, string>(); // playerId -> token

  chat: ChatMessage[] = [];
  private turnTimer: ReturnType<typeof setTimeout> | null = null;
  private nextHandTimer: ReturnType<typeof setTimeout> | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  /** What the bots have learned about each player's habits this session. */
  private notes = new ProfileBook();
  private lastNotedHand = 0;
  /** Busted bots waiting for the host's OK to buy back in, and ones the host refused. */
  private pendingBotRebuys = new Set<string>();
  private declinedBotRebuys = new Set<string>();
  private handsSinceRemark = 0;
  lastActivityAt = Date.now();

  constructor(code: string, settings: RoomSettings, io: Server) {
    this.code = code;
    this.engine = new PokerEngine(code, settings);
    this.io = io;
  }

  touch(): void {
    this.lastActivityAt = Date.now();
  }

  // ---------- Player / socket bookkeeping ----------

  createTokenFor(playerId: string): string {
    const existing = this.tokenByPlayer.get(playerId);
    if (existing) return existing;
    const token = generateId(24);
    this.reconnectTokens.set(token, playerId);
    this.tokenByPlayer.set(playerId, token);
    return token;
  }

  resolveToken(token: string): string | undefined {
    return this.reconnectTokens.get(token);
  }

  bindSocket(playerId: string, socketId: string): void {
    const prevSocket = this.playerSocket.get(playerId);
    if (prevSocket && prevSocket !== socketId) {
      this.socketPlayer.delete(prevSocket);
    }
    this.playerSocket.set(playerId, socketId);
    this.socketPlayer.set(socketId, playerId);
    this.engine.setConnected(playerId, true);
  }

  /** Returns the playerId that was bound to this socket, if any. */
  unbindSocket(socketId: string): string | undefined {
    const playerId = this.socketPlayer.get(socketId);
    if (!playerId) return undefined;
    this.socketPlayer.delete(socketId);
    if (this.playerSocket.get(playerId) === socketId) {
      this.playerSocket.set(playerId, '');
      this.engine.setConnected(playerId, false);
    }
    return playerId;
  }

  socketIdFor(playerId: string): string | undefined {
    const s = this.playerSocket.get(playerId);
    return s || undefined;
  }

  /** A room with no humans left is empty — bots alone never keep a room alive. */
  isEmpty(): boolean {
    return ![...this.engine.players.values()].some((p) => !p.isBot);
  }

  private hasConnectedHuman(): boolean {
    return [...this.engine.players.values()].some((p) => !p.isBot && p.isConnected);
  }

  removeReconnectData(playerId: string): void {
    const token = this.tokenByPlayer.get(playerId);
    if (token) {
      this.reconnectTokens.delete(token);
      this.tokenByPlayer.delete(playerId);
    }
    const socketId = this.playerSocket.get(playerId);
    if (socketId) this.socketPlayer.delete(socketId);
    this.playerSocket.delete(playerId);
  }

  // ---------- Broadcasting ----------

  broadcastState(): void {
    for (const player of this.engine.players.values()) {
      const socketId = this.playerSocket.get(player.id);
      if (!socketId) continue;
      const snapshot = this.engine.getSnapshot(player.id);
      snapshot.botRebuyRequests = [...this.pendingBotRebuys];
      this.io.to(socketId).emit(ServerEvents.StateUpdate, snapshot);
    }
    this.scheduleTurnTimer();
    // e.g. a human reconnecting while a bot was waiting to act.
    if (!this.botTimer) this.scheduleBotTurn();
  }

  broadcastChat(message: ChatMessage): void {
    this.chat.push(message);
    if (this.chat.length > CHAT_HISTORY_LIMIT) this.chat.shift();
    for (const socketId of this.playerSocket.values()) {
      if (socketId) this.io.to(socketId).emit(ServerEvents.ChatMessage, message);
    }
  }

  broadcastEmote(playerId: string, emoji: string): void {
    for (const socketId of this.playerSocket.values()) {
      if (socketId) this.io.to(socketId).emit(ServerEvents.EmoteBroadcast, { playerId, emoji });
    }
  }

  systemChat(text: string): void {
    this.broadcastChat({ id: generateId(10), playerId: null, name: 'Table', text, ts: Date.now(), isSystem: true });
  }

  // ---------- Turn timer ----------

  private clearTurnTimer(): void {
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }
  }

  private scheduleTurnTimer(): void {
    this.clearTurnTimer();
    const { currentTurnPlayerId, turnExpiresAt } = this.engine;
    if (!currentTurnPlayerId || !turnExpiresAt) return;
    const delay = Math.max(0, turnExpiresAt - Date.now());
    this.turnTimer = setTimeout(() => {
      const stillPlayerId = this.engine.currentTurnPlayerId;
      if (!stillPlayerId) return;
      this.engine.forceTimeoutAction(stillPlayerId);
      const player = this.engine.players.get(stillPlayerId);
      if (player) this.systemChat(`${player.name} timed out and ${player.status === 'folded' ? 'folded' : 'checked'}.`);
      this.afterEngineMutation();
    }, delay + 50);
  }

  // ---------- Hand flow ----------

  /** Call after any engine mutation to broadcast state and schedule follow-up timers. */
  afterEngineMutation(): void {
    this.broadcastState();

    if (this.engine.phase === 'between_hands' || this.engine.phase === 'game_over') {
      this.takeNotes();
      this.scheduleNextHand();
    }
    this.scheduleBotTurn();
  }

  /** After each hand, bots update their notes on everyone (from public actions and showdowns). */
  private takeNotes(): void {
    const last = this.engine.handHistory[0];
    if (!last || last.timestamp === this.lastNotedHand) return;
    this.lastNotedHand = last.timestamp;
    this.notes.recordHand(last);
    this.handsSinceRemark++;
    this.maybeBotRemark();
  }

  /**
   * Now and then a sharp bot lets a human know it has a read on them — so you can tell they're
   * studying you. Rare (at most once every 6 hands, and only with a confident read).
   */
  private maybeBotRemark(): void {
    if (this.handsSinceRemark < 6 || Math.random() > 0.35) return;
    const players = [...this.engine.players.values()];
    const watchers = players.filter((p) => p.isBot && p.botLevel >= 4 && p.status !== 'eliminated');
    const humans = players.filter((p) => !p.isBot && p.isConnected);
    if (watchers.length === 0 || humans.length === 0) return;
    const target = humans[Math.floor(Math.random() * humans.length)];
    const line = describeRead(target.name, this.notes.read(target.id));
    if (!line) return;
    const bot = watchers[Math.floor(Math.random() * watchers.length)];
    this.handsSinceRemark = 0;
    this.broadcastChat({ id: generateId(10), playerId: bot.id, name: `🤖 ${bot.name}`, text: line, ts: Date.now() });
  }

  // ---------- Bots ----------

  /**
   * If it's a bot's turn, act after a short human-like "think". The bot goes through the same
   * applyAction path as a person, so it can only ever make legal moves; if anything about the
   * turn changed while it was thinking, it does nothing (the next mutation reschedules).
   */
  private scheduleBotTurn(): void {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    const turnId = this.engine.currentTurnPlayerId;
    const bot = turnId ? this.engine.players.get(turnId) : undefined;
    if (!bot || !bot.isBot || this.engine.phase !== 'hand_in_progress') return;
    // Nobody watching: let the normal turn timer move things along slowly instead.
    if (!this.hasConnectedHuman()) return;

    const turnKey = `${this.engine.handNumber}|${this.engine.street}|${this.engine.currentBet}|${turnId}`;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      const nowKey = `${this.engine.handNumber}|${this.engine.street}|${this.engine.currentBet}|${this.engine.currentTurnPlayerId}`;
      if (nowKey !== turnKey) return;
      let result: { ok: boolean };
      try {
        const decision = decideBotAction(this.engine, bot, this.notes);
        result = this.engine.applyAction(bot.id, decision.action, decision.amount);
      } catch {
        result = { ok: false };
      }
      // Belt and braces: a rejected move falls back to check/fold so the game never stalls.
      if (!result.ok) this.engine.forceTimeoutAction(bot.id);
      this.touch();
      this.afterEngineMutation();
    }, botThinkMs(this.engine, bot));
  }

  /**
   * Busted bots don't rebuy on their own — they ask the host, who allows or refuses. Asked once;
   * a refused bot sits out until the host lets it back in from Host Controls.
   */
  private askBotRebuys(): boolean {
    if (!this.engine.settings.rebuyEnabled) return false;
    let asked = false;
    for (const p of this.engine.players.values()) {
      if (!p.isBot || p.chips > 0 || this.pendingBotRebuys.has(p.id) || this.declinedBotRebuys.has(p.id)) continue;
      this.pendingBotRebuys.add(p.id);
      this.systemChat(`🤖 ${p.name} is out of chips and asks the host to buy back in.`);
      asked = true;
    }
    return asked;
  }

  /** The host's answer to a bot's buy-in request (also used to let a refused bot back in later). */
  answerBotRebuy(botId: string, allow: boolean): void {
    const bot = this.engine.players.get(botId);
    if (!bot || !bot.isBot) return;
    this.pendingBotRebuys.delete(botId);
    if (!allow) {
      this.declinedBotRebuys.add(botId);
      this.systemChat(`The host said no — 🤖 ${bot.name} sits out.`);
      this.broadcastState();
      return;
    }
    this.declinedBotRebuys.delete(botId);
    if (this.engine.rebuy(botId).ok) this.systemChat(`The host let 🤖 ${bot.name} buy back in.`);
    this.afterEngineMutation();
  }

  /** Drop any buy-in requests for a player who left, or for everyone after a restart. */
  forgetBotRebuys(playerId?: string): void {
    if (playerId) {
      this.pendingBotRebuys.delete(playerId);
      this.declinedBotRebuys.delete(playerId);
    } else {
      this.pendingBotRebuys.clear();
      this.declinedBotRebuys.clear();
    }
  }

  private scheduleNextHand(): void {
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
    this.nextHandTimer = setTimeout(() => {
      // Asked only now, after the end-of-hand sequence has played, so the chat can't spoil the result.
      if (this.askBotRebuys()) this.broadcastState();
      if (this.engine.phase !== 'between_hands') return;
      if (!this.engine.canStartHand()) return;
      this.engine.startHand();
      this.systemChat(`Hand #${this.engine.handNumber} started.`);
      this.afterEngineMutation();
    }, this.nextHandDelayMs());
  }

  /** Long enough for clients to play the whole end-of-hand sequence (see shared/showdownTiming). */
  private nextHandDelayMs(): number {
    const snap = this.engine.getSnapshot();
    if (!snap.winnersAnnouncement || snap.winnersAnnouncement.length === 0) return NEXT_HAND_DELAY_MS;
    const timeline = showdownTimeline({
      runoutCards: runoutCardCount(snap),
      revealCount: snap.showdown?.length ?? 0,
      contested: (snap.showdown?.length ?? 0) > 1,
      allIn: snap.allInRunoutFrom !== null,
    });
    return timeline.nextHandAt + 400;
  }

  destroy(): void {
    this.clearTurnTimer();
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
    if (this.botTimer) clearTimeout(this.botTimer);
  }
}
