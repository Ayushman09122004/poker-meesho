import { useState } from 'react';
import { motion } from 'framer-motion';
import { getAvatar } from '../lib/avatar';

interface AvatarBadgeProps {
  seed: string;
  size?: number;
  ring?: 'gold' | 'gray' | 'none';
  dimmed?: boolean;
  /** Kept for API compatibility; portraits no longer bob. */
  animated?: boolean;
  /** Bump this number (e.g. on every new lastAction) to replay a one-shot "reacting" pulse. */
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

/** ~1 in 3 characters "keep a drink at the table" — a small deterministic, decorative-only prop. */
export function hasDrinkProp(seed: string): boolean {
  return hashString(seed) % 3 === 0;
}

/** A seated torso silhouette in the character's colours (used by the legacy 3D scene). */
export function AvatarBody({ seed, width }: { seed: string; width: number }) {
  const { gradient, ring: accentColor } = getAvatar(seed);
  return (
    <div
      className="pointer-events-none"
      style={{
        width,
        height: width * 0.62,
        borderRadius: '46% 46% 8% 8% / 78% 78% 8% 8%',
        background: `linear-gradient(180deg, ${accentColor} 0%, ${gradient[1]} 85%)`,
      }}
    />
  );
}

/** The portrait inside a circle: the persona photo cropped onto the face, or an initials badge. */
export function PersonaPortrait({ seed, size }: { seed: string; size: number }) {
  const { image, focus, zoom, gradient, emoji } = getAvatar(seed);
  const [failed, setFailed] = useState(false);
  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        draggable={false}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover select-none"
        style={{ objectPosition: focus, transform: `scale(${zoom})`, transformOrigin: focus }}
      />
    );
  }
  return (
    <div
      className="w-full h-full flex items-center justify-center font-display font-extrabold text-white/90"
      style={{ background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`, fontSize: size * 0.36 }}
    >
      {emoji}
    </div>
  );
}

export function AvatarBadge({ seed, size = 44, ring = 'none', dimmed, gesturePulse }: AvatarBadgeProps) {
  const { ring: accentColor } = getAvatar(seed);
  const bezel = Math.max(2, Math.round(size * 0.06));
  return (
    <motion.div
      key={gesturePulse ?? 0}
      initial={false}
      animate={gesturePulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`relative shrink-0 select-none rounded-full ${dimmed ? 'opacity-45 grayscale' : ''}`}
      style={{
        width: size,
        height: size,
        padding: bezel,
        background: ring === 'gold' ? 'linear-gradient(135deg,#f5d78a,#a97e2b)' : ring === 'gray' ? '#475569' : `linear-gradient(135deg, ${accentColor}, #0b0e15)`,
        boxShadow: `0 ${Math.max(2, size * 0.06)}px ${size * 0.25}px rgba(0,0,0,0.55)${ring === 'gold' ? ', 0 0 22px rgba(227,182,79,0.6)' : ''}`,
      }}
    >
      <div className="w-full h-full rounded-full overflow-hidden bg-ink-900">
        <PersonaPortrait seed={seed} size={size} />
      </div>
    </motion.div>
  );
}
