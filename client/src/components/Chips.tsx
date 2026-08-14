import { motion } from 'framer-motion';

function formatChips(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
}

const CHIP_COLORS = ['#e3b64f', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];

// A single casino-style chip face: edge-spot pattern (repeating-conic-gradient) plus an inset
// highlight/shadow pair so it reads as a rounded token rather than a flat circle.
function ChipFace({ color, size }: { color: string; size: number }) {
  return (
    <span
      className="block rounded-full border-2 border-white/70"
      style={{
        width: size,
        height: size,
        background: `repeating-conic-gradient(${color} 0deg 40deg, #ffffffcc 40deg 50deg)`,
        boxShadow: `inset 0 ${size * 0.12}px ${size * 0.2}px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.4)`,
      }}
    />
  );
}

export function ChipStackIcon({ value, size = 14 }: { value: number; size?: number }) {
  const color = CHIP_COLORS[Math.min(4, Math.floor(Math.log10(Math.max(1, value)) / 1))];
  return <ChipFace color={color} size={size} />;
}

/** A stacked column of 1-3 chip faces — taller stacks read as bigger bets, like real casino chips. */
export function ChipStack({ value, size = 14 }: { value: number; size?: number }) {
  const tier = Math.min(4, Math.floor(Math.log10(Math.max(1, value)) / 1));
  const color = CHIP_COLORS[tier];
  const layers = Math.min(3, 1 + tier);
  const overlap = size * 0.32;
  return (
    <span className="relative inline-block" style={{ width: size, height: size + overlap * (layers - 1) }}>
      {Array.from({ length: layers }).map((_, i) => (
        <span
          key={i}
          className="absolute left-0"
          style={{ bottom: i * overlap, zIndex: i }}
        >
          <ChipFace color={color} size={size} />
        </span>
      ))}
    </span>
  );
}

export function ChipBadge({ amount, label, size = 'md' }: { amount: number; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (amount <= 0 && !label) return null;
  const textSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[11px]' : 'text-sm';
  const chipSize = size === 'lg' ? 16 : 12;
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-1.5 bg-black/55 backdrop-blur-sm border border-gold/30 rounded-full pl-2 pr-2.5 py-1 ${textSize} font-display text-gold-light shadow-card`}
    >
      <ChipStack value={amount} size={chipSize} />
      <span>{label ?? formatChips(amount)}</span>
    </motion.div>
  );
}

export { formatChips };
