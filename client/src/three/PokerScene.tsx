import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GameStateSnapshot, PublicPlayer, WinnerAnnouncement } from '../../../shared/types';
import { EmoteEvent } from '../store/gameStore';
import {
  COMMUNITY_CARDS_CENTER_3D,
  DECK_POSITION_3D,
  POT_POSITION_3D,
  getBetPosition3D,
  getDealerButtonPosition3D,
  getSeat3D,
  seatScaleForCount,
  worldDeltaToLocalXZ,
} from './layout3D';
import { occupiedSeatOrder } from '../lib/seatLayout';
import { Card3D } from './Card3D';
import { ChipStack3D } from './ChipStack3D';
import { DealerButton3D } from './DealerButton3D';
import { Character3D, ReactionPose } from './Character3D';
import { TableMesh } from './TableMesh';
import { formatChips } from '../components/Chips';

const THEME_FELT: Record<string, { light: string; dark: string }> = {
  midnight: { light: '#1c2b52', dark: '#0a0f1f' },
  emerald: { light: '#125c44', dark: '#062a20' },
  crimson: { light: '#5c1225', dark: '#25060d' },
  royal: { light: '#2b1c52', dark: '#120a26' },
};

interface PokerSceneProps {
  snapshot: GameStateSnapshot;
  selfPlayerId: string | null;
  highlightedKeys?: Set<string>;
  winnersByPlayer: Map<string, WinnerAnnouncement>;
  emotes: EmoteEvent[];
}

function poseFor(player: PublicPlayer, isWinner: boolean): ReactionPose {
  if (player.status === 'eliminated') return 'eliminated';
  if (isWinner) return 'winning';
  if (player.status === 'folded') return 'folded';
  if (player.lastAction === 'bet' || player.lastAction === 'raise' || player.lastAction === 'all_in') return 'betting';
  if (player.lastAction === 'fold') return 'losing';
  return 'active';
}

function CameraRig({ emphasis }: { emphasis: number }) {
  const { camera } = useThree();
  const base = useRef(new THREE.Vector3(0, 3.6, 4.6));
  useFrame(() => {
    const pull = 1 - emphasis * 0.18;
    camera.position.lerp(new THREE.Vector3(base.current.x, base.current.y * pull, base.current.z * pull), 0.05);
  });
  return null;
}

