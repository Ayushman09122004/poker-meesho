import { useEffect, useRef } from 'react';
import { socket } from '../lib/socket';
import { useGameStore } from '../store/gameStore';
import { ClientEvents, ServerEvents } from '../../../shared/events';
import {
  ActionPayload,
  ChatMessage,
  CreateRoomPayload,
  GameStateSnapshot,
  HostUpdateSettingsPayload,
  JoinRoomPayload,
  JoinRoomResult,
  PlayerAction,
  RoomSettings,
} from '../../../shared/types';
import { getSession, saveSession, clearSession, clearLastRoomCode } from '../lib/storage';

export function useGameConnection() {
  const store = useGameStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    socket.on('connect', () => useGameStore.getState().setConnected(true));
    socket.on('disconnect', () => useGameStore.getState().setConnected(false));

    socket.on(ServerEvents.StateUpdate, (snapshot: GameStateSnapshot) => {
      useGameStore.getState().setSnapshot(snapshot);
    });

    socket.on(ServerEvents.ChatMessage, (msg: ChatMessage) => {
      useGameStore.getState().pushChat(msg);
    });

    socket.on(ServerEvents.EmoteBroadcast, (payload: { playerId: string; emoji: string }) => {
      useGameStore.getState().pushEmote(payload.playerId, payload.emoji);
    });

    socket.on(ServerEvents.RoomError, (payload: { message: string }) => {
      useGameStore.getState().pushToast(payload.message, 'error');
    });

    socket.on(ServerEvents.Kicked, () => {
      useGameStore.getState().pushToast('You were removed from the room by the host.', 'error');
      useGameStore.getState().reset();
      socket.disconnect();
    });

    socket.connect();

    return () => {
      // Intentionally do not disconnect on unmount in dev (StrictMode double-invokes effects).
    };
  }, []);

  return {
    connected: store.connected,
  };
}

export function createRoom(name: string, avatarSeed: string, settings: Partial<RoomSettings>): Promise<JoinRoomResult> {
  return new Promise((resolve) => {
    const payload: CreateRoomPayload = { name, avatarSeed, settings };
    socket.emit(ClientEvents.CreateRoom, payload, (res: JoinRoomResult) => {
      if (res.ok && res.roomCode && res.playerId && res.reconnectToken) {
        saveSession(res.roomCode, { playerId: res.playerId, reconnectToken: res.reconnectToken });
        useGameStore.getState().setSession(res.roomCode, res.playerId);
      }
      resolve(res);
    });
  });
}

export function joinRoom(roomCode: string, name: string, avatarSeed: string): Promise<JoinRoomResult> {
  return new Promise((resolve) => {
    const code = roomCode.toUpperCase().trim();
    const existing = getSession(code);
    const payload: JoinRoomPayload = {
      roomCode: code,
      name,
      avatarSeed,
      reconnectToken: existing?.reconnectToken,
    };
    socket.emit(ClientEvents.JoinRoom, payload, (res: JoinRoomResult) => {
      if (res.ok && res.roomCode && res.playerId && res.reconnectToken) {
        saveSession(res.roomCode, { playerId: res.playerId, reconnectToken: res.reconnectToken });
        useGameStore.getState().setSession(res.roomCode, res.playerId);
      }
      resolve(res);
    });
  });
}

export function tryAutoReconnect(roomCode: string): Promise<JoinRoomResult> | null {
  const existing = getSession(roomCode.toUpperCase());
  if (!existing) return null;
  return joinRoom(roomCode, '', '');
}

export function leaveRoom(): void {
  const roomCode = useGameStore.getState().roomCode;
  socket.emit(ClientEvents.LeaveRoom);
  if (roomCode) clearSession(roomCode);
  clearLastRoomCode();
  useGameStore.getState().reset();
}

export function setReady(ready: boolean): void {
  socket.emit(ClientEvents.SetReady, { ready });
}

export function startGame(): void {
  socket.emit(ClientEvents.StartGame);
}

export function restartGame(): void {
  socket.emit(ClientEvents.RestartGame);
}

export function updateSettings(settings: Partial<RoomSettings>): void {
  const payload: HostUpdateSettingsPayload = { settings };
  socket.emit(ClientEvents.UpdateSettings, payload);
}

export function kickPlayer(targetPlayerId: string): void {
  socket.emit(ClientEvents.KickPlayer, { targetPlayerId });
}

export function requestRebuy(): void {
  socket.emit(ClientEvents.Rebuy);
}

export function sendPlayerAction(action: PlayerAction, amount?: number): void {
  const payload: ActionPayload = { action, amount };
  socket.emit(ClientEvents.PlayerAction, payload);
}

export function useTimeBankAction(): void {
  socket.emit(ClientEvents.UseTimeBank);
}

export function sendChat(text: string): void {
  socket.emit(ClientEvents.SendChat, { text });
}

export function sendEmote(emoji: string): void {
  socket.emit(ClientEvents.SendEmote, { emoji });
}
