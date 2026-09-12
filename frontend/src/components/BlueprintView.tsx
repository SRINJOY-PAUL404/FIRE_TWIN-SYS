import React, { useState, useMemo, useRef } from 'react';
import type { Extinguisher, Location } from '../types';
import { 
  CAMPUS_BLUEPRINT_ARCHETYPES, 
  generateBuildingBlueprint,
  type BuildingBlueprint,
  type BlueprintRoom 
} from './blueprint/proceduralBlueprint';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ShieldCheck, 
  AlertTriangle, 
  Flame, 
  Compass, 
  Building as BuildingIcon,
  X,
  Radio,
  Clock,
  BatteryCharging
} from 'lucide-react';

interface BlueprintViewProps {
  extinguishers: Extinguisher[];
  locations: Location[];
  selectedBuildingId?: string | null;
  selectedFloor?: number | null;
  onSelectBuilding?: (id: string | null, name: string | null) => void;
  onSelectFloor?: (floor: number | null) => void;
}

export const BlueprintView: React.FC<BlueprintViewProps> = ({
  extinguishers,
  locations,
  selectedBuildingId,
  selectedFloor: propSelectedFloor,
  onSelectBuilding,
  onSelectFloor: propOnSelectFloor,
}) => {
  // Local building selection if not controlled by parent
  const [internalBuildingId, setInternalBuildingId] = useState<string>('3'); // Default to Engineering Block
  const [internalFloor, setInternalFloor] = useState<number>(0); // Default to Ground Floor
  const [selectedUnit, setSelectedUnit] = useState<Extinguisher | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<BlueprintRoom | null>(null);

  // Zoom & Pan state
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Resolve current building and floor
  const activeBuildingId = useMemo(() => {
    if (selectedBuildingId) {
      // Find numeric key or string ID matching archetypes
      const found = Object.values(CAMPUS_BLUEPRINT_ARCHETYPES).find(
        a => a.id === selectedBuildingId || a.name.toLowerCase() === selectedBuildingId.toLowerCase()
      );
      if (found) return found.id;
    }
    return internalBuildingId;
  }, [selectedBuildingId, internalBuildingId]);

  const activeFloor = propSelectedFloor !== undefined && propSelectedFloor !== null ? propSelectedFloor : internalFloor;

  const currentArchetype = CAMPUS_BLUEPRINT_ARCHETYPES[activeBuildingId] || CAMPUS_BLUEPRINT_ARCHETYPES['3'];

  // Generate the procedural blueprint for the active building and floor
  const blueprint: BuildingBlueprint = useMemo(() => {
    return generateBuildingBlueprint(activeBuildingId, activeFloor);
  }, [activeBuildingId, activeFloor]);

  // Handle building switch
  const handleSwitchBuilding = (bId: string) => {
    setInternalBuildingId(bId);
    setInternalFloor(0);
    setSelectedUnit(null);
    const arch = CAMPUS_BLUEPRINT_ARCHETYPES[bId];
    if (onSelectBuilding) {
      onSelectBuilding(bId, arch ? arch.name : null);
    }
    if (propOnSelectFloor) {
      propOnSelectFloor(0);
    }
  };

  // Handle floor switch
  const handleSwitchFloor = (floorIdx: number) => {
    setInternalFloor(floorIdx);
    setSelectedUnit(null);
    if (propOnSelectFloor) {
      propOnSelectFloor(floorIdx);
    }
  };

  // Filter extinguishers assigned to this building and floor
  const floorExtinguishers = useMemo(() => {
    return extinguishers.filter(ext => {
      if (ext.lifecycle_state !== 'ACTIVE') return false;
      const loc = locations.find(l => l.id === ext.location_id);
      if (!loc) return false;

      const locBldgId = loc.building_id ? String(loc.building_id) : '';
      const bldgMatch = locBldgId === activeBuildingId || loc.name.toLowerCase().includes(currentArchetype.name.toLowerCase());
      if (!bldgMatch) return false;

      const extFloor = loc.floor ? parseInt(loc.floor, 10) : 0;
      return extFloor === activeFloor;
    });
  }, [extinguishers, locations, activeBuildingId, currentArchetype.name, activeFloor]);

  // Map floor extinguishers to logical blueprint anchors
  const placedUnits = useMemo(() => {
    const anchors: Array<{ x: number; y: number; label: string }> = [
      { x: blueprint.core.extinguisherAnchor.x, y: blueprint.core.extinguisherAnchor.y, label: 'Core / Stairwell Lobby' },
      ...blueprint.corridor.anchors,
      ...blueprint.rooms.map(r => ({
        x: r.extinguisherAnchor ? r.extinguisherAnchor.x : r.x + 25,
        y: r.extinguisherAnchor ? r.extinguisherAnchor.y : r.y + 25,
        label: r.name,
      })),
    ];

    return floorExtinguishers.map((ext, idx) => {
      const anchor = anchors[idx % anchors.length];
      return {
        unit: ext,
        x: anchor.x,
        y: anchor.y,
        anchorLabel: anchor.label,
      };
    });
  }, [floorExtinguishers, blueprint]);

  // Status counters
  const healthyCount = floorExtinguishers.filter(e => e.status === 'Healthy').length;
  const warningCount = floorExtinguishers.filter(e => e.status === 'Low Pressure' || e.status === 'Maintenance Due').length;
  const criticalCount = floorExtinguishers.filter(e => e.status === 'Emergency' || e.status === 'Defective').length;

  // Zoom handlers
  const handleZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(2.5, Math.max(0.65, prev + delta)));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click pan
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      setPanOffset({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full h-full bg-[#050b14] text-[#e2e8f0] font-[var(--font-body)] flex flex-col select-none overflow-hidden">
      
      {/* ── TOP CONTROL BAR: Building Tabs, Floor Filter & CAD Tools ── */}
      <div className="bg-[var(--color-command-panel)] border-b border-[var(--color-command-border)] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-20">
        
        {/* Building selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <div className="flex items-center text-xs font-[var(--font-nav)] uppercase tracking-wider text-[var(--color-steel-blue)] mr-2">
            <BuildingIcon className="w-3.5 h-3.5 mr-1 text-[var(--color-amber-alert)]" />
            Structure:
          </div>
          {Object.values(CAMPUS_BLUEPRINT_ARCHETYPES).map(arch => {
            const isActive = arch.id === activeBuildingId;
            return (
              <button
                key={arch.id}
                onClick={() => handleSwitchBuilding(arch.id)}
                className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-all border ${
                  isActive
                    ? 'bg-[#00f0ff]/15 border-[#00f0ff] text-white shadow-[0_0_12px_rgba(0,240,255,0.3)] font-bold'
                    : 'bg-[var(--color-command-bg)] border-[var(--color-command-border)] text-slate-300 hover:border-slate-400 hover:text-white'
                }`}
              >
                <span className="text-[10px] text-[var(--color-steel-blue)] mr-1.5">{arch.code}</span>
                {arch.name}
              </button>
            );
          })}
        </div>

        {/* Floor Level Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-[var(--font-nav)] uppercase tracking-wider text-[var(--color-steel-blue)] mr-1">
            Level:
          </span>
          <div className="flex bg-[var(--color-command-bg)] border border-[var(--color-command-border)]">
            {Array.from({ length: currentArchetype.floors }).map((_, fIdx) => {
              const isFActive = fIdx === activeFloor;
              return (
                <button
                  key={`fl-btn-${fIdx}`}
                  onClick={() => handleSwitchFloor(fIdx)}
                  className={`px-3 py-1 text-xs font-[var(--font-mono)] font-bold uppercase transition-all ${
                    fIdx > 0 ? 'border-l border-[var(--color-command-border)]' : ''
                  } ${
                    isFActive
                      ? 'bg-[var(--color-amber-alert)] text-[#0f1218] shadow-[0_0_8px_rgba(232,163,61,0.4)]'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {fIdx === 0 ? 'G' : `FL ${fIdx}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* CAD Canvas Navigation Tools */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-[11px] font-[var(--font-mono)] text-[var(--color-steel-blue)]">
            <Layers className="w-3 h-3 text-[#00f0ff]" />
            <span>CAD: ORTHOGRAPHIC 1:100</span>
          </div>

          <div className="flex bg-[var(--color-command-bg)] border border-[var(--color-command-border)]">
            <button
              onClick={() => handleZoom(0.15)}
              className="px-2.5 py-1 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 border-r border-[var(--color-command-border)]"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleZoom(-0.15)}
              className="px-2.5 py-1 text-sm font-bold text-slate-300 hover:text-white hover:bg-slate-800 border-r border-[var(--color-command-border)]"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="px-2.5 py-1 text-xs font-[var(--font-mono)] text-slate-300 hover:text-white hover:bg-slate-800"
              title="Reset View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN BLUEPRINT DRAWING CANVAS ── */}
      <div 
        className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing bg-[#050b14]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Subtle CAD Background Grid Patterns */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25">
          <defs>
            <pattern id="cad-fine-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#00f0ff" strokeWidth="0.4" strokeOpacity="0.25" />
            </pattern>
            <pattern id="cad-major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#cad-fine-grid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#00f0ff" strokeWidth="0.9" strokeOpacity="0.5" />
            </pattern>
            {/* Structural hatch */}
            <pattern id="hatch-concrete" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#00f0ff" strokeWidth="1" strokeOpacity="0.18" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cad-major-grid)" />
        </svg>

        {/* Transform Container for Zoom & Pan */}
        <div 
          className="w-full h-full flex items-center justify-center transition-transform duration-75 origin-center"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          }}
        >
          {/* Main Blueprint Vector Art */}
          <svg 
            viewBox="0 0 1000 650" 
            className="w-full max-w-6xl max-h-[88vh] drop-shadow-[0_0_25px_rgba(0,240,255,0.08)]"
          >
            {/* 1. Canvas Outer Boundary & Grid Axis Markers */}
            <g className="cad-axes text-[10px] font-[var(--font-mono)] fill-[#00f0ff]/40">
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((letter, i) => (
                <text key={`ax-${letter}`} x={80 + i * 115} y={35} textAnchor="middle">{letter}</text>
              ))}
              {['1', '2', '3', '4', '5'].map((num, i) => (
                <text key={`ay-${num}`} x={35} y={85 + i * 115} textAnchor="middle">{num}</text>
              ))}
            </g>

            {/* 2. Outer Dimension Lines & Annotations */}
            <g className="cad-dimensions stroke-[#00f0ff]/60 fill-[#00f0ff]/80 text-[10px] font-[var(--font-mono)]">
              {/* Top Dimension line */}
              <line 
                x1={blueprint.canvasBounds.x} 
                y1={blueprint.canvasBounds.y - 25} 
                x2={blueprint.canvasBounds.x + blueprint.canvasBounds.width} 
                y2={blueprint.canvasBounds.y - 25} 
                strokeWidth="1" 
              />
              <line 
                x1={blueprint.canvasBounds.x} 
                y1={blueprint.canvasBounds.y - 32} 
                x2={blueprint.canvasBounds.x} 
                y2={blueprint.canvasBounds.y - 18} 
                strokeWidth="1.5" 
              />
              <line 
                x1={blueprint.canvasBounds.x + blueprint.canvasBounds.width} 
                y1={blueprint.canvasBounds.y - 32} 
                x2={blueprint.canvasBounds.x + blueprint.canvasBounds.width} 
                y2={blueprint.canvasBounds.y - 18} 
                strokeWidth="1.5" 
              />
              <text 
                x={blueprint.canvasBounds.x + blueprint.canvasBounds.width * 0.5} 
                y={blueprint.canvasBounds.y - 30} 
                textAnchor="middle"
                className="font-bold tracking-wider"
              >
                {blueprint.dimensionLabels.topM}
              </text>

              {/* Left Dimension line */}
              <line 
                x1={blueprint.canvasBounds.x - 25} 
                y1={blueprint.canvasBounds.y} 
                x2={blueprint.canvasBounds.x - 25} 
                y2={blueprint.canvasBounds.y + blueprint.canvasBounds.height} 
                strokeWidth="1" 
              />
              <line 
                x1={blueprint.canvasBounds.x - 32} 
                y1={blueprint.canvasBounds.y} 
                x2={blueprint.canvasBounds.x - 18} 
                y2={blueprint.canvasBounds.y} 
                strokeWidth="1.5" 
              />
              <line 
                x1={blueprint.canvasBounds.x - 32} 
                y1={blueprint.canvasBounds.y + blueprint.canvasBounds.height} 
                x2={blueprint.canvasBounds.x - 18} 
                y2={blueprint.canvasBounds.y + blueprint.canvasBounds.height} 
                strokeWidth="1.5" 
              />
              <text 
                x={blueprint.canvasBounds.x - 30} 
                y={blueprint.canvasBounds.y + blueprint.canvasBounds.height * 0.5} 
                textAnchor="middle"
                transform={`rotate(-90 ${blueprint.canvasBounds.x - 30} ${blueprint.canvasBounds.y + blueprint.canvasBounds.height * 0.5})`}
                className="font-bold tracking-wider"
              >
                {blueprint.dimensionLabels.leftM}
              </text>
            </g>

            {/* 3. Building Outer Double Wall Shell (Rendered from Real Traced Footprint Polygon) */}
            <g className="building-outer-walls">
              {/* Outer wall fill / cavity */}
              <polygon
                points={blueprint.footprintSvgPath}
                fill="#0a192f"
                fillOpacity="0.75"
                stroke="#00f0ff"
                strokeWidth="2.5"
              />
              {/* Inner wall boundary line */}
              <polygon
                points={blueprint.innerWallSvgPath}
                fill="none"
                stroke="#0284c7"
                strokeWidth="1.2"
                strokeDasharray="8 3"
              />
            </g>

            {/* 4. Central Circulation Corridor Spine */}
            {blueprint.corridor.height > 0 && (
              <g className="corridor-spine">
                <rect
                  x={blueprint.corridor.x}
                  y={blueprint.corridor.y}
                  width={blueprint.corridor.width}
                  height={blueprint.corridor.height}
                  fill="#00f0ff"
                  fillOpacity="0.04"
                  stroke="#00f0ff"
                  strokeWidth="1.2"
                />
                {/* Centerline */}
                <line
                  x1={blueprint.corridor.x + 10}
                  y1={blueprint.corridor.y + blueprint.corridor.height * 0.5}
                  x2={blueprint.corridor.x + blueprint.corridor.width - 10}
                  y2={blueprint.corridor.y + blueprint.corridor.height * 0.5}
                  stroke="#00f0ff"
                  strokeWidth="0.8"
                  strokeDasharray="6 4"
                  strokeOpacity="0.6"
                />
                <text
                  x={blueprint.corridor.x + blueprint.corridor.width * 0.5}
                  y={blueprint.corridor.y + blueprint.corridor.height * 0.5 + 3}
                  textAnchor="middle"
                  fill="#00f0ff"
                  fillOpacity="0.5"
                  className="text-[9px] font-[var(--font-mono)] tracking-widest uppercase font-bold"
                >
                  {blueprint.corridor.label}
                </text>
              </g>
            )}

            {/* 5. Fixed Vertical Core (Stairwell & Elevator) */}
            <g className="building-core">
              {/* Stairwell Enclosure */}
              <rect
                x={blueprint.core.stairwell.x}
                y={blueprint.core.stairwell.y}
                width={blueprint.core.stairwell.width}
                height={blueprint.core.stairwell.height}
                fill="#0f172a"
                stroke="#f59e0b"
                strokeWidth="1.8"
              />
              {/* Stair Treads */}
              {Array.from({ length: blueprint.core.stairwell.treads }).map((_, tIdx) => {
                const stepY = blueprint.core.stairwell.y + (tIdx + 1) * (blueprint.core.stairwell.height / (blueprint.core.stairwell.treads + 1));
                return (
                  <line
                    key={`tread-${tIdx}`}
                    x1={blueprint.core.stairwell.x + 5}
                    y1={stepY}
                    x2={blueprint.core.stairwell.x + blueprint.core.stairwell.width - 5}
                    y2={stepY}
                    stroke="#f59e0b"
                    strokeWidth="0.9"
                    strokeOpacity="0.6"
                  />
                );
              })}
              <text
                x={blueprint.core.stairwell.x + blueprint.core.stairwell.width * 0.5}
                y={blueprint.core.stairwell.y + blueprint.core.stairwell.height * 0.5 + 4}
                textAnchor="middle"
                fill="#f59e0b"
                className="text-[8px] font-[var(--font-mono)] font-bold tracking-wider"
              >
                {blueprint.core.stairwell.label}
              </text>

              {/* Elevator Core */}
              <rect
                x={blueprint.core.elevator.x}
                y={blueprint.core.elevator.y}
                width={blueprint.core.elevator.width}
                height={blueprint.core.elevator.height}
                fill="#0f172a"
                stroke="#00f0ff"
                strokeWidth="1.8"
              />
              {/* Lift Diagonal Cross X */}
              <line
                x1={blueprint.core.elevator.x}
                y1={blueprint.core.elevator.y}
                x2={blueprint.core.elevator.x + blueprint.core.elevator.width}
                y2={blueprint.core.elevator.y + blueprint.core.elevator.height}
                stroke="#00f0ff"
                strokeWidth="0.8"
                strokeOpacity="0.5"
              />
              <line
                x1={blueprint.core.elevator.x + blueprint.core.elevator.width}
                y1={blueprint.core.elevator.y}
                x2={blueprint.core.elevator.x}
                y2={blueprint.core.elevator.y + blueprint.core.elevator.height}
                stroke="#00f0ff"
                strokeWidth="0.8"
                strokeOpacity="0.5"
              />
              <text
                x={blueprint.core.elevator.x + blueprint.core.elevator.width * 0.5}
                y={blueprint.core.elevator.y + blueprint.core.elevator.height * 0.5 + 3}
                textAnchor="middle"
                fill="#00f0ff"
                className="text-[8px] font-[var(--font-mono)] font-bold tracking-wider"
              >
                {blueprint.core.elevator.label}
              </text>
            </g>

            {/* 6. Procedurally Generated Rooms */}
            <g className="procedural-rooms">
              {blueprint.rooms.map(room => {
                const isHovered = hoveredRoom?.id === room.id;
                return (
                  <g 
                    key={room.id}
                    onMouseEnter={() => setHoveredRoom(room)}
                    onMouseLeave={() => setHoveredRoom(null)}
                    className="cursor-pointer transition-all duration-150"
                  >
                    {/* Room Wall Boundary */}
                    <rect
                      x={room.x}
                      y={room.y}
                      width={room.width}
                      height={room.height}
                      fill={isHovered ? '#00f0ff' : '#07152b'}
                      fillOpacity={isHovered ? 0.12 : 0.65}
                      stroke="#00f0ff"
                      strokeWidth={isHovered ? 2 : 1.4}
                    />

                    {/* Door Opening & Swing Arc */}
                    <circle
                      cx={room.door.x}
                      cy={room.door.y}
                      r="3"
                      fill="#00f0ff"
                    />
                    <path
                      d={
                        room.door.wall === 'bottom'
                          ? `M ${room.door.x} ${room.door.y} A 16 16 0 0 1 ${room.door.x + 16} ${room.door.y - 16}`
                          : room.door.wall === 'top'
                          ? `M ${room.door.x} ${room.door.y} A 16 16 0 0 0 ${room.door.x + 16} ${room.door.y + 16}`
                          : `M ${room.door.x} ${room.door.y} A 16 16 0 0 1 ${room.door.x + 16} ${room.door.y + 16}`
                      }
                      fill="none"
                      stroke="#00f0ff"
                      strokeWidth="0.8"
                      strokeDasharray="2 2"
                      strokeOpacity="0.75"
                    />

                    {/* Room Label & Area Stamp */}
                    <text
                      x={room.x + 10}
                      y={room.y + 16}
                      fill="#00f0ff"
                      className="text-[10px] font-[var(--font-mono)] font-bold tracking-wider"
                    >
                      {room.code}
                    </text>
                    <text
                      x={room.x + 10}
                      y={room.y + 30}
                      fill="#e2e8f0"
                      className="text-[9px] font-[var(--font-nav)] font-semibold tracking-wide"
                      style={{ maxWidth: `${room.width - 20}px` }}
                    >
                      {room.name.length > 28 ? `${room.name.slice(0, 26)}...` : room.name}
                    </text>
                    <text
                      x={room.x + room.width - 10}
                      y={room.y + room.height - 8}
                      textAnchor="end"
                      fill="#00f0ff"
                      fillOpacity="0.5"
                      className="text-[8px] font-[var(--font-mono)]"
                    >
                      {room.areaSqM} m²
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 7. Structural Bay Concrete Columns */}
            <g className="structural-columns">
              {blueprint.structuralColumns.map((col, cIdx) => (
                <rect
                  key={`col-${cIdx}`}
                  x={col.x - 5}
                  y={col.y - 5}
                  width="10"
                  height="10"
                  fill="#0284c7"
                  stroke="#00f0ff"
                  strokeWidth="1"
                />
              ))}
            </g>

            {/* 8. Extinguisher Units Anchored on Blueprint */}
            <g className="extinguisher-units">
              {placedUnits.map(({ unit, x, y, anchorLabel }) => {
                const isSelected = selectedUnit?.id === unit.id;
                const isNominal = unit.status === 'Healthy';
                const isWarn = unit.status === 'Low Pressure' || unit.status === 'Maintenance Due';
                const isCrit = unit.status === 'Emergency' || unit.status === 'Defective';

                const statusColor = isNominal ? '#10b981' : isWarn ? '#f59e0b' : '#ef4444';

                return (
                  <g
                    key={`ext-marker-${unit.id}`}
                    transform={`translate(${x}, ${y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedUnit(unit);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Glowing pulse halo */}
                    <circle
                      r={isSelected ? "14" : "10"}
                      fill={statusColor}
                      fillOpacity="0.25"
                      stroke={statusColor}
                      strokeWidth="1.5"
                      className={isCrit || isWarn ? "animate-pulse" : ""}
                    />
                    
                    {/* Inner core badge */}
                    <circle
                      r="6"
                      fill={statusColor}
                      stroke="#ffffff"
                      strokeWidth="1.2"
                    />

                    {/* Unit ID Pill Tag */}
                    <g transform="translate(12, -8)">
                      <rect
                        width="58"
                        height="16"
                        fill="#0a121e"
                        fillOpacity="0.9"
                        stroke={statusColor}
                        strokeWidth="1"
                        rx="2"
                      />
                      <text
                        x="29"
                        y="11"
                        textAnchor="middle"
                        fill="#ffffff"
                        className="text-[8px] font-[var(--font-mono)] font-bold tracking-wider"
                      >
                        {unit.extinguisher_id}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* 9. Compass Rose / North Indicator */}
            <g transform="translate(930, 70)" className="compass-rose">
              <circle r="22" fill="#0a192f" stroke="#00f0ff" strokeWidth="1" strokeOpacity="0.5" />
              <polygon points="0,-18 5,0 0,-4 -5,0" fill="#00f0ff" />
              <polygon points="0,18 5,0 0,4 -5,0" fill="#0284c7" />
              <text x="0" y="-22" textAnchor="middle" fill="#00f0ff" className="text-[9px] font-[var(--font-mono)] font-bold">N</text>
              <Compass className="w-4 h-4 text-[#00f0ff] -translate-x-2 -translate-y-2 opacity-30" />
            </g>

            {/* 10. Architectural Title Sheet Block (Bottom Right CAD stamp) */}
            <g transform="translate(680, 520)" className="title-block">
              <rect
                width="290"
                height="105"
                fill="#071326"
                fillOpacity="0.95"
                stroke="#00f0ff"
                strokeWidth="1.5"
              />
              <line x1="0" y1="28" x2="290" y2="28" stroke="#00f0ff" strokeWidth="1" />
              <line x1="0" y1="58" x2="290" y2="58" stroke="#00f0ff" strokeWidth="1" />
              <line x1="145" y1="58" x2="145" y2="105" stroke="#00f0ff" strokeWidth="1" />

              <text x="12" y="18" fill="#00f0ff" className="text-[9px] font-[var(--font-mono)] font-bold tracking-wider uppercase">
                BRAINWARE UNIVERSITY · SAFETY DIGITAL TWIN
              </text>
              <text x="12" y="44" fill="#ffffff" className="text-[11px] font-[var(--font-nav)] font-bold tracking-wide uppercase">
                {blueprint.buildingName} — {blueprint.floorLabel}
              </text>
              <text x="12" y="74" fill="var(--color-steel-blue)" className="text-[8px] font-[var(--font-mono)] uppercase">
                SCALE: 1:100 (METRIC)
              </text>
              <text x="12" y="92" fill="#00f0ff" className="text-[8px] font-[var(--font-mono)] uppercase font-semibold">
                ELEV: +{blueprint.elevationM.toFixed(1)}m
              </text>
              <text x="155" y="74" fill="var(--color-steel-blue)" className="text-[8px] font-[var(--font-mono)] uppercase">
                DWG: {blueprint.buildingCode}-FL{blueprint.floor}
              </text>
              <text x="155" y="92" fill="#10b981" className="text-[8px] font-[var(--font-mono)] uppercase font-bold flex items-center">
                ● CAD LINK ACTIVE
              </text>
            </g>
          </svg>
        </div>

        {/* ── BOTTOM LEFT STATUS LEGEND ── */}
        <div className="absolute bottom-4 left-4 z-10 bg-[var(--color-command-panel)]/95 border border-[var(--color-command-border)] p-3 flex flex-col gap-2 backdrop-blur-md shadow-2xl">
          <div className="text-[10px] font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)] border-b border-[var(--color-command-border)] pb-1">
            Floor Suppression Units ({floorExtinguishers.length})
          </div>
          <div className="flex items-center gap-4 text-xs font-[var(--font-mono)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
              <span className="text-slate-300">Nominal ({healthyCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
              <span className="text-amber-400">Attention ({warningCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]"></span>
              <span className="text-rose-400">Critical ({criticalCount})</span>
            </div>
          </div>
        </div>

        {/* ── RIGHT INSPECTION DRAWER FOR SELECTED EXTINGUISHER ── */}
        {selectedUnit && (
          <div className="absolute top-4 right-4 w-80 bg-[var(--color-command-panel)] border border-[#00f0ff] shadow-[0_0_25px_rgba(0,240,255,0.2)] flex flex-col animate-in slide-in-from-right-8 z-30">
            {/* Header */}
            <div className="p-3 border-b border-[var(--color-command-border)] flex justify-between items-start bg-[var(--color-command-bg)]">
              <div>
                <span className="text-[10px] font-[var(--font-mono)] text-[#00f0ff] tracking-widest uppercase block">CAD Equipment Mount</span>
                <h3 className="font-[var(--font-mono)] text-lg text-white font-bold">{selectedUnit.extinguisher_id}</h3>
              </div>
              <button 
                onClick={() => setSelectedUnit(null)}
                className="text-[var(--color-steel-blue)] hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Specs & Live Readings */}
            <div className="p-4 space-y-4 text-xs">
              {/* Status Badge */}
              <div className="flex items-center justify-between border border-[var(--color-command-border)] p-2.5 bg-[var(--color-command-bg)]">
                <span className="font-[var(--font-nav)] uppercase tracking-wider text-[var(--color-steel-blue)]">Operating Status</span>
                <div className={`px-2 py-0.5 font-[var(--font-mono)] font-bold text-xs uppercase border ${
                  selectedUnit.status === 'Healthy'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : selectedUnit.status === 'Low Pressure' || selectedUnit.status === 'Maintenance Due'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                }`}>
                  {selectedUnit.status}
                </div>
              </div>

              {/* Gauge Readings */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="border border-[var(--color-command-border)] p-2.5 bg-[var(--color-command-bg)]">
                  <span className="font-[var(--font-nav)] text-[10px] uppercase tracking-wider text-[var(--color-steel-blue)] block mb-1">Pressure</span>
                  <span className={`font-[var(--font-mono)] text-lg font-bold ${
                    selectedUnit.pressure < 40 ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {selectedUnit.pressure.toFixed(1)}%
                  </span>
                </div>
                <div className="border border-[var(--color-command-border)] p-2.5 bg-[var(--color-command-bg)]">
                  <span className="font-[var(--font-nav)] text-[10px] uppercase tracking-wider text-[var(--color-steel-blue)] block mb-1">IoT Battery</span>
                  <span className="font-[var(--font-mono)] text-lg font-bold text-slate-200">
                    {selectedUnit.battery != null ? `${selectedUnit.battery.toFixed(0)}%` : '100%'}
                  </span>
                </div>
              </div>

              {/* Hardware Details */}
              <div className="space-y-1.5 font-[var(--font-mono)] text-[11px] border border-[var(--color-command-border)] p-2.5 bg-[var(--color-command-bg)]">
                <div className="flex justify-between text-slate-400">
                  <span>Type / Mass:</span>
                  <span className="text-slate-200 font-semibold">{selectedUnit.type} ({selectedUnit.capacity})</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Serial Number:</span>
                  <span className="text-slate-200">{selectedUnit.serial_number}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>IoT Node ID:</span>
                  <span className="text-slate-200">{selectedUnit.esp32_device_id}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Mount Location:</span>
                  <span className="text-slate-200">{selectedUnit.room || blueprint.floorLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
