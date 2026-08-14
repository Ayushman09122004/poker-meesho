import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getAvatar } from '../lib/avatar';
import { hasDrinkProp } from '../components/AvatarBadge';
import { getCharacterFaceTexture } from './characterFaceTexture';

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export type ReactionPose = 'idle' | 'active' | 'betting' | 'folded' | 'winning' | 'losing' | 'eliminated';

interface Character3DProps {
  seed: string;
  facingAngle: number;
  scale: number;
  pose: ReactionPose;
  dimmed?: boolean;
}

/**
 * A stylized, low-poly seated figure built from primitive geometry (capsules, spheres, boxes) —
 * not a rigged photoreal human, which would require a 3D character asset/animation pipeline this
 * project doesn't have. It reuses the same named-character identity (colors + emoji "face") as
 * the existing 2D avatar system, procedurally animated: idle breathing + head turn, and a small
 * set of reactive poses (lean in on bet, slump on fold, lift on winning, sink on losing) that
 * apply to any character rather than needing bespoke animation per persona.
 */
export function Character3D({ seed, facingAngle, scale, pose, dimmed }: Character3DProps) {
  const { emoji, gradient, ring: accent } = getAvatar(seed);
  const seedHash = hashSeed(seed);
  const bobPhase = (seedHash % 100) / 100;
  const bobSpeed = 0.9 + (seedHash % 5) / 10;
  const showDrink = hasDrinkProp(seed);

  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const leanRef = useRef(0);

  const faceTexture = useMemo(() => getCharacterFaceTexture(emoji), [emoji]);
  const bodyMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: gradient[0], roughness: 0.65, transparent: true }),
    [gradient]
  );
  const headMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e8b98a', roughness: 0.6, transparent: true }),
    []
  );
  const accentMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: accent, roughness: 0.4, metalness: 0.2, transparent: true }),
    [accent]
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!body || !head) return;

    // Idle breathing + gentle sway, phase-shifted per character so a full table doesn't move in sync.
    const breathe = Math.sin((t + bobPhase * 10) * bobSpeed) * 0.02;
    const sway = Math.sin((t + bobPhase * 7) * bobSpeed * 0.6) * 0.03;

    // Target lean/tilt per reaction pose.
    let targetLean = 0; // + leans forward toward table
    let targetTilt = 0; // head/body tilt down (disappointment/fold) or up (confidence/win)
    let targetScale = 1;
    if (pose === 'betting') {
      targetLean = 0.16;
    } else if (pose === 'active') {
      targetLean = 0.05;
    } else if (pose === 'folded') {
      targetLean = -0.08;
      targetTilt = 0.18;
      targetScale = 0.94;
    } else if (pose === 'winning') {
      targetTilt = -0.22;
      targetScale = 1.06;
    } else if (pose === 'losing') {
      targetTilt = 0.14;
      targetScale = 0.97;
    } else if (pose === 'eliminated') {
      targetTilt = 0.3;
      targetScale = 0.9;
    }

    leanRef.current += (targetLean - leanRef.current) * 0.08;
    body.position.z = -leanRef.current * 0.35 + sway * 0.1;
    body.rotation.x = leanRef.current * 0.5;
    body.rotation.z += (targetTilt * 0.15 - body.rotation.z) * 0.06;
    body.position.y = breathe;
    const s = scale * targetScale;
    body.scale.set(
      body.scale.x + (s - body.scale.x) * 0.08,
      body.scale.y + (s - body.scale.y) * 0.08,
      body.scale.z + (s - body.scale.z) * 0.08
    );

    head.rotation.y = Math.sin((t + bobPhase * 5) * 0.5) * 0.22;
    head.rotation.x += (targetTilt - head.rotation.x) * 0.06;

    const targetOpacity = dimmed ? 0.4 : 1;
    [bodyMaterial, headMaterial, accentMaterial].forEach((m) => {
      m.opacity += (targetOpacity - m.opacity) * 0.12;
    });
  });

  return (
    <group rotation={[0, facingAngle, 0]}>
      {/* Chair */}
      <mesh position={[0, -0.32, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color="#241509" roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.02, 0.32]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.6, 0.06]} />
        <meshStandardMaterial color="#241509" roughness={0.7} />
      </mesh>

      <group ref={bodyRef} position={[0, 0, 0]}>
        {/* Torso */}
        <mesh position={[0, 0.02, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.36, 6, 12]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
        {/* Shoulders / accent collar */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <torusGeometry args={[0.2, 0.045, 8, 20]} />
          <primitive object={accentMaterial} attach="material" />
        </mesh>
        {/* Arms, angled slightly toward the table */}
        <mesh position={[-0.26, 0.05, 0.12]} rotation={[0.5, 0, 0.25]} castShadow>
          <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
        <mesh position={[0.26, 0.05, 0.12]} rotation={[0.5, 0, -0.25]} castShadow>
          <capsuleGeometry args={[0.06, 0.32, 4, 8]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>

        <group ref={headRef} position={[0, 0.42, 0.02]}>
          <mesh castShadow>
            <sphereGeometry args={[0.16, 20, 20]} />
            <primitive object={headMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0, 0.15]}>
            <planeGeometry args={[0.2, 0.2]} />
            <meshBasicMaterial map={faceTexture} transparent />
          </mesh>
        </group>
      </group>

      {showDrink && (
        <mesh position={[0.32, -0.05, 0.35]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.12, 10]} />
          <meshStandardMaterial color="#d8a84e" roughness={0.2} metalness={0.1} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
