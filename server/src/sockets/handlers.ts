import { Server, Socket } from 'socket.io';
import { nanoid } from 'nanoid';
import {
  ActionPayload,
  ChatPayload,
  CreateRoomPayload,
  EmotePayload,
  HostUpdateSettingsPayload,
  JoinRoomPayload,
  JoinRoomResult,
} from '../../../shared/types';
import { ClientEvents, ServerEvents } from '../../../shared/events';
import { RoomManager } from '../game/RoomManager';
import { sanitizeSettings } from '../game/settings';

interface SocketData {
  roomCode?: string;
  playerId?: string;
}

function cleanName(name: unknown): string {
  const s = String(name ?? '').trim().slice(0, 20);
  return s.length > 0 ? s : 'Player';
}

function cleanAvatarSeed(seed: unknown): string {
  const s = String(seed ?? '').trim().slice(0, 40);
  return s.length > 0 ? s : nanoid(6);
}

function cleanChatText(text: unknown): string | null {
  const s = String(text ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 300);
  return s.length > 0 ? s : null;
}

const ALLOWED_EMOJIS = new Set([
  '👍', '👎', '😂', '😮', '😢', '🔥', '🤔', '😎', '🙌', '💰', '🃏', '♠️', '♥️', '♦️', '♣️', '🎉', '😴', '🤯', '🫡', '🥶',
]);

