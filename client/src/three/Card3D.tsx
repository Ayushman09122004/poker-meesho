import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Card } from '../../../shared/types';
import { getCardBackTexture, getCardFaceTexture } from './cardTexture';

const CARD_W = 0.62;
const CARD_H = 0.86;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export interface Card3DProps {
  card?: Card | null;
  faceDown: boolean;
  from: [number, number, number];
  to: [number, number, number];
  /** Final resting yaw (radians) — a slight per-card fan angle so a hand of two cards doesn't
   * look perfectly stacked, and so community cards read as a natural spread. */
  restYaw?: number;
  /** Changes whenever this card should replay its deal-in flight (e.g. a new hand starting). */
  dealKey: string;
  delay?: number;
  scale?: number;
  highlighted?: boolean;
  dimmed?: boolean;
}

/**
 * A card lies flat on the table (its face normal points +Y, toward the overhead camera) rather
 * than standing up facing the camera — that's how a real dealt card actually sits. Two things
 * animate independently:
 *  - Flight: position eases from the deck to its slot with a small arc and a bit of tumble,
 *    replaying whenever `dealKey` changes (new hand dealt).
 *  - Flip: when `faceDown` toggles, the card scales flat on X and swaps its texture at the
 *    midpoint — from the table's angled seated-camera view this reads as the card turning over,
 *    without needing to model an edge-on 3D flip.
 */
export function Card3D({
  card,
  faceDown,
  from,
  to,
  restYaw = 0,
  dealKey,
  delay = 0,
  scale = 1,
  highlighted,
  dimmed,
}: Card3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const flipRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const flightStartRef = useRef(0);
  const prevDealKeyRef = useRef<string | null>(null);
  const tumbleSeedRef = useRef(0);

  const flipStartRef = useRef<number | null>(null);
  const prevFaceDownRef = useRef(faceDown);
  const flippedTextureRef = useRef(faceDown);

  const backTexture = useMemo(() => getCardBackTexture(), []);
  const faceTexture = useMemo(() => (card ? getCardFaceTexture(card) : null), [card]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: faceDown || !faceTexture ? backTexture : faceTexture,
        roughness: 0.45,
        metalness: 0.05,
        transparent: true,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    material.map = flippedTextureRef.current || !faceTexture ? backTexture : faceTexture;
    material.needsUpdate = true;
  }, [faceTexture, backTexture, material]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const flip = flipRef.current;
    if (!group || !flip) return;
    const now = clock.elapsedTime;

    // --- Flight (deal-in) ---
    if (prevDealKeyRef.current !== dealKey) {
      prevDealKeyRef.current = dealKey;
      flightStartRef.current = now;
      tumbleSeedRef.current = Math.random() * Math.PI * 2;
    }
    const elapsed = now - flightStartRef.current;
    const duration = 0.5;
    const t = Math.max(0, Math.min(1, (elapsed - delay) / duration));
    const eased = easeOutCubic(t);
    const waiting = elapsed < delay;

    const x = lerp(from[0], to[0], eased);
    const z = lerp(from[2], to[2], eased);
    const arc = Math.sin(Math.PI * eased) * 0.9 * (1 - Math.abs(eased - 0.5) * 0.3);
    const y = lerp(from[1], to[1], eased) + arc;
    group.position.set(x, waiting ? from[1] : y, z);

    const tumble = lerp(tumbleSeedRef.current, restYaw, eased);
    group.rotation.y = tumble;
    group.rotation.x = Math.sin(Math.PI * eased) * -0.25 * (1 - eased);

    const appear = Math.min(1, elapsed / 0.08);
    (group.scale as THREE.Vector3).setScalar(scale * (waiting ? 0 : appear));

    // --- Flip (face up/down toggle, independent of flight) ---
    if (prevFaceDownRef.current !== faceDown) {
      prevFaceDownRef.current = faceDown;
      flipStartRef.current = now;
    }
    if (flipStartRef.current !== null) {
      const flipElapsed = now - flipStartRef.current;
      const flipDuration = 0.32;
      const ft = Math.max(0, Math.min(1, flipElapsed / flipDuration));
      const scaleX = Math.abs(Math.cos(ft * Math.PI));
      flip.scale.set(Math.max(0.02, scaleX), 1, 1);
      if (ft >= 0.5 && flippedTextureRef.current !== faceDown) {
        flippedTextureRef.current = faceDown;
        material.map = faceDown || !faceTexture ? backTexture : faceTexture;
        material.needsUpdate = true;
      }
      if (ft >= 1) flipStartRef.current = null;
    }

    if (meshRef.current) {
      const targetOpacity = dimmed ? 0.55 : 1;
      material.opacity += (targetOpacity - material.opacity) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={from}>
      <group ref={flipRef}>
        <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} material={material} castShadow receiveShadow>
          <planeGeometry args={[CARD_W, CARD_H]} />
        </mesh>
        {highlighted && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]}>
            <planeGeometry args={[CARD_W + 0.06, CARD_H + 0.06]} />
            <meshBasicMaterial color="#e3b64f" transparent opacity={0.55} />
          </mesh>
        )}
      </group>
    </group>
  );
}
