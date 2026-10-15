// Each persona's signature win move: the effect that plays over the table when they take a pot,
// plus a catchphrase shown in a speech bubble (and offered as a quick chat line).
import { characterForSeed } from './characters';

export type FxKind =
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'shadow'
  | 'blood'
  | 'sharingan'
  | 'gold'
  | 'slash'
  | 'bullets'
  | 'rage'
  | 'smoke'
  | 'sakura'
  | 'matrix'
  | 'laser'
  | 'crystal'
  | 'cards'
  | 'slime'
  | 'bees'
  | 'confetti'
  | 'donuts'
  | 'bears'
  | 'boom';

export interface CharacterFx {
  kind: FxKind;
  line: string;
  /** Main colour for sparks, bolts and the speech bubble border. */
  color: string;
}

const FX: Record<string, CharacterFx> = {
  scorpion: { kind: 'fire', line: 'GET OVER HERE!', color: '#ff8a1a' },
  sukuna: { kind: 'blood', line: 'Know your place, fool.', color: '#e11d48' },
  'darth-vader': { kind: 'lightning', line: 'I find your lack of faith disturbing.', color: '#ef4444' },
  joker: { kind: 'cards', line: 'Why so serious?', color: '#a855f7' },
  venom: { kind: 'shadow', line: 'WE ARE VENOM!', color: '#e5e7eb' },
  'ghost-rider': { kind: 'fire', line: 'Look into my eyes…', color: '#ff6a00' },
  spawn: { kind: 'shadow', line: "Hell's not big enough for me.", color: '#22c55e' },
  deadpool: { kind: 'boom', line: 'MAXIMUM EFFORT!', color: '#ef4444' },
  'doom-slayer': { kind: 'rage', line: 'RIP AND TEAR!', color: '#ef4444' },
  kratos: { kind: 'rage', line: 'BOY!', color: '#dc2626' },
  vergil: { kind: 'slash', line: 'I need more power.', color: '#60a5fa' },
  dante: { kind: 'slash', line: 'JACKPOT!', color: '#ef4444' },
  'shao-kahn': { kind: 'rage', line: "It's official… you suck!", color: '#f59e0b' },
  'noob-saibot': { kind: 'shadow', line: 'Join the darkness.', color: '#94a3b8' },
  'sub-zero': { kind: 'ice', line: 'Flawless victory.', color: '#7dd3fc' },
  homelander: { kind: 'laser', line: 'I can do whatever I want!', color: '#ef4444' },
  'billy-butcher': { kind: 'blood', line: 'Oi! Diabolical.', color: '#b91c1c' },
  negan: { kind: 'blood', line: 'Eeny, meeny, miny… moe.', color: '#b91c1c' },
  hannibal: { kind: 'blood', line: "I'm having an old friend for dinner.", color: '#991b1b' },
  'john-wick': { kind: 'bullets', line: "Yeah… I'm thinking I'm back.", color: '#facc15' },
  punisher: { kind: 'bullets', line: 'One batch. Two batch. Penny and dime.', color: '#f8fafc' },
  blade: { kind: 'slash', line: 'Some always try to ice-skate uphill.', color: '#dc2626' },
  rorschach: { kind: 'smoke', line: "I'm not locked in here with you…", color: '#d6b98c' },
  batman: { kind: 'shadow', line: "I'm Batman.", color: '#facc15' },
  wolverine: { kind: 'slash', line: "I'm the best there is at what I do.", color: '#facc15' },
  geralt: { kind: 'fire', line: 'Hmm. Wind’s howling.', color: '#f59e0b' },
  'arthur-morgan': { kind: 'bullets', line: 'We’re thieves in a world that don’t want us.', color: '#d97706' },
  'jin-sakai': { kind: 'sakura', line: 'For Tsushima.', color: '#f472b6' },
  'agent-47': { kind: 'gold', line: 'Contract complete.', color: '#dc2626' },
  'leon-kennedy': { kind: 'bullets', line: "Where's everyone going? Bingo?", color: '#facc15' },
  'solid-snake': { kind: 'smoke', line: 'Kept you waiting, huh?', color: '#84cc16' },
  'master-chief': { kind: 'lightning', line: 'Finish the fight.', color: '#60a5fa' },
  neo: { kind: 'matrix', line: 'Whoa.', color: '#22c55e' },
  'jack-sparrow': { kind: 'gold', line: 'Why is the rum always gone?', color: '#f59e0b' },
  'thomas-shelby': { kind: 'smoke', line: 'By order of the Peaky Blinders!', color: '#94a3b8' },
  'walter-white': { kind: 'crystal', line: 'Say my name.', color: '#38bdf8' },
  'saul-goodman': { kind: 'gold', line: 'Better call Saul!', color: '#facc15' },
  'tony-montana': { kind: 'gold', line: 'Say hello to my little friend!', color: '#f8fafc' },
  'sung-jin-woo': { kind: 'shadow', line: 'ARISE.', color: '#a78bfa' },
  itachi: { kind: 'sharingan', line: 'You lack hatred.', color: '#dc2626' },
  madara: { kind: 'sharingan', line: 'Wake up to reality.', color: '#dc2626' },
  toji: { kind: 'slash', line: "Don't take it personally.", color: '#94a3b8' },
  aizen: { kind: 'lightning', line: 'Since when were you under the impression…', color: '#a78bfa' },
  hisoka: { kind: 'cards', line: '♠ Bungee gum stretches… ♥', color: '#ec4899' },
  levi: { kind: 'slash', line: 'Tch.', color: '#22c55e' },
  eren: { kind: 'rage', line: 'TATAKAE!', color: '#16a34a' },
  'danny-devito': { kind: 'confetti', line: 'I’m Danny DeVito!', color: '#f59e0b' },
  'mr-bean': { kind: 'confetti', line: 'Teddy!', color: '#a16207' },
  shrek: { kind: 'slime', line: 'What are you doing in my swamp?!', color: '#84cc16' },
  homer: { kind: 'donuts', line: 'WOOHOO!', color: '#facc15' },
  'peter-griffin': { kind: 'confetti', line: 'Hehehehehe.', color: '#22c55e' },
  'michael-scott': { kind: 'confetti', line: "That's what she said!", color: '#3b82f6' },
  dwight: { kind: 'bears', line: 'Bears. Beets. Battlestar Galactica.', color: '#eab308' },
  'nicolas-cage': { kind: 'bees', line: 'NOT THE BEES!', color: '#facc15' },
  'jack-black': { kind: 'boom', line: 'THIS IS THE GREATEST POT IN THE WORLD!', color: '#ef4444' },
};

const DEFAULT_FX: CharacterFx = { kind: 'gold', line: 'Ship it!', color: '#e3b64f' };

export function fxForSeed(seed: string): CharacterFx {
  return FX[characterForSeed(seed).id] ?? DEFAULT_FX;
}
