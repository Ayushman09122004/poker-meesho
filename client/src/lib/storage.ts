const NAME_KEY = 'poker.playerName';
const AVATAR_KEY = 'poker.avatarSeed';
const MUTE_KEY = 'poker.muted';
const SESSION_PREFIX = 'poker.session.'; // + roomCode -> {playerId, reconnectToken}

export interface StoredSession {
  playerId: string;
  reconnectToken: string;
}

export function getSavedName(): string {
  return localStorage.getItem(NAME_KEY) ?? '';
}
export function saveName(name: string): void {
  localStorage.setItem(NAME_KEY, name);
}

export function getSavedAvatarSeed(): string {
  let seed = localStorage.getItem(AVATAR_KEY);
  if (!seed) {
    seed = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(AVATAR_KEY, seed);
  }
  return seed;
}
export function saveAvatarSeed(seed: string): void {
  localStorage.setItem(AVATAR_KEY, seed);
}

export function getMuted(): boolean {
  return localStorage.getItem(MUTE_KEY) === '1';
}
export function saveMuted(muted: boolean): void {
  localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

const LAST_ROOM_KEY = 'poker.lastRoomCode';

// Session/reconnect data intentionally lives in sessionStorage, not localStorage: it's scoped to
// this one browser tab. That way two different people sharing one browser (e.g. passing a laptop
// around) who open the room in two separate tabs each keep their own identity instead of one
// tab's rejoin silently overwriting the other's saved token.
export function getLastRoomCode(): string | null {
  return sessionStorage.getItem(LAST_ROOM_KEY);
}
export function saveLastRoomCode(code: string): void {
  sessionStorage.setItem(LAST_ROOM_KEY, code);
}
export function clearLastRoomCode(): void {
  sessionStorage.removeItem(LAST_ROOM_KEY);
}

export function saveSession(roomCode: string, session: StoredSession): void {
  sessionStorage.setItem(SESSION_PREFIX + roomCode, JSON.stringify(session));
  saveLastRoomCode(roomCode);
}
export function getSession(roomCode: string): StoredSession | null {
  const raw = sessionStorage.getItem(SESSION_PREFIX + roomCode);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}
export function clearSession(roomCode: string): void {
  sessionStorage.removeItem(SESSION_PREFIX + roomCode);
}
