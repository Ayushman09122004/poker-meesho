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
  /** The character's own voice clip (public/voices/<id>.mp3), when one was found. */
  voice?: VoiceClip;
}

export interface VoiceClip {
  url: string;
  /** Volume multiplier that brings this clip to a common loudness. */
  gain: number;
  /** Seconds into the clip where the line starts. */
  start: number;
  /** How long to play before fading out (seconds). */
  length: number;
}

// Voice clips in public/voices, checked by speech recognition (the line is really in the clip)
// and loudness-matched: gain brings each clip's loudest half-second to the same level, and
// start/length skip intros and stop right after the line. Characters not listed keep the
// synthesized sound.
const VOICES: Record<string, { gain: number; start?: number; length?: number }> = {
  scorpion: { gain: 0.86 },
  sukuna: { gain: 3.75 },
  'darth-vader': { gain: 0.68 },
  joker: { gain: 2.93 },
  venom: { gain: 1.0, length: 3.5 },
  'ghost-rider': { gain: 1.01 },
  deadpool: { gain: 1.44 },
  'doom-slayer': { gain: 2.2, length: 4.4 },
  kratos: { gain: 5.3 },
  vergil: { gain: 3.6 },
  dante: { gain: 3.8 },
  'shao-kahn': { gain: 3.9 },
  'noob-saibot': { gain: 0.81 },
  'sub-zero': { gain: 0.88 },
  homelander: { gain: 0.8, length: 4 },
  'billy-butcher': { gain: 2.19, start: 2.8, length: 2.2 },
  negan: { gain: 5.2 },
  batman: { gain: 1.37 },
  wolverine: { gain: 1.25 },
  geralt: { gain: 0.98, start: 3.7, length: 4.5 },
  'arthur-morgan': { gain: 0.9 },
  'agent-47': { gain: 4.7, length: 4 },
  'leon-kennedy': { gain: 8 },
  'solid-snake': { gain: 2.07 },
  'master-chief': { gain: 2.21 },
  neo: { gain: 0.98 },
  'jack-sparrow': { gain: 8 },
  'thomas-shelby': { gain: 2.85 },
  'walter-white': { gain: 4.1, start: 4.0, length: 2.5 },
  'saul-goodman': { gain: 1.07 },
  'tony-montana': { gain: 1.26 },
  'sung-jin-woo': { gain: 1.65 },
  itachi: { gain: 0.65 },
  madara: { gain: 0.76, length: 3 },
  aizen: { gain: 2.11, length: 4.2 },
  hisoka: { gain: 3.66 },
  eren: { gain: 3.48 },
  'danny-devito': { gain: 8, length: 2.3 },
  'mr-bean': { gain: 1.44 },
  shrek: { gain: 0.94 },
  homer: { gain: 1.09 },
  'peter-griffin': { gain: 0.62, length: 3.5 },
  'michael-scott': { gain: 4.8 },
  dwight: { gain: 1.57, length: 5.8 },
  'nicolas-cage': { gain: 3.25, length: 3 },
  'jack-black': { gain: 1.5, length: 3.3 },
};

