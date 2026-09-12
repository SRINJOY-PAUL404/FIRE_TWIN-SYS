/**
 * Single Source of Truth for Brainware University Campus Buildings
 * 
 * Geographic Coordinates, Per-Floor Rooftop Footprint Polygons, Metric Dimensions,
 * and 3D Flat-Projection Mappings across 2D Mapbox, 3D Campus, and Blueprint views.
 */

export interface BuildingPolygonVertex {
  lat: number;
  lng: number;
}

export interface FloorDef {
  floorIndex: number; // 0 for G, 1 for FL 1, etc.
  floorLabel: string; // 'G', 'FL 1', etc.
  heightM: number;    // Realistic per-floor clearance in meters (e.g. 3.6m for Engineering labs)
  elevationM: number; // Cumulative elevation above ground level
  paths: BuildingPolygonVertex[]; // Footprint polygon for this floor
}

export interface CampusBuildingDef {
  id: string;
  name: string;
  code: string;
  floors: number;
  floorHeightM: number;
  totalHeightM: number;
  floorsDef: FloorDef[];
  color: string;
  description: string;
  center: { lat: number; lng: number };
  paths: BuildingPolygonVertex[];
  bounds: {
    min_lat: number;
    max_lat: number;
    min_lon: number;
    max_lon: number;
  };
  dimensionsM: {
    width: number;
    depth: number;
    height: number;
  };
}

// Campus Geographic Reference Origin (center of the main lawn / quadrangle)
export const CAMPUS_ORIGIN = {
  lat: 22.73245,
  lng: 88.49965,
};

// Metric conversion factors at Latitude 22.73245° N
// 1 deg latitude ≈ 110,750 m
// 1 deg longitude ≈ 102,670 m
export const METERS_PER_DEG_LAT = 110750;
export const METERS_PER_DEG_LNG = 102670;

// 3D Scene scaling (1 meter = 0.25 3D world units for balanced campus camera framing)
export const SCENE_SCALE_3D = 0.25;

/**
 * Converts real geographic lat/lng coordinates to local 3D world coordinates [x, z]
 * centered around the campus origin.
 * In 3D WebGL space: +X is East, -Z is North.
 */
export function geoTo3D(lat: number, lng: number): [number, number] {
  const dLng = lng - CAMPUS_ORIGIN.lng;
  const dLat = lat - CAMPUS_ORIGIN.lat;
  
  const x = dLng * METERS_PER_DEG_LNG * SCENE_SCALE_3D;
  const z = -dLat * METERS_PER_DEG_LAT * SCENE_SCALE_3D;
  
  return [x, z];
}

/**
 * Converts building polygon vertices into local 2D shape points [lx, lz] in 3D scene units
 * relative to the building's own center.
 */
export function getLocalBuildingPolygon3D(bldg: CampusBuildingDef): Array<[number, number]> {
  return bldg.paths.map(p => {
    const dLng = p.lng - bldg.center.lng;
    const dLat = p.lat - bldg.center.lat;
    const lx = dLng * METERS_PER_DEG_LNG * SCENE_SCALE_3D;
    const lz = -dLat * METERS_PER_DEG_LAT * SCENE_SCALE_3D;
    return [lx, lz];
  });
}

/**
 * Transforms real geographic polygon vertices into SVG viewBox points { x, y }
 * mapped precisely within the provided 2D CAD canvas bounds.
 */
export function getBuildingSvgPolygon(
  bldg: CampusBuildingDef, 
  canvasBounds: { x: number; y: number; width: number; height: number }
): { points: Array<{ x: number; y: number }>; svgPointsString: string } {
  const latSpan = bldg.bounds.max_lat - bldg.bounds.min_lat;
  const lonSpan = bldg.bounds.max_lon - bldg.bounds.min_lon;

  // Preserve polygon if bounds are valid
  const points = bldg.paths.slice(0, bldg.paths.length - 1).map(p => {
    const normX = lonSpan > 0 ? (p.lng - bldg.bounds.min_lon) / lonSpan : 0.5;
    // Invert Y so North is at the top of the CAD canvas
    const normY = latSpan > 0 ? 1 - ((p.lat - bldg.bounds.min_lat) / latSpan) : 0.5;

    const x = Math.round(canvasBounds.x + normX * canvasBounds.width);
    const y = Math.round(canvasBounds.y + normY * canvasBounds.height);
    return { x, y };
  });

  const svgPointsString = points.map(pt => `${pt.x},${pt.y}`).join(' ');

  return { points, svgPointsString };
}

