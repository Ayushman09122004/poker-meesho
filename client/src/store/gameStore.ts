import { create } from 'zustand';
import { ChatMessage, GameStateSnapshot, MemeEvent, ThrowEvent } from '../../../shared/types';

export interface EntranceEvent {
  id: string;
  playerId: string;
  name: string;
  avatarSeed: string;
}

export interface EmoteEvent {
  id: string;
  playerId: string;
  emoji: string;
  ts: number;
}

export interface Toast {
  id: string;
  text: string;
  tone: 'error' | 'info';
}

export type Screen = 'landing' | 'lobby' | 'table';

interface GameStore {
  connected: boolean;
  screen: Screen;
  roomCode: string | null;
  selfPlayerId: string | null;
  isHost: boolean;
  snapshot: GameStateSnapshot | null;
  prevSnapshot: GameStateSnapshot | null;
  chat: ChatMessage[];
  emotes: EmoteEvent[];
  /** Tomatoes, roses, beers and chickens currently flying across the table. */
  throws: ThrowEvent[];
  /** Memes cashed in, waiting to play / playing (first one is on screen). */
  memes: MemeEvent[];
  /** Character entrances waiting to play (first one is on screen). */
  entrances: EntranceEvent[];
  toasts: Toast[];
  muted: boolean;
  showHostSettings: boolean;
  showStats: boolean;
  showHandHistory: boolean;
  showChatPanel: boolean;

  setConnected: (c: boolean) => void;
  setScreen: (s: Screen) => void;
  setSession: (roomCode: string, playerId: string) => void;
  setSnapshot: (s: GameStateSnapshot) => void;
  pushChat: (m: ChatMessage) => void;
  pushThrow: (t: ThrowEvent) => void;
  pushMeme: (m: MemeEvent) => void;
  shiftMeme: (id: string) => void;
  pushEntrance: (e: EntranceEvent) => void;
  shiftEntrance: (id: string) => void;
  pushEmote: (playerId: string, emoji: string) => void;
  expireEmote: (id: string) => void;
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
  setMuted: (m: boolean) => void;
  toggleHostSettings: (v?: boolean) => void;
  toggleStats: (v?: boolean) => void;
  toggleHandHistory: (v?: boolean) => void;
  toggleChatPanel: (v?: boolean) => void;
  reset: () => void;
}

let idCounter = 0;
function uid(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

export const useGameStore = create<GameStore>((set, get) => ({
  connected: false,
  screen: 'landing',
  roomCode: null,
  selfPlayerId: null,
  isHost: false,
  snapshot: null,
  prevSnapshot: null,
  chat: [],
  emotes: [],
  throws: [],
  memes: [],
  entrances: [],
  toasts: [],
  muted: false,
  showHostSettings: false,
  showStats: false,
  showHandHistory: false,
  showChatPanel: false,

  setConnected: (c) => set({ connected: c }),
  setScreen: (s) => set({ screen: s }),
  setSession: (roomCode, playerId) => set({ roomCode, selfPlayerId: playerId }),
  setSnapshot: (s) =>
    set((state) => ({
      prevSnapshot: state.snapshot,
      snapshot: s,
      isHost: s.hostId === state.selfPlayerId,
      screen: s.phase === 'lobby' ? 'lobby' : 'table',
    })),
  pushChat: (m) => set((state) => ({ chat: [...state.chat, m].slice(-200) })),
  pushEmote: (playerId, emoji) => {
    const id = uid();
    set((state) => ({ emotes: [...state.emotes, { id, playerId, emoji, ts: Date.now() }] }));
    setTimeout(() => get().expireEmote(id), 2600);
  },
  expireEmote: (id) => set((state) => ({ emotes: state.emotes.filter((e) => e.id !== id) })),
  pushMeme: (m) => set((state) => ({ memes: [...state.memes, m].slice(-5) })),
  shiftMeme: (id) => set((state) => ({ memes: state.memes.filter((m) => m.id !== id) })),
  pushEntrance: (e) => set((state) => ({ entrances: [...state.entrances, e].slice(-4) })),
  shiftEntrance: (id) => set((state) => ({ entrances: state.entrances.filter((e) => e.id !== id) })),
  pushThrow: (t) => {
    set((state) => ({ throws: [...state.throws, t].slice(-12) }));
    setTimeout(() => set((state) => ({ throws: state.throws.filter((x) => x.id !== t.id) })), 2600);
  },
  pushToast: (text, tone = 'error') => {
    const id = uid();
    set((state) => ({ toasts: [...state.toasts, { id, text, tone }] }));
    setTimeout(() => get().dismissToast(id), 4500);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  setMuted: (m) => set({ muted: m }),
  toggleHostSettings: (v) => set((state) => ({ showHostSettings: v ?? !state.showHostSettings })),
  toggleStats: (v) => set((state) => ({ showStats: v ?? !state.showStats })),
  toggleHandHistory: (v) => set((state) => ({ showHandHistory: v ?? !state.showHandHistory })),
  toggleChatPanel: (v) => set((state) => ({ showChatPanel: v ?? !state.showChatPanel })),
  reset: () =>
    set({
      screen: 'landing',
      roomCode: null,
      selfPlayerId: null,
      isHost: false,
      snapshot: null,
      prevSnapshot: null,
      chat: [],
      emotes: [],
      throws: [],
      memes: [],
      entrances: [],
    }),
}));
