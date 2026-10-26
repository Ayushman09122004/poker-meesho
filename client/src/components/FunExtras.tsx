import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { MEMES, MEME_PLAY_MS, TIER_LABEL } from '../../../shared/memes';
import { useGameStore } from '../store/gameStore';
import { playMeme } from '../hooks/useGameConnection';
import { AvatarBadge } from './AvatarBadge';
import { fxForSeed } from '../lib/characterFx';
import { characterForSeed } from '../lib/characters';
import { CHARACTER_CLIPS } from '../lib/talkData';
import { sound } from '../lib/sound';

// Win-streak meme tickets (cash one in → a meme plays on everyone's screen before the next deal)
// and character entrances (a banner + their voice line when someone sits down).

const TIER_COLOR: Record<number, string> = {
  1: 'from-sky-500 to-sky-700',
  2: 'from-emerald-500 to-emerald-700',
  3: 'from-fuchsia-500 to-fuchsia-700',
  4: 'from-amber-400 to-orange-600',
};

/** Small 🎟️ badge on a player's avatar showing how many meme tickets they hold. */
export function TicketBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="absolute -right-1 top-0 z-10 text-[12px] font-extrabold px-1.5 py-0.5 rounded-full bg-gradient-to-b from-fuchsia-500 to-purple-700 text-white border-2 border-ink-950"
      title={`${count} meme ticket${count === 1 ? '' : 's'} — earned on win streaks`}
    >
      🎟️{count}
    </span>
  );
}