export function registerSocketHandlers(io: Server, rooms: RoomManager): void {
  io.on('connection', (socket: Socket) => {
    const data = socket.data as SocketData;

    const currentRoom = () => (data.roomCode ? rooms.getRoom(data.roomCode) : undefined);

    function joinResult(roomCode: string, playerId: string, reconnectToken: string): JoinRoomResult {
      return { ok: true, roomCode, playerId, reconnectToken };
    }

    socket.on(ClientEvents.CreateRoom, (payload: CreateRoomPayload, ack?: (r: JoinRoomResult) => void) => {
      const room = rooms.createRoom(payload.settings ?? {});
      const playerId = nanoid(10);
      const add = room.engine.addPlayer(playerId, cleanName(payload.name), cleanAvatarSeed(payload.avatarSeed), true);
      if (!add.ok) {
        ack?.({ ok: false, error: add.error });
        return;
      }
      const token = room.createTokenFor(playerId);
      room.bindSocket(playerId, socket.id);
      data.roomCode = room.code;
      data.playerId = playerId;
      socket.join(room.code);
      room.touch();
      room.systemChat(`${cleanName(payload.name)} created the room.`);
      ack?.(joinResult(room.code, playerId, token));
      room.broadcastState();
    });

    socket.on(ClientEvents.JoinRoom, (payload: JoinRoomPayload, ack?: (r: JoinRoomResult) => void) => {
      const room = rooms.getRoom((payload.roomCode ?? '').toUpperCase());
      if (!room) {
        ack?.({ ok: false, error: 'Room not found' });
        return;
      }

      // Reconnect path
      if (payload.reconnectToken) {
        const existingPlayerId = room.resolveToken(payload.reconnectToken);
        if (existingPlayerId && room.engine.players.has(existingPlayerId)) {
          room.bindSocket(existingPlayerId, socket.id);
          data.roomCode = room.code;
          data.playerId = existingPlayerId;
          socket.join(room.code);
          room.touch();
          const name = room.engine.players.get(existingPlayerId)!.name;
          room.systemChat(`${name} reconnected.`);
          ack?.(joinResult(room.code, existingPlayerId, payload.reconnectToken));
          room.broadcastState();
          return;
        }
      }

      if (room.engine.phase === 'hand_in_progress' || room.engine.phase === 'between_hands') {
        // Mid-game joins become spectators seated for the next chip-permitting hand isn't supported yet;
        // allow if there's an open seat, they'll just wait for the next hand.
      }

      const name = cleanName(payload.name);
      const playerId = nanoid(10);
      const add = room.engine.addPlayer(playerId, name, cleanAvatarSeed(payload.avatarSeed), room.engine.players.size === 0);
      if (!add.ok) {
        ack?.({ ok: false, error: add.error });
        return;
      }
      const token = room.createTokenFor(playerId);
      room.bindSocket(playerId, socket.id);
      data.roomCode = room.code;
      data.playerId = playerId;
      socket.join(room.code);
      room.touch();
      room.systemChat(`${name} joined the room.`);
      ack?.(joinResult(room.code, playerId, token));
      room.broadcastState();
    });

    socket.on(ClientEvents.LeaveRoom, () => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      const name = room.engine.players.get(data.playerId)?.name;
      room.engine.removePlayer(data.playerId);
      room.removeReconnectData(data.playerId);
      socket.leave(room.code);
      if (name) room.systemChat(`${name} left the room.`);
      if (room.isEmpty()) {
        rooms.deleteRoom(room.code);
      } else {
        room.afterEngineMutation();
      }
      data.roomCode = undefined;
      data.playerId = undefined;
    });

    socket.on(ClientEvents.SetReady, (payload: { ready: boolean }) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      room.engine.setReady(data.playerId, !!payload?.ready);
      room.touch();

      const seated = [...room.engine.players.values()];
      const allReady = seated.length >= 2 && seated.every((p) => p.isReady);
      if (room.engine.phase === 'lobby' && room.engine.settings.autoStartWhenReady && allReady) {
        const started = room.engine.startHand();
        if (started.ok) room.systemChat(`Hand #${room.engine.handNumber} started.`);
      }
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.StartGame, () => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      if (room.engine.hostId !== data.playerId) {
        socket.emit(ServerEvents.RoomError, { message: 'Only the host can start the game' });
        return;
      }
      const result = room.engine.startHand();
      if (!result.ok) {
        socket.emit(ServerEvents.RoomError, { message: result.error ?? 'Cannot start game' });
        return;
      }
      room.systemChat(`Hand #${room.engine.handNumber} started.`);
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.RestartGame, () => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      if (room.engine.hostId !== data.playerId) {
        socket.emit(ServerEvents.RoomError, { message: 'Only the host can restart the game' });
        return;
      }
      room.engine.resetGame();
      room.systemChat('The host restarted the game. Everyone is back to the starting stack.');
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.UpdateSettings, (payload: HostUpdateSettingsPayload) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      if (room.engine.hostId !== data.playerId) {
        socket.emit(ServerEvents.RoomError, { message: 'Only the host can change settings' });
        return;
      }
      if (room.engine.phase !== 'lobby') {
        socket.emit(ServerEvents.RoomError, { message: 'Settings can only change before the game starts' });
        return;
      }
      room.engine.settings = sanitizeSettings(payload.settings ?? {}, room.engine.settings);
      for (const p of room.engine.players.values()) p.chips = room.engine.settings.startingChips;
      room.touch();
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.KickPlayer, (payload: { targetPlayerId: string }) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      if (room.engine.hostId !== data.playerId) {
        socket.emit(ServerEvents.RoomError, { message: 'Only the host can remove players' });
        return;
      }
      const target = room.engine.players.get(payload.targetPlayerId);
      if (!target || target.id === data.playerId) return;
      const targetSocketId = room.socketIdFor(target.id);
      room.engine.removePlayer(target.id);
      room.systemChat(`${target.name} was removed by the host.`);
      room.removeReconnectData(target.id);
      if (targetSocketId) {
        io.to(targetSocketId).emit(ServerEvents.Kicked, { reason: 'Removed by host' });
        io.sockets.sockets.get(targetSocketId)?.leave(room.code);
      }
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.Rebuy, () => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      const result = room.engine.rebuy(data.playerId);
      if (result.ok) {
        const name = room.engine.players.get(data.playerId)?.name;
        room.systemChat(`${name} bought back in.`);
      } else {
        socket.emit(ServerEvents.RoomError, { message: result.error ?? 'Rebuy failed' });
      }
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.PlayerAction, (payload: ActionPayload) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      const result = room.engine.applyAction(data.playerId, payload.action, payload.amount);
      room.touch();
      if (!result.ok) {
        socket.emit(ServerEvents.RoomError, { message: result.error ?? 'Illegal action' });
        return;
      }
      room.afterEngineMutation();
    });

    socket.on(ClientEvents.SendChat, (payload: ChatPayload) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      const text = cleanChatText(payload?.text);
      if (!text) return;
      const player = room.engine.players.get(data.playerId);
      if (!player) return;
      room.broadcastChat({ id: nanoid(10), playerId: player.id, name: player.name, text, ts: Date.now() });
    });

    socket.on(ClientEvents.SendEmote, (payload: EmotePayload) => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      if (!ALLOWED_EMOJIS.has(payload?.emoji)) return;
      room.broadcastEmote(data.playerId, payload.emoji);
    });

    socket.on('disconnect', () => {
      const room = currentRoom();
      if (!room || !data.playerId) return;
      room.unbindSocket(socket.id);
      const name = room.engine.players.get(data.playerId)?.name;
      if (name) room.systemChat(`${name} disconnected.`);
      room.afterEngineMutation();
    });
  });
}
