import React from 'react';
import { X } from 'lucide-react';
import type { ExtinguisherUnit3D, Building3D } from './useCampusData';

interface CampusHUDProps {
  buildings: Building3D[];
  units: ExtinguisherUnit3D[];
  selectedUnit: ExtinguisherUnit3D | null;
  selectedBuildingId: string | null;
  selectedFloor: number | null;
  onSelectUnit: (unit: ExtinguisherUnit3D | null) => void;
  onSelectBuilding: (id: string | null) => void;
  onSelectFloor: (floor: number | null) => void;
  locations?: any[];
}

export const CampusHUD: React.FC<CampusHUDProps> = ({
  buildings,
  units,
  selectedUnit,
  selectedBuildingId,
  selectedFloor,
  onSelectUnit,
  onSelectBuilding,
  onSelectFloor,
}) => {
  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  const okCnt = units.filter(u => u.status === 'ok').length;
  const warnCnt = units.filter(u => u.status === 'warn').length;
  const critCnt = units.filter(u => u.status === 'crit').length;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between overflow-hidden">
      
      {/* LEFT PANEL: Overview */}
      <div className="absolute top-4 left-4 w-72 pointer-events-none flex flex-col gap-4">
        <div 
          className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-4 flex flex-col gap-4 transition-opacity duration-300 pointer-events-auto"
          style={{ opacity: selectedBuildingId ? 0 : 1, pointerEvents: selectedBuildingId ? 'none' : 'auto' }}
        >
          <h2 className="text-sm font-bold tracking-widest uppercase font-[var(--font-nav)] text-[#E2E8F0] border-b border-[var(--color-command-border)] pb-2">
            Campus Overview
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="border border-[var(--color-command-border)] p-2 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Total Units</div>
                <div className="font-[var(--font-mono)] text-xl text-[#E2E8F0]">{units.length}</div>
             </div>
             <div className="border border-[var(--color-command-border)] p-2 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Buildings</div>
                <div className="font-[var(--font-mono)] text-xl text-[#E2E8F0]">{buildings.length}</div>
             </div>
          </div>
          
          <div className="space-y-2 font-[var(--font-mono)] text-xs">
            <div className="flex justify-between items-center border border-[var(--color-command-border)] p-2 bg-[var(--color-command-bg)]">
              <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-success-teal)] mr-2"></span> NOMINAL</div>
              <span className="text-[#E2E8F0]">{okCnt}</span>
            </div>
            <div className="flex justify-between items-center border border-[var(--color-command-border)] p-2 bg-[var(--color-command-bg)]">
              <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-amber-alert)] mr-2"></span> ATTENTION</div>
              <span className="text-[var(--color-amber-alert)]">{warnCnt}</span>
            </div>
            <div className="flex justify-between items-center border border-[var(--color-command-border)] p-2 bg-[var(--color-command-bg)]">
              <div className="flex items-center"><span className="w-2 h-2 rounded-none bg-[var(--color-red-critical)] mr-2"></span> CRITICAL</div>
              <span className="text-[var(--color-red-critical)]">{critCnt}</span>
            </div>
          </div>
        </div>
        
        {/* Floor Filter */}
        {selectedBuilding && (
          <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-4 flex flex-col gap-3 animate-in fade-in pointer-events-auto">
            <div className="flex justify-between items-center border-b border-[var(--color-command-border)] pb-2">
              <h2 className="text-sm font-bold tracking-widest uppercase font-[var(--font-nav)] text-[#E2E8F0]">
                {selectedBuilding.name}
              </h2>
              <button onClick={() => { onSelectBuilding(null); onSelectFloor(null); }} className="text-[var(--color-steel-blue)] hover:text-[#E2E8F0]">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase">
              Filter by Floor
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => onSelectFloor(null)} 
                className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-widest transition-colors border border-[var(--color-command-border)] ${selectedFloor === null ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0]' : 'bg-[var(--color-command-bg)] text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
              >
                All
              </button>
              {[...Array(selectedBuilding.floors)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => onSelectFloor(i)} 
                  className={`px-3 py-1 text-xs font-[var(--font-nav)] uppercase tracking-widest transition-colors border border-[var(--color-command-border)] ${selectedFloor === i ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0]' : 'bg-[var(--color-command-bg)] text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
                >
                  {i === 0 ? 'G' : `Fl ${i}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Inspector */}
      {selectedUnit && (
        <div className="absolute top-4 right-4 w-[340px] pointer-events-auto bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col animate-in slide-in-from-right-8 max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="p-4 border-b border-[var(--color-command-border)] flex justify-between items-start bg-[var(--color-command-bg)]">
            <div>
              <h2 className="font-[var(--font-mono)] text-lg text-[#E2E8F0] font-bold">{selectedUnit.raw.extinguisher_id}</h2>
              <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1">SN: {selectedUnit.raw.serial_number}</div>
            </div>
            <button onClick={() => onSelectUnit(null)} className="text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 space-y-6">
            {/* Status */}
            <div className="flex items-center space-x-3">
              <span className={`w-3 h-3 rounded-none ${
                  selectedUnit.status === 'ok' ? 'bg-[var(--color-success-teal)]' : 
                  selectedUnit.status === 'warn' ? 'bg-[var(--color-amber-alert)] animate-pulse' : 
                  'bg-[var(--color-red-critical)]'
                }`}></span>
              <span className="font-[var(--font-mono)] text-sm uppercase text-[#E2E8F0] font-bold">
                {selectedUnit.raw.status}
              </span>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Type / Cap</div>
                <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">{selectedUnit.raw.type}</div>
                <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-0.5">{selectedUnit.raw.capacity}</div>
              </div>
              <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Pressure</div>
                <div className={`font-[var(--font-mono)] text-xl font-bold ${selectedUnit.pressure < 50 ? 'text-[var(--color-red-critical)]' : 'text-[#E2E8F0]'}`}>
                  {selectedUnit.pressure.toFixed(1)}%
                </div>
              </div>
              <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">AI Confidence</div>
                <div className="font-[var(--font-mono)] text-xl font-bold text-[#E2E8F0]">
                  {selectedUnit.confidence}%
                </div>
              </div>
              <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Device ID</div>
                <div className="font-[var(--font-mono)] text-xs text-[#E2E8F0] break-all">{selectedUnit.raw.esp32_device_id}</div>
              </div>
            </div>

            {/* Location Block */}
            <div>
              <div className="font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase mb-2">Location Data</div>
              <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">Building {selectedBuilding?.name || 'Unknown'}</div>
                <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1">
                  Floor {selectedUnit.floor} <br/>
                  Room {selectedUnit.raw.room || 'N/A'}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div className="font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase mb-4">Lifecycle Events</div>
              <div className="relative border-l border-[var(--color-command-border)] ml-2 pl-4 space-y-6">
                <div className="relative">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-steel-blue)]"></span>
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase">Installed</div>
                  <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                    {selectedUnit.raw.installation_date ? new Date(selectedUnit.raw.installation_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                
                {selectedUnit.raw.last_inspection_date && (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-steel-blue)]"></span>
                    <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase">Last Inspected</div>
                    <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                      {new Date(selectedUnit.raw.last_inspection_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {selectedUnit.raw.next_inspection_date && (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-amber-alert)]"></span>
                    <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-amber-alert)] uppercase">Next Inspection</div>
                    <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                      {new Date(selectedUnit.raw.next_inspection_date).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="relative">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-red-critical)]"></span>
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-red-critical)] uppercase">Expiry</div>
                  <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                    {selectedUnit.raw.expiry_date ? new Date(selectedUnit.raw.expiry_date).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RIGHT PANEL: Building/Floor Inventory */}
      {!selectedUnit && selectedBuildingId && (
        <div className="absolute top-4 right-4 w-[340px] pointer-events-auto bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col animate-in slide-in-from-right-8 max-h-[calc(100vh-120px)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-command-border)] flex justify-between items-start bg-[var(--color-command-bg)]">
            <div>
              <h2 className="font-[var(--font-mono)] text-lg text-[#E2E8F0] font-bold">
                {selectedFloor === null ? 'ALL FLOORS' : selectedFloor === 0 ? 'GROUND FLOOR' : `FLOOR ${selectedFloor}`}
              </h2>
              <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1">
                {selectedBuilding?.name}
              </div>
            </div>
            <button onClick={() => { onSelectBuilding(null); onSelectFloor(null); }} className="text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-y-auto p-4 space-y-3">
            {units
              .filter(u => u.buildingId === selectedBuildingId && (selectedFloor === null || u.floor === selectedFloor))
              .map(u => (
              <div 
                key={u.id}
                className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)] hover:border-[var(--color-steel-blue)] cursor-pointer transition-colors"
                onClick={() => onSelectUnit(u)}
              >
                <div className="flex justify-between items-start mb-2">
                   <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] font-bold">{u.id}</div>
                   <div className="flex items-center space-x-2">
                     <span className={`w-2 h-2 rounded-none ${
                        u.status === 'ok' ? 'bg-[var(--color-success-teal)]' : 
                        u.status === 'warn' ? 'bg-[var(--color-amber-alert)] animate-pulse' : 
                        'bg-[var(--color-red-critical)]'
                      }`}></span>
                   </div>
                </div>
                <div className="flex justify-between text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)]">
                  <span>{u.raw.type} ({u.raw.capacity})</span>
                  <span>{u.pressure.toFixed(1)}%</span>
                </div>
              </div>
            ))}
            
            {units.filter(u => u.buildingId === selectedBuildingId && (selectedFloor === null || u.floor === selectedFloor)).length === 0 && (
              <div className="text-center font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] py-4">
                No units found for this selection.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
