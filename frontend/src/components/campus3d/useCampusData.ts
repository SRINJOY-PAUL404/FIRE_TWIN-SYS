import { useMemo } from 'react';
import type { Extinguisher } from '../../types';
import { useBuildings } from '../../hooks/useBuildings';

export interface Building3D {
  id: string;
  name: string;
  sub: string;
  position: [number, number]; // x, z on campus grid
  width: number;
  depth: number;
  floors: number;
  floorHeight: number;
  height: number;
  status: 'ok' | 'warn' | 'crit';
  floorsData: { status: 'ok' | 'warn' | 'crit' }[];
}

export interface ExtinguisherUnit3D {
  id: string;
  buildingId: string;
  floor: number;
  localPosition: [number, number]; // x, z within building footprint
  status: 'ok' | 'warn' | 'crit';
  pressure: number;
  lastInspection: string; // ISO date
  confidence: number;
  raw: Extinguisher;
}

const parseFloor = (floorStr?: string): number => {
  if (!floorStr) return 0;
  const num = parseInt(floorStr, 10);
  return isNaN(num) ? 0 : num;
};

const mapStatus = (status: string): 'ok' | 'warn' | 'crit' => {
  if (!status) return 'ok';
  const lower = status.toLowerCase();
  if (lower.includes('healthy') || lower === 'ok') return 'ok';
  if (lower.includes('low pressure') || lower.includes('warn') || lower.includes('attention')) return 'warn';
  return 'crit';
};

export function useCampusData(extinguishers: Extinguisher[], locations: any[]) {
  const { items: apiBuildings } = useBuildings();

  return useMemo(() => {
    const layout = [
      { name: 'Central Library', sub: 'Building 01 · 4 Floors', w: 4.6, h: 3.8, d: 3.4, x: -12.0, z: -6.5, floors: 4 },
      { name: 'Main Academic Building', sub: 'Building 02 · 6 Floors', w: 5.4, h: 5.4, d: 3.8, x: -1.0, z: -8.0, floors: 6 },
      { name: 'Engineering Block', sub: 'Building 03 · 9 Floors', w: 4.8, h: 7.8, d: 3.4, x: 10.5, z: -6.5, floors: 9 },
      { name: 'Law & Management', sub: 'Building 04 · 4 Floors', w: 4.2, h: 3.8, d: 3.2, x: 12.0, z: 4.5, floors: 4 },
      { name: 'Allied Health Sciences', sub: 'Building 05 · 3 Floors', w: 3.8, h: 2.8, d: 3.0, x: 3.5, z: 8.0, floors: 3 },
      { name: 'Food Court & Canteen', sub: 'Building 06 · 1 Floor', w: 3.6, h: 1.5, d: 2.8, x: -8.5, z: 7.5, floors: 1 },
    ];

    const buildings: Building3D[] = layout.map((l, index) => {
      const apiB = apiBuildings.find(ab => ab.name.toLowerCase() === l.name.toLowerCase()) || { id: `local-${index}`, name: l.name };
      const bId = apiB.id.toString();
      
      return {
        id: bId,
        name: l.name,
        sub: l.sub,
        position: [l.x, l.z],
        width: l.w,
        depth: l.d,
        floors: l.floors,
        floorHeight: l.h / l.floors,
        height: l.h,
        status: 'ok',
        floorsData: [],
      };
    });
    
    const groupedExtinguishers: Record<string, Record<number, Extinguisher[]>> = {};
    extinguishers.filter(e => e.lifecycle_state === 'ACTIVE').forEach(ext => {
      const loc = locations.find(l => l.id === ext.location_id);
      if (!loc) return;

      const bldgId = loc.building_id ? loc.building_id.toString() : '';
      const bldg = buildings.find(b => b.id === bldgId || loc.name.toLowerCase().includes(b.name.toLowerCase()));
      const targetBldgId = bldg ? bldg.id : bldgId;
      if (!targetBldgId) return;
      
      let floor = parseFloor(loc.floor);
      if (bldg) {
        floor = Math.max(0, Math.min(floor, bldg.floors - 1));
      }

      if (!groupedExtinguishers[targetBldgId]) groupedExtinguishers[targetBldgId] = {};
      if (!groupedExtinguishers[targetBldgId][floor]) groupedExtinguishers[targetBldgId][floor] = [];
      groupedExtinguishers[targetBldgId][floor].push(ext);
    });

    const units3D: ExtinguisherUnit3D[] = [];
    
    Object.entries(groupedExtinguishers).forEach(([bldgId, floorsObj]) => {
      const bldg = buildings.find(b => b.id === bldgId);
      const w = bldg ? bldg.width : 4.0;
      const d = bldg ? bldg.depth : 4.0;
      
      Object.entries(floorsObj).forEach(([floorStr, exts]) => {
        const floor = parseInt(floorStr, 10);
        const count = exts.length;
        
        exts.forEach((ext, i) => {
          let lx = 0;
          let lz = 0;
          
          if (count === 1) {
            lx = 0;
            lz = 0;
          } else if (count === 2) {
            lx = (i === 0 ? -1 : 1) * (w * 0.25);
            lz = 0;
          } else if (count <= 4) {
            const angle = (i / count) * Math.PI * 2 + (Math.PI / 4);
            lx = Math.cos(angle) * (w * 0.32);
            lz = Math.sin(angle) * (d * 0.32);
          } else {
            const ring = i % 2 === 0 ? 0.35 : 0.20;
            const angle = (i / count) * Math.PI * 2;
            lx = Math.cos(angle) * (w * ring);
            lz = Math.sin(angle) * (d * ring);
          }
          
          units3D.push({
            id: ext.extinguisher_id,
            buildingId: bldgId,
            floor: floor,
            localPosition: [lx, lz],
            status: mapStatus(ext.status),
            pressure: ext.pressure,
            lastInspection: ext.last_inspection_date || new Date().toISOString(),
            confidence: 90,
            raw: ext,
          });
        });
      });
    });

    buildings.forEach(b => {
      const bUnits = units3D.filter(u => u.buildingId === b.id);
      
      const floorsData = Array.from({ length: b.floors }).map((_, f) => {
        const floorUnits = bUnits.filter(u => u.floor === f);
        if (floorUnits.length === 0) return { status: 'ok' as const };
        const hasCrit = floorUnits.some(u => u.status === 'crit');
        if (hasCrit) return { status: 'crit' as const };
        const hasWarn = floorUnits.some(u => u.status === 'warn');
        if (hasWarn) return { status: 'warn' as const };
        return { status: 'ok' as const };
      });
      
      b.floorsData = floorsData;
      const bHasCrit = floorsData.some(f => f.status === 'crit');
      const bHasWarn = floorsData.some(f => f.status === 'warn');
      b.status = bHasCrit ? 'crit' : (bHasWarn ? 'warn' : 'ok');
    });

    return { buildings, units: units3D, units3D };
  }, [extinguishers, locations, apiBuildings]);
}
