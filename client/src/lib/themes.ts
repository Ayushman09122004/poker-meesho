// Visual config for each table theme: felt, padded rail, room backdrop, and which animated
// ambience layer (if any) plays around the table.
import { TableTheme } from '../../../shared/types';

export type Ambience = 'none' | 'embers' | 'petals' | 'rain' | 'dust' | 'code';

export interface ThemeLook {
  felt: { light: string; dark: string };
  rail: [string, string];
  room: string;
  ambience: Ambience;
}

export const THEME_LOOK: Record<TableTheme, ThemeLook> = {
  midnight: { felt: { light: '#3f86b8', dark: '#1d4f7a' }, rail: ['#8a9bb0', '#3c4a5c'], room: '#1f3f66', ambience: 'none' },
  emerald: { felt: { light: '#2fa776', dark: '#0f5c3d' }, rail: ['#8a6a48', '#3d2a17'], room: '#163f30', ambience: 'none' },
  crimson: { felt: { light: '#b0384f', dark: '#5c1225' }, rail: ['#7a6a5a', '#2e231a'], room: '#4a1824', ambience: 'none' },
  royal: { felt: { light: '#6a4fb0', dark: '#2b1c5c' }, rail: ['#a39abf', '#3d3557'], room: '#2c2152', ambience: 'none' },
  // Mortal Kombat-style stone arena with torch embers.
  arena: { felt: { light: '#8a4a22', dark: '#3a1608' }, rail: ['#6b6258', '#2a2420'], room: '#4a1a08', ambience: 'embers' },
  // Anime night with drifting cherry blossoms.
  sakura: { felt: { light: '#c46a92', dark: '#5a1f42' }, rail: ['#3a2a35', '#120a10'], room: '#3a1630', ambience: 'petals' },
  // Rainy rooftop under the Bat-signal.
  gotham: { felt: { light: '#3a4a5e', dark: '#141c27' }, rail: ['#4a4f58', '#15181d'], room: '#141c2a', ambience: 'rain' },
  // Saloon table with lantern light and floating dust.
  western: { felt: { light: '#5f8a4a', dark: '#2a4220' }, rail: ['#a2703c', '#4a2c12'], room: '#4a2c14', ambience: 'dust' },
  // Green code rain.
  matrix: { felt: { light: '#1f5a32', dark: '#06200f' }, rail: ['#2a3a2e', '#0a120c'], room: '#03140a', ambience: 'code' },
};

export function themeLook(theme: string | undefined): ThemeLook {
  return THEME_LOOK[(theme as TableTheme) ?? 'midnight'] ?? THEME_LOOK.midnight;
}