// ---------------------------------------------------------------------------
// Helper to generate per-floor definitions
// ---------------------------------------------------------------------------
function createFloorsDef(
  floorCount: number, 
  floorHeightM: number, 
  paths: BuildingPolygonVertex[]
): FloorDef[] {
  return Array.from({ length: floorCount }).map((_, fIdx) => ({
    floorIndex: fIdx,
    floorLabel: fIdx === 0 ? 'G' : `FL ${fIdx}`,
    heightM: floorHeightM,
    elevationM: fIdx * floorHeightM,
    paths: [...paths],
  }));
}

// ---------------------------------------------------------------------------
// 6 Calibrated Brainware University Campus Buildings with Real Per-Floor Models
// ---------------------------------------------------------------------------
export const CAMPUS_BUILDINGS: CampusBuildingDef[] = [
  {
    id: 'central_library',
    name: 'Central Library',
    code: 'BLDG-01',
    floors: 4,
    floorHeightM: 3.5, // 3.5m ceiling clearance for book stacks & archival climate control
    totalHeightM: 14.0,
    color: '#06b6d4', // Cyan
    description: 'Central Library & Digital Archives (Building 01 · 4 Floors)',
    center: { lat: 22.73253, lng: 88.49872 },
    paths: [
      { lat: 22.73278, lng: 88.49852 },
      { lat: 22.73280, lng: 88.49890 },
      { lat: 22.73228, lng: 88.49892 },
      { lat: 22.73226, lng: 88.49854 },
      { lat: 22.73278, lng: 88.49852 },
    ],
    floorsDef: createFloorsDef(4, 3.5, [
      { lat: 22.73278, lng: 88.49852 },
      { lat: 22.73280, lng: 88.49890 },
      { lat: 22.73228, lng: 88.49892 },
      { lat: 22.73226, lng: 88.49854 },
      { lat: 22.73278, lng: 88.49852 },
    ]),
    bounds: {
      min_lat: 22.73226,
      max_lat: 22.73280,
      min_lon: 88.49852,
      max_lon: 88.49892,
    },
    dimensionsM: {
      width: 39.0,
      depth: 57.5,
      height: 14.0,
    },
  },
  {
    id: 'main_academic',
    name: 'Main Academic Building',
    code: 'BLDG-02',
    floors: 6,
    floorHeightM: 3.4, // 3.4m standard floor height for lecture halls & deanery
    totalHeightM: 20.4,
    color: '#3b82f6', // Blue
    description: 'Main Academic Administration & Smart Classrooms (Building 02 · 6 Floors)',
    center: { lat: 22.73314, lng: 88.49931 },
    paths: [
      { lat: 22.73335, lng: 88.49885 },
      { lat: 22.73338, lng: 88.49975 },
      { lat: 22.73292, lng: 88.49977 },
      { lat: 22.73290, lng: 88.49887 },
      { lat: 22.73335, lng: 88.49885 },
    ],
    floorsDef: createFloorsDef(6, 3.4, [
      { lat: 22.73335, lng: 88.49885 },
      { lat: 22.73338, lng: 88.49975 },
      { lat: 22.73292, lng: 88.49977 },
      { lat: 22.73290, lng: 88.49887 },
      { lat: 22.73335, lng: 88.49885 },
    ]),
    bounds: {
      min_lat: 22.73290,
      max_lat: 22.73338,
      min_lon: 88.49885,
      max_lon: 88.49977,
    },
    dimensionsM: {
      width: 94.5,
      depth: 50.0,
      height: 20.4,
    },
  },
  {
    id: 'engineering_block',
    name: 'Engineering Block',
    code: 'BLDG-03',
    floors: 9,
    floorHeightM: 3.6, // 3.6m tall heavy lab floor clearance for robotics & machinery
    totalHeightM: 32.4,
    color: '#6366f1', // Indigo
    description: 'Faculty of Engineering & Technology (Building 03 · 9 Floors)',
    center: { lat: 22.73335, lng: 88.50054 },
    paths: [
      { lat: 22.73365, lng: 88.50020 },
      { lat: 22.73368, lng: 88.50085 },
      { lat: 22.73305, lng: 88.50088 },
      { lat: 22.73302, lng: 88.50023 },
      { lat: 22.73365, lng: 88.50020 },
    ],
    floorsDef: createFloorsDef(9, 3.6, [
      { lat: 22.73365, lng: 88.50020 },
      { lat: 22.73368, lng: 88.50085 },
      { lat: 22.73305, lng: 88.50088 },
      { lat: 22.73302, lng: 88.50023 },
      { lat: 22.73365, lng: 88.50020 },
    ]),
    bounds: {
      min_lat: 22.73302,
      max_lat: 22.73368,
      min_lon: 88.50020,
      max_lon: 88.50088,
    },
    dimensionsM: {
      width: 69.8,
      depth: 69.8,
      height: 32.4,
    },
  },
  {
    id: 'law_management',
    name: 'Law & Management',
    code: 'BLDG-04',
    floors: 4,
    floorHeightM: 3.3, // 3.3m floor clearance for moot courts & business suites
    totalHeightM: 13.2,
    color: '#8b5cf6', // Violet
    description: 'School of Law, Management & Humanities (Building 04 · 4 Floors)',
    center: { lat: 22.73228, lng: 88.50081 },
    paths: [
      { lat: 22.73260, lng: 88.50050 },
      { lat: 22.73262, lng: 88.50110 },
      { lat: 22.73195, lng: 88.50112 },
      { lat: 22.73193, lng: 88.50052 },
      { lat: 22.73260, lng: 88.50050 },
    ],
    floorsDef: createFloorsDef(4, 3.3, [
      { lat: 22.73260, lng: 88.50050 },
      { lat: 22.73262, lng: 88.50110 },
      { lat: 22.73195, lng: 88.50112 },
      { lat: 22.73193, lng: 88.50052 },
      { lat: 22.73260, lng: 88.50050 },
    ]),
    bounds: {
      min_lat: 22.73193,
      max_lat: 22.73262,
      min_lon: 88.50050,
      max_lon: 88.50112,
    },
    dimensionsM: {
      width: 63.6,
      depth: 74.2,
      height: 13.2,
    },
  },
  {
    id: 'health_sciences',
    name: 'Allied Health Sciences',
    code: 'BLDG-05',
    floors: 3,
    floorHeightM: 3.4, // 3.4m floor clearance for anatomy labs & clinical simulation
    totalHeightM: 10.2,
    color: '#10b981', // Emerald
    description: 'School of Medical, Nursing & Health Sciences (Building 05 · 3 Floors)',
    center: { lat: 22.73164, lng: 88.50008 },
    paths: [
      { lat: 22.73185, lng: 88.49975 },
      { lat: 22.73188, lng: 88.50040 },
      { lat: 22.73142, lng: 88.50042 },
      { lat: 22.73140, lng: 88.49977 },
      { lat: 22.73185, lng: 88.49975 },
    ],
    floorsDef: createFloorsDef(3, 3.4, [
      { lat: 22.73185, lng: 88.49975 },
      { lat: 22.73188, lng: 88.50040 },
      { lat: 22.73142, lng: 88.50042 },
      { lat: 22.73140, lng: 88.49977 },
      { lat: 22.73185, lng: 88.49975 },
    ]),
    bounds: {
      min_lat: 22.73140,
      max_lat: 22.73188,
      min_lon: 88.49975,
      max_lon: 88.50042,
    },
    dimensionsM: {
      width: 68.8,
      depth: 49.8,
      height: 10.2,
    },
  },
  {
    id: 'food_court',
    name: 'Food Court & Canteen',
    code: 'BLDG-06',
    floors: 1,
    floorHeightM: 4.8, // 4.8m tall high-ceiling open dining & student amenity hall
    totalHeightM: 4.8,
    color: '#f59e0b', // Amber
    description: 'Campus Student Amenities & Food Court (Building 06 · 1 Floor)',
    center: { lat: 22.73161, lng: 88.49908 },
    paths: [
      { lat: 22.73180, lng: 88.49880 },
      { lat: 22.73182, lng: 88.49935 },
      { lat: 22.73142, lng: 88.49937 },
      { lat: 22.73140, lng: 88.49882 },
      { lat: 22.73180, lng: 88.49880 },
    ],
    floorsDef: createFloorsDef(1, 4.8, [
      { lat: 22.73180, lng: 88.49880 },
      { lat: 22.73182, lng: 88.49935 },
      { lat: 22.73142, lng: 88.49937 },
      { lat: 22.73140, lng: 88.49882 },
      { lat: 22.73180, lng: 88.49880 },
    ]),
    bounds: {
      min_lat: 22.73140,
      max_lat: 22.73182,
      min_lon: 88.49880,
      max_lon: 88.49937,
    },
    dimensionsM: {
      width: 58.5,
      depth: 44.3,
      height: 4.8,
    },
  },
];

// Helper to look up building by ID, Code, or Name
export function getCampusBuilding(identifier: string): CampusBuildingDef | undefined {
  const lower = identifier.toLowerCase().trim();
  return CAMPUS_BUILDINGS.find(
    b => b.id === lower || 
         b.code.toLowerCase() === lower || 
         b.name.toLowerCase() === lower ||
         lower.includes(b.name.toLowerCase())
  );
}

// Helper to look up a specific floor definition
export function getBuildingFloorDef(bldgId: string, floorIndex: number): FloorDef | undefined {
  const bldg = getCampusBuilding(bldgId);
  if (!bldg) return undefined;
  return bldg.floorsDef.find(f => f.floorIndex === floorIndex) || bldg.floorsDef[0];
}
