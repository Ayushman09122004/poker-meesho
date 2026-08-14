import { AnimatePresence, motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { PlayingCard, CardSlot } from './PlayingCard';
import { ChipBadge } from './Chips';
import { cardKey } from '../lib/handHint';

interface CommunityAreaProps {
  snapshot: GameStateSnapshot;
  highlightedKeys?: Set<string>;
}

export function CommunityArea({ snapshot, highlightedKeys }: CommunityAreaProps) {
  const cards = snapshot.communityCards;
  const slots = Array.from({ length: 5 });
  const revealFrom = snapshot.revealedRunoutFrom;

  return (
    <div className="flex flex-col items-center gap-3">
      <AnimatePresence>
        {snapshot.totalPot > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-1">
            <ChipBadge amount={snapshot.totalPot} label={`Pot: ${snapshot.totalPot.toLocaleString()}`} size="lg" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2.5">
        {slots.map((_, i) =>
          cards[i] ? (
            <PlayingCard
              key={`community-${i}`}
              card={cards[i]}
              size="lg"
              delay={i * 0.1}
              flyFrom={{ x: -(i - 2) * 106, y: -70 }}
              highlighted={highlightedKeys?.has(cardKey(cards[i]))}
              dimmed={revealFrom !== null && i >= revealFrom}
            />
          ) : (
            <CardSlot key={`slot-${i}`} size="lg" />
          )
        )}
      </div>

      {revealFrom !== null && (
        <p className="text-[11px] text-slate-400 italic">Hand ended early — showing what would have come</p>
      )}
    </div>
  );
}
