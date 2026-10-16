// Visual config for each table theme: felt, padded rail, room backdrop, and which animated
// ambience layer (if any) plays around the table.
import { TableTheme } from '../../../shared/types';

export type Ambience =
  | 'none' | 'embers' | 'petals' | 'rain' | 'dust' | 'code'
  | 'candles' | 'stars' | 'spores' | 'suits' | 'leaves' | 'synthwave' | 'snow' | 'fireflies' | 'donuts' | 'crystals';

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
  // Great Hall: house-red felt, gold rail, floating candles.
  hogwarts: { felt: { light: '#8a2a2a', dark: '#3a0c0c' }, rail: ['#d8b25a', '#6a4a14'], room: '#2a1a10', ambience: 'candles' },
  // A galaxy far, far away: starfield and a lightsaber glow.
  galaxy: { felt: { light: '#2a3550', dark: '#080c18' }, rail: ['#9aa3b0', '#3a404a'], room: '#05070f', ambience: 'stars' },
  // The Upside Down: cold teal felt, drifting spores, red lightning.
  upsidedown: { felt: { light: '#2f4a52', dark: '#0d1a1e' }, rail: ['#4a3a3a', '#1a1010'], room: '#160a0c', ambience: 'spores' },
  // Arkham Asylum: Joker purple and green, card suits floating up.
  arkham: { felt: { light: '#5b2a8a', dark: '#1e0a33' }, rail: ['#3fae4a', '#14501a'], room: '#1a0c2a', ambience: 'suits' },
  // Hidden Leaf: Naruto orange, falling leaves.
  leaf: { felt: { light: '#e0782a', dark: '#7a3208' }, rail: ['#3a2a1a', '#140c06'], room: '#2a1608', ambience: 'leaves' },
  // Vice City: neon sunset over a synthwave grid.
  vicecity: { felt: { light: '#1aa3b8', dark: '#0a3a52' }, rail: ['#ff4fa3', '#8a1a55'], room: '#2a0a3a', ambience: 'synthwave' },
  // Lin Kuei frost: Sub-Zero's ice table with snowfall.
  frost: { felt: { light: '#5aa8d8', dark: '#123a5c' }, rail: ['#d8eef8', '#6a8aa0'], room: '#0c2238', ambience: 'snow' },
  // Shrek's swamp: murky green with fireflies.
  swamp: { felt: { light: '#6a8a2a', dark: '#26360a' }, rail: ['#6a4a2a', '#2a1a0a'], room: '#141e08', ambience: 'fireflies' },
  // Springfield: sky-blue felt, Simpsons-yellow rail, raining donuts.
  springfield: { felt: { light: '#4aa8e8', dark: '#1a5a9a' }, rail: ['#ffd90f', '#b08a00'], room: '#2a4a7a', ambience: 'donuts' },
  // Heisenberg's lab: desert-tan rail, blue crystal sparkles.
  heisenberg: { felt: { light: '#2a8a9a', dark: '#0a3a44' }, rail: ['#c8a46a', '#6a5028'], room: '#2a2214', ambience: 'crystals' },
};

export function themeLook(theme: string | undefined): ThemeLook {
  return THEME_LOOK[(theme as TableTheme) ?? 'midnight'] ?? THEME_LOOK.midnight;
}
