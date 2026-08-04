import { motion } from 'framer-motion';
import { getAvatar } from '../lib/avatar';

interface AvatarBadgeProps {
  seed: string;
  size?: number;
  ring?: 'gold' | 'gray' | 'none';
  dimmed?: boolean;
  /** Plays a subtle continuous idle bob/sway — only worth it for seated, in-play avatars. */
  animated?: boolean;
  /** Bump this number (e.g. on every new lastAction) to replay a one-shot "playing a card" gesture. */
  gesturePulse?: number;
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function AvatarBadge({ seed, size = 44, ring = 'none', dimmed, animated, gesturePulse }: AvatarBadgeProps) {
  const { emoji, gradient } = getAvatar(seed);
  const ringClass = ring === 'gold' ? 'ring-2 ring-gold shadow-glow' : ring === 'gray' ? 'ring-2 ring-white/20' : '';
  // Vary each avatar's idle bob timing/phase by its seed so a table full of animated avatars
  // doesn't sway in unison like a synchronized dance line.
  const seedHash = hashString(seed);
  const bobDuration = 2.6 + (seedHash % 8) / 5;
  const bobDelay = (seedHash % 10) / 10;

  return (
    <div
      className={`rounded-full shrink-0 select-none ${ringClass} ${dimmed ? 'opacity-40 grayscale' : ''}`}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="w-full h-full rounded-full"
        animate={animated ? { y: [0, -size * 0.06, 0], rotate: [0, -2.5, 2.5, 0] } : undefined}
        transition={
          animated ? { duration: bobDuration, delay: bobDelay, repeat: Infinity, ease: 'easeInOut' } : undefined
        }
      >
        <motion.div
          key={gesturePulse ?? 0}
          className="w-full h-full rounded-full flex items-center justify-center"
          initial={false}
          animate={gesturePulse ? { scale: [1, 1.18, 0.96, 1], rotate: [0, -10, 8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, fontSize: size * 0.55 }}
        >
          {emoji}
        </motion.div>
      </motion.div>
    </div>
  );
}
