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

// Casino denominations, biggest first. A pile is the amount broken into these, one column per
// denomination — so a big pot really looks like more (and higher-value) chips than a blind.
const DENOMS: { value: number; face: string; edge: string }[] = [
  { value: 5000, face: '#f97316', edge: '#fff7ed' },
  { value: 1000, face: '#facc15', edge: '#422006' },
  { value: 500, face: '#7c3aed', edge: '#f5f3ff' },
  { value: 100, face: '#2f2f36', edge: '#fbbf24' },
  { value: 25, face: '#16a34a', edge: '#f0fdf4' },
  { value: 5, face: '#dc2626', edge: '#fef2f2' },
  { value: 1, face: '#e5e7eb', edge: '#1d4ed8' },
];

function pileColumns(amount: number, maxColumns: number, maxPerColumn: number) {
  const cols: { face: string; edge: string; count: number }[] = [];
  let rest = Math.max(0, Math.round(amount));
  for (const d of DENOMS) {
    if (rest < d.value) continue;
    const n = Math.floor(rest / d.value);
    rest -= n * d.value;
    cols.push({ face: d.face, edge: d.edge, count: Math.min(maxPerColumn, n) });
    if (cols.length === maxColumns) break;
  }
  return cols;
}

/** One chip seen from slightly above: a face with edge stripes and a darker rim below it. */
function PileChip({ face, edge, size }: { face: string; edge: string; size: number }) {
  return (
    <span
      className="absolute left-0 block rounded-full"
      style={{
        width: size,
        height: size * 0.62,
        background: `repeating-conic-gradient(from 10deg, ${face} 0deg 30deg, ${edge} 30deg 45deg)`,
        boxShadow: `inset 0 0 0 ${size * 0.13}px ${face}, inset 0 0 0 ${size * 0.16}px rgba(255,255,255,0.35), 0 ${size * 0.09}px 0 ${face}cc, 0 ${size * 0.12}px 2px rgba(0,0,0,0.55)`,
      }}
    />
  );
}

/** A small pile of stacked casino chips with the amount next to it — how bets and the pot sit on the felt. */
export function ChipPile({ amount, size = 26, showLabel = true, label }: { amount: number; size?: number; showLabel?: boolean; label?: string }) {
  if (amount <= 0) return null;
  const cols = pileColumns(amount, 3, 6);
  const step = size * 0.14;
  const tallest = Math.max(...cols.map((c) => c.count));
  const height = size * 0.62 + step * (tallest - 1) + size * 0.12;
  return (
    <div className="flex items-center gap-1.5 pointer-events-none">
      <div className="relative flex" style={{ height }}>
        {cols.map((c, ci) => (
          <span key={ci} className="relative" style={{ width: size * 0.82, height, zIndex: cols.length - ci }}>
            {Array.from({ length: c.count }).map((_, i) => (
              <span key={i} className="absolute left-0" style={{ bottom: i * step }}>
                <PileChip face={c.face} edge={c.edge} size={size} />
              </span>
            ))}
          </span>
        ))}
        <span style={{ width: size * 0.18 }} />
      </div>
      {showLabel && (
        <span className="px-2 py-0.5 rounded-md bg-black/65 text-white font-display font-bold text-[15px] leading-tight whitespace-nowrap shadow">
          {label ?? formatChips(amount)}
        </span>
      )}
    </div>
  );
}

export { formatChips };