/** Top-bar button + picker to cash in a meme ticket. */
export function MemeButton({ snapshot, selfId }: { snapshot: GameStateSnapshot; selfId: string | null }) {
  const [open, setOpen] = useState(false);
  const tickets = (selfId && snapshot.memeTickets?.[selfId]) || [];
  if (tickets.length === 0 && !open) return null;
  const best = tickets.length ? Math.max(...tickets) : 0;
  return (
    <>
      <button
        onClick={() => {
          sound.uiClick();
          setOpen(true);
        }}
        title="Cash in a meme ticket — it plays on everyone's screen"
        className="h-8 sm:h-9 px-3 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-700 hover:brightness-110 transition shadow-glow"
      >
        🎉 Memes ({tickets.length})
      </button>
      {createPortal(
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-fuchsia-400/40 bg-ink-900 p-5 shadow-card"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-display text-xl font-extrabold text-fuchsia-200">🎟️ Cash in a meme</p>
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-xl leading-none">
                  ×
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                Your tickets: {tickets.length ? tickets.map((t) => TIER_LABEL[t]).join(', ') : 'none'} · it plays on everyone's screen before the next deal.
              </p>
              {[1, 2, 3, 4].map((tier) => (
                <div key={tier} className="mb-4">
                  <p className="text-xs uppercase tracking-wide text-slate-300 mb-2">
                    <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${TIER_COLOR[tier]} text-white font-bold mr-2`}>{TIER_LABEL[tier]} streak</span>
                    {best < tier && <span className="text-slate-500">🔒 win {tier + 1} in a row to unlock</span>}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {MEMES.filter((m) => m.tier === tier).map((m) => {
                      const can = best >= tier;
                      return (
                        <button
                          key={m.id}
                          disabled={!can}
                          onClick={() => {
                            sound.uiClick();
                            playMeme(m.id);
                            setOpen(false);
                          }}
                          className={`rounded-xl overflow-hidden border-2 text-left transition ${
                            can ? 'border-white/10 hover:border-fuchsia-400 hover:scale-[1.02]' : 'border-white/5 opacity-40 cursor-not-allowed'
                          }`}
                        >
                          <video src={m.url} autoPlay loop muted playsInline className="w-full aspect-video object-cover bg-black" />
                          <p className="px-2 py-1.5 text-sm font-semibold text-slate-100 bg-ink-800">{m.title}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

/** Plays cashed-in memes one at a time over the whole screen. */
export function MemeOverlay() {
  const memes = useGameStore((s) => s.memes);
  const players = useGameStore((s) => s.snapshot?.players);
  const current = memes[0];
  const meme = current ? MEMES.find((m) => m.id === current.memeId) : undefined;
  const who = current ? players?.find((p) => p.id === current.playerId) : undefined;
  // Timers live in a ref, not in an effect cleanup that re-runs on every state change.
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (!current || started.current === current.id) return;
    started.current = current.id;
    sound.bigWin();
    if (meme?.sound) sound.playEffect(meme.sound);
    const id = current.id;
    setTimeout(() => useGameStore.getState().shiftMeme(id), MEME_PLAY_MS);
  }, [current, meme]);

  return (
    <AnimatePresence>
      {current && meme && (
        <motion.div
          key={current.id}
          className="fixed inset-0 z-[46] flex flex-col items-center justify-center pointer-events-none bg-black/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.4, rotate: -6 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
            className={`rounded-3xl p-2 bg-gradient-to-br ${TIER_COLOR[meme.tier]} shadow-glow`}
          >
            <video src={meme.url} autoPlay loop muted playsInline className="block max-h-[52vh] max-w-[70vw] rounded-2xl bg-black" />
          </motion.div>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-4 px-5 py-2 rounded-full bg-ink-950/90 border border-white/15 text-white font-display font-extrabold text-xl"
          >
            🎉 {who?.name ?? 'Someone'} cashed a {TIER_LABEL[meme.tier]} meme: {meme.title}!
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const ENTRANCE_MS = 3600;

/** Fighting-game style entrance banner (with their voice line) when someone sits down. */
export function EntranceBanner() {
  const entrances = useGameStore((s) => s.entrances);
  const current = entrances[0];
  const started = useRef<string | null>(null);
  useEffect(() => {
    if (!current || started.current === current.id) return;
    started.current = current.id;
    const fx = fxForSeed(current.avatarSeed);
    if (fx.voice) sound.playVoice(fx.voice);
    else {
      // Characters without a real clip have a natural-voice recording of their catchphrase.
      const url = CHARACTER_CLIPS[characterForSeed(current.avatarSeed).id]?.[fx.line];
      if (url) sound.playVoice({ url, gain: 1, length: 5 });
      else sound.stamp();
    }
    const id = current.id;
    setTimeout(() => useGameStore.getState().shiftEntrance(id), ENTRANCE_MS);
  }, [current]);

  const fx = current ? fxForSeed(current.avatarSeed) : null;
  const character = current ? characterForSeed(current.avatarSeed) : null;
  return (
    <div className="fixed top-16 inset-x-0 z-[44] flex justify-center pointer-events-none">
      <AnimatePresence>
        {current && fx && (
          <motion.div
            key={current.id}
            initial={{ x: '-120vw', skewX: -12 }}
            animate={{ x: 0, skewX: 0 }}
            exit={{ x: '120vw', skewX: 12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 18 }}
            className="relative flex items-center gap-4 pl-3 pr-8 py-3 rounded-2xl bg-ink-950/90 border-2 shadow-card overflow-hidden"
            style={{ borderColor: fx.color, boxShadow: `0 0 40px ${fx.color}66` }}
          >
            <motion.span
              className="absolute inset-0"
              style={{ background: `linear-gradient(90deg, transparent, ${fx.color}33, transparent)` }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
            />
            <motion.div initial={{ scale: 0.3, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.2, type: 'spring' }}>
              <AvatarBadge seed={current.avatarSeed} size={76} />
            </motion.div>
            <div className="relative">
              <p className="text-[11px] tracking-[0.3em] font-bold uppercase" style={{ color: fx.color }}>
                A challenger appears
              </p>
              <p className="font-display text-2xl font-black text-white leading-tight">{current.name}</p>
              {character && character.name !== current.name && <p className="text-xs text-slate-400">as {character.name}</p>}
              <p className="text-sm text-slate-200 italic mt-0.5">“{fx.line}”</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
