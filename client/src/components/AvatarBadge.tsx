import { getAvatar } from '../lib/avatar';

interface AvatarBadgeProps {
  seed: string;
  size?: number;
  ring?: 'gold' | 'gray' | 'none';
  dimmed?: boolean;
}

export function AvatarBadge({ seed, size = 44, ring = 'none', dimmed }: AvatarBadgeProps) {
  const { emoji, gradient } = getAvatar(seed);
  const ringClass = ring === 'gold' ? 'ring-2 ring-gold shadow-glow' : ring === 'gray' ? 'ring-2 ring-white/20' : '';

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 select-none ${ringClass} ${dimmed ? 'opacity-40 grayscale' : ''}`}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        fontSize: size * 0.55,
      }}
    >
      {emoji}
    </div>
  );
}
