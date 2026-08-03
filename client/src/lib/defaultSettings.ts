import { RoomSettings } from '../../../shared/types';

export function defaultClientSettings(): Partial<RoomSettings> {
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
