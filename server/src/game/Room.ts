import { Server } from 'socket.io';
import { ChatMessage, RoomSettings } from '../../../shared/types';
import { ServerEvents } from '../../../shared/events';
import { PokerEngine } from './PokerEngine';
import { generateId } from '../utils/rng';

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

  isEmpty(): boolean {
    return this.engine.players.size === 0;
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
      this.io.to(socketId).emit(ServerEvents.StateUpdate, snapshot);
    }
    this.scheduleTurnTimer();
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
      this.scheduleNextHand();
    }
  }

  private scheduleNextHand(): void {
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
    if (this.engine.phase === 'game_over') return;
    this.nextHandTimer = setTimeout(() => {
      if (this.engine.phase !== 'between_hands') return;
      if (!this.engine.canStartHand()) return;
      this.engine.startHand();
      this.systemChat(`Hand #${this.engine.handNumber} started.`);
      this.afterEngineMutation();
    }, NEXT_HAND_DELAY_MS);
  }

  destroy(): void {
    this.clearTurnTimer();
    if (this.nextHandTimer) clearTimeout(this.nextHandTimer);
  }
}
