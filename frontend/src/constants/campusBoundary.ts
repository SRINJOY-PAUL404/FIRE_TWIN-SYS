/**
 * Campus Boundary Polygon & Point-in-Polygon Utilities
 *
 * Real campus perimeter of Brainware University, Barasat.
 * Provided as GeoJSON by the campus administrator.
 *
 * The boundary can be recalibrated at any time using the map's
 * CALIBRATE tool — click perimeter corners, copy the JSON, and
 * replace the CAMPUS_BOUNDARY array below.
 */

import type { BuildingPolygonVertex } from './campusBuildings';

// ---------------------------------------------------------------------------
// Campus Perimeter Polygon (vertices from user-provided GeoJSON, closed)
// Source: Brainware University boundary provided 2026-09-19
// ---------------------------------------------------------------------------
export const CAMPUS_BOUNDARY: BuildingPolygonVertex[] = [
  { lat: 22.732949, lng: 88.499129 },
  { lat: 22.732932, lng: 88.498897 },
  { lat: 22.732894, lng: 88.498610 },
  { lat: 22.732667, lng: 88.498127 },
  { lat: 22.731030, lng: 88.497563 },
  { lat: 22.730661, lng: 88.498661 },
  { lat: 22.731502, lng: 88.500154 },
  { lat: 22.732447, lng: 88.500349 },
  { lat: 22.732893, lng: 88.499817 },
  { lat: 22.732949, lng: 88.499129 }, // close
];

// ---------------------------------------------------------------------------
// Ray-Casting Point-in-Polygon Algorithm
// ---------------------------------------------------------------------------

/**
 * Determines whether a point (lat, lng) lies inside a closed polygon
 * using the ray-casting crossing-number test.
 *
 * @param lat     – Latitude of the test point
 * @param lng     – Longitude of the test point
 * @param polygon – Array of { lat, lng } vertices (first == last to close)
 * @returns true if the point is inside the polygon
 */
export function isPointInPolygon(
  lat: number,
  lng: number,
  polygon: BuildingPolygonVertex[]
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lng;
    const yj = polygon[j].lat;
    const xj = polygon[j].lng;

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

    if (intersects) inside = !inside;
  }

  return inside;
}

/**
 * Convenience: checks if a point falls within the campus boundary.
 */
export function isPointInsideCampus(lat: number, lng: number): boolean {
  return isPointInPolygon(lat, lng, CAMPUS_BOUNDARY);
}

// ---------------------------------------------------------------------------
// GeoJSON Representation (for rendering on MapLibre)
// ---------------------------------------------------------------------------
export const CAMPUS_BOUNDARY_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      id: 'campus-boundary',
      properties: {
        name: 'Brainware University Campus',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [CAMPUS_BOUNDARY.map(p => [p.lng, p.lat])],
      },
    },
  ],
};