export function PokerScene({ snapshot, selfPlayerId, highlightedKeys, winnersByPlayer, emotes }: PokerSceneProps) {
  const seatOrder = useMemo(() => occupiedSeatOrder(snapshot.players.map((p) => p.seatIndex)), [snapshot.players]);
  const count = snapshot.players.length;
  const selfPlayer = snapshot.players.find((p) => p.id === selfPlayerId);
  const selfOrder = selfPlayer ? seatOrder.get(selfPlayer.seatIndex) ?? 0 : 0;

  const relIndexFor = (p: PublicPlayer) => {
    const order = seatOrder.get(p.seatIndex) ?? 0;
    return ((order - selfOrder) % count + count) % count;
  };

  const dealerOrder = seatOrder.get(snapshot.dealerSeat) ?? 0;
  const dealerRel = count > 0 ? ((dealerOrder - selfOrder) % count + count) % count : 0;
  const feltTheme = THEME_FELT[snapshot.settings.tableTheme] ?? THEME_FELT.midnight;
  const seatScale = seatScaleForCount(count);

  const bigBetInProgress = snapshot.currentBet > snapshot.settings.bigBlind * 6;
  const allInInProgress = snapshot.players.some((p) => p.status === 'all_in');
  const emphasis = snapshot.street === 'showdown' ? 1 : allInInProgress ? 0.8 : bigBetInProgress ? 0.4 : 0;

  return (
    <Canvas shadows camera={{ position: [0, 3.6, 4.6], fov: 42 }} dpr={[1, 1.75]}>
      <color attach="background" args={['#05070d']} />
      <fog attach="fog" args={['#05070d', 7, 20]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[2.5, 6, 3]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />
      <pointLight position={[-4, 3, -2]} intensity={0.35} color="#e3b64f" />
      <pointLight position={[4, 3, -2]} intensity={0.35} color="#5db8ff" />
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[9, 48]} />
        <meshStandardMaterial color="#0a0d16" roughness={0.9} />
      </mesh>

      <CameraRig emphasis={emphasis} />
      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={7.5}
        minPolarAngle={Math.PI * 0.18}
        maxPolarAngle={Math.PI * 0.47}
        target={[0, 0.78, -0.2]}
        enableDamping
        dampingFactor={0.08}
      />

      <TableMesh feltColorLight={feltTheme.light} feltColorDark={feltTheme.dark} />

      {/* Deck */}
      <group position={DECK_POSITION_3D}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[i * 0.004, i * 0.006, -i * 0.004]} rotation={[-Math.PI / 2, 0, 0.03]} castShadow>
            <planeGeometry args={[0.62, 0.86]} />
            <meshStandardMaterial color="#0f1626" roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Pot */}
      <ChipStack3D amount={snapshot.totalPot} from={POT_POSITION_3D} to={POT_POSITION_3D} moveKey={`pot-${snapshot.handNumber}-${snapshot.street}`} visible={snapshot.totalPot > 0} />
      {snapshot.totalPot > 0 && (
        <Html position={[POT_POSITION_3D[0], POT_POSITION_3D[1] + 0.4, POT_POSITION_3D[2]]} center distanceFactor={8} occlude>
          <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-gold/30 text-gold-light font-display text-sm whitespace-nowrap">
            Pot: {snapshot.totalPot.toLocaleString()}
          </div>
        </Html>
      )}

      {/* Community cards */}
      {Array.from({ length: 5 }).map((_, i) => {
        const card = snapshot.communityCards[i];
        const spread = (i - 2) * 0.7;
        const to: [number, number, number] = [COMMUNITY_CARDS_CENTER_3D[0] + spread, COMMUNITY_CARDS_CENTER_3D[1], COMMUNITY_CARDS_CENTER_3D[2]];
        const dimmed = snapshot.revealedRunoutFrom !== null && i >= snapshot.revealedRunoutFrom;
        return (
          <Card3D
            key={`community-${i}`}
            card={card ?? null}
            faceDown={!card}
            from={DECK_POSITION_3D}
            to={to}
            dealKey={`community-${snapshot.handNumber}-${i}-${card ? `${card.rank}${card.suit}` : 'x'}`}
            delay={i * 0.12}
            highlighted={!!card && !!highlightedKeys?.has(`${card.rank}${card.suit}`)}
            dimmed={dimmed}
          />
        );
      })}

      {/* Dealer button */}
      {snapshot.phase !== 'lobby' && count > 0 && (
        <DealerButton3D position={getDealerButtonPosition3D(dealerRel, count)} />
      )}

      {/* Seats */}
      {snapshot.players.map((p) => {
        const rel = relIndexFor(p);
        const { position, facingAngle } = getSeat3D(rel, count);
        const isSelf = p.id === selfPlayerId;
        const winner = winnersByPlayer.get(p.id);
        const pose = poseFor(p, !!winner);
        const showCards = p.holeCards ? p.holeCards.length > 0 : p.hasCards;
        const betTo = getBetPosition3D(rel, count);
        const dealDelay = rel * 0.15;

        // Cards sit inside a group rotated to match the seat's own facing direction, so "in front
        // of the player" (local -Z) always means "toward the table center" regardless of which
        // side of the oval this seat is on. The deck's world-space offset has to be rotated into
        // that same local frame to compute a correct flight-start position.
        const [deckLocalX, deckLocalZ] = worldDeltaToLocalXZ(
          DECK_POSITION_3D[0] - position[0],
          DECK_POSITION_3D[2] - position[2],
          facingAngle
        );
        const cardFrom: [number, number, number] = [deckLocalX, DECK_POSITION_3D[1] - position[1], deckLocalZ];
        const activeEmote = [...emotes].reverse().find((e) => e.playerId === p.id);

        return (
          <group key={p.id} position={position}>
            {!isSelf && (
              <Character3D seed={p.avatarSeed} facingAngle={facingAngle} scale={seatScale} pose={pose} dimmed={!p.isConnected || p.status === 'eliminated'} />
            )}

            <Html position={[0, isSelf ? 0.55 : 1.15, 0]} center distanceFactor={8} occlude>
              <div
                className={`text-center px-2.5 py-1 rounded-lg bg-black/55 backdrop-blur-sm border ${
                  snapshot.currentTurnPlayerId === p.id ? 'border-gold/70 shadow-glow' : 'border-white/10'
                }`}
              >
                <p className="text-xs font-medium text-white whitespace-nowrap flex items-center gap-1">
                  {p.isHost && <span>👑</span>}
                  {p.name}
                  {isSelf && <span className="text-gold-light">(you)</span>}
                </p>
                <p className="text-[11px] text-gold-light font-display">{formatChips(p.chips)}</p>
                {(p.lastAction || p.status === 'eliminated' || !p.isConnected) && (
                  <p className="text-[10px] text-emerald-300">
                    {p.status === 'eliminated' ? 'Eliminated' : !p.isConnected ? 'Disconnected' : p.lastAction}
                  </p>
                )}
              </div>
            </Html>

            {showCards && (
              <group rotation={[0, facingAngle, 0]}>
                <Card3D
                  card={p.holeCards?.[0] ?? null}
                  faceDown={!p.holeCards}
                  from={cardFrom}
                  to={[-0.18, 0.03, -0.55]}
                  restYaw={-0.15}
                  dealKey={`hole-${snapshot.handNumber}-${p.id}-0`}
                  delay={dealDelay}
                  scale={seatScale}
                  highlighted={p.status !== 'folded' && (!!winner || !!highlightedKeys?.has(p.holeCards?.[0] ? `${p.holeCards[0].rank}${p.holeCards[0].suit}` : ''))}
                  dimmed={p.status === 'folded'}
                />
                <Card3D
                  card={p.holeCards?.[1] ?? null}
                  faceDown={!p.holeCards}
                  from={cardFrom}
                  to={[0.18, 0.03, -0.55]}
                  restYaw={0.15}
                  dealKey={`hole-${snapshot.handNumber}-${p.id}-1`}
                  delay={dealDelay + 0.08}
                  scale={seatScale}
                  highlighted={p.status !== 'folded' && (!!winner || !!highlightedKeys?.has(p.holeCards?.[1] ? `${p.holeCards[1].rank}${p.holeCards[1].suit}` : ''))}
                  dimmed={p.status === 'folded'}
                />
              </group>
            )}

            <ChipStack3D
              amount={p.bet}
              from={[betTo[0] - position[0], betTo[1] - position[1], betTo[2] - position[2]]}
              to={[betTo[0] - position[0], betTo[1] - position[1], betTo[2] - position[2]]}
              moveKey={`bet-${p.id}-${snapshot.street}-${p.bet}`}
              visible={p.bet > 0}
            />

            {winner && (
              <Html position={[0, 1.5, 0]} center distanceFactor={8}>
                <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-gold to-gold-light text-ink-950 font-display font-bold text-xs whitespace-nowrap shadow-glow">
                  🪙 +{formatChips(winner.amount)} {winner.handName ? `· ${winner.handName}` : ''}
                </div>
              </Html>
            )}

            {activeEmote && (
              <Html key={activeEmote.id} position={[0, 1.8, 0]} center distanceFactor={8}>
                <div className="text-3xl animate-bounce">{activeEmote.emoji}</div>
              </Html>
            )}
          </group>
        );
      })}
    </Canvas>
  );
}
