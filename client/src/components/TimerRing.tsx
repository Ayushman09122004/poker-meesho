import { useEffect, useState } from 'react';

interface TimerRingProps {
  expiresAt: number;
  totalMs: number;
  size?: number;
}

export function TimerRing({ expiresAt, totalMs, size = 64 }: TimerRingProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, expiresAt - now);
  const fraction = totalMs > 0 ? remaining / totalMs : 0;
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - fraction);
  const urgent = remaining < totalMs * 0.3;

  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90 pointer-events-none">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={3} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={urgent ? '#ef4444' : '#e3b64f'}
        strokeWidth={3}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.1s linear' }}
      />
    </svg>
  );
}
