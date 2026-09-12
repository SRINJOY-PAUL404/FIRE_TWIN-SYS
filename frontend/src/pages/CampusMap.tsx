import React, { useEffect, useState } from 'react';
import { getExtinguishers, getLocations } from '../api';
import type { Extinguisher } from '../types';
import { MapboxCampusMap } from '../components/MapboxCampusMap';
import { Campus3DView } from '../components/campus3d/Campus3DView';
import { BlueprintView } from '../components/BlueprintView';

const CampusMap = () => {
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [viewMode, setViewMode] = useState<'2D' | 'Blueprint' | '3D'>('2D');
  const [emergencyExtinguisherId, setEmergencyExtinguisherId] = useState<number | null>(null);
  const [selectedBuildingInfo, setSelectedBuildingInfo] = useState<{id: string, name: string} | null>(null);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    getExtinguishers().then(data => setExtinguishers(data)).catch(console.error);
    getLocations().then(data => setLocations(data)).catch(console.error);

    const wsUrl = `ws://${window.location.hostname || 'localhost'}:8000/ws`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE' || data.type === 'EMERGENCY') {
          setExtinguishers(prev => prev.map(ex => 
            ex.id === data.extinguisher_id 
              ? { ...ex, pressure: data.pressure, battery: data.battery, status: data.status }
              : ex
          ));
          if (data.type === 'EMERGENCY') {
            setEmergencyExtinguisherId(data.extinguisher_id);
          }
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };
    return () => ws.close();
  }, []);

  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  const handleSelectBuilding = React.useCallback((id: string | null, name: string | null) => {
    if (id && name) {
      setSelectedBuildingInfo({ id, name });
    } else {
      setSelectedBuildingInfo(null);
    }
  }, []);

  return (
    <div className="blueprint-mode h-full flex flex-col space-y-4" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex justify-between items-center bg-[var(--color-command-panel)] border border-[var(--color-command-border)] px-4 py-2">
        <h1 className="text-lg font-bold tracking-widest uppercase font-[var(--font-nav)] text-[#E2E8F0]">
          {selectedBuildingInfo ? `${selectedBuildingInfo.name} — ${selectedFloor !== null ? (selectedFloor === 0 ? 'Ground Floor' : `Floor ${selectedFloor}`) : 'Floor Breakdown'}` : 'Architectural Blueprint'}
        </h1>
        <div className="flex items-center space-x-4">
          {selectedBuildingInfo && (
            <button 
              onClick={() => { setSelectedBuildingInfo(null); setSelectedFloor(null); }} 
              className="px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-widest bg-[var(--color-steel-blue)]/20 text-[#E2E8F0] border border-[var(--color-command-border)] hover:bg-[var(--color-steel-blue)]/40 transition-colors"
            >
              ← Back to Campus
            </button>
          )}
          <div className="flex bg-[var(--color-command-bg)] border border-[var(--color-command-border)]">
            <button 
              onClick={() => { setViewMode('2D'); }}
              className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors ${viewMode === '2D' ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0]' : 'text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
            >
              2D Map (Mapbox)
            </button>
            <button 
              onClick={() => setViewMode('Blueprint')}
              className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors border-l border-[var(--color-command-border)] ${viewMode === 'Blueprint' ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0]' : 'text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
            >
              Blueprint
            </button>
            <button 
              onClick={() => setViewMode('3D')}
              className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-wider transition-colors border-l border-[var(--color-command-border)] ${viewMode === '3D' ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0]' : 'text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
            >
              3D Campus
            </button>
          </div>
          <div className="hidden sm:flex space-x-4 text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] items-center px-4 py-1 border border-[var(--color-command-border)] bg-[var(--color-command-bg)]">
            <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-success-teal)] mr-2"></span> NOMINAL</div>
            <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-amber-alert)] mr-2"></span> ATTENTION</div>
            <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-red-critical)] mr-2"></span> CRITICAL</div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] overflow-hidden relative z-0">
        {viewMode === '2D' ? (
          <MapboxCampusMap 
            extinguishers={extinguishers} 
            locations={locations} 
            emergencyExtinguisherId={emergencyExtinguisherId}
            selectedBuildingId={selectedBuildingInfo?.id || null}
            onSelectBuilding={handleSelectBuilding}
          />
        ) : viewMode === 'Blueprint' ? (
          <BlueprintView 
            extinguishers={extinguishers} 
            locations={locations} 
            selectedBuildingId={selectedBuildingInfo?.id || null}
            selectedFloor={selectedFloor}
            onSelectBuilding={handleSelectBuilding}
            onSelectFloor={(floor) => setSelectedFloor(floor)}
          />
        ) : (
          <Campus3DView 
            extinguishers={extinguishers}
            locations={locations}
            selectedBuildingId={selectedBuildingInfo?.id || null}
            selectedFloor={selectedFloor}
            onSelectBuilding={handleSelectBuilding}
            onSelectFloor={(floor) => setSelectedFloor(floor)}
          />
        )}
      </div>
    </div>
  );
};

export default CampusMap;
