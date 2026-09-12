import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { FeatureCollection, Polygon } from 'geojson';
import type { Extinguisher, Location } from '../types';
import { 
  CAMPUS_BUILDINGS, 
  CAMPUS_ORIGIN, 
  type CampusBuildingDef 
} from '../constants/campusBuildings';
import { 
  MapPin, 
  Search, 
  Crosshair, 
  Plus, 
  Minus, 
  Maximize2,
  Lock,
  Unlock,
  Sliders,
  Copy,
  Trash2,
  Check
} from 'lucide-react';

interface MapboxCampusMapProps {
  extinguishers: Extinguisher[];
  locations: Location[];
  emergencyExtinguisherId?: number | null;
  selectedBuildingId?: string | null;
  onSelectBuilding?: (id: string | null, name: string | null) => void;
  onSelectExtinguisher?: (ext: Extinguisher) => void;
}

// High-Definition, Zero-Auth, Watermark-Free Base Map Styles (Esri REST & OSM services with CORS enabled)
export const MAP_STYLES: Record<'hybrid' | 'styled_dark' | 'roadmap', maplibregl.StyleSpecification> = {
  hybrid: {
    version: 8,
    name: 'Satellite Streets',
    sources: {
      'esri-satellite': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© Esri, Maxar, Earthstar Geographics',
      },
      'esri-labels': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'satellite-base',
        type: 'raster',
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22,
      },
      {
        id: 'satellite-labels',
        type: 'raster',
        source: 'esri-labels',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
  styled_dark: {
    version: 8,
    name: 'Dark Vector',
    sources: {
      'esri-dark-base': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16, // Esri dark native max zoom is 16; setting maxzoom: 16 allows MapLibre to overzoom up to 22 seamlessly
        attribution: '© Esri, HERE, Garmin, OpenStreetMap contributors',
      },
      'esri-dark-labels': {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        maxzoom: 16,
      },
    },
    layers: [
      {
        id: 'dark-base',
        type: 'raster',
        source: 'esri-dark-base',
        minzoom: 0,
        maxzoom: 22,
      },
      {
        id: 'dark-labels',
        type: 'raster',
        source: 'esri-dark-labels',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
  roadmap: {
    version: 8,
    name: 'Roadmap',
    sources: {
      'osm-streets': {
        type: 'raster',
        tiles: [
          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        tileSize: 256,
        maxzoom: 19,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [
      {
        id: 'roadmap-base',
        type: 'raster',
        source: 'osm-streets',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
  },
};

const STORAGE_LOCK_KEY = 'campus_map_view_locked';

// Generate GeoJSON FeatureCollection directly from the Single Source of Truth
const BUILDINGS_GEOJSON: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: CAMPUS_BUILDINGS.map(b => ({
    type: 'Feature',
    id: b.id,
    properties: {
      id: b.id,
      name: b.name,
      code: b.code,
      floors: b.floors,
      color: b.color,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [b.paths.map(p => [p.lng, p.lat])],
    },
  })),
};

export const MapboxCampusMap: React.FC<MapboxCampusMapProps> = ({
  extinguishers,
  locations,
  emergencyExtinguisherId,
  selectedBuildingId,
  onSelectBuilding,
  onSelectExtinguisher,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersMapRef = useRef<Map<number, maplibregl.Marker>>(new Map());
  const activePopupRef = useRef<maplibregl.Popup | null>(null);
  const selectedUnitIdRef = useRef<number | null>(null);

  // Dev Calibration State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const isCalibratingRef = useRef<boolean>(isCalibrating);
  isCalibratingRef.current = isCalibrating;

  const [calibrationPoints, setCalibrationPoints] = useState<Array<{ lat: number; lng: number }>>([]);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Latest props refs
  const extinguishersRef = useRef<Extinguisher[]>(extinguishers);
  extinguishersRef.current = extinguishers;

  const locationsRef = useRef<Location[]>(locations);
  locationsRef.current = locations;

  const onSelectBuildingRef = useRef(onSelectBuilding);
  onSelectBuildingRef.current = onSelectBuilding;

  const onSelectExtinguisherRef = useRef(onSelectExtinguisher);
  onSelectExtinguisherRef.current = onSelectExtinguisher;

  // View Lock state (DEFAULT TRUE, persisted in localStorage)
  const [isViewLocked, setIsViewLocked] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_LOCK_KEY);
      if (stored === null) return true;
      return stored === 'true';
    } catch {
      return true;
    }
  });

  const isViewLockedRef = useRef<boolean>(isViewLocked);
  isViewLockedRef.current = isViewLocked;

  const toggleViewLock = useCallback(() => {
    setIsViewLocked(prev => {
      const nextVal = !prev;
      isViewLockedRef.current = nextVal;
      console.log(`[CampusMap] View lock toggled: ${nextVal ? 'LOCKED' : 'UNLOCKED'}`);
      try {
        localStorage.setItem(STORAGE_LOCK_KEY, String(nextVal));
      } catch (err) {
        console.warn('Failed to save lock state to localStorage', err);
      }
      return nextVal;
    });
  }, []);

  const [mapType, setMapType] = useState<'hybrid' | 'styled_dark' | 'roadmap'>('hybrid');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Filter active deployed units
  const activeExtinguishers = useMemo(() => {
    return extinguishers.filter(e => e.lifecycle_state === 'ACTIVE' && e.latitude && e.longitude);
  }, [extinguishers]);

  // Helper to get location and building name
  const getLocationInfo = useCallback((locId: number | null) => {
    if (!locId) return { buildingName: 'Central Storage', locName: 'In Storage' };
    const loc = locationsRef.current.find(l => l.id === locId);
    if (!loc) return { buildingName: 'Campus', locName: 'Floor Unit' };
    
    const bldg = CAMPUS_BUILDINGS.find(b => loc.name.toLowerCase().includes(b.name.toLowerCase()));
    return {
      buildingName: bldg?.name || 'Academic Campus',
      locName: loc.name
    };
  }, []);

  // HTML content builder for info windows / popups
  const renderPopupContent = useCallback((ext: Extinguisher, locInfo: { buildingName: string; locName: string }, pinColor: string) => {
    return `
      <div style="font-family: 'JetBrains Mono', monospace; padding: 4px; color: #0f172a; min-width: 220px;">
        <div style="border-bottom: 2px solid ${pinColor}; padding-bottom: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 13px; color: #0f172a;">${ext.extinguisher_id}</strong>
          <span style="font-size: 10px; padding: 2px 6px; background: ${pinColor}20; color: ${pinColor}; font-weight: bold; border-radius: 2px;">
            ${ext.status.toUpperCase()}
          </span>
        </div>
        <div style="font-size: 11px; line-height: 1.6; color: #334155;">
          <div><strong>Building:</strong> ${locInfo.buildingName}</div>
          <div><strong>Location:</strong> ${locInfo.locName}</div>
          <div><strong>Room:</strong> ${ext.room || 'N/A'}</div>
          <div><strong>Type:</strong> ${ext.type} (${ext.capacity})</div>
          <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; display: flex; justify-content: space-between;">
            <span><strong>Pressure:</strong> <span style="color: ${ext.pressure < 40 ? '#ef4444' : '#10b981'}; font-weight: bold;">${ext.pressure.toFixed(1)}%</span></span>
            <span><strong>Battery:</strong> <span style="font-weight: bold;">${ext.battery.toFixed(1)}%</span></span>
          </div>
        </div>
      </div>
    `;
  }, []);

  // Fit all campus buildings and units into view (guarded by lock)
  const fitAllBounds = useCallback((force = false) => {
    if (!mapRef.current) return;
    if (isViewLockedRef.current && !force) {
      console.log('[CampusMap] fitAllBounds suppressed by Static View Lock');
      return;
    }

    const bounds = new maplibregl.LngLatBounds();

    CAMPUS_BUILDINGS.forEach(b => {
      b.paths.forEach(p => bounds.extend([p.lng, p.lat]));
    });

    extinguishersRef.current
      .filter(e => e.lifecycle_state === 'ACTIVE' && e.latitude && e.longitude)
      .forEach(e => {
        bounds.extend([e.longitude!, e.latitude!]);
      });

    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 19.5, duration: 800 });
    } else {
      mapRef.current.flyTo({ center: [CAMPUS_ORIGIN.lng, CAMPUS_ORIGIN.lat], zoom: 18.0, duration: 800 });
    }
  }, []);

  // Fit single building polygon bounds into view (guarded by lock)
  const fitBuildingBounds = useCallback((bldg: CampusBuildingDef, force = false) => {
    if (!mapRef.current) return;
    if (isViewLockedRef.current && !force) {
      console.log('[CampusMap] fitBuildingBounds suppressed by Static View Lock');
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    bldg.paths.forEach(p => bounds.extend([p.lng, p.lat]));
    mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 19.8, duration: 800 });
  }, []);

  // Reset entire map view and UI filters to default
  const resetView = useCallback((force = false) => {
    setSelectedBuilding('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');
    if (onSelectBuildingRef.current) {
      onSelectBuildingRef.current(null, null);
    }
    fitAllBounds(force);
  }, [fitAllBounds]);

  // Zoom controls
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn({ duration: 300 });
  };

  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut({ duration: 300 });
  };

  // Setup building vector layers on top of basemap
  const setupBuildingLayers = useCallback((map: maplibregl.Map) => {
    try {
      if (!map.isStyleLoaded()) {
        console.log('[MapboxCampusMap] Style not yet loaded; skipping sync');
        return;
      }

      // 1. Add or update Building Footprint Source
      if (!map.getSource('campus-buildings')) {
        map.addSource('campus-buildings', {
          type: 'geojson',
          data: BUILDINGS_GEOJSON,
        });
      } else {
        const source = map.getSource('campus-buildings') as maplibregl.GeoJSONSource;
        if (source && typeof source.setData === 'function') {
          source.setData(BUILDINGS_GEOJSON);
        }
      }

      // 2. Semi-transparent Fill Layer
      if (!map.getLayer('campus-buildings-fill')) {
        map.addLayer({
          id: 'campus-buildings-fill',
          type: 'fill',
          source: 'campus-buildings',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': 0.28,
          },
        });
      }

      // 3. Colored Outline Line Layer
      if (!map.getLayer('campus-buildings-line')) {
        map.addLayer({
          id: 'campus-buildings-line',
          type: 'line',
          source: 'campus-buildings',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-opacity': 1.0,
          },
        });
      }
    } catch (err) {
      console.warn('[MapboxCampusMap] Failed to setup building layers:', err);
    }
  }, []);

  // Sync unit markers in DOM
  const syncMarkers = useCallback(() => {
    if (!mapRef.current || !isMapLoaded) return;
    const map = mapRef.current;

    // Filter units based on active UI filters
    const filteredUnits = activeExtinguishers.filter(ext => {
      const locInfo = getLocationInfo(ext.location_id);
      
      const matchBuilding = selectedBuilding === 'ALL' || locInfo.buildingName === selectedBuilding;
      const matchStatus = 
        selectedStatus === 'ALL' || 
        (selectedStatus === 'HEALTHY' && ext.status === 'Healthy') ||
        (selectedStatus === 'ATTENTION' && (ext.status === 'Low Pressure' || ext.status === 'Maintenance Due')) ||
        (selectedStatus === 'CRITICAL' && (ext.status === 'Emergency' || ext.status === 'Missing' || ext.status === 'Inspection Pending'));
      
      const matchSearch = 
        !searchQuery || 
        ext.extinguisher_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ext.room ? ext.room.toLowerCase().includes(searchQuery.toLowerCase()) : false) ||
        locInfo.buildingName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchBuilding && matchStatus && matchSearch;
    });

    const currentMarkerIds = new Set(filteredUnits.map(u => u.id));

    // Remove markers that no longer match the filter
    markersMapRef.current.forEach((marker, id) => {
      if (!currentMarkerIds.has(id)) {
        marker.remove();
        markersMapRef.current.delete(id);
      }
    });

    // Add or update markers in-place
    filteredUnits.forEach(ext => {
      if (!ext.latitude || !ext.longitude) return;

      const isCrit = ext.status === 'Emergency' || ext.status === 'Missing' || ext.id === emergencyExtinguisherId;
      const isWarn = ext.status === 'Low Pressure' || ext.status === 'Maintenance Due';
      
      const pinColor = isCrit ? '#ef4444' : isWarn ? '#f59e0b' : '#10b981';

      let marker = markersMapRef.current.get(ext.id);

      if (!marker) {
        // Create custom DOM marker element
        const el = document.createElement('div');
        el.className = 'mapbox-firetwin-marker cursor-pointer transition-transform hover:scale-125';
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';

        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid #0f172a; box-shadow: 0 0 10px ${pinColor}cc; z-index: 2;"></div>
            ${isCrit || isWarn ? `<div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${pinColor}40; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; z-index: 1;"></div>` : ''}
          </div>
        `;

        const popup = new maplibregl.Popup({ offset: 18, closeButton: true, maxWidth: '280px' });

        marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([ext.longitude, ext.latitude])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener('click', () => {
          selectedUnitIdRef.current = ext.id;
          if (onSelectExtinguisherRef.current) onSelectExtinguisherRef.current(ext);

          const locInfo = getLocationInfo(ext.location_id);
          const content = renderPopupContent(ext, locInfo, pinColor);
          popup.setHTML(content);
          activePopupRef.current = popup;
        });

        markersMapRef.current.set(ext.id, marker);
      } else {
        // Update marker coordinates in-place
        marker.setLngLat([ext.longitude, ext.latitude]);

        // Update DOM element inner styling
        const el = marker.getElement();
        el.innerHTML = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${pinColor}; border: 2px solid #0f172a; box-shadow: 0 0 10px ${pinColor}cc; z-index: 2;"></div>
            ${isCrit || isWarn ? `<div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; background-color: ${pinColor}40; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite; z-index: 1;"></div>` : ''}
          </div>
        `;

        // If popup is open for this unit, update live stats
        if (selectedUnitIdRef.current === ext.id && activePopupRef.current && activePopupRef.current.isOpen()) {
          const locInfo = getLocationInfo(ext.location_id);
          activePopupRef.current.setHTML(renderPopupContent(ext, locInfo, pinColor));
        }
      }
    });
  }, [
    activeExtinguishers, 
    selectedBuilding, 
    selectedStatus, 
    searchQuery, 
    emergencyExtinguisherId, 
    isMapLoaded, 
    getLocationInfo, 
    renderPopupContent
  ]);

  // Handle Style Switch (gated by map.once('style.load') to re-add layers seamlessly)
  const handleSwitchStyle = useCallback((newType: 'hybrid' | 'styled_dark' | 'roadmap') => {
    if (newType === mapType || !mapRef.current) return;
    setMapType(newType);

    const map = mapRef.current;

    // Capture camera coordinates prior to style change
    const center = map.getCenter();
    const zoom = map.getZoom();
    const pitch = map.getPitch();
    const bearing = map.getBearing();

    // Register style.load listener ONCE per switch to re-add sources and layers AFTER the new style completes loading
    map.once('style.load', () => {
      // Re-apply preserved camera coordinates
      map.setCenter(center);
      map.setZoom(zoom);
      map.setPitch(pitch);
      map.setBearing(bearing);

      // Re-add custom building footprint polygons & styles
      setupBuildingLayers(map);

      // Re-sync markers & popups
      syncMarkers();
    });

    map.setStyle(MAP_STYLES[newType]);
  }, [mapType, setupBuildingLayers, syncMarkers]);

  // Sync selectedBuildingId prop changes with local state
  useEffect(() => {
    if (selectedBuildingId) {
      const bldg = CAMPUS_BUILDINGS.find(b => b.id === selectedBuildingId);
      if (bldg) {
        setSelectedBuilding(bldg.name);
        if (isMapLoaded && !isViewLockedRef.current) {
          fitBuildingBounds(bldg);
        }
      }
    } else {
      setSelectedBuilding('ALL');
    }
  }, [selectedBuildingId, isMapLoaded, fitBuildingBounds]);

  // Initialize Map Instance (Runs ONCE on mount)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialStyle = MAP_STYLES.hybrid;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: initialStyle,
      center: [CAMPUS_ORIGIN.lng, CAMPUS_ORIGIN.lat],
      zoom: 18.0,
      minZoom: 15,
      maxZoom: 22,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;

    // Dev Calibration Click Handler (Gated by isCalibrating state)
    map.on('click', (e: any) => {
      if (!isCalibratingRef.current || !e.lngLat) return;
      const pt = {
        lat: parseFloat(e.lngLat.lat.toFixed(6)),
        lng: parseFloat(e.lngLat.lng.toFixed(6)),
      };
      console.log(`[Rooftop Calibration] Point: { lat: ${pt.lat}, lng: ${pt.lng} }`);
      setCalibrationPoints(prev => [...prev, pt]);
    });

    // Permanent Building polygon interaction listeners (Routed by layer id)
    map.on('mouseenter', 'campus-buildings-fill', () => {
      map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'campus-buildings-fill', () => {
      map.getCanvas().style.cursor = '';
    });

    map.on('click', 'campus-buildings-fill', (e: any) => {
      if (e.features && e.features[0]) {
        const props = (e.features[0].properties || {}) as Record<string, any>;
        const bldgName = props.name as string;
        const bldgId = props.id as string;
        
        setSelectedBuilding(bldgName);
        
        if (onSelectBuildingRef.current) {
          onSelectBuildingRef.current(bldgId, bldgName);
        }

        const bldg = CAMPUS_BUILDINGS.find(b => b.name === bldgName || b.id === bldgId);
        if (bldg && !isViewLockedRef.current) {
          fitBuildingBounds(bldg);
        }
      }
    });

    map.on('load', () => {
      setIsMapLoaded(true);
      setupBuildingLayers(map);
      map.resize();

      if (!isViewLockedRef.current) {
        fitAllBounds(false);
      }
    });

    // Resize observer to ensure full dimensions in flex layouts
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(mapContainerRef.current);

    setTimeout(() => map.resize(), 100);
    setTimeout(() => map.resize(), 500);

    // Clean up on unmount
    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [fitAllBounds, fitBuildingBounds, setupBuildingLayers]);

  // Render & Update Extinguisher Unit Markers in-place
  useEffect(() => {
    syncMarkers();
  }, [syncMarkers]);

  // Copy points to clipboard
  const handleCopyPoints = () => {
    const jsonStr = JSON.stringify(calibrationPoints, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
    });
  };

  return (
    <div className="relative w-full h-full bg-[#0a0e17] overflow-hidden select-none">
      {/* Map Canvas Viewport Container (Absolute Inset-0 to fill 100% of parent) */}
      <div 
        ref={mapContainerRef} 
        className="absolute inset-0 w-full h-full z-0" 
        style={{ width: '100%', height: '100%' }}
      />

      {/* Top Map Control Bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left Filter Group */}
        <div className="flex items-center gap-2 pointer-events-auto bg-[var(--color-command-panel)]/90 backdrop-blur-md border border-[var(--color-command-border)] p-1.5 shadow-xl">
          <div className="flex items-center px-2 py-1 text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] border-r border-[var(--color-command-border)]">
            <MapPin className="w-3.5 h-3.5 mr-1 text-[var(--color-amber-alert)]" />
            <span className="hidden sm:inline">CAMPUS:</span> <strong className="text-slate-200 ml-1">Brainware Univ.</strong>
          </div>

          {/* Building Selector */}
          <select
            value={selectedBuilding}
            onChange={(e) => {
              const bldgName = e.target.value;
              setSelectedBuilding(bldgName);
              const bldg = CAMPUS_BUILDINGS.find(b => b.name === bldgName);
              
              if (onSelectBuilding) {
                if (bldg) onSelectBuilding(bldg.id, bldg.name);
                else onSelectBuilding(null, null);
              }
              
              if (!isViewLockedRef.current && mapRef.current) {
                if (bldgName === 'ALL' || !bldg) {
                  fitAllBounds();
                } else {
                  fitBuildingBounds(bldg);
                }
              }
            }}
            className="bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-xs text-slate-200 font-[var(--font-mono)] px-2 py-1 focus:outline-none focus:border-[var(--color-amber-alert)]"
          >
            <option value="ALL">All Buildings (6)</option>
            {CAMPUS_BUILDINGS.map(b => (
              <option key={b.id} value={b.name}>{b.name} ({b.floors} Fl)</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-xs text-slate-200 font-[var(--font-mono)] px-2 py-1 focus:outline-none focus:border-[var(--color-amber-alert)]"
          >
            <option value="ALL">All Statuses</option>
            <option value="HEALTHY">Nominal / Healthy</option>
            <option value="ATTENTION">Needs Attention</option>
            <option value="CRITICAL">Critical / Emergency</option>
          </select>

          {/* Search Input */}
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-[var(--color-steel-blue)]" />
            <input
              type="text"
              placeholder="Search ID, Room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-[var(--color-command-bg)] border border-[var(--color-command-border)] text-xs text-slate-200 font-[var(--font-mono)] w-36 focus:outline-none focus:border-[var(--color-amber-alert)]"
            />
          </div>
        </div>

        {/* Right Layer / Style Switcher + Calibration Tool Toggle */}
        <div className="flex items-center gap-1 pointer-events-auto bg-[var(--color-command-panel)]/90 backdrop-blur-md border border-[var(--color-command-border)] p-1.5 shadow-xl">
          <button
            onClick={() => handleSwitchStyle('hybrid')}
            className={`px-2.5 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors cursor-pointer ${
              mapType === 'hybrid'
                ? 'bg-[var(--color-steel-blue)]/30 text-emerald-400 border-b-2 border-emerald-400 font-bold'
                : 'text-[var(--color-steel-blue)] hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => handleSwitchStyle('styled_dark')}
            className={`px-2.5 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors cursor-pointer ${
              mapType === 'styled_dark'
                ? 'bg-[var(--color-steel-blue)]/30 text-cyan-400 border-b-2 border-cyan-400 font-bold'
                : 'text-[var(--color-steel-blue)] hover:text-slate-200'
            }`}
          >
            Dark Vector
          </button>
          <button
            onClick={() => handleSwitchStyle('roadmap')}
            className={`px-2.5 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors cursor-pointer ${
              mapType === 'roadmap'
                ? 'bg-[var(--color-steel-blue)]/30 text-amber-400 border-b-2 border-amber-400 font-bold'
                : 'text-[var(--color-steel-blue)] hover:text-slate-200'
            }`}
          >
            Roadmap
          </button>

          <div className="h-4 w-[1px] bg-[var(--color-command-border)] mx-1" />

          {/* Dev Calibration HUD Toggle */}
          <button
            onClick={() => setIsCalibrating(prev => !prev)}
            title="Dev Calibration Mode (Click map to capture rooftop corners)"
            className={`px-2 py-1 text-[11px] font-[var(--font-mono)] border transition-all flex items-center gap-1 cursor-pointer ${
              isCalibrating 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 font-bold shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-[var(--color-command-border)]'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span className="hidden sm:inline">CALIBRATE</span>
          </button>
        </div>
      </div>

      {/* Floating Dedicated Zoom & Static View Lock Controls */}
      <div className="absolute top-16 right-3 z-10 pointer-events-auto flex flex-col gap-1.5 bg-[var(--color-command-panel)]/90 backdrop-blur-md border border-[var(--color-command-border)] p-1.5 shadow-xl">
        {/* Static View Lock Toggle Button */}
        <button
          onClick={toggleViewLock}
          title={isViewLocked ? "Static View Locked (Programmatic Pan/Zoom Disabled) - Click to Unlock" : "Static View Unlocked (Click to Freeze Viewport)"}
          aria-label={isViewLocked ? "Unlock View" : "Lock View"}
          className={`p-1.5 transition-all cursor-pointer border flex items-center justify-center relative group ${
            isViewLocked 
              ? 'bg-[var(--color-amber-alert)]/20 text-[var(--color-amber-alert)] border-[var(--color-amber-alert)] shadow-[0_0_8px_rgba(232,163,61,0.3)]' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--color-steel-blue)]/20 border-transparent hover:border-[var(--color-command-border)]'
          }`}
        >
          {isViewLocked ? <Lock className="w-4 h-4 text-[var(--color-amber-alert)]" /> : <Unlock className="w-4 h-4" />}
          {isViewLocked && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--color-amber-alert)] rounded-full animate-ping"></span>
          )}
        </button>

        <div className="h-[1px] bg-[var(--color-command-border)] my-0.5" />

        <button
          onClick={handleZoomIn}
          title="Zoom In"
          aria-label="Zoom In"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[var(--color-steel-blue)]/20 transition-colors cursor-pointer border border-transparent hover:border-[var(--color-command-border)] flex items-center justify-center"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          aria-label="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-white hover:bg-[var(--color-steel-blue)]/20 transition-colors cursor-pointer border border-transparent hover:border-[var(--color-command-border)] flex items-center justify-center"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="h-[1px] bg-[var(--color-command-border)] my-0.5" />

        <button
          onClick={() => fitAllBounds(true)}
          title="Fit to View (Show All Units & Buildings)"
          aria-label="Fit to View"
          className="p-1.5 text-[var(--color-amber-alert)] hover:text-amber-300 hover:bg-[var(--color-steel-blue)]/20 transition-colors cursor-pointer border border-transparent hover:border-[var(--color-command-border)] flex items-center justify-center"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => resetView(true)}
          title="Recenter & Reset View"
          aria-label="Recenter & Reset View"
          className="p-1.5 text-[var(--color-steel-blue)] hover:text-slate-200 hover:bg-[var(--color-steel-blue)]/20 transition-colors cursor-pointer border border-transparent hover:border-[var(--color-command-border)] flex items-center justify-center"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Static View Lock HUD Pill Indicator */}
      {isViewLocked && (
        <div className="absolute top-16 left-3 z-10 pointer-events-auto bg-[var(--color-command-panel)]/95 backdrop-blur-md border border-[var(--color-amber-alert)] px-2.5 py-1 shadow-lg flex items-center gap-1.5 text-[10px] font-[var(--font-mono)] text-[var(--color-amber-alert)]">
          <Lock className="w-3 h-3" />
          <span className="font-bold tracking-wider uppercase">STATIC VIEW LOCKED</span>
        </div>
      )}

      {/* Calibration HUD Tool Panel */}
      {isCalibrating && (
        <div className="absolute top-28 left-3 z-20 pointer-events-auto bg-[var(--color-command-panel)]/95 backdrop-blur-md border border-amber-500 p-3 shadow-2xl max-w-sm text-xs font-[var(--font-mono)] text-slate-200">
          <div className="flex justify-between items-center border-b border-[var(--color-command-border)] pb-1.5 mb-2">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Crosshair className="w-3.5 h-3.5" /> ROOFTOP CALIBRATION
            </span>
            <span className="text-[10px] text-slate-400">{calibrationPoints.length} points</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
            Click rooftop corners on the satellite map to record vertices:
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1 mb-2 bg-[#0a0e17] p-2 border border-[var(--color-command-border)] text-[10px]">
            {calibrationPoints.length === 0 ? (
              <span className="text-slate-500 italic">Click on map to add points...</span>
            ) : (
              calibrationPoints.map((pt, i) => (
                <div key={i} className="flex justify-between text-slate-300">
                  <span>P{i + 1}: {pt.lat}, {pt.lng}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyPoints}
              disabled={calibrationPoints.length === 0}
              className="flex-1 px-2 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/60 hover:bg-amber-500/30 flex items-center justify-center gap-1 text-[10px] disabled:opacity-50"
            >
              {copiedNotification ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedNotification ? 'COPIED JSON!' : 'COPY POLYGON'}
            </button>
            <button
              onClick={() => setCalibrationPoints([])}
              className="px-2 py-1 bg-red-500/20 text-red-300 border border-red-500/60 hover:bg-red-500/30 flex items-center justify-center text-[10px]"
              title="Clear Points"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Campus Building Legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-auto bg-[var(--color-command-panel)]/90 backdrop-blur-md border border-[var(--color-command-border)] p-3 shadow-xl max-w-xs hidden sm:block">
        <div className="text-[10px] font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)] border-b border-[var(--color-command-border)] pb-1 mb-2 flex justify-between">
          <span>Campus Footprints</span>
          <span>6 Buildings</span>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-[var(--font-mono)] text-[11px]">
          {CAMPUS_BUILDINGS.map(b => (
            <div
              key={b.id}
              onClick={() => {
                setSelectedBuilding(b.name);
                if (onSelectBuilding) {
                  onSelectBuilding(b.id, b.name);
                }
                if (!isViewLockedRef.current && mapRef.current) {
                  fitBuildingBounds(b);
                }
              }}
              className="flex items-center space-x-1.5 cursor-pointer hover:text-white text-slate-300 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-none flex-shrink-0" style={{ backgroundColor: b.color }}></span>
              <span className="truncate" title={b.name}>{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Status Legend */}
      <div className="absolute bottom-4 right-4 z-10 pointer-events-auto bg-[var(--color-command-panel)]/90 backdrop-blur-md border border-[var(--color-command-border)] p-2.5 shadow-xl flex items-center space-x-4 font-[var(--font-mono)] text-xs">
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-1.5"></span>
          <span className="text-slate-200">Nominal</span>
        </div>
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full mr-1.5"></span>
          <span className="text-slate-200">Attention</span>
        </div>
        <div className="flex items-center">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5"></span>
          <span className="text-slate-200">Emergency</span>
        </div>
      </div>
    </div>
  );
};
