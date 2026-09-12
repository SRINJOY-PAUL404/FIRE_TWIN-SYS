import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExtinguisherUnit3D } from './useCampusData';

interface ExtinguisherMarkerProps {
  unit: ExtinguisherUnit3D;
  position: [number, number, number];
  onClick: (unit: ExtinguisherUnit3D) => void;
}

const STATUS_COLORS = {
  ok: '#3FBF6E',
  warn: '#E8A33D',
  crit: '#E24C4C',
};

export const ExtinguisherMarker: React.FC<ExtinguisherMarkerProps> = ({ unit, position, onClick }) => {
  const markerRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const color = STATUS_COLORS[unit.status];
  const needsPulse = unit.status === 'warn' || unit.status === 'crit';

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    
    // Add simple floating effect
    if (markerRef.current) {
      markerRef.current.position.y = position[1] + Math.sin(t * 3 + position[0]) * 0.1;
    }

    // Add pulse ring effect if warning or critical
    if (needsPulse && ringRef.current) {
      const scale = 1 + (t * 2 % 1.5);
      ringRef.current.scale.set(scale, scale, scale);
      
      const material = ringRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = Math.max(0, 1 - (scale - 1) / 1.5);
    }
  });

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Target Dot on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, position[1] - 0.3, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Main Sphere */}
      <mesh 
        ref={markerRef}
        position={[0, position[1], 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick(unit);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
        
        {/* Pulse Ring */}
        {needsPulse && (
          <mesh ref={ringRef} position={[0, 0, 0]}>
            <ringGeometry args={[0.45, 0.55, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} side={THREE.DoubleSide} />
          </mesh>
        )}
      </mesh>
    </group>
  );
};
