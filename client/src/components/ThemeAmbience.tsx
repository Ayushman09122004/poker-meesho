import { memo, useMemo } from 'react';
import { Ambience } from '../lib/themes';

// Animated scenery behind the table, done with plain CSS keyframes (see index.css) so it costs
// next to nothing while the game runs. Particle positions/timings are randomised once per mount.

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export const ThemeAmbience = memo(function ThemeAmbience({ kind }: { kind: Ambience }) {
  const particles = useMemo(() => {
    const count = kind === 'rain' ? 70 : kind === 'code' ? 34 : kind === 'petals' ? 28 : kind === 'embers' ? 36 : kind === 'dust' ? 30 : 0;
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      left: rand(0, 100),
      delay: -rand(0, 12),
      duration: kind === 'rain' ? rand(0.6, 1.1) : kind === 'code' ? rand(5, 11) : rand(7, 16),
      size: kind === 'embers' ? rand(2, 5) : kind === 'petals' ? rand(9, 16) : kind === 'dust' ? rand(2, 4) : 1,
      drift: rand(-60, 60),
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

      {particles.map((p) => {
        const common = { left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` } as React.CSSProperties;
        if (kind === 'embers')
          return <span key={p.key} className="amb-ember" style={{ ...common, width: p.size, height: p.size, ['--drift' as string]: `${p.drift}px` }} />;
        if (kind === 'petals')
          return <span key={p.key} className="amb-petal" style={{ ...common, width: p.size, height: p.size * 0.7, ['--drift' as string]: `${p.drift * 2}px` }} />;
        if (kind === 'rain') return <span key={p.key} className="amb-rain" style={common} />;
        if (kind === 'dust')
          return <span key={p.key} className="amb-dust" style={{ ...common, width: p.size, height: p.size, top: `${rand(10, 90)}%`, ['--drift' as string]: `${p.drift}px` }} />;
        return (
          <span key={p.key} className="amb-code" style={common}>
            {p.chars}
          </span>
        );
      })}
    </div>
  );
});
