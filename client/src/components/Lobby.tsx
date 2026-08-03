import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { AvatarBadge } from './AvatarBadge';
import { leaveRoom, setReady, startGame, updateSettings } from '../hooks/useGameConnection';
import { SettingsForm } from './SettingsForm';
import { ChatDock } from './Chat';
import { sound } from '../lib/sound';

export function Lobby() {
  const snapshot = useGameStore((s) => s.snapshot);
  const selfPlayerId = useGameStore((s) => s.selfPlayerId);
  const isHost = useGameStore((s) => s.isHost);
  const [copied, setCopied] = useState(false);
  const [editingSettings, setEditingSettings] = useState(false);

  if (!snapshot) return null;
  const self = snapshot.players.find((p) => p.id === selfPlayerId);
  const canStart = snapshot.players.length >= 2;

  const roomCode = snapshot.roomCode;

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="w-full h-full bg-felt-radial [--felt-light:#125c44] [--felt-dark:#062a20] flex flex-col items-center overflow-y-auto py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-ink-900/90 backdrop-blur border border-white/10 rounded-2xl shadow-card p-6 sm:p-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wide">Room code</p>
            <button onClick={copyCode} className="font-display text-3xl font-extrabold text-gold-light tracking-[0.25em] hover:text-gold transition">
              {snapshot.roomCode}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={copyLink} className="px-3 py-2 rounded-lg bg-ink-800 border border-white/10 text-sm text-slate-200 hover:bg-ink-700 transition">
              {copied ? 'Copied!' : 'Copy invite link'}
            </button>
            <button onClick={leaveRoom} className="px-3 py-2 rounded-lg bg-ink-800 border border-white/10 text-sm text-rose-300 hover:bg-ink-700 transition">
              Leave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {snapshot.players.map((p) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                p.isReady ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-ink-800/60'
              }`}
            >
              <AvatarBadge seed={p.avatarSeed} size={36} ring={p.isConnected ? 'none' : 'gray'} dimmed={!p.isConnected} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate flex items-center gap-1.5">
                  {p.name}
                  {p.isHost && <span title="Host">👑</span>}
                </p>
                <p className={`text-xs ${p.isReady ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {!p.isConnected ? 'Disconnected' : p.isReady ? 'Ready' : 'Not ready'}
                </p>
              </div>
            </motion.div>
          ))}
          {Array.from({ length: Math.max(0, snapshot.settings.maxPlayers - snapshot.players.length) }).map((_, i) => (
            <div key={`open-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-white/10 p-3 text-slate-600 text-sm">
              Open seat
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
          <div className="text-sm text-slate-400">
            Blinds {snapshot.settings.smallBlind}/{snapshot.settings.bigBlind} · Starting stack{' '}
            {snapshot.settings.startingChips.toLocaleString()} chips
          </div>
          {isHost && (
            <button onClick={() => setEditingSettings((v) => !v)} className="text-xs text-gold-light hover:text-gold underline">
              {editingSettings ? 'Hide settings' : 'Edit settings'}
            </button>
          )}
        </div>

        {editingSettings && isHost && (
          <div className="mb-6 p-4 rounded-xl bg-ink-800/60 border border-white/10">
            <SettingsForm settings={snapshot.settings} onChange={(patch) => updateSettings(patch)} />
          </div>
        )}

        <div className="flex gap-3">
          {self && (
            <button
              onClick={() => {
                sound.uiClick();
                setReady(!self.isReady);
              }}
              className={`flex-1 py-3 rounded-xl font-display font-bold transition ${
                self.isReady
                  ? 'bg-ink-800 border border-emerald-500/50 text-emerald-300'
                  : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-glow'
              }`}
            >
              {self.isReady ? "You're ready ✓" : "I'm ready"}
            </button>
          )}
          {isHost && (
            <button
              disabled={!canStart}
              onClick={startGame}
              className="flex-1 py-3 rounded-xl bg-gradient-to-br from-gold to-gold-dark text-ink-950 font-display font-bold disabled:opacity-50 shadow-glow hover:brightness-110 transition"
            >
              Deal now
            </button>
          )}
        </div>
        {!canStart && <p className="text-center text-xs text-slate-500 mt-3">Waiting for at least 2 players…</p>}
      </motion.div>

      <div className="w-full max-w-2xl mt-4">
        <ChatDock embedded />
      </div>
    </div>
  );
}
