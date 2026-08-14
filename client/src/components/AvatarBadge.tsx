import { motion } from 'framer-motion';
import { getAvatar } from '../lib/avatar';

interface AvatarBadgeProps {
  seed: string;
  size?: number;
  ring?: 'gold' | 'gray' | 'none';
  dimmed?: boolean;
  /** Plays a subtle continuous idle bob + 3D tilt — only worth it for seated, in-play avatars. */
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

// A glossy, faux-3D "token" look: a colored bezel ring (per-character accent), a radial highlight
// standing in for a light source, and a soft contact shadow underneath. Combined with a gentle
// perspective tilt, this reads as a 3D object without pulling in a WebGL/Three.js dependency —
// which would meaningfully bloat the bundle and add render risk for a free-tier deploy, for a
// gain (true 3D geometry on an emoji glyph) the player would barely notice at avatar size.
export function AvatarBadge({ seed, size = 44, ring = 'none', dimmed, animated, gesturePulse }: AvatarBadgeProps) {
  const { emoji, gradient, ring: accentColor } = getAvatar(seed);
  const ringClass = ring === 'gold' ? 'ring-2 ring-gold shadow-glow' : ring === 'gray' ? 'ring-2 ring-white/20' : '';
  // Vary each avatar's idle timing/phase by its seed so a table full of animated avatars doesn't
  // sway/tilt in unison like a synchronized dance line.
  const seedHash = hashString(seed);
  const bobDuration = 2.6 + (seedHash % 8) / 5;
  const bobDelay = (seedHash % 10) / 10;
  const tiltDir = seedHash % 2 === 0 ? 1 : -1;

  return (
    <div
      className={`relative shrink-0 select-none rounded-full ${ringClass} ${dimmed ? 'opacity-40 grayscale' : ''}`}
      style={{ width: size, height: size, perspective: size * 8 }}
    >
      {animated && (
        <div
          className="absolute left-1/2 rounded-[50%] bg-black/45 blur-[3px]"
          style={{ width: size * 0.7, height: size * 0.16, top: size * 0.94, transform: 'translateX(-50%)' }}
        />
      )}
      <motion.div
        className="relative w-full h-full rounded-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={
          animated
            ? { y: [0, -size * 0.06, 0], rotateY: [tiltDir * -9, tiltDir * 9, tiltDir * -9], rotateX: [3, -3, 3] }
            : undefined
        }
        transition={
          animated ? { duration: bobDuration, delay: bobDelay, repeat: Infinity, ease: 'easeInOut' } : undefined
        }
      >
        {/* Bezel ring — the character's own accent color, like a poker-chip rim */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: accentColor,
            boxShadow: `0 ${Math.max(2, size * 0.05)}px ${size * 0.22}px rgba(0,0,0,0.45)`,
          }}
        />
        <motion.div
          key={gesturePulse ?? 0}
          className="absolute rounded-full flex items-center justify-center overflow-hidden"
          style={{
            inset: Math.max(1.5, size * 0.06),
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            fontSize: size * 0.5,
            boxShadow: `inset -${size * 0.06}px -${size * 0.08}px ${size * 0.18}px rgba(0,0,0,0.4), inset ${size * 0.04}px ${size * 0.05}px ${size * 0.12}px rgba(255,255,255,0.3)`,
          }}
          initial={false}
          animate={gesturePulse ? { scale: [1, 1.18, 0.96, 1], rotate: [0, -10, 8, 0] } : { scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Specular highlight — sells the glossy-sphere illusion */}
          <div
            className="absolute rounded-full bg-white/40 blur-[2px] pointer-events-none"
            style={{ width: size * 0.32, height: size * 0.2, top: size * 0.1, left: size * 0.14 }}
          />
          <span className="relative">{emoji}</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
