import { useState } from 'react';
import { motion } from 'framer-motion';
import { AvatarPicker } from './AvatarPicker';
import { SettingsForm } from './SettingsForm';
import { createRoom, joinRoom } from '../hooks/useGameConnection';
import { getSavedAvatarSeed, getSavedName, saveAvatarSeed, saveName } from '../lib/storage';
import { useGameStore } from '../store/gameStore';
import { RoomSettings } from '../../../shared/types';
import { defaultClientSettings } from '../lib/defaultSettings';

export function Landing() {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [name, setName] = useState(getSavedName());
  const [avatarSeed, setAvatarSeed] = useState(getSavedAvatarSeed());
  const [roomCode, setRoomCode] = useState('');
  const [settings, setSettings] = useState<Partial<RoomSettings>>(defaultClientSettings());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pushToast = useGameStore((s) => s.pushToast);

  function persistIdentity() {
    saveName(name.trim());
    saveAvatarSeed(avatarSeed);
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError('Enter a name first');
      return;
    }
    setBusy(true);
    setError(null);
    persistIdentity();
    const res = await createRoom(name.trim(), avatarSeed, settings);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not create room');
      pushToast(res.error ?? 'Could not create room');
    }
  }

  async function handleJoin() {
    if (!name.trim()) {
      setError('Enter a name first');
      return;
    }
    if (!roomCode.trim()) {
      setError('Enter a room code');
      return;
    }
    setBusy(true);
    setError(null);
    persistIdentity();
    const res = await joinRoom(roomCode.trim(), name.trim(), avatarSeed);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not join room');
      pushToast(res.error ?? 'Could not join room');
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-felt-radial [--felt-light:#125c44] [--felt-dark:#062a20] px-4 overflow-y-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg bg-ink-900/90 backdrop-blur border border-white/10 rounded-2xl shadow-card p-6 sm:p-8"
      >
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-gold-light tracking-tight">
            ♠ Felt &amp; Friends
          </h1>
          <p className="text-slate-400 text-sm mt-1">Home-game Texas Hold'em. Virtual chips only — just for fun.</p>
        </div>

        {mode === 'menu' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setMode('create')}
              className="w-full py-3 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-display font-bold text-lg shadow-glow hover:brightness-110 transition"
            >
              Host a new table
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-3 rounded-xl bg-ink-800 border border-white/10 text-slate-100 font-display font-semibold text-lg hover:bg-ink-700 transition"
            >
              Join with a room code
            </button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide">Your name</label>
              <input
                autoFocus
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="e.g. Alex"
                className="w-full mt-1 bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-slate-100 outline-none focus:border-gold/60"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wide">Pick an avatar</label>
              <div className="mt-1">
                <AvatarPicker value={avatarSeed} onChange={setAvatarSeed} />
              </div>
            </div>

            {mode === 'join' && (
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide">Room code</label>
                <input
                  maxLength={5}
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE"
                  className="w-full mt-1 bg-ink-800 border border-white/10 rounded-lg px-3 py-2 text-slate-100 tracking-[0.3em] text-center font-display text-xl outline-none focus:border-gold/60"
                />
              </div>
            )}

            {mode === 'create' && (
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wide mb-2 block">Table settings</label>
                <SettingsForm settings={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />
              </div>
            )}

            {error && <p className="text-rose-400 text-sm">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setMode('menu')}
                className="px-4 py-2.5 rounded-xl bg-ink-800 border border-white/10 text-slate-300 hover:bg-ink-700 transition"
              >
                Back
              </button>
              <button
                disabled={busy}
                onClick={mode === 'create' ? handleCreate : handleJoin}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-display font-bold disabled:opacity-60 shadow-glow hover:brightness-110 transition"
              >
                {busy ? 'Please wait…' : mode === 'create' ? 'Create room' : 'Join table'}
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-500 mt-6">
          For entertainment only. No real money, no gambling, no purchasable or redeemable chips.
        </p>
      </motion.div>
    </div>
  );
}
