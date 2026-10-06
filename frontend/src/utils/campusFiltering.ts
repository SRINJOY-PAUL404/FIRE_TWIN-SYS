/**
 * Campus Filtering & Building Assignment Utilities
 *
 * Provides functions to:
 * - Classify extinguishers as inside/outside campus boundary
 * - Assign each in-campus unit to its nearest/containing building
 * - Group units by building with status summaries
 */

import type { Extinguisher } from '../types';
import {
  CAMPUS_BUILDINGS,
  type CampusBuildingDef,
} from '../constants/campusBuildings';
import {
  isPointInsideCampus,
  isPointInPolygon,
} from '../constants/campusBoundary';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusSummary {
  total: number;
  healthy: number;
  attention: number;
  critical: number;
}

export interface BuildingGroup {
  building: CampusBuildingDef;
  units: Extinguisher[];
  status: StatusSummary;
  isInsideCampus: boolean;
}

export interface CampusClassification {
  /** Units whose coordinates fall inside the campus boundary */
  inCampus: Extinguisher[];
  /** Units whose coordinates fall outside the campus boundary (or have no coords) */
  outOfCampus: Extinguisher[];
}

export interface BuildingGroupMap {
  /** Keyed by building id */
  [buildingId: string]: BuildingGroup;
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Classifies ACTIVE extinguishers into in-campus and out-of-campus buckets.
 */
export function classifyExtinguishers(extinguishers: Extinguisher[]): CampusClassification {
  const inCampus: Extinguisher[] = [];
  const outOfCampus: Extinguisher[] = [];

  for (const ext of extinguishers) {
    if (
      ext.lifecycle_state === 'ACTIVE' &&
      ext.latitude != null &&
      ext.longitude != null &&
      isPointInsideCampus(ext.latitude, ext.longitude)
    ) {
      inCampus.push(ext);
    } else {
      outOfCampus.push(ext);
    }
  }

  return { inCampus, outOfCampus };
}

/**
 * Checks if a building center falls inside the campus boundary.
 */
export function isBuildingInsideCampus(bldg: CampusBuildingDef): boolean {
  return isPointInsideCampus(bldg.center.lat, bldg.center.lng);
}

/**
 * Assigns an extinguisher to a building using two strategies:
 * 1. Point-in-polygon: check if unit coords fall within any building footprint
 * 2. Nearest centroid: fallback for units that don't fall inside any footprint
 *
 * Only considers buildings that are inside the campus boundary.
 */
export function assignExtinguisherToBuilding(
  ext: Extinguisher,
  buildings: CampusBuildingDef[] = CAMPUS_BUILDINGS
): CampusBuildingDef | null {
  if (ext.latitude == null || ext.longitude == null) return null;

  const campusBuildings = buildings.filter(b => isBuildingInsideCampus(b));
  if (campusBuildings.length === 0) return null;

  // Strategy 1: check if unit is inside any building footprint polygon
  for (const bldg of campusBuildings) {
    if (isPointInPolygon(ext.latitude, ext.longitude, bldg.paths)) {
      return bldg;
    }
  }

  // Strategy 2: nearest building centroid (for units between buildings)
  let nearest: CampusBuildingDef | null = null;
  let minDist = Infinity;

  for (const bldg of campusBuildings) {
    const dLat = ext.latitude - bldg.center.lat;
    const dLng = ext.longitude - bldg.center.lng;
    // Simple Euclidean distance (fine for small campus areas)
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = bldg;
    }
  }

  return nearest;
}

/**
 * Computes a status summary from a list of extinguishers.
 */
function computeStatusSummary(units: Extinguisher[]): StatusSummary {
  let healthy = 0;
  let attention = 0;
  let critical = 0;

  for (const u of units) {
    if (u.status === 'Healthy') {
      healthy++;
    } else if (u.status === 'Low Pressure' || u.status === 'Maintenance Due') {
      attention++;
    } else {
      // Emergency, Missing, Inspection Pending, etc.
      critical++;
    }
  }

  return { total: units.length, healthy, attention, critical };
}

/**
 * Groups in-campus extinguishers by their assigned building.
 * Returns a map keyed by building id with units, status summary, etc.
 */
export function groupExtinguishersByBuilding(
  extinguishers: Extinguisher[],
  buildings: CampusBuildingDef[] = CAMPUS_BUILDINGS
): BuildingGroupMap {
  const { inCampus } = classifyExtinguishers(extinguishers);

  // Initialize groups for campus-interior buildings only
  const groups: BuildingGroupMap = {};
  for (const bldg of buildings) {
    const inside = isBuildingInsideCampus(bldg);
    groups[bldg.id] = {
      building: bldg,
      units: [],
      status: { total: 0, healthy: 0, attention: 0, critical: 0 },
      isInsideCampus: inside,
    };
  }

  // Assign each in-campus unit to its building
  for (const ext of inCampus) {
    const bldg = assignExtinguisherToBuilding(ext, buildings);
    if (bldg && groups[bldg.id]) {
      groups[bldg.id].units.push(ext);
    }
  }

  // Compute status summaries
  for (const id of Object.keys(groups)) {
    groups[id].status = computeStatusSummary(groups[id].units);
  }

  return groups;
}
