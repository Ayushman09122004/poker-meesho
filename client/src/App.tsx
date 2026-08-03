import { useEffect, useState } from 'react';
import { useGameConnection, joinRoom } from './hooks/useGameConnection';
import { useSoundEffects } from './hooks/useSoundEffects';
import { useGameStore } from './store/gameStore';
import { getLastRoomCode, getSession } from './lib/storage';
import { Landing } from './components/Landing';
import { Lobby } from './components/Lobby';
import { Table } from './components/Table';
import { Toasts } from './components/Toasts';

export default function App() {
  const { connected } = useGameConnection();
  useSoundEffects();
  const screen = useGameStore((s) => s.screen);
  const [reconnecting, setReconnecting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!connected || attempted) return;
    setAttempted(true);
    const lastRoom = getLastRoomCode();
    if (lastRoom && getSession(lastRoom)) {
      setReconnecting(true);
      joinRoom(lastRoom, '', '').finally(() => setReconnecting(false));
    }
  }, [connected, attempted]);

  return (
    <div className="w-screen h-screen">
      <Toasts />
      {reconnecting && screen === 'landing' ? (
        <div className="w-full h-full flex items-center justify-center bg-ink-950">
          <p className="text-slate-400 animate-pulse">Reconnecting to your table…</p>
        </div>
      ) : screen === 'landing' ? (
        <Landing />
      ) : screen === 'lobby' ? (
        <Lobby />
      ) : (
        <Table />
      )}
    </div>
  );
}
