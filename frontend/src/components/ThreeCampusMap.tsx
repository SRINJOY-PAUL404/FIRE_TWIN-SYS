import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Html, Environment, Sky, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Extinguisher } from '../types';
import { 
  Flame, Search, X, Map as MapIcon, Shield, BarChart2, AlertTriangle, 
  Settings, User, Bell, ChevronRight, Navigation, Layout, Cloud, Sun,
  Layers, Camera, Radio
} from 'lucide-react';

interface ThreeCampusMapProps {
  extinguishers: Extinguisher[];
  emergencyExtinguisherId?: number | null;
}

// ---------------------------------------------------------------
// COLORS & THEME (Dusk Glassmorphism matching reference)
// ---------------------------------------------------------------
const COLORS = {
  void: '#0b131e', // Dusk sky base
  ground: '#131c19', // Dark grass
  road: '#1a1f26',
  water: '#0a1d2e',
  glass: '#d6e6f2', // Brighter interior-lit glass
  frame: '#f0f4f8', // White concrete frames
  panelBg: 'rgba(8, 14, 25, 0.75)',
  panelBorder: 'rgba(59, 130, 246, 0.3)',
  neonBlue: '#3b82f6',
  emerald: '#10b981',
  amber: '#f59e0b',
  crimson: '#ef4444',
  textDim: '#94a3b8'
};

const getStatusColor = (status: string, id: number, emergencyId?: number | null) => {
  if (id === emergencyId || status === 'Emergency' || status === 'Missing' || status === 'EXPIRED') return COLORS.crimson;
  if (status === 'Low Pressure' || status === 'LOW_PRESSURE') return COLORS.amber;
  return COLORS.emerald;
};

// ---------------------------------------------------------------
// BUILDINGS DATA (11 Logical Zones from Reference)
// ---------------------------------------------------------------
const BUILDINGS_DATA = [
  { id: 1, name: 'Admin Block', floors: 5, cx: -8, cz: -15, w: 14, d: 10 },
  { id: 2, name: 'Academic Block - A', floors: 6, cx: 10, cz: -15, w: 16, d: 12 },
  { id: 3, name: 'Academic Block - B', floors: 6, cx: 30, cz: -10, w: 16, d: 12 },
  { id: 4, name: 'Library', floors: 4, cx: 5, cz: 2, w: 12, d: 12 },
  { id: 5, name: 'Hostel - A', floors: 6, cx: -28, cz: 0, w: 14, d: 18 },
  { id: 6, name: 'Hostel - B', floors: 6, cx: -20, cz: 20, w: 14, d: 18 },
  { id: 7, name: 'Auditorium', floors: 3, cx: 22, cz: 12, w: 18, d: 15, isWood: true },
  { id: 8, name: 'Canteen', floors: 2, cx: 42, cz: 10, w: 10, d: 10 },
  { id: 9, name: 'Medical Center', floors: 3, cx: 35, cz: 25, w: 10, d: 12 },
  { id: 10, name: 'Sports Complex', floors: 3, cx: -2, cz: 28, w: 16, d: 12 },
  { id: 11, name: 'Security Gate', floors: 2, cx: 18, cz: 35, w: 6, d: 4 },
];

// ---------------------------------------------------------------
// TREES GENERATOR
// ---------------------------------------------------------------
const CampusTrees = () => {
  const count = 150;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  useMemo(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 80;
      // Avoid buildings
      if (x > -35 && x < 45 && z > -20 && z < 35 && Math.random() > 0.2) continue;
      
      dummy.position.set(x, 1, z);
      const scale = 0.5 + Math.random() * 0.8;
      dummy.scale.set(scale, scale * (1 + Math.random()*0.5), scale);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow receiveShadow>
      <sphereGeometry args={[1.5, 8, 8]} />
      <meshStandardMaterial color="#1a3d24" roughness={0.9} />
    </instancedMesh>
  );
};

