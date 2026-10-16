import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { sendChat, sendEmote } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';
import { fxForSeed } from '../lib/characterFx';
import { COMMON_LINES, POP_CULTURE, SOUND_BOARD, characterLinesFor, clipForLine, speechProfile } from '../lib/trashTalk';

/** One spoken line / sound per player at most this often, so nobody can spam the table. */
const SAY_COOLDOWN_MS = 4000;

const QUICK_EMOJIS = ['👍', '😂', '🔥', '😮', '😢', '🤔', '😎', '🙌', '🃏', '🎉', '😴', '🤯'];
const QUICK_PHRASES = ['Nice hand!', 'Good fold', 'Nh', 'Unlucky', 'Let\'s go!', 'gg'];

export function ChatDock({ embedded = false }: { embedded?: boolean }) {
  const chat = useGameStore((s) => s.chat);
  // Your own character's catchphrase as a one-tap line.
  const mySeed = useGameStore((s) => s.snapshot?.players.find((p) => p.id === s.selfPlayerId)?.avatarSeed);
  const myFx = mySeed ? fxForSeed(mySeed) : null;
  const catchphrase = myFx?.line ?? null;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(embedded);
  const [sayOpen, setSayOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The newest message we've already reacted to (by id — the list is capped, so its length stops growing).
  const lastSeenId = useRef<string | null>(chat[chat.length - 1]?.id ?? null);

  // Say-it-out-loud lines: everyone hears a player's catchphrase in their character's voice, the
  // trash-talk lines read aloud in a voice that suits the character, and soundboard effects.
  const lastSaidAt = useRef(new Map<string, number>());
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    const last = chat[chat.length - 1];
    if (!last || last.id === lastSeenId.current) return;
    const firstLoad = lastSeenId.current === null && chat.length > 1;
    lastSeenId.current = last.id;
    if (firstLoad || last.isSystem) return;
    const sender = useGameStore.getState().snapshot?.players.find((p) => p.id === last.playerId);
    const now = Date.now();
    const canSay = !!sender && now - (lastSaidAt.current.get(sender.id) ?? 0) > SAY_COOLDOWN_MS;
    if (sender && canSay) {
      const fx = fxForSeed(sender.avatarSeed);
      if (last.text === fx.line && fx.voice) {
        lastSaidAt.current.set(sender.id, now);
        sound.playVoice(fx.voice);
        return;
      }
      const clip = clipForLine(last.text, sender.avatarSeed);
      if (clip) {
        lastSaidAt.current.set(sender.id, now);
        // Real recording; if it can't play, the speech engine reads the line instead.
        const profile = speechProfile(sender.avatarSeed);
        sound.playVoice({ url: clip, gain: 1, length: 6 }, () => sound.speak(last.text.replace(/^🎬 /, ''), profile));
        return;
      }
    }
    sound.message();
  }, [chat]);

  const say = (line: string) => {
    sendChat(line);
    setSayOpen(false);
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text.trim());
    setText('');
  }

  const body = (
    <div className={`flex flex-col ${embedded ? 'h-64' : 'h-full'}`}>
      {sayOpen ? (
        <SayPanel catchphrase={catchphrase} characterLines={mySeed ? characterLinesFor(mySeed) : []} onSay={say} />
      ) : (
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm">
        {chat.length === 0 && <p className="text-slate-500 text-xs italic">No messages yet. Say hi 👋</p>}
        {chat.map((m) => (
          <div key={m.id} className={m.isSystem ? 'text-slate-500 text-xs italic' : ''}>
            {!m.isSystem && <span className="text-gold-light font-medium mr-1.5">{m.name}:</span>}
            <span className={m.isSystem ? '' : 'text-slate-200'}>{m.text}</span>
          </div>
        ))}
      </div>
      )}
      <div className="flex gap-1 px-2 pt-1 overflow-x-auto">
        {QUICK_EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => sendEmote(e)}
            className="text-lg hover:scale-125 transition-transform shrink-0"
            title="React"
          >
            {e}
          </button>
        ))}
      </div>
      <div className="flex gap-1 px-2 pt-1.5 overflow-x-auto">
        <button
          onClick={() => setSayOpen((o) => !o)}
          title="Say something out loud — everyone hears it"
          className={`text-[11px] px-2 py-1 rounded-full border shrink-0 transition font-bold ${
            sayOpen ? 'bg-fuchsia-600 border-fuchsia-300 text-white' : 'bg-fuchsia-900/50 border-fuchsia-400/60 text-fuchsia-100 hover:bg-fuchsia-800/60'
          }`}
        >
          🗣️ Say…
        </button>
        {catchphrase && (
          <button
            onClick={() => sendChat(catchphrase)}
            title={myFx?.voice ? "Say your character's line — everyone hears it in their voice" : "Your character's catchphrase"}
            className="text-[11px] px-2 py-1 rounded-full bg-gold/20 border border-gold/50 hover:bg-gold/30 text-gold-light shrink-0 transition font-semibold"
          >
            {myFx?.voice ? '🔊' : '⭐'} {catchphrase}
          </button>
        )}
        {QUICK_PHRASES.map((p) => (
          <button
            key={p}
            onClick={() => sendChat(p)}
            className="text-[11px] px-2 py-1 rounded-full bg-ink-700 hover:bg-ink-600 text-slate-300 shrink-0 transition"
          >
            {p}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex gap-2 p-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Type a message…"
          className="flex-1 bg-ink-800 border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gold/50"
        />
        <button type="submit" className="px-3 py-1.5 rounded-lg bg-gold text-ink-950 text-sm font-semibold hover:brightness-110 transition">
          Send
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return <div className="bg-ink-900/90 backdrop-blur border border-white/10 rounded-2xl shadow-card overflow-hidden">{body}</div>;
  }

  return (
    <div className="pointer-events-auto">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`w-72 ${sayOpen ? 'h-[30rem]' : 'h-80'} transition-[height] bg-ink-900/95 backdrop-blur border border-white/10 rounded-2xl shadow-card overflow-hidden mb-2`}
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-full bg-ink-800 border border-white/10 flex items-center justify-center text-xl shadow-card hover:bg-ink-700 transition"
        title="Chat"
      >
        💬
      </button>
    </div>
  );
}

