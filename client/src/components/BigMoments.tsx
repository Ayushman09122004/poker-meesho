import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameStateSnapshot } from '../../../shared/types';
import { ShowdownState } from '../hooks/useShowdownSequence';
import { sound } from '../lib/sound';

// Table-wide moments layered over the end-of-hand sequence:
//  - All-in run-out: lights dim around the board, "ALL IN" pulses, a heartbeat plays.
//  - Rare hand (quads or better): a huge banner with light rays.
//  - Bad beat (a full house or better loses at showdown): a red stamp + screen shake.
//  - Monster pot (50+ big blinds): a gold banner when the pot is pushed.

const RARE = new Set(['Four of a Kind', 'Straight Flush', 'Royal Flush']);

export interface Moments {
  allInDrama: boolean;
  rareHand: string | null;
  badBeat: boolean;
  monsterPot: boolean;
}

export function computeMoments(s: GameStateSnapshot, seq: ShowdownState): Moments {
  const allInDrama = seq.ended && s.allInRunoutFrom !== null && !seq.highlight;
  const rareHand = seq.highlight && seq.winningHandName && RARE.has(seq.winningHandName) ? seq.winningHandName : null;
  const badBeat =
    seq.highlight && !!s.showdown?.some((e) => !e.isWinner && e.hand && e.hand.rankValue >= 6 && (s.showdown?.length ?? 0) > 1);
  const monsterPot = seq.awarded && s.totalPot >= s.settings.bigBlind * 50;
  return { allInDrama, rareHand, badBeat, monsterPot };
}

export function BigMoments({ moments, stageW, stageH, cx, cy, handKey }: { moments: Moments; stageW: number; stageH: number; cx: number; cy: number; handKey: string }) {
  // Heartbeat while the all-in board runs out.
  useEffect(() => {
    if (!moments.allInDrama) return;
    sound.heartbeat();
    const id = setInterval(() => sound.heartbeat(), 900);
    return () => clearInterval(id);
  }, [moments.allInDrama]);

  // One stamp sound per banner per hand.
  const played = useRef(new Set<string>());
  useEffect(() => {
    for (const [key, on] of [
      ['rare', !!moments.rareHand],
      ['bad', moments.badBeat],
      ['monster', moments.monsterPot],
    ] as const) {
      const id = `${handKey}-${key}`;
      if (on && !played.current.has(id)) {
        played.current.add(id);
        key === 'rare' ? sound.bigWin() : sound.stamp();
      }
    }
  }, [moments.rareHand, moments.badBeat, moments.monsterPot, handKey]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <AnimatePresence>
        {moments.allInDrama && (
          <motion.div key="allin" className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
            <div
              className="absolute -inset-40"
              style={{ background: `radial-gradient(ellipse 30% 22% at ${cx + 160}px ${cy + 160}px, transparent 0%, rgba(0,0,0,0.72) 100%)` }}
            />
            <motion.div
              className="absolute left-1/2 -translate-x-1/2 font-display font-black italic tracking-widest text-[64px] text-white"
              style={{ top: stageH * 0.12, textShadow: '0 0 30px rgba(239,68,68,0.95), 0 4px 0 #7f1d1d' }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 0.9, repeat: Infinity }}
            >
              ALL IN
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moments.rareHand && (
          <motion.div
            key={`rare-${handKey}`}
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 3, times: [0, 0.1, 0.8, 1] }}
          >
            <motion.div
              className="absolute w-[900px] h-[900px] rounded-full"
              style={{ background: 'repeating-conic-gradient(rgba(255,215,120,0.35) 0deg 8deg, transparent 8deg 20deg)', maskImage: 'radial-gradient(circle, black 20%, transparent 65%)' }}
              animate={{ rotate: 90 }}
              transition={{ duration: 3, ease: 'linear' }}
            />
            <motion.div
              className="relative font-display font-black uppercase text-[78px] leading-none text-center"
              style={{
                background: 'linear-gradient(180deg,#fff7d6,#f5d78a 40%,#a97e2b)',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 6px 0 #3b2a0a) drop-shadow(0 0 30px rgba(227,182,79,0.9))',
              }}
              initial={{ scale: 0.2, rotate: -8 }}
              animate={{ scale: [0.2, 1.15, 1], rotate: [-8, 3, 0] }}
              transition={{ duration: 0.7 }}
            >
              {moments.rareHand}!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moments.badBeat && (
          <motion.div
            key={`bad-${handKey}`}
            className="absolute font-display font-black uppercase text-[70px] text-rose-500 border-[6px] border-rose-500 rounded-2xl px-6"
            style={{ left: stageW / 2, top: stageH * 0.2, x: '-50%', textShadow: '0 0 20px rgba(244,63,94,0.8)', background: 'rgba(20,0,5,0.55)' }}
            initial={{ opacity: 0, scale: 3, rotate: -14 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [3, 1, 1, 1], rotate: -10 }}
            transition={{ duration: 2.6, times: [0, 0.12, 0.85, 1] }}
          >
            Bad beat!
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moments.monsterPot && (
          <motion.div
            key={`monster-${handKey}`}
            className="absolute font-display font-black uppercase text-[60px] italic"
            style={{
              left: stageW / 2,
              top: stageH * 0.1,
              x: '-50%',
              background: 'linear-gradient(180deg,#fff7d6,#facc15 45%,#b45309)',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              filter: 'drop-shadow(0 5px 0 #451a03) drop-shadow(0 0 24px rgba(250,204,21,0.8))',
            }}
            initial={{ opacity: 0, y: -40, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-40, 0, 0, -10], scale: [0.6, 1.1, 1, 1] }}
            transition={{ duration: 2.8, times: [0, 0.15, 0.8, 1] }}
          >
            Monster pot!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
