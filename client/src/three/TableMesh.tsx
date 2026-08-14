import { useMemo } from 'react';
import * as THREE from 'three';
import { TABLE_RADIUS_X, TABLE_RADIUS_Z, TABLE_SURFACE_Y } from './layout3D';

interface TableMeshProps {
  feltColorLight: string;
  feltColorDark: string;
}

// A canvas-generated radial-gradient texture for the felt, so the surface reads as lit fabric
// rather than a flat color fill — cheap to generate, no external texture asset needed.
function useFeltTexture(light: string, dark: string) {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size * 0.4, size * 0.1, size / 2, size / 2, size * 0.75);
    gradient.addColorStop(0, light);
    gradient.addColorStop(1, dark);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    // Subtle fabric noise so it doesn't look like flat plastic.
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [light, dark]);
}

export function TableMesh({ feltColorLight, feltColorDark }: TableMeshProps) {
  const feltTexture = useFeltTexture(feltColorLight, feltColorDark);
  const railHeight = 0.16;

  return (
    <group>
      {/* Wood rail — a squashed torus-like ring around the felt, beveled via cylinder + scale */}
      <mesh position={[0, TABLE_SURFACE_Y - railHeight / 2, 0]} scale={[TABLE_RADIUS_X + 0.32, 1, TABLE_RADIUS_Z + 0.32]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, railHeight, 64]} />
        <meshStandardMaterial color="#5c3a20" roughness={0.35} metalness={0.15} />
      </mesh>
      <mesh position={[0, TABLE_SURFACE_Y - railHeight - 0.001, 0]} scale={[TABLE_RADIUS_X + 0.34, 1, TABLE_RADIUS_Z + 0.34]} receiveShadow>
        <cylinderGeometry args={[1, 1.05, 0.08, 64]} />
        <meshStandardMaterial color="#2e1c0f" roughness={0.5} />
      </mesh>
      {/* Gold trim ring between rail and felt */}
      <mesh position={[0, TABLE_SURFACE_Y + 0.005, 0]} scale={[TABLE_RADIUS_X + 0.06, 1, TABLE_RADIUS_Z + 0.06]}>
        <ringGeometry args={[0.985, 1, 64]} />
        <meshStandardMaterial color="#e3b64f" roughness={0.3} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      {/* Felt playing surface */}
      <mesh position={[0, TABLE_SURFACE_Y, 0]} scale={[TABLE_RADIUS_X, 1, TABLE_RADIUS_Z]} receiveShadow>
        <cylinderGeometry args={[1, 1, 0.02, 64]} />
        <meshStandardMaterial map={feltTexture} roughness={0.92} />
      </mesh>
      {/* Table pedestal, mostly hidden by the rail but grounds the object visually */}
      <mesh position={[0, TABLE_SURFACE_Y / 2 - 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.7, TABLE_SURFACE_Y - 0.2, 24]} />
        <meshStandardMaterial color="#241509" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.04, 32]} />
        <meshStandardMaterial color="#1a0f07" roughness={0.7} />
      </mesh>
    </group>
  );
}
