import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameStateSnapshot, PublicPlayer } from '../../../shared/types';
import { addBot, answerBotRebuy, setBotLevel } from '../hooks/useGameConnection';
import { CHARACTERS, seedForCharacter } from '../lib/characters';
import { getAvatar } from '../lib/avatar';
import { AvatarPicker } from './AvatarPicker';
import { AvatarBadge } from './AvatarBadge';
import { sound } from '../lib/sound';

// Host-only tools for computer players: an "Add bot" dialog (pick the bot's character and one of
// five difficulty levels) and a compact difficulty switcher for bots already seated.

export const BOT_LEVELS = [
  { level: 1, name: 'Fish', icon: '🐟', blurb: 'Calls everything, barely reads cards' },
  { level: 2, name: 'Rookie', icon: '🐣', blurb: 'Knows the basics, plays passive' },
  { level: 3, name: 'Regular', icon: '🎯', blurb: 'Solid — plays the odds' },
  { level: 4, name: 'Shark', icon: '🦈', blurb: 'Sharp, aggressive, bluffs sometimes' },
  { level: 5, name: 'Pro', icon: '👑', blurb: 'Near-perfect odds, tricky and relentless' },
] as const;

export function botLevelInfo(level: number) {
  return BOT_LEVELS[Math.min(5, Math.max(1, level)) - 1];
}

/** Picks a character nobody at the table is using yet (falls back to any). */
function randomFreeSeed(takenSeeds: string[]): string {
  const free = CHARACTERS.filter((c) => !takenSeeds.includes(seedForCharacter(c.id)));
  const pool = free.length > 0 ? free : CHARACTERS;
  return seedForCharacter(pool[Math.floor(Math.random() * pool.length)].id);
}

export function AddBotButton({ players, maxPlayers, className = '' }: { players: PublicPlayer[]; maxPlayers: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const full = players.length >= maxPlayers;
  return (
    <>
      <button
        disabled={full}
        onClick={() => {
          sound.uiClick();
          setOpen(true);
        }}
        title={full ? 'Table is full' : 'Add a computer player'}
        className={`px-3 py-2 rounded-lg bg-ink-800 border border-sky-400/40 text-sm text-sky-200 hover:bg-ink-700 disabled:opacity-40 transition ${className}`}
      >
        🤖 Add bot
      </button>
      {/* Portalled to <body>: an animated (transformed) parent would otherwise trap this
          full-screen dialog inside its own box and stacking layer. */}
      {open && createPortal(<AddBotDialog players={players} onClose={() => setOpen(false)} />, document.body)}
    </>
  );
}

function AddBotDialog({ players, onClose }: { players: PublicPlayer[]; onClose: () => void }) {
  const taken = players.map((p) => p.avatarSeed);
  const [seed, setSeed] = useState(() => randomFreeSeed(taken));
  const [level, setLevel] = useState(3);
  const persona = getAvatar(seed);

  const add = () => {
    sound.uiClick();
    addBot(persona.name, seed, level);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-ink-900 border border-white/10 rounded-2xl shadow-card p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-gold-light">🤖 Add a bot</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <AvatarBadge seed={seed} size={72} />
          <div className="min-w-0">
            <p className="font-display text-lg font-bold text-white truncate">{persona.name}</p>
            <p className="text-xs text-slate-400">{persona.title}</p>
            <button onClick={() => setSeed(randomFreeSeed(taken))} className="mt-1 text-xs text-sky-300 hover:text-sky-200 underline">
              🎲 Random character
            </button>
          </div>
        </div>

        <p className="text-slate-300 text-xs uppercase tracking-wide font-semibold mb-1.5">Difficulty</p>
        <div className="grid grid-cols-5 gap-1.5 mb-4">
          {BOT_LEVELS.map((l) => (
            <button
              key={l.level}
              onClick={() => setLevel(l.level)}
              className={`rounded-xl border-2 px-1 py-2 text-center transition ${
                level === l.level ? 'border-gold bg-gold/10' : 'border-white/10 bg-ink-800 hover:bg-ink-700'
              }`}
            >
              <div className="text-2xl leading-none">{l.icon}</div>
              <div className={`text-[11px] font-bold mt-1 ${level === l.level ? 'text-gold-light' : 'text-slate-300'}`}>
                {l.level}. {l.name}
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 -mt-2 mb-4">{botLevelInfo(level).blurb}</p>

        <p className="text-slate-300 text-xs uppercase tracking-wide font-semibold mb-1.5">Character</p>
        <AvatarPicker value={seed} onChange={setSeed} />

        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-ink-800 border border-white/10 text-slate-300">
            Cancel
          </button>
          <button onClick={add} className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-display font-bold shadow-glow hover:brightness-110">
            Seat {persona.name} ({botLevelInfo(level).name})
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Host-only cards for bots that ran out of chips and are asking to buy back in. Shown at the top
 * of the table until the host answers.
 */
export function BotRebuyRequests({ snapshot }: { snapshot: GameStateSnapshot }) {
  const requests = (snapshot.botRebuyRequests ?? [])
    .map((id) => snapshot.players.find((p) => p.id === id))
    .filter((p): p is PublicPlayer => !!p);
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {requests.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: -16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-sky-400/50 bg-ink-900/95 backdrop-blur px-4 py-2.5 shadow-card w-[min(94vw,520px)]"
          >
            <AvatarBadge seed={p.avatarSeed} size={40} />
            <div className="text-sm flex-1 min-w-0">
              <p className="text-white font-semibold">🤖 {p.name} is out of chips</p>
              <p className="text-slate-400 text-xs">Let them buy back in for {snapshot.settings.startingChips.toLocaleString()} chips?</p>
            </div>
            <button
              onClick={() => {
                sound.uiClick();
                answerBotRebuy(p.id, true);
              }}
              className="shrink-0 ml-2 px-3 py-1.5 rounded-lg bg-gradient-to-b from-emerald-500 to-emerald-700 text-white text-sm font-bold"
            >
              Allow
            </button>
            <button
              onClick={() => {
                sound.uiClick();
                answerBotRebuy(p.id, false);
              }}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-ink-800 border border-white/15 text-slate-300 text-sm"
            >
              No
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Small dropdown to change a seated bot's difficulty (host only). */
export function BotLevelSelect({ player }: { player: PublicPlayer }) {
  return (
    <select
      value={player.botLevel}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setBotLevel(player.id, Number(e.target.value))}
      title="Bot difficulty"
      className="bg-ink-800 border border-white/10 rounded-md text-[11px] text-slate-200 px-1 py-0.5 outline-none focus:border-gold/60"
    >
      {BOT_LEVELS.map((l) => (
        <option key={l.level} value={l.level}>
          {l.icon} {l.level}. {l.name}
        </option>
      ))}
    </select>
  );
}
