import { motion } from 'framer-motion';

function formatChips(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return `${n}`;
}

const CHIP_COLORS = ['#e3b64f', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];

export function ChipStackIcon({ value, size = 14 }: { value: number; size?: number }) {
  const color = CHIP_COLORS[Math.min(4, Math.floor(Math.log10(Math.max(1, value)) / 1))];
  return (
    <span
      className="inline-block rounded-full border-2 border-white/70"
      style={{
        width: size,
        height: size,
        background: `repeating-conic-gradient(${color} 0deg 40deg, #ffffffcc 40deg 50deg)`,
      }}
    />
  );
}

export function ChipBadge({ amount, label, size = 'md' }: { amount: number; label?: string; size?: 'sm' | 'md' | 'lg' }) {
  if (amount <= 0 && !label) return null;
  const textSize = size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-[11px]' : 'text-sm';
  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`flex items-center gap-1.5 bg-black/55 backdrop-blur-sm border border-gold/30 rounded-full px-2.5 py-1 ${textSize} font-display text-gold-light shadow-card`}
    >
      <ChipStackIcon value={amount} size={size === 'lg' ? 16 : 12} />
      <span>{label ?? formatChips(amount)}</span>
    </motion.div>
  );
}

export { formatChips };
