import React, { useState, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { Extinguisher } from '../../types';
import { useCampusData } from './useCampusData';
import type { ExtinguisherUnit3D, Building3D } from './useCampusData';
import { Building } from './Building';
import { ExtinguisherMarker } from './ExtinguisherMarker';
import { CampusHUD } from './CampusHUD';

interface Campus3DViewProps {
  extinguishers: Extinguisher[];
  locations: any[];
  selectedBuildingId: string | null;
  selectedFloor?: number | null;
  onSelectBuilding: (id: string | null, name: string | null) => void;
  onSelectFloor?: (floor: number | null) => void;
}

// CameraController handles the lerping
const CameraController: React.FC<{ selectedBuildingId: string | null, buildings: Building3D[], orbitRef: React.RefObject<OrbitControlsImpl | null> }> = ({ selectedBuildingId, buildings, orbitRef }) => {
  const { camera } = useThree();
  const prevBuildingRef = useRef<string | null>(selectedBuildingId);
  const isTransitioning = useRef(false);

  React.useEffect(() => {
    if (prevBuildingRef.current !== selectedBuildingId) {
      isTransitioning.current = true;
      prevBuildingRef.current = selectedBuildingId;
    }
  }, [selectedBuildingId]);

  useFrame((_, delta) => {
    if (!orbitRef.current) return;
    
    if (selectedBuildingId) {
      const b = buildings.find(b => b.id === selectedBuildingId);
      if (b) {
        // Target is building center
        const targetX = b.position[0];
        const targetY = (b.floors * b.floorHeight) / 2;
        const targetZ = b.position[1];
        
        orbitRef.current.target.lerp(new THREE.Vector3(targetX, targetY, targetZ), delta * 4);
        
        if (isTransitioning.current) {
          // Camera position: offset to frame it nicely
          const offset = new THREE.Vector3(12, 12, 16);
          const desiredPos = new THREE.Vector3(targetX, 0, targetZ).add(offset);
          camera.position.lerp(desiredPos, delta * 4);
          
          if (camera.position.distanceTo(desiredPos) < 0.5) {
            isTransitioning.current = false;
          }
        }
        orbitRef.current.minDistance = 6;
      }
    } else {
      orbitRef.current.target.lerp(new THREE.Vector3(0, 1, 0), delta * 4);
      if (isTransitioning.current) {
        const overviewPos = new THREE.Vector3(26, 26, 32);
        camera.position.lerp(overviewPos, delta * 4);
        if (camera.position.distanceTo(overviewPos) < 0.5) {
          isTransitioning.current = false;
        }
      }
      orbitRef.current.minDistance = 10;
    }
  });
  return null;
};

export const Campus3DView: React.FC<Campus3DViewProps> = ({ 
  extinguishers, 
  locations, 
  selectedBuildingId, 
  selectedFloor: propSelectedFloor,
  onSelectBuilding,
  onSelectFloor: propOnSelectFloor,
}) => {
  const { buildings, units3D } = useCampusData(extinguishers, locations);

  const [selectedUnit, setSelectedUnit] = useState<ExtinguisherUnit3D | null>(null);
  const [internalSelectedFloor, setInternalSelectedFloor] = useState<number | null>(null);

  const activeFloor = propSelectedFloor !== undefined ? propSelectedFloor : internalSelectedFloor;

  const handleFloorChange = (floor: number | null) => {
    setInternalSelectedFloor(floor);
    if (propOnSelectFloor) {
      propOnSelectFloor(floor);
    }
  };
  
  const orbitRef = useRef<OrbitControlsImpl>(null);
  const [autoRotate, setAutoRotate] = useState(false);

  const handleZoomIn = () => {
    if (orbitRef.current) {
      const target = orbitRef.current.target;
      const camera = orbitRef.current.object;
      const dir = new THREE.Vector3().subVectors(camera.position, target);
      camera.position.copy(target).add(dir.multiplyScalar(0.8));
      orbitRef.current.update();
    }
  };

  const handleZoomOut = () => {
    if (orbitRef.current) {
      const target = orbitRef.current.target;
      const camera = orbitRef.current.object;
      const dir = new THREE.Vector3().subVectors(camera.position, target);
      camera.position.copy(target).add(dir.multiplyScalar(1.25));
      orbitRef.current.update();
    }
  };

  const handleSelectUnit = (unit: ExtinguisherUnit3D | null) => {
    setSelectedUnit(unit);
    if (unit) {
      const b = buildings.find(b => b.id === unit.buildingId);
      onSelectBuilding(unit.buildingId, b ? b.name : null);
      handleFloorChange(unit.floor);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#14161A] font-sans">
      <CampusHUD 
        buildings={buildings}
        units={units3D}
        locations={locations}
        selectedUnit={selectedUnit}
        selectedBuildingId={selectedBuildingId}
        selectedFloor={activeFloor}
        onSelectUnit={handleSelectUnit}
        onSelectBuilding={(id) => {
          const b = buildings.find(b => b.id === id);
          onSelectBuilding(id, b ? b.name : null);
        }}
        onSelectFloor={handleFloorChange}
      />
      
      <Canvas camera={{ position: [26, 26, 32], fov: 42 }}>
        {/* Environment setup */}
        <color attach="background" args={['#0a0e17']} />
        <fogExp2 attach="fog" args={['#0a0e17', 0.022]} />
        
        {/* Holographic Wireframe Lighting: Cool Ambient + Key Directional + Subtle Accent Rim */}
        <ambientLight color="#8899bb" intensity={0.55} />
        <directionalLight color="#aeccff" intensity={0.85} position={[20, 30, 15]} />
        <directionalLight color="#a855f7" intensity={0.25} position={[-20, 15, -15]} />
        
        {/* Subtle Campus Ground Plane & Grid */}
        <gridHelper args={[44, 44, '#2a3550', '#151c2e']} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[44, 44]} />
          <meshStandardMaterial color="#0c1120" roughness={0.9} />
        </mesh>

        <OrbitControls 
          ref={orbitRef}
          enableDamping 
          dampingFactor={0.09} 
          minDistance={8} 
          maxDistance={65}
          maxPolarAngle={1.45}
          autoRotate={autoRotate}
          autoRotateSpeed={2.0}
        />

        <CameraController selectedBuildingId={selectedBuildingId} buildings={buildings} orbitRef={orbitRef} />

        <group>
          {buildings.map((b) => (
            <Building 
              key={b.id} 
              building={b}
              isSelected={selectedBuildingId === b.id}
              isDimmed={selectedBuildingId !== null && selectedBuildingId !== b.id}
              selectedFloor={selectedBuildingId === b.id ? activeFloor : null}
              onClick={() => {
                onSelectBuilding(b.id, b.name);
                handleFloorChange(null);
                setSelectedUnit(null);
              }}
              onFloorClick={(floorIndex) => {
                handleFloorChange(floorIndex);
              }}
            />
          ))}
        </group>

        {/* Show units only when their building is selected */}
        {selectedBuildingId && (
          <group>
          {units3D.map((unit: ExtinguisherUnit3D) => {
            const b = buildings.find(bldg => bldg.id === unit.buildingId);
            if (!b) return null;

            // Only show units if their building is selected
            if (selectedBuildingId !== b.id) {
              return null;
            }

            // Apply floor filtering
            if (activeFloor !== null && unit.floor !== activeFloor) {
              return null;
            }

            // Calculate world position aligned with exploded floor slabs
            const explodeGap = 0.55;
            const ef = selectedBuildingId === b.id ? 1.0 : 0.0;
            const worldX = b.position[0] + unit.localPosition[0];
            const worldZ = b.position[1] + unit.localPosition[1];
            const worldY = (unit.floor * b.floorHeight) + (unit.floor * explodeGap * ef) + (b.floorHeight * 0.45);

            return (
              <ExtinguisherMarker 
                key={unit.id}
                unit={unit}
                position={[worldX, worldY, worldZ]}
                onClick={handleSelectUnit}
              />
            );
          })}
        </group>
        )}
      </Canvas>

      {/* Camera Controls */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 z-20">
        <button 
          onClick={() => setAutoRotate(!autoRotate)}
          className={`px-3 py-2 text-xs font-[var(--font-nav)] uppercase tracking-widest transition-colors border border-[var(--color-command-border)] ${autoRotate ? 'bg-[var(--color-amber-alert)] text-[#0F1218]' : 'bg-[var(--color-command-bg)] text-[#E2E8F0] hover:bg-[var(--color-steel-blue)]/20'}`}
        >
          360° {autoRotate ? 'ON' : 'OFF'}
        </button>
        <div className="flex bg-[var(--color-command-bg)] border border-[var(--color-command-border)]">
          <button 
            onClick={handleZoomIn}
            className="flex-1 px-3 py-2 text-lg font-bold text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors border-r border-[var(--color-command-border)] cursor-pointer"
            title="Zoom In"
          >
            +
          </button>
          <button 
            onClick={handleZoomOut}
            className="flex-1 px-3 py-2 text-lg font-bold text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors cursor-pointer"
            title="Zoom Out"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
};
