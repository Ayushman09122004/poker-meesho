import { Server } from 'socket.io';
import { RoomSettings } from '../../../shared/types';
import { generateRoomCode } from '../utils/rng';
import { Room } from './Room';
import { sanitizeSettings } from './settings';

const STALE_ROOM_MS = 6 * 60 * 60 * 1000; // 6 hours of no activity

export class RoomManager {
  private rooms = new Map<string, Room>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    setInterval(() => this.sweepStaleRooms(), 30 * 60 * 1000).unref();
  }

  createRoom(settingsPartial: Partial<RoomSettings>): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const settings = sanitizeSettings(settingsPartial);
    const room = new Room(code, settings, this.io);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  deleteRoom(code: string): void {
    const room = this.rooms.get(code);
    if (room) {
      room.destroy();
      this.rooms.delete(code);
    }
  }

  private sweepStaleRooms(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (room.isEmpty() && now - room.lastActivityAt > STALE_ROOM_MS) {
        this.deleteRoom(code);
      }
    }
  }
}
