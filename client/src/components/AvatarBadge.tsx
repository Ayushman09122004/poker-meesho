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

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * CSS to crop a photo into a square so the face sits as near the centre as the photo allows.
 * `focus` is the face centre as a fraction of the photo (x, y); `ratio` is the photo's
 * height / width. Returns object-position (which part of the photo shows) and the face's spot
 * inside the square, used as the zoom origin so zooming in keeps the face in view.
 */
function faceCrop(fx: number, fy: number, ratio: number) {
  if (ratio >= 1) {
    // Tall photo: the square shows a full-width band; slide it so the face is centred vertically.
    const py = ratio === 1 ? 0.5 : clamp01((fy * ratio - 0.5) / (ratio - 1));
    return { position: `${fx * 100}% ${py * 100}%`, origin: { x: fx, y: fy * ratio - py * (ratio - 1) } };
  }
  const w = 1 / ratio;
  const px = clamp01((fx * w - 0.5) / (w - 1));
  return { position: `${px * 100}% ${fy * 100}%`, origin: { x: fx * w - px * (w - 1), y: fy } };
}

/** The portrait inside a circle: the persona photo cropped onto the face, or an initials badge. */
export function PersonaPortrait({ seed, size }: { seed: string; size: number }) {
  const { image, focus, zoom, gradient, emoji } = getAvatar(seed);
  const [failed, setFailed] = useState(false);
  const [ratio, setRatio] = useState<number | null>(null);
  if (image && !failed) {
    const [fx, fy] = focus.split(' ').map((v) => parseFloat(v) / 100);
    const crop = ratio ? faceCrop(fx, fy, ratio) : null;
    // Once the face is placed, zoom in and nudge it toward the centre of the circle — but only as
    // far as the zoom allows without pulling an empty edge into view.
    const nudge = (o: number) => {
      const z = Math.max(1, zoom);
      return Math.min(o * (z - 1), Math.max(-(1 - o) * (z - 1), 0.5 - o)) * 100;
    };
    const shiftX = crop ? nudge(crop.origin.x) : 0;
    const shiftY = crop ? nudge(crop.origin.y) : 0;
    return (
      <img
        src={image}
        alt=""
        draggable={false}
        onLoad={(e) => setRatio(e.currentTarget.naturalHeight / e.currentTarget.naturalWidth)}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover select-none"
        style={
          crop
            ? {
                objectPosition: crop.position,
                transformOrigin: `${crop.origin.x * 100}% ${crop.origin.y * 100}%`,
                transform: `translate(${shiftX}%, ${shiftY}%) scale(${zoom})`,
              }
            : { objectPosition: focus, opacity: 0 }
        }
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
