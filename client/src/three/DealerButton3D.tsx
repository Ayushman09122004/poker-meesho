import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function DealerButton3D({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    g.position.x = lerp(g.position.x, position[0], 0.15);
    g.position.y = lerp(g.position.y, position[1], 0.15);
    g.position.z = lerp(g.position.z, position[2], 0.15);
  });
  return (
    <group ref={ref} position={position}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 24]} />
        <meshStandardMaterial color="#f5f0e6" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.021, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.1, 24]} />
        <meshStandardMaterial color="#1a1a2e" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
