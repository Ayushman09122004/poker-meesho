// Say-it-out-loud chat lines. Everything here is a real recording:
//  - your character's catchphrase: their actual voice clip (characterFx), or a natural-voice
//    recording for the few characters without one;
//  - character lines and trash talk: natural (neural) voice recordings, in a voice that suits the
//    character — deep for villains, British for Shelby & co, goofy for the comedians (talkData);
//  - pop-culture quotes and the soundboard: the real movie/game/meme clips (popData).
// The browser's speech engine is only a fallback if a recording can't be played.
import { characterForSeed } from './characters';
import { CHARACTER_CLIPS, CHARACTER_VOICE, COMMON_CLIPS, COMMON_LINES } from './talkData';
import { POP_CULTURE, SOUND_BOARD } from './popData';

export { COMMON_LINES, POP_CULTURE, SOUND_BOARD };

/** Two extra lines per character, in their style. */
const CHARACTER_LINES: Record<string, string[]> = {
  scorpion: ['Your chips belong to me!', 'Toasty!'],
  sukuna: ['Know your place, fool.', 'Stand proud. You folded well.'],
  'darth-vader': ['I am your dealer.', 'You underestimate the power of the river.'],
  joker: ["Let's put a smile on that face!", 'You call that a poker face?'],
  venom: ['We will eat your chips!', 'Tasty bluff. We want more.'],
  'ghost-rider': ['Your bluff burns, sinner.', 'Pay for your sins. Call.'],
  spawn: ['I came back from hell for this pot.', 'Your luck just died.'],
  deadpool: ['Maximum effort! Minimum cards!', 'Fourth wall says you are bluffing.'],
  'doom-slayer': ['Rip and tear your stack!', 'The only thing they fear is my all-in.'],
  kratos: ['Do not be sorry. Be better.', 'Boy. Fold.'],
  vergil: ['You are not worthy of this pot.', 'Motivated? No. Just better.'],
  dante: ["Let's rock, baby!", 'This party is getting crazy!'],
  'shao-kahn': ['You are nothing!', "It's official: you suck!"],
  'noob-saibot': ['Noob.', 'Welcome to the shadows, noob.'],
  'sub-zero': ['Your chips are frozen.', 'Cold hands. Colder bluffs.'],
  homelander: ['I am stronger. I am smarter. I am better.', 'Nobody calls me.'],
  'billy-butcher': ['Oi! You absolute muppet!', 'Diabolical play, mate.'],
  negan: ['Eeny, meeny, miny, moe…', 'You are gonna pay for that call.'],
  hannibal: ['I can smell your fear from here.', 'Your bluff is… delicious.'],
  'john-wick': ['People keep asking if I am bluffing.', 'Consequences.'],
  punisher: ['You call that a bet? I call that a mistake.', 'No mercy. No folds.'],
  blade: ['Some mothers do always try to bluff uphill.', 'Your chips are already dead.'],
  rorschach: ['None of you understand. I am not locked in this hand with you.', 'Never fold. Not even in the face of Armageddon.'],
  batman: ['Where are the chips?!', 'I work alone. And I win alone.'],
  wolverine: ['I am the best there is at what I do.', 'Fold, bub.'],
  geralt: ['Hmm.', 'Wind is howling. So are you.'],
  'arthur-morgan': ['We are thieves in a world that do not want us no more.', 'You are a fool, partner.'],
  'jin-sakai': ['Honor died on the river.', 'The ghost takes this pot.'],
  'agent-47': ['Target eliminated.', 'Nothing personal. Just business.'],
  'leon-kennedy': ['Your right hand comes off?', 'No thanks, bro.'],
  'solid-snake': ['Snake? SNAAAKE!', 'Brother, you are bluffing.'],
  'master-chief': ['Finish the fight. And the pot.', 'Sir. Finishing this hand.'],
  neo: ['There is no spoon. Only my all-in.', 'I know poker.'],
  'jack-sparrow': ['This is the hand you will always remember as the hand you almost won.', 'Savvy?'],
  'thomas-shelby': ['I do not pay for bluffs.', 'I do not bluff. I just win.'],
  'walter-white': ['I am the one who calls.', 'You are goddamn right.'],
  'saul-goodman': ['Objection! That bluff is illegal.', 'I got you, pal. Not really.'],
  'tony-montana': ['The world is yours… if you call.', 'Every dog has his day.'],
  'sung-jin-woo': ['Level up.', 'My shadows saw your cards.'],
  itachi: ['Foolish little brother.', 'Your bluff is an illusion.'],
  madara: ['Dance for me.', 'You think you can bluff me?'],
  toji: ['I am the one who will take all your chips.', 'Nothing personal, kid.'],
  aizen: ['All according to plan.', 'Since when were you under the impression you were winning?'],
  hisoka: ['Ooh, such a juicy pot.', 'Bungee gum has the properties of both a call and a raise.'],
  levi: ['Give up on your dreams and fold.', 'Disgusting play.'],
  eren: ['I will keep moving forward!', 'If you do not fight, you cannot win!'],
  'danny-devito': ['I am an icon.', 'Can I offer you a nice egg in this trying time?'],
  'mr-bean': ['Hehehe!', 'Teddy says you are bluffing.'],
  shrek: ['Ogres are like poker players. We have layers.', 'Better out than in!'],
  homer: ["D'oh!", 'Mmm… chips.'],
  'peter-griffin': ['Freakin sweet!', 'Roadhouse!'],
  'michael-scott': ['I declare… BANKRUPTCY!', 'No! God! No! God please no!'],
  dwight: ['False.', 'Identity theft is not a joke, Jim!'],
  'nicolas-cage': ['I am going to steal the Declaration of Independence. And your chips.', 'How in the name of Zeus did you call that?'],
  'jack-black': ['Chicken jockey!', 'You are not hardcore unless you live hardcore!'],
};

/** The extra lines this character can say (besides the catchphrase). */
export function characterLinesFor(seed: string): string[] {
  return CHARACTER_LINES[characterForSeed(seed).id] ?? [];
}

/**
 * The recording to play when a player with this avatar sends `text`, or null if the text isn't
 * one of the say-it-out-loud lines (then it's just a chat message).
 */
export function clipForLine(text: string, seed: string): string | null {
  const id = characterForSeed(seed).id;
  const pop = POP_CULTURE.find((p) => p.text === text) ?? SOUND_BOARD.find((s) => s.text === text);
  if (pop) return pop.url;
  const own = CHARACTER_CLIPS[id]?.[text];
  if (own) return own;
  const common = COMMON_CLIPS[text];
  if (common) return common[CHARACTER_VOICE[id] ?? 'hero'];
  return null;
}

/** Whether `text`, sent by a player with this avatar, is one of the lines that gets spoken aloud. */
export function isSpeakableLine(text: string, seed: string): boolean {
  return COMMON_LINES.includes(text) || characterLinesFor(seed).includes(text);
}

/** Fallback speech-engine voice for this character, if a recording fails to play. */
export function speechProfile(seed: string): { pitch: number; rate: number; variant: number } {
  const id = characterForSeed(seed).id;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const voice = CHARACTER_VOICE[id];
  if (voice === 'deep') return { pitch: 0.45, rate: 0.9, variant: h };
  if (voice === 'funny') return { pitch: 1.5, rate: 1.1, variant: h };
  return { pitch: 0.95, rate: 1, variant: h };
}
