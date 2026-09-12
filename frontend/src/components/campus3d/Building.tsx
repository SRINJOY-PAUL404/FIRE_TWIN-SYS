import React, { useMemo, useState, useRef } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { Building3D } from './useCampusData';

interface BuildingProps {
  building: Building3D;
  isSelected: boolean;
  isDimmed: boolean;
  selectedFloor: number | null; // null means show all floors
  onClick: () => void;
  onFloorClick?: (floorIndex: number) => void;
}

const STATUS_COLORS = {
  ok: '#38d97a',
  warn: '#f0a93a',
  crit: '#ef4444',
};

export const Building: React.FC<BuildingProps> = ({ 
  building, 
  isSelected, 
  isDimmed, 
  selectedFloor, 
  onClick, 
  onFloorClick 
}) => {
  const [hovered, setHovered] = useState(false);
  const [labelsVisible, setLabelsVisible] = useState(false);
  const { width, depth, floors, floorHeight, position, status, floorsData } = building;
  
  const massingHeight = building.height || floors * floorHeight;
  const explodeGap = 0.55; // vertical gap between floors when exploded

  const explodeFactor = useRef(0);
  const targetExplode = isSelected ? 1 : 0;

  const baseStatusColor = STATUS_COLORS[status];
  const activeEdgeColor = hovered && !isSelected ? '#00f0ff' : baseStatusColor;

  // 1. Overview Wireframe Box Geometries
  const solidBoxGeom = useMemo(() => new THREE.BoxGeometry(width, massingHeight, depth), [width, depth, massingHeight]);
  const solidEdgesGeom = useMemo(() => new THREE.EdgesGeometry(solidBoxGeom), [solidBoxGeom]);

  // Intermediate floor divider lines around the outer box
  const floorDividersGeom = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const hw = width / 2;
    const hd = depth / 2;
    const hh = massingHeight / 2;

    for (let f = 1; f < floors; f++) {
      const y = -hh + f * floorHeight;
      // Perimeter rectangle ring
      points.push(new THREE.Vector3(-hw, y, -hd), new THREE.Vector3(hw, y, -hd));
      points.push(new THREE.Vector3(hw, y, -hd), new THREE.Vector3(hw, y, hd));
      points.push(new THREE.Vector3(hw, y, hd), new THREE.Vector3(-hw, y, hd));
      points.push(new THREE.Vector3(-hw, y, hd), new THREE.Vector3(-hw, y, -hd));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    return geom;
  }, [width, depth, massingHeight, floors, floorHeight]);

  // 2. Floor slice geometries & edges for exploded drill-down state
  const slabHeight = floorHeight * 0.82;
  const slabWidth = width * 0.94;
  const slabDepth = depth * 0.94;

  const floorBoxGeom = useMemo(() => new THREE.BoxGeometry(slabWidth, slabHeight, slabDepth), [slabWidth, slabHeight, slabDepth]);
  const floorEdgesGeom = useMemo(() => new THREE.EdgesGeometry(floorBoxGeom), [floorBoxGeom]);

  const floorHighlightEdgesGeom = useMemo(() => {
    const highlightBox = new THREE.BoxGeometry(slabWidth * 1.02, slabHeight + 0.05, slabDepth * 1.02);
    return new THREE.EdgesGeometry(highlightBox);
  }, [slabWidth, slabHeight, slabDepth]);

  useFrame((_, delta) => {
    // Smooth lerping for explode animation
    const speed = 5.0;
    explodeFactor.current = THREE.MathUtils.lerp(explodeFactor.current, targetExplode, delta * speed);
    const ef = explodeFactor.current;
    
    if (ef > 0.35 && !labelsVisible && isSelected) setLabelsVisible(true);
    if (ef <= 0.35 && labelsVisible) setLabelsVisible(false);
  });

  const baseRadius = Math.max(width, depth) * 0.72;

  return (
    <group position={[position[0], 0, position[1]]}>
      {/* Ground Base Glowing Ellipse / Ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[baseRadius * 0.85, baseRadius * 1.05, 32]} />
        <meshBasicMaterial 
          color={baseStatusColor} 
          transparent 
          opacity={isDimmed ? 0.06 : (hovered || isSelected ? 0.75 : 0.35)} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* Inner subtle glow disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[baseRadius * 0.85, 32]} />
        <meshBasicMaterial 
          color={baseStatusColor} 
          transparent 
          opacity={isDimmed ? 0.02 : (hovered || isSelected ? 0.12 : 0.06)} 
          side={THREE.DoubleSide} 
        />
      </mesh>

      {/* 1. COLLAPSED VIEW: Holographic Wireframe Box with Faint Translucent Fill */}
      {!isSelected && (
        <group position={[0, massingHeight / 2, 0]}>
          {/* Translucent hologram body */}
          <mesh
            geometry={solidBoxGeom}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
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
            <meshPhongMaterial
              color={hovered ? "#1a253a" : "#0f1626"}
              transparent
              opacity={isDimmed ? 0.08 : (hovered ? 0.42 : 0.28)}
              shininess={40}
              specular="#223355"
            />
          </mesh>

          {/* Thin Wireframe Outer Edges */}
          <lineSegments geometry={solidEdgesGeom}>
            <lineBasicMaterial 
              color={activeEdgeColor} 
              transparent 
              opacity={isDimmed ? 0.18 : (hovered ? 1.0 : 0.75)} 
              linewidth={1} 
            />
          </lineSegments>

          {/* Floor Divider Wireframe Rings */}
          {floors > 1 && (
            <lineSegments geometry={floorDividersGeom}>
              <lineBasicMaterial 
                color={activeEdgeColor} 
                transparent 
                opacity={isDimmed ? 0.1 : (hovered ? 0.6 : 0.35)} 
                linewidth={1} 
              />
            </lineSegments>
          )}

          {/* Small Status Indicator Dot on Front Face */}
          <mesh position={[-width / 2 + 0.35, -massingHeight / 2 + 0.35, depth / 2 + 0.02]}>
            <circleGeometry args={[0.1, 16]} />
            <meshBasicMaterial color={baseStatusColor} />
          </mesh>
        </group>
      )}

      {/* 2. EXPLODED VIEW: Translucent Hologram Floor Slices with Interactive Floor Drill-Down */}
      {isSelected && (
        <group>
          {Array.from({ length: floors }).map((_, f) => {
            const floorStatus = floorsData[f]?.status || 'ok';
            const floorColor = STATUS_COLORS[floorStatus];
            const labelText = floorStatus === 'ok' ? 'NOMINAL' : floorStatus === 'warn' ? 'ATTENTION' : 'CRITICAL';
            const isHidden = selectedFloor !== null && selectedFloor !== f;
            const isFloorActive = selectedFloor === f;

            const ef = explodeFactor.current;
            const explodedY = (f * floorHeight) + (f * explodeGap * ef) + (slabHeight / 2);
            const targetOpacity = isHidden ? 0.12 : (isFloorActive ? 0.95 : 0.6);

            return (
              <group key={`floor-slice-${f}`} position={[0, explodedY, 0]}>
                {/* Translucent Floor Box Slab */}
                <mesh
                  geometry={floorBoxGeom}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFloorClick) onFloorClick(f);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'pointer';
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = 'auto';
                  }}
                >
                  <meshPhongMaterial 
                    color={isFloorActive ? '#162844' : '#0f1626'}
                    transparent
                    opacity={isHidden ? 0.08 : (isFloorActive ? 0.5 : 0.25)}
                    shininess={40}
                    specular="#223355"
                  />
                </mesh>

                {/* Floor Wireframe Edge Outline */}
                <lineSegments geometry={floorEdgesGeom}>
                  <lineBasicMaterial 
                    color={isFloorActive ? '#00f0ff' : floorColor} 
                    transparent 
                    opacity={targetOpacity} 
                    linewidth={isFloorActive ? 2 : 1} 
                  />
                </lineSegments>

                {/* Active Floor Glowing Highlight Outline */}
                {isFloorActive && (
                  <lineSegments geometry={floorHighlightEdgesGeom}>
                    <lineBasicMaterial color="#00f0ff" transparent opacity={0.95} linewidth={2} />
                  </lineSegments>
                )}

                {/* Floor Status LED Dot */}
                <mesh position={[-slabWidth / 2 + 0.25, 0, slabDepth / 2 + 0.02]}>
                  <sphereGeometry args={[0.08, 12, 12]} />
                  <meshBasicMaterial color={floorColor} />
                </mesh>
                {(floorStatus === 'warn' || floorStatus === 'crit') && (
                  <mesh position={[-slabWidth / 2 + 0.25, 0, slabDepth / 2 + 0.02]}>
                    <ringGeometry args={[0.1, 0.16, 16]} />
                    <meshBasicMaterial color={floorColor} transparent opacity={0.7} side={THREE.DoubleSide} />
                  </mesh>
                )}

                {/* Floor Exploded HUD Label */}
                <Html 
                  position={[-(slabWidth / 2) - 1.2, 0, 0]} 
                  center 
                  style={{ 
                    pointerEvents: 'none', 
                    transition: 'opacity 0.25s ease-in-out', 
                    opacity: (labelsVisible && !isHidden) ? 1 : 0 
                  }}
                >
                  <div className="flex items-center">
                    <div 
                      className={`bg-[rgba(10,14,23,0.95)] border px-2.5 py-1 text-[10px] font-[var(--font-mono)] whitespace-nowrap shadow-xl flex items-center gap-1.5 ${
                        isFloorActive ? 'border-[var(--color-amber-alert)] ring-1 ring-[var(--color-amber-alert)]' : 'border-[var(--color-command-border)]'
                      }`}
                    >
                      <span className="text-slate-200 font-bold">FL {f}</span>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: floorColor }}></span>
                      <span className="uppercase text-[9px] font-bold" style={{ color: floorColor }}>{labelText}</span>
                    </div>
                    <div className="w-5 h-[1px] bg-[var(--color-command-border)]"></div>
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      )}

      {/* Building Name & Info Floating Billboard (Anchored above roof) */}
      <Html 
        position={[0, massingHeight + 0.65, 0]} 
        center 
        style={{ 
          pointerEvents: 'none', 
          transition: 'opacity 0.2s ease-in-out', 
          opacity: (isDimmed || isSelected) ? 0 : 1 
        }}
      >
        <div className="flex flex-col items-center whitespace-nowrap select-none">
          <div 
            className={`backdrop-blur-md px-2.5 py-1 text-xs font-bold tracking-wide shadow-2xl flex items-center gap-1.5 transition-all ${
              hovered 
                ? 'bg-[rgba(15,23,42,0.98)] border-2 border-[var(--color-amber-alert)] text-white scale-105' 
                : 'bg-[rgba(10,14,23,0.92)] border border-[var(--color-command-border)] text-slate-100'
            }`}
            style={{ borderLeft: `3px solid ${baseStatusColor}` }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: baseStatusColor }}></span>
            <span>{building.name}</span>
          </div>
          <div className="text-[10px] font-[var(--font-mono)] text-[var(--color-steel-blue)] mt-0.5 tracking-wider bg-[rgba(10,14,23,0.85)] px-1.5 py-0.5 border border-[var(--color-command-border)]/60">
            {building.sub}
          </div>
          <div className="w-[1px] h-[16px] mt-0.5 bg-gradient-to-b from-[var(--color-command-border)] to-transparent"></div>
        </div>
      </Html>
    </group>
  );
};
