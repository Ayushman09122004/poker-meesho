import { memo, useMemo } from 'react';
import { Ambience } from '../lib/themes';

// Animated scenery behind the table, done with plain CSS keyframes (see index.css) so it costs
// next to nothing while the game runs. Particle positions/timings are randomised once per mount.

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

const COUNTS: Partial<Record<Ambience, number>> = {
  rain: 70,
  code: 34,
  petals: 28,
  embers: 36,
  dust: 30,
  candles: 16,
  stars: 110,
  spores: 40,
  suits: 26,
  leaves: 22,
  snow: 80,
  fireflies: 30,
  donuts: 14,
  crystals: 34,
};

const SUITS = ['♠', '♥', '♦', '♣'];

export const ThemeAmbience = memo(function ThemeAmbience({ kind }: { kind: Ambience }) {
  const particles = useMemo(() => {
    const count = COUNTS[kind] ?? 0;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      left: rand(0, 100),
      top: rand(2, 95),
      delay: -rand(0, 12),
      duration:
        kind === 'rain' ? rand(0.6, 1.1) : kind === 'code' ? rand(5, 11) : kind === 'stars' || kind === 'crystals' ? rand(1.8, 4.5) : kind === 'snow' ? rand(8, 18) : rand(7, 16),
      size:
        kind === 'embers' ? rand(2, 5)
        : kind === 'petals' ? rand(9, 16)
        : kind === 'dust' ? rand(2, 4)
        : kind === 'stars' ? rand(1, 3)
        : kind === 'spores' ? rand(2, 5)
        : kind === 'snow' ? rand(2, 6)
        : kind === 'fireflies' ? rand(3, 6)
        : kind === 'crystals' ? rand(5, 11)
        : kind === 'candles' ? rand(22, 34)
        : kind === 'suits' ? rand(16, 32)
        : kind === 'leaves' ? rand(18, 28)
        : kind === 'donuts' ? rand(22, 34)
        : 1,
      drift: rand(-60, 60),
      suit: SUITS[i % 4],
      chars: kind === 'code' ? Array.from({ length: 14 }, () => String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))).join('') : '',
    }));
  }, [kind]);

  if (kind === 'none') return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {kind === 'embers' && (
        <>
          <div className="amb-torch" style={{ left: '4%' }} />
          <div className="amb-torch" style={{ right: '4%' }} />
        </>
      )}
      {kind === 'rain' && <div className="amb-batsignal" />}
      {kind === 'dust' && <div className="amb-lantern" />}
      {kind === 'candles' && <div className="amb-lantern" />}
      {kind === 'stars' && (
        <>
          <div className="amb-saber" style={{ left: '3%', ['--saber' as string]: '90, 170, 255' }} />
          <div className="amb-saber" style={{ right: '3%', ['--saber' as string]: '255, 60, 60' }} />
        </>
      )}
      {kind === 'spores' && <div className="amb-redflash" />}
      {kind === 'synthwave' && (
        <>
          <div className="amb-sun" />
          <div className="amb-grid" />
        </>
      )}

      {particles.map((p) => {
        const common = { left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` } as React.CSSProperties;
        const drift = { ['--drift' as string]: `${p.drift}px` } as React.CSSProperties;
        switch (kind) {
          case 'embers':
            return <span key={p.key} className="amb-ember" style={{ ...common, width: p.size, height: p.size, ...drift }} />;
          case 'petals':
            return <span key={p.key} className="amb-petal" style={{ ...common, width: p.size, height: p.size * 0.7, ['--drift' as string]: `${p.drift * 2}px` }} />;
          case 'rain':
            return <span key={p.key} className="amb-rain" style={common} />;
          case 'dust':
            return <span key={p.key} className="amb-dust" style={{ ...common, width: p.size, height: p.size, top: `${p.top}%`, ...drift }} />;
          case 'code':
            return (
              <span key={p.key} className="amb-code" style={common}>
                {p.chars}
              </span>
            );
          case 'candles':
            return (
              <span key={p.key} className="amb-emoji amb-bob" style={{ ...common, top: `${3 + p.top * 0.45}%`, fontSize: p.size, ['--drift' as string]: '0px' }}>
                🕯️
              </span>
            );
          case 'stars':
            return <span key={p.key} className="amb-star" style={{ ...common, top: `${p.top}%`, width: p.size, height: p.size }} />;
          case 'spores':
            return <span key={p.key} className="amb-spore" style={{ ...common, width: p.size, height: p.size, ...drift }} />;
          case 'suits':
            return (
              <span key={p.key} className="amb-suit" style={{ ...common, fontSize: p.size, color: p.key % 2 ? 'rgba(80,220,100,0.5)' : 'rgba(190,120,255,0.5)', ...drift }}>
                {p.suit}
              </span>
            );
          case 'leaves':
          case 'donuts':
            return (
              <span key={p.key} className="amb-emoji amb-falling" style={{ ...common, fontSize: p.size, ['--drift' as string]: `${p.drift * 2}px` }}>
                {kind === 'leaves' ? '🍃' : '🍩'}
              </span>
            );
          case 'snow':
            return <span key={p.key} className="amb-snow" style={{ ...common, width: p.size, height: p.size, ...drift }} />;
          case 'fireflies':
            return <span key={p.key} className="amb-firefly" style={{ ...common, top: `${p.top}%`, width: p.size, height: p.size, ...drift }} />;
          case 'crystals':
            return <span key={p.key} className="amb-crystal" style={{ ...common, top: `${p.top}%`, width: p.size, height: p.size }} />;
          default:
            return null;
        }
      })}
    </div>
  );
});