const FX: Record<string, CharacterFx> = {
  scorpion: { kind: 'fire', line: 'GET OVER HERE!', color: '#ff8a1a' },
  sukuna: { kind: 'blood', line: "Domain Expansion: Malevolent Shrine.", color: '#e11d48' },
  'darth-vader': { kind: 'lightning', line: 'I find your lack of faith disturbing.', color: '#ef4444' },
  joker: { kind: 'cards', line: 'Why so serious?', color: '#a855f7' },
  venom: { kind: 'shadow', line: 'WE ARE VENOM!', color: '#e5e7eb' },
  'ghost-rider': { kind: 'fire', line: 'Look into my eyes…', color: '#ff6a00' },
  spawn: { kind: 'shadow', line: "Hell's not big enough for me.", color: '#22c55e' },
  deadpool: { kind: 'boom', line: '🎶 Bye bye bye! 🎶', color: '#ef4444' },
  'doom-slayer': { kind: 'rage', line: 'Rip and tear, until it is done.', color: '#ef4444' },
  kratos: { kind: 'rage', line: 'BOY!', color: '#dc2626' },
  vergil: { kind: 'slash', line: 'I need more power.', color: '#60a5fa' },
  dante: { kind: 'slash', line: 'JACKPOT!', color: '#ef4444' },
  'shao-kahn': { kind: 'rage', line: "That was pathetic!", color: '#f59e0b' },
  'noob-saibot': { kind: 'shadow', line: "Noob Saibot wins.", color: '#94a3b8' },
  'sub-zero': { kind: 'ice', line: "Sub-Zero wins. Flawless.", color: '#7dd3fc' },
  homelander: { kind: 'laser', line: 'I can do whatever I want!', color: '#ef4444' },
  'billy-butcher': { kind: 'blood', line: 'That was diabolical.', color: '#b91c1c' },
  negan: { kind: 'blood', line: "Easy peasy, lemon squeezy.", color: '#b91c1c' },
  hannibal: { kind: 'blood', line: "I'm having an old friend for dinner.", color: '#991b1b' },
  'john-wick': { kind: 'bullets', line: "Yeah… I'm thinking I'm back.", color: '#facc15' },
  punisher: { kind: 'bullets', line: 'One batch. Two batch. Penny and dime.', color: '#f8fafc' },
  blade: { kind: 'slash', line: 'Some always try to ice-skate uphill.', color: '#dc2626' },
  rorschach: { kind: 'smoke', line: "I'm not locked in here with you…", color: '#d6b98c' },
  batman: { kind: 'shadow', line: "I'm Batman.", color: '#facc15' },
  wolverine: { kind: 'slash', line: "Let's go, bub!", color: '#facc15' },
  geralt: { kind: 'fire', line: "If I have to choose between one evil and another…", color: '#f59e0b' },
  'arthur-morgan': { kind: 'bullets', line: "Outta the damn way!", color: '#d97706' },
  'jin-sakai': { kind: 'sakura', line: 'For Tsushima.', color: '#f472b6' },
  'agent-47': { kind: 'gold', line: "Well done, 47.", color: '#dc2626' },
  'leon-kennedy': { kind: 'bullets', line: "Where's everyone going? Bingo?", color: '#facc15' },
  'solid-snake': { kind: 'smoke', line: 'Kept you waiting, huh?', color: '#84cc16' },
  'master-chief': { kind: 'lightning', line: "I need a weapon.", color: '#60a5fa' },
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
  aizen: { kind: 'lightning', line: "Welcome to my Soul Society.", color: '#a78bfa' },
  hisoka: { kind: 'cards', line: '♠ Bungee gum stretches… ♥', color: '#ec4899' },
  levi: { kind: 'slash', line: 'Tch.', color: '#22c55e' },
  eren: { kind: 'rage', line: 'TATAKAE!', color: '#16a34a' },
  'danny-devito': { kind: 'confetti', line: "So anyway, I started blasting.", color: '#f59e0b' },
  'mr-bean': { kind: 'confetti', line: "Mr. Beeeean!", color: '#a16207' },
  shrek: { kind: 'slime', line: 'What are you doing in my swamp?!', color: '#84cc16' },
  homer: { kind: 'donuts', line: 'WOOHOO!', color: '#facc15' },
  'peter-griffin': { kind: 'confetti', line: 'Hehehehehe.', color: '#22c55e' },
  'michael-scott': { kind: 'confetti', line: "That's what she said!", color: '#3b82f6' },
  dwight: { kind: 'bears', line: 'Bears. Beets. Battlestar Galactica.', color: '#eab308' },
  'nicolas-cage': { kind: 'bees', line: 'NOT THE BEES!', color: '#facc15' },
  'jack-black': { kind: 'boom', line: "I… am Steve.", color: '#ef4444' },
};

const DEFAULT_FX: CharacterFx = { kind: 'gold', line: 'Ship it!', color: '#e3b64f' };

export function fxForSeed(seed: string): CharacterFx {
  const id = characterForSeed(seed).id;
  const fx = FX[id] ?? DEFAULT_FX;
  const v = VOICES[id];
  return v ? { ...fx, voice: { url: `/voices/${id}.mp3`, gain: v.gain, start: v.start ?? 0, length: v.length ?? 4.5 } } : fx;
}