/** The say-it-out-loud picker: your character's lines, trash talk, and the soundboard. */
function SayPanel({
  catchphrase,
  characterLines,
  onSay,
}: {
  catchphrase: string | null;
  characterLines: string[];
  onSay: (line: string) => void;
}) {
  const chip = 'text-[12px] px-2.5 py-1 rounded-full transition text-left';
  return (
    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2.5">
      <p className="text-[11px] text-slate-400">Everyone at the table hears it 🔊</p>
      {(catchphrase || characterLines.length > 0) && (
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gold-light/80 mb-1">Your character</p>
          <div className="flex flex-wrap gap-1">
            {catchphrase && (
              <button onClick={() => onSay(catchphrase)} className={`${chip} bg-gold/25 border border-gold/60 text-gold-light font-semibold hover:bg-gold/35`}>
                🎙️ {catchphrase}
              </button>
            )}
            {characterLines.map((l) => (
              <button key={l} onClick={() => onSay(l)} className={`${chip} bg-gold/10 border border-gold/30 text-gold-light hover:bg-gold/20`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-fuchsia-300 mb-1">Trash talk</p>
        <div className="flex flex-wrap gap-1">
          {COMMON_LINES.map((l) => (
            <button key={l} onClick={() => onSay(l)} className={`${chip} bg-ink-700 hover:bg-ink-600 text-slate-200`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-amber-300 mb-1">🎬 Pop culture</p>
        <div className="flex flex-wrap gap-1">
          {POP_CULTURE.map((p) => (
            <button
              key={p.text}
              title={p.from}
              onClick={() => onSay(p.text)}
              className={`${chip} bg-amber-900/40 border border-amber-400/30 hover:bg-amber-800/50 text-amber-100`}
            >
              {p.text.replace(/^🎬 /, '')}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wide text-sky-300 mb-1">Soundboard</p>
        <div className="flex flex-wrap gap-1">
          {SOUND_BOARD.map((s) => (
            <button key={s.text} onClick={() => onSay(s.text)} className={`${chip} bg-sky-900/50 border border-sky-400/30 hover:bg-sky-800/60 text-sky-100`}>
              {s.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
