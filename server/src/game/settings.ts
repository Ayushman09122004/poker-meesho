import { GameMode, RoomSettings, TableTheme } from '../../../shared/types';

const VALID_THEMES: TableTheme[] = ['midnight', 'emerald', 'crimson', 'royal'];
const VALID_MODES: GameMode[] = ['assisted', 'professional'];

export function defaultSettings(): RoomSettings {
  return {
    startingChips: 5000,
    smallBlind: 25,
    bigBlind: 50,
    blindIncreaseIntervalHands: 0,
    turnTimerSeconds: 30,
    maxPlayers: 9,
    isPrivate: true,
    autoStartWhenReady: true,
    rebuyEnabled: true,
    tableTheme: 'midnight',
    gameMode: 'assisted',
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function sanitizeSettings(partial: Partial<RoomSettings>, base: RoomSettings = defaultSettings()): RoomSettings {
  const merged = { ...base, ...partial };
  return {
    startingChips: clamp(Math.round(merged.startingChips) || base.startingChips, 100, 1_000_000),
    smallBlind: clamp(Math.round(merged.smallBlind) || base.smallBlind, 1, 100_000),
    bigBlind: Math.max(
      clamp(Math.round(merged.bigBlind) || base.bigBlind, 2, 200_000),
      clamp(Math.round(merged.smallBlind) || base.smallBlind, 1, 100_000) * 2
    ),
    blindIncreaseIntervalHands: clamp(Math.round(merged.blindIncreaseIntervalHands) || 0, 0, 100),
    turnTimerSeconds: clamp(Math.round(merged.turnTimerSeconds) || base.turnTimerSeconds, 10, 120),
    maxPlayers: clamp(Math.round(merged.maxPlayers) || base.maxPlayers, 2, 9),
    isPrivate: !!merged.isPrivate,
    autoStartWhenReady: !!merged.autoStartWhenReady,
    rebuyEnabled: !!merged.rebuyEnabled,
    tableTheme: VALID_THEMES.includes(merged.tableTheme) ? merged.tableTheme : 'midnight',
    gameMode: VALID_MODES.includes(merged.gameMode) ? merged.gameMode : 'assisted',
  };
}
