import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const CHIP_COLORS = ['#e3b64f', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];
const CHIP_RADIUS = 0.16;
const CHIP_HEIGHT = 0.045;

function chipTierColor(amount: number): string {
  const tier = Math.min(4, Math.floor(Math.log10(Math.max(1, amount))));
  return CHIP_COLORS[tier];
}

interface ChipStack3DProps {
  amount: number;
  from: [number, number, number];
  to: [number, number, number];
  /** Changes whenever these chips should replay their slide animation (a new bet posted, or the
   * pot sweeping to a winner). */
  moveKey: string;
  visible: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A short physical stack of poker chips that slides from one table position to another —
 * used for both "bet chips sliding to the middle" and "pot chips sweeping to the winner". */
export function ChipStack3D({ amount, from, to, moveKey, visible }: ChipStack3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const startRef = useRef(0);
  const prevKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevKeyRef.current !== moveKey) {
      prevKeyRef.current = moveKey;
      startRef.current = -1; // recompute on next frame using clock time
    }
  }, [moveKey]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    if (!group) return;
    if (startRef.current === -1) startRef.current = clock.elapsedTime;
    const elapsed = clock.elapsedTime - startRef.current;
    const t = Math.max(0, Math.min(1, elapsed / 0.45));
    const eased = easeOutCubic(t);
    group.position.set(lerp(from[0], to[0], eased), lerp(from[1], to[1], eased), lerp(from[2], to[2], eased));
    const targetScale = visible && amount > 0 ? 1 : 0;
    group.scale.x += (targetScale - group.scale.x) * 0.2;
    group.scale.y = group.scale.x;
    group.scale.z = group.scale.x;
  });

  if (amount <= 0) return null;
  const layers = Math.min(6, 1 + Math.floor(Math.log10(Math.max(1, amount)) * 2));
  const color = chipTierColor(amount);

  return (
    <group ref={groupRef} position={from}>
      {Array.from({ length: layers }).map((_, i) => (
        <mesh key={i} position={[0, i * CHIP_HEIGHT, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[CHIP_RADIUS, CHIP_RADIUS, CHIP_HEIGHT, 20]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
        </mesh>
      ))}
    </group>
  );
}