// ---------------------------------------------------------------
// 3D ARCHITECTURE GENERATOR (High Fidelity)
// ---------------------------------------------------------------
const DetailedBuilding = ({ 
  bldg, isSelected, selectedFloor, onClick 
}: { bldg: any, isSelected: boolean, selectedFloor: number | null, onClick: () => void }) => {
  const [hovered, setHovered] = useState(false);
  const floorH = 2.8;
  const elements = [];
  
  // Cutaway Logic
  const wallOpacity = isSelected ? 0.1 : 0.6;
  const isCutaway = isSelected;

  for (let f = 0; f < bldg.floors; f++) {
    const y0 = f * floorH;
    
    // Floor Isolation
    const isFloorActive = selectedFloor === null || selectedFloor === f;
    const floorOpacity = isFloorActive ? 1.0 : 0.05;
    
    // Internal Floor Slab
    elements.push(
      <mesh key={`slab-${f}`} position={[0, y0, 0]} receiveShadow>
        <boxGeometry args={[bldg.w - 0.2, 0.2, bldg.d - 0.2]} />
        <meshStandardMaterial color={bldg.isWood && f === 1 ? '#8b5a2b' : '#b0b8c4'} roughness={0.8} transparent opacity={isCutaway ? floorOpacity : 0.9} />
      </mesh>
    );

    // Warm Interior Core (Simulating lights/rooms)
    if (!isCutaway && isFloorActive) {
      elements.push(
        <mesh key={`core-${f}`} position={[0, y0 + floorH/2, 0]}>
          <boxGeometry args={[bldg.w - 3, floorH - 0.4, bldg.d - 3]} />
          <meshBasicMaterial color={bldg.isWood ? '#ffb347' : '#ffdca8'} transparent opacity={0.3} />
        </mesh>
      );
    }
  }

  // White Structural Pillars/Frame (Creates the modern architectural look)
  elements.push(
    <lineSegments key="frame" position={[0, (bldg.floors * floorH)/2, 0]}>
      <edgesGeometry args={[new THREE.BoxGeometry(bldg.w, bldg.floors * floorH, bldg.d)]} />
      <lineBasicMaterial color={COLORS.frame} transparent opacity={isCutaway ? 0.2 : 0.8} linewidth={2} />
    </lineSegments>
  );

  // Exterior Glass Shell
  elements.push(
    <mesh key="shell" position={[0, (bldg.floors * floorH)/2, 0]} castShadow>
      <boxGeometry args={[bldg.w, bldg.floors * floorH, bldg.d]} />
      <meshStandardMaterial 
        color={COLORS.glass} 
        transparent 
        opacity={isCutaway ? 0.1 : 0.4} 
        roughness={0.2} 
        metalness={0.8}
        envMapIntensity={1.5}
      />
    </mesh>
  );

  const roofY = bldg.floors * floorH;

  return (
    <group position={[bldg.cx, 0, bldg.cz]}>
      <mesh 
        position={[0, roofY / 2, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <boxGeometry args={[bldg.w + 0.5, roofY, bldg.d + 0.5]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {elements}
      
      {/* Dark Glassmorphism Building Label */}
      {(hovered || isSelected || !isCutaway) && (
        <Html position={[0, roofY + 1.5, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ 
            background: 'rgba(12, 18, 28, 0.8)', 
            border: `1px solid rgba(59, 130, 246, 0.4)`, 
            padding: '4px 10px', 
            borderRadius: '4px',
            color: '#fff', 
            fontSize: '11px', 
            whiteSpace: 'nowrap', 
            backdropFilter: 'blur(8px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>{bldg.name}</span>
            <span style={{ color: COLORS.textDim, fontSize: '9px' }}>G+{bldg.floors - 1}</span>
          </div>
        </Html>
      )}
    </group>
  );
};

// ---------------------------------------------------------------
// ENVIRONMENT (Dusk, Roads, Water, Sports Field)
// ---------------------------------------------------------------
const CampusEnvironment = () => {
  return (
    <group>
      {/* Ground Base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={COLORS.ground} roughness={1} />
      </mesh>

      {/* Main Road Network */}
      <mesh position={[0, 0.01, 4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 10]} />
        <meshStandardMaterial color={COLORS.road} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.01, 18]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 8]} />
        <meshStandardMaterial color={COLORS.road} roughness={0.9} />
      </mesh>
      <mesh position={[-12, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 80]} />
        <meshStandardMaterial color={COLORS.road} roughness={0.9} />
      </mesh>
      <mesh position={[28, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 80]} />
        <meshStandardMaterial color={COLORS.road} roughness={0.9} />
      </mesh>
      
      {/* Sports Field (Football pitch) */}
      <mesh position={[-35, 0.02, 35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 45]} />
        <meshStandardMaterial color="#1a472a" roughness={1.0} />
      </mesh>
      {/* Pitch Lines */}
      <mesh position={[-35, 0.03, 35]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4, 4.2, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>
      <lineSegments position={[-35, 0.03, 35]} rotation={[-Math.PI / 2, 0, 0]}>
        <edgesGeometry args={[new THREE.PlaneGeometry(28, 43)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.6} />
      </lineSegments>
      
      {/* Water Body (Lake in the back) */}
      <mesh position={[20, 0.0, -35]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 25]} />
        <meshStandardMaterial color={COLORS.water} roughness={0.1} metalness={0.8} />
      </mesh>

      <CampusTrees />
    </group>
  );
};

// ---------------------------------------------------------------
// EXTINGUISHER MARKER (Optimized 3D Marker)
// ---------------------------------------------------------------
const ExtinguisherMarker = ({ extinguisher, color, x, y, z, isHidden, onClick }: { extinguisher: Extinguisher, color: string, x: number, y: number, z: number, isHidden: boolean, onClick: () => void }) => {
  const isCrit = color === COLORS.crimson;
  const markerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (isHidden) return;
    const t = clock.elapsedTime;
    const offset = extinguisher.id * 0.1;
    if (markerRef.current) {
      markerRef.current.position.y = 2.5 + Math.sin(t * 2 + offset) * 0.2;
      markerRef.current.rotation.y += 0.02;
    }
  });

  if (isHidden) return null;

  return (
    <group position={[x, y, z]}>
      {/* Dropdown line */}
      <mesh position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 2.5]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      
      {/* Target Dot on floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[0.3, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* 3D Floating Diamond instead of expensive HTML badge */}
      <mesh 
        ref={markerRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <octahedronGeometry args={[isCrit ? 0.6 : 0.4]} />
        <meshBasicMaterial color={hovered ? '#ffffff' : color} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------
// CAMERA CONTROLLER
// ---------------------------------------------------------------
const SceneCameraControls = ({ selectedBuilding, selectedUnit, selectedFloor, topDownMode }: { selectedBuilding: any, selectedUnit: Extinguisher | null, selectedFloor: number | null, topDownMode: boolean }) => {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (controlsRef.current) {
      if (topDownMode) {
        controlsRef.current.setLookAt(0, 90, 0.1, 0, 0, 0, true);
      } else if (selectedUnit) {
        const bldg = BUILDINGS_DATA.find(b => b.id === selectedUnit.building_id) || BUILDINGS_DATA[0];
        const rx = (Math.sin(selectedUnit.id * 13.37) + 1) / 2;
        const rz = (Math.cos(selectedUnit.id * 42.1) + 1) / 2;
        const x = bldg.cx - bldg.w/2 + 1 + rx * (bldg.w - 2);
        const z = bldg.cz - bldg.d/2 + 1 + rz * (bldg.d - 2);
        const y = (selectedUnit.id % bldg.floors) * 2.8;
        controlsRef.current.setLookAt(x + 5, y + 4, z + 5, x, y, z, true);
      } else if (selectedBuilding) {
        const focusY = selectedFloor !== null ? selectedFloor * 2.8 : 5;
        controlsRef.current.setLookAt(selectedBuilding.cx + 20, focusY + 15, selectedBuilding.cz + 20, selectedBuilding.cx, focusY, selectedBuilding.cz, true);
      } else {
        // High-angle aerial isometric view
        controlsRef.current.setLookAt(40, 50, 60, 0, 0, 0, true);
      }
    }
  }, [selectedBuilding, selectedUnit, selectedFloor, topDownMode]);

  return <CameraControls ref={controlsRef} makeDefault minDistance={2} maxDistance={150} maxPolarAngle={Math.PI / 2.1} />;
};

// ---------------------------------------------------------------
// MAIN COMPONENT (GLASSMORPHISM UI OVERHAUL)
// ---------------------------------------------------------------
export const ThreeCampusMap: React.FC<ThreeCampusMapProps> = ({ extinguishers, emergencyExtinguisherId }) => {
  const [selectedUnit, setSelectedUnit] = useState<Extinguisher | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [topDownMode, setTopDownMode] = useState(false);

  const selectedBuilding = BUILDINGS_DATA.find(b => b.id === selectedBuildingId) || null;

  const okCnt = extinguishers.filter(e => e.status === 'Healthy').length;
  const warnCnt = extinguishers.filter(e => e.status === 'Low Pressure').length;
  const critCnt = extinguishers.filter(e => e.status === 'Emergency' || e.status === 'Missing').length;

  const panelStyle = {
    background: COLORS.panelBg,
    backdropFilter: 'blur(16px)',
    border: `1px solid ${COLORS.panelBorder}`,
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
    color: '#fff',
    borderRadius: '12px'
  };

  return (
    <div className="w-full h-full relative overflow-hidden font-sans" style={{ background: COLORS.void }}>
      
      {/* ----------------------------------------------------- */}
      {/* UI: TOP NAVIGATION (Centered) */}
      {/* ----------------------------------------------------- */}
      <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between pointer-events-none">
        
        {/* Logo */}
        <div className="flex items-center gap-3 pointer-events-auto bg-black/40 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
          <div className="bg-white p-1 rounded-full"><img src="https://upload.wikimedia.org/wikipedia/en/2/2a/Brainware_University_logo.png" alt="Logo" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} /></div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-wide text-white">Brainware University</h1>
            <p className="text-[10px] text-slate-400 tracking-widest uppercase">Digital Twin • Fire Safety Monitoring</p>
          </div>
        </div>
        
        {/* Main Nav Tabs */}
        <div style={panelStyle} className="flex px-1 py-1 pointer-events-auto rounded-full">
          <button onClick={() => setTopDownMode(false)} className={`px-6 py-2 text-sm font-semibold rounded-full transition-colors ${!topDownMode ? 'bg-[#1e40af] text-white shadow-inner border border-[#3b82f6]' : 'text-slate-300 hover:text-white'}`}>3D Model</button>
          <button onClick={() => setTopDownMode(true)} className={`px-6 py-2 text-sm font-semibold rounded-full transition-colors ${topDownMode ? 'bg-[#1e40af] text-white shadow-inner border border-[#3b82f6]' : 'text-slate-300 hover:text-white'}`}>2D Plan</button>
          <button className="px-6 py-2 text-sm font-semibold rounded-full text-slate-300 hover:text-white">Heatmap</button>
          <button className="px-6 py-2 text-sm font-semibold rounded-full text-slate-300 hover:text-white">Assets</button>
          <button className="px-6 py-2 text-sm font-semibold rounded-full text-slate-300 hover:text-white">Analytics</button>
          <button className="px-6 py-2 text-sm font-semibold rounded-full text-slate-300 hover:text-white">Emergency</button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <div style={panelStyle} className="relative flex items-center pl-3 pr-2 py-1 rounded-full">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search building, floor or unit..." className="bg-transparent border-none outline-none text-sm text-white px-3 py-1.5 w-60 placeholder:text-slate-500 focus:ring-0" />
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md cursor-pointer hover:bg-black/60">
            <div className="bg-[#1e40af] w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[#3b82f6]">SP</div>
            <div className="flex flex-col text-left mr-2">
              <span className="text-sm font-bold leading-tight">Srinjoy</span>
              <span className="text-[10px] text-slate-400 leading-tight">Admin</span>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* UI: FAR LEFT TOOLBAR */}
      {/* ----------------------------------------------------- */}
      <div className="absolute top-1/2 -translate-y-1/2 left-4 z-10 flex flex-col gap-3 pointer-events-auto">
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors border-[#3b82f6]/50 bg-[#1e40af]/30"><Layers className="w-5 h-5 text-[#3b82f6]" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Flame className="w-5 h-5 text-slate-400" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Shield className="w-5 h-5 text-slate-400" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Bell className="w-5 h-5 text-slate-400" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Camera className="w-5 h-5 text-slate-400" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Layout className="w-5 h-5 text-slate-400" /></button>
        <button style={panelStyle} className="p-3 rounded-lg hover:bg-white/10 transition-colors"><Radio className="w-5 h-5 text-slate-400" /></button>
      </div>

      {/* ----------------------------------------------------- */}
      {/* UI: LEFT OVERVIEW PANEL */}
      {/* ----------------------------------------------------- */}
      <div className="absolute top-24 left-20 w-72 z-10 pointer-events-none flex flex-col gap-4">
        <div style={panelStyle} className="p-5 pointer-events-auto rounded-xl">
          <h2 className="text-sm text-white font-bold mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-[#3b82f6] rounded-full"></span> Campus Overview
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <Flame className="w-6 h-6 text-red-500" />
              <div>
                <div className="text-xs text-slate-400">Total Assets</div>
                <div className="text-xl font-bold">{extinguishers.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <Layout className="w-6 h-6 text-slate-300" />
              <div>
                <div className="text-xs text-slate-400">Buildings</div>
                <div className="text-xl font-bold">{BUILDINGS_DATA.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <Layers className="w-6 h-6 text-[#3b82f6]" />
              <div>
                <div className="text-xs text-slate-400">Floors</div>
                <div className="text-xl font-bold">48</div>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 p-2 rounded-lg border border-white/5">
              <Radio className="w-6 h-6 text-emerald-500" />
              <div>
                <div className="text-xs text-slate-400">Active Sensors</div>
                <div className="text-xl font-bold">96</div>
              </div>
            </div>
          </div>
          
          <h3 className="text-sm font-bold text-white mb-3">Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-300">Operational</span></div><span className="text-emerald-400 font-bold">{okCnt}</span></div>
            <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500"></span><span className="text-slate-300">Inspection Due</span></div><span className="text-orange-400 font-bold">{warnCnt}</span></div>
            <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400"></span><span className="text-slate-300">Low Pressure</span></div><span className="text-amber-400 font-bold">3</span></div>
            <div className="flex justify-between items-center text-sm"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-300">Critical / Missing</span></div><span className="text-red-400 font-bold">{critCnt}</span></div>
          </div>
        </div>

        {/* Selected Building Details */}
        {selectedBuilding && (
          <div style={panelStyle} className="p-5 pointer-events-auto animate-in fade-in rounded-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-white font-bold">{selectedBuilding.name}</h2>
              <button onClick={() => { setSelectedBuildingId(null); setSelectedUnit(null); setSelectedFloor(null); }} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="text-xs text-slate-400 mb-2 uppercase tracking-widest">Isolate Floor</div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setSelectedFloor(null)} className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${selectedFloor === null ? 'bg-[#3b82f6] text-white' : 'bg-white/5 text-slate-300'}`}>ALL</button>
              {[...Array(selectedBuilding.floors)].map((_, i) => (
                <button key={i} onClick={() => setSelectedFloor(i)} className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${selectedFloor === i ? 'bg-[#3b82f6] text-white' : 'bg-white/5 text-slate-300'}`}>{i === 0 ? 'G' : i}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------- */}
      {/* UI: RIGHT PANELS (Alerts + Minimap) */}
      {/* ----------------------------------------------------- */}
      <div className="absolute top-24 right-6 w-80 z-10 pointer-events-none flex flex-col gap-4">
        
        {/* Live Alerts */}
        <div style={panelStyle} className="p-5 pointer-events-auto rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm text-white font-bold flex items-center gap-2">
              <span className="w-1.5 h-4 bg-[#3b82f6] rounded-full"></span> Live Alerts
            </h2>
            <button className="text-xs text-[#3b82f6] hover:text-white">View All</button>
          </div>
          <div className="space-y-3">
            {extinguishers.filter(e => e.status !== 'Healthy').slice(0, 4).map((ex, i) => {
              const isCrit = ex.status === 'Emergency' || ex.status === 'Missing';
              return (
                <div key={i} onClick={() => { setSelectedBuildingId(ex.building_id || 1); setSelectedUnit(ex); }} className="flex gap-3 cursor-pointer group pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center text-white ${isCrit ? 'bg-red-500' : 'bg-orange-500'}`}>!</div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-bold text-white text-sm">{ex.extinguisher_id}</span>
                      <span className="text-[10px] text-slate-400">2m ago</span>
                    </div>
                    <div className="text-xs text-slate-400 mb-1">Building {ex.building_id} • Floor {ex.id % 4}</div>
                    <div className={`text-xs font-semibold ${isCrit ? 'text-red-400' : 'text-orange-400'}`}>{ex.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Minimap Widget */}
        <div style={panelStyle} className="p-4 pointer-events-auto rounded-xl h-64 relative overflow-hidden flex flex-col items-center justify-center">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <div className="relative z-10 w-full h-full border border-[#3b82f6]/30 rounded-lg bg-[#080e19]/80 flex items-center justify-center">
             <MapIcon className="w-12 h-12 text-[#3b82f6]/50" />
             <div className="absolute top-2 right-2 text-white font-bold text-xs">N ↑</div>
             {/* Abstract map representation */}
             <div className="absolute w-3 h-3 bg-red-500 rounded-full top-1/3 left-1/4 animate-ping"></div>
             <div className="absolute w-2 h-2 bg-emerald-500 rounded-full top-1/2 left-1/2"></div>
             <div className="absolute w-2 h-2 bg-orange-500 rounded-full top-2/3 right-1/4"></div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* UI: BOTTOM LEFT SELECTED ASSET */}
      {/* ----------------------------------------------------- */}
      {selectedUnit && (
        <div className="absolute bottom-6 left-20 w-80 z-20 pointer-events-auto animate-in slide-in-from-bottom-8">
          <div style={panelStyle} className="p-5 rounded-xl border border-white/10">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-16 bg-red-600 rounded-md flex items-center justify-center shadow-lg relative overflow-hidden border border-red-400/50">
                  <div className="absolute top-0 w-full h-2 bg-black"></div>
                  <div className="w-4 h-10 border-l border-r border-red-800"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{selectedUnit.extinguisher_id}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase text-white ${selectedUnit.status === 'Healthy' ? 'bg-emerald-500' : selectedUnit.status === 'Low Pressure' ? 'bg-orange-500' : 'bg-red-500'}`}>{selectedUnit.status}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">ABC Dry Powder (6kg)</div>
                </div>
              </div>
              <button onClick={() => setSelectedUnit(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="grid grid-cols-[80px_1fr] gap-y-2 text-sm mb-5">
              <span className="text-slate-400">Building</span><span className="text-white">: Building {selectedUnit.building_id}</span>
              <span className="text-slate-400">Floor</span><span className="text-white">: {selectedUnit.id % 4}rd Floor</span>
              <span className="text-slate-400">Pressure</span><span className="text-white">: {selectedUnit.pressure.toFixed(1)}%</span>
              <span className="text-slate-400">Last Seen</span><span className="text-white">: 2m ago</span>
            </div>
            
            <div className="flex gap-3">
              <button className="flex-1 bg-[#1e40af] hover:bg-[#1d4ed8] text-white font-semibold py-2 rounded-lg text-sm border border-[#3b82f6]/50 transition-colors shadow-lg">View Details</button>
              <button className="flex-1 bg-transparent hover:bg-white/5 text-white font-semibold py-2 rounded-lg text-sm transition-colors border border-white/20 flex items-center justify-center gap-2"><Navigation className="w-4 h-4" /> Navigate</button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- */}
      {/* UI: BOTTOM CENTER TOOLBAR */}
      {/* ----------------------------------------------------- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <div style={panelStyle} className="flex px-2 py-2 gap-2 rounded-xl">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1e40af] text-white border border-[#3b82f6]/50"><Layers className="w-4 h-4"/> All Units</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Flame className="w-4 h-4"/> Extinguisher</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Shield className="w-4 h-4"/> Hydrant</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Bell className="w-4 h-4"/> Alarm</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Navigation className="w-4 h-4"/> Exit</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Camera className="w-4 h-4"/> Camera</button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white"><Radio className="w-4 h-4"/> Sensor</button>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* UI: BOTTOM RIGHT WEATHER WIDGET */}
      {/* ----------------------------------------------------- */}
      <div className="absolute bottom-6 right-6 z-10 pointer-events-auto">
        <div style={panelStyle} className="px-5 py-3 rounded-xl flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Sun className="w-8 h-8 text-amber-400" />
            <div>
              <div className="text-xl font-bold text-white leading-tight">28°C</div>
              <div className="text-xs text-slate-400">Partly Cloudy</div>
            </div>
          </div>
          <div className="w-px h-8 bg-white/10"></div>
          <div className="text-right">
            <div className="text-xl font-bold text-white leading-tight">4:32 PM</div>
            <div className="text-xs text-slate-400">Aug 11, 2026</div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------- */}
      {/* 3D SCENE */}
      {/* ----------------------------------------------------- */}
      <div className="flex-1 w-full h-full cursor-crosshair">
        <Canvas shadows camera={{ position: [40, 50, 60], fov: 45 }} dpr={[1, 1.5]}>
          <color attach="background" args={[COLORS.void]} />
          <fogExp2 attach="fog" args={[COLORS.void, 0.008]} />
          
          <Sky sunPosition={[100, 10, -100]} turbidity={10} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
          <Environment preset="night" />
          
          <ambientLight intensity={1.5} color="#d6e6f2" />
          <directionalLight position={[50, 50, -20]} intensity={2} color="#ffdca8" castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-60} shadow-camera-right={60} shadow-camera-top={60} shadow-camera-bottom={-60} />
          
          <SceneCameraControls selectedBuilding={selectedBuilding} selectedUnit={selectedUnit} selectedFloor={selectedFloor} topDownMode={topDownMode} />
          
          <CampusEnvironment />

          <group>
            {BUILDINGS_DATA.map(b => (
              <DetailedBuilding 
                key={b.id} 
                bldg={b} 
                isSelected={selectedBuildingId === b.id} 
                selectedFloor={selectedFloor}
                onClick={() => { setSelectedBuildingId(b.id); setSelectedUnit(null); setSelectedFloor(null); }} 
              />
            ))}
          </group>
          
          <group>
            {extinguishers.map((ext) => {
              const bldg = BUILDINGS_DATA.find(b => b.id === ext.building_id) || BUILDINGS_DATA[0];
              const extFloor = ext.id % bldg.floors;
              
              const isHidden = (selectedBuildingId === bldg.id && selectedFloor !== null && selectedFloor !== extFloor);

              const edge = ext.id % 4;
              const pad = 1.5;
              let rx = (Math.sin(ext.id * 13.37) + 1) / 2;
              let rz = (Math.cos(ext.id * 42.1) + 1) / 2;
              if (edge === 0) rz = 0; if (edge === 1) rx = 1; if (edge === 2) rz = 1; if (edge === 3) rx = 0;
              
              const x = bldg.cx - bldg.w/2 + pad + rx * (bldg.w - pad * 2);
              const z = bldg.cz - bldg.d/2 + pad + rz * (bldg.d - pad * 2);
              const y = extFloor * 2.8;

              const color = getStatusColor(ext.status, ext.id, emergencyExtinguisherId);

              return (
                <ExtinguisherMarker 
                  key={ext.id} 
                  extinguisher={ext} 
                  color={color} 
                  x={x} y={y} z={z} 
                  isHidden={isHidden}
                  onClick={() => { setSelectedBuildingId(bldg.id); setSelectedUnit(ext); setSelectedFloor(extFloor); }} 
                />
              );
            })}
          </group>
        </Canvas>
      </div>
    </div>
  );
};
