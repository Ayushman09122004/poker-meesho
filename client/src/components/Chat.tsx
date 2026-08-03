import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { sendChat, sendEmote } from '../hooks/useGameConnection';
import { sound } from '../lib/sound';

const QUICK_EMOJIS = ['👍', '😂', '🔥', '😮', '😢', '🤔', '😎', '🙌', '🃏', '🎉', '😴', '🤯'];
const QUICK_PHRASES = ['Nice hand!', 'Good fold', 'Nh', 'Unlucky', 'Let\'s go!', 'gg'];

export function ChatDock({ embedded = false }: { embedded?: boolean }) {
  const chat = useGameStore((s) => s.chat);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(embedded);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    if (chat.length > lastCountRef.current && lastCountRef.current > 0) {
      const last = chat[chat.length - 1];
      if (!last.isSystem) sound.message();
    }
    lastCountRef.current = chat.length;
  }, [chat]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChat(text.trim());
    setText('');
  }

  const body = (
    <div className={`flex flex-col ${embedded ? 'h-64' : 'h-full'}`}>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 text-sm">
        {chat.length === 0 && <p className="text-slate-500 text-xs italic">No messages yet. Say hi 👋</p>}
        {chat.map((m) => (
          <div key={m.id} className={m.isSystem ? 'text-slate-500 text-xs italic' : ''}>
            {!m.isSystem && <span className="text-gold-light font-medium mr-1.5">{m.name}:</span>}
            <span className={m.isSystem ? '' : 'text-slate-200'}>{m.text}</span>
          </div>
        ))}
      </div>
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
            className="w-72 h-80 bg-ink-900/95 backdrop-blur border border-white/10 rounded-2xl shadow-card overflow-hidden mb-2"
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
