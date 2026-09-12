import React, { useEffect, useState } from 'react';
import { getExtinguishers, createExtinguisher, getLocations, updateExtinguisher } from '../api';
import type { Extinguisher, Location } from '../types';
import { Search, Filter, X, Plus, Archive, LayoutGrid } from 'lucide-react';

const Extinguishers = () => {
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [selectedExtinguisher, setSelectedExtinguisher] = useState<Extinguisher | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'ACTIVE' | 'STORAGE'>('ACTIVE');
  
  const [newExt, setNewExt] = useState({
      extinguisher_id: '',
      serial_number: '',
      location_id: '',
      room: '',
      type: 'CO2',
      capacity: '5kg',
      esp32_device_id: ''
  });

  useEffect(() => {
    getExtinguishers().then(data => setExtinguishers(data)).catch(console.error);
    getLocations().then(data => setLocations(data)).catch(console.error);
  }, []);

  const handleAddSubmit = async () => {
      try {
          const loc = locations.find(l => l.id.toString() === newExt.location_id);
          const lifecycle_state = loc?.location_type === 'STORAGE' ? 'IN_STORAGE' : 'ACTIVE';
          
          const created = await createExtinguisher({
              ...newExt,
              location_id: parseInt(newExt.location_id),
              installation_date: new Date().toISOString(),
              expiry_date: new Date(Date.now() + 365*24*60*60*1000).toISOString(),
              status: 'Healthy',
              lifecycle_state,
              pressure: 100,
              battery: 100
          });
          setExtinguishers([...extinguishers, created]);
          setShowAddForm(false);
      } catch (err: any) {
          console.error(err);
          alert(err.response?.data?.detail || "Failed to create extinguisher");
      }
  };

  const activeUnitsList = extinguishers.filter(e => e.lifecycle_state === 'ACTIVE');
  const storageUnitsList = extinguishers.filter(e => e.lifecycle_state === 'IN_STORAGE');

  const filteredData = extinguishers.filter(ext => {
    const matchesSearch = ext.extinguisher_id.toLowerCase().includes(search.toLowerCase()) ||
                          ext.type.toLowerCase().includes(search.toLowerCase()) ||
                          ext.status.toLowerCase().includes(search.toLowerCase()) ||
                          (ext.room && ext.room.toLowerCase().includes(search.toLowerCase()));
    
    const matchesView = viewMode === 'STORAGE' ? ext.lifecycle_state === 'IN_STORAGE' : ext.lifecycle_state === 'ACTIVE';
    
    return matchesSearch && matchesView;
  });

  const getLocationName = (locId: number | null) => {
      if (!locId) return 'Central Storage Depot';
      const loc = locations.find(l => l.id === locId);
      return loc ? loc.name : 'Unknown Location';
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-[var(--color-command-panel)] border border-[var(--color-command-border)] px-4 py-2">
        <div className="flex items-center space-x-4">
            <h1 className="text-lg font-bold tracking-widest uppercase font-[var(--font-nav)] text-[#E2E8F0]">Inventory</h1>
            <div className="flex border border-[var(--color-command-border)] rounded-none overflow-hidden">
                <button 
                    onClick={() => setViewMode('ACTIVE')} 
                    className={`flex items-center px-3 py-1 font-[var(--font-nav)] uppercase tracking-wider text-xs transition-colors ${viewMode === 'ACTIVE' ? 'bg-[var(--color-steel-blue)]/20 text-[#E2E8F0] border-b-2 border-b-[var(--color-success-teal)]' : 'bg-[var(--color-command-bg)] text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
                >
                    <LayoutGrid className="w-3.5 h-3.5 mr-2 text-[var(--color-success-teal)]" />
                    Active Units <span className="ml-2 font-[var(--font-mono)] px-1.5 py-0.2 bg-[var(--color-command-panel)] text-[var(--color-success-teal)] text-[11px] font-bold">{activeUnitsList.length}</span>
                </button>
                <button 
                    onClick={() => setViewMode('STORAGE')} 
                    className={`flex items-center px-3 py-1 font-[var(--font-nav)] uppercase tracking-wider text-xs transition-colors border-l border-[var(--color-command-border)] ${viewMode === 'STORAGE' ? 'bg-[var(--color-amber-alert)]/10 text-[var(--color-amber-alert)] border-b-2 border-b-[var(--color-amber-alert)]' : 'bg-[var(--color-command-bg)] text-[var(--color-steel-blue)] hover:text-[#E2E8F0]'}`}
                >
                    <Archive className="w-3.5 h-3.5 mr-2 text-[var(--color-amber-alert)]" />
                    Storage Pool <span className="ml-2 font-[var(--font-mono)] px-1.5 py-0.2 bg-[var(--color-command-panel)] text-[var(--color-amber-alert)] text-[11px] font-bold">{storageUnitsList.length}</span>
                </button>
            </div>
        </div>
        
        <div className="flex space-x-3 w-full sm:w-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3 w-3 text-[var(--color-steel-blue)]" />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-64 pl-8 pr-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] placeholder-[var(--color-steel-blue)] focus:outline-none focus:border-[var(--color-amber-alert)] font-[var(--font-mono)] text-xs"
            />
          </div>
          <button className="flex items-center px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[var(--color-steel-blue)] hover:text-[#E2E8F0] font-[var(--font-nav)] uppercase tracking-wider text-sm transition-colors">
            <Filter className="h-3 w-3 mr-2" />
            Filter
          </button>
          <button onClick={() => { setSelectedExtinguisher(null); setShowAddForm(true); }} className="flex items-center px-3 py-1 border border-[var(--color-amber-alert)] rounded-none bg-[var(--color-amber-alert)]/10 text-[var(--color-amber-alert)] hover:bg-[var(--color-amber-alert)] hover:text-[#0F1218] font-[var(--font-nav)] uppercase tracking-wider text-sm transition-colors">
            <Plus className="h-3 w-3 mr-2" />
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row space-x-4 pb-8">
        {/* Main Table Area */}
        <div className={`flex-1 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] overflow-hidden flex flex-col transition-opacity duration-300 ${selectedExtinguisher ? 'opacity-80' : 'opacity-100'}`}>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--color-command-bg)] sticky top-0 z-10 border-b border-[var(--color-command-border)]">
                <tr>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal">ID / Serial</th>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal">Type / Cap</th>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal">Location</th>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal text-right">Pressure</th>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal text-right">Battery</th>
                  <th className="px-4 py-2 font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-command-border)]">
                {filteredData.map((ext) => (
                  <tr 
                    key={ext.id} 
                    onClick={() => setSelectedExtinguisher(ext)}
                    className={`cursor-pointer transition-colors group ${selectedExtinguisher?.id === ext.id ? 'bg-[var(--color-steel-blue)]/20 border-l-2 border-l-[var(--color-amber-alert)]' : 'hover:bg-[var(--color-command-bg)]'}`}
                  >
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">{ext.extinguisher_id}</div>
                      <div className="font-[var(--font-mono)] text-[10px] text-[var(--color-steel-blue)]">{ext.serial_number}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">{ext.type}</div>
                      <div className="font-[var(--font-mono)] text-[10px] text-[var(--color-steel-blue)]">{ext.capacity}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">{getLocationName(ext.location_id)}</div>
                      <div className="font-[var(--font-mono)] text-[10px] text-[var(--color-steel-blue)]">Rm {ext.room || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <div className={`font-[var(--font-mono)] text-sm ${ext.pressure < 50 ? 'text-[var(--color-red-critical)]' : 'text-[#E2E8F0]'}`}>
                        {ext.pressure.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right font-[var(--font-mono)] text-sm text-[#E2E8F0]">
                      {ext.battery.toFixed(1)}%
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex flex-col gap-1 font-[var(--font-mono)] text-xs text-[#E2E8F0]">
                        <div className="flex items-center">
                          <span className={`w-2 h-2 rounded-none mr-2 ${
                            ext.status === 'Healthy' ? 'bg-[var(--color-success-teal)]' : 
                            ext.status === 'Low Pressure' ? 'bg-[var(--color-amber-alert)] animate-pulse' : 
                            'bg-[var(--color-red-critical)]'
                          }`}></span>
                          {ext.status.toUpperCase()}
                        </div>
                        {ext.lifecycle_state === 'IN_STORAGE' && (
                          <span className="text-[10px] text-[var(--color-amber-alert)] font-mono bg-[var(--color-amber-alert)]/10 px-1.5 py-0.5 w-fit border border-[var(--color-amber-alert)]/30 font-bold">
                            SPARE / IN STORAGE
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm">
                      NO_RECORDS_FOUND
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sliding Details Panel */}
        {selectedExtinguisher && (
          <div className="w-[340px] shrink-0 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-[var(--color-command-border)] flex justify-between items-start bg-[var(--color-command-bg)]">
              <div>
                <h2 className="font-[var(--font-mono)] text-lg text-[#E2E8F0] font-bold">{selectedExtinguisher.extinguisher_id}</h2>
                <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1">SN: {selectedExtinguisher.serial_number}</div>
              </div>
              <button onClick={() => setSelectedExtinguisher(null)} className="text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Status */}
              <div className="flex items-center space-x-3">
                <span className={`w-3 h-3 rounded-none ${
                    selectedExtinguisher.status === 'Healthy' ? 'bg-[var(--color-success-teal)]' : 
                    selectedExtinguisher.status === 'Low Pressure' ? 'bg-[var(--color-amber-alert)] animate-pulse' : 
                    'bg-[var(--color-red-critical)]'
                  }`}></span>
                <span className="font-[var(--font-mono)] text-sm uppercase text-[#E2E8F0] font-bold">
                  {selectedExtinguisher.status}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Type / Cap</div>
                  <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">{selectedExtinguisher.type}</div>
                  <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-0.5">{selectedExtinguisher.capacity}</div>
                </div>
                <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Pressure</div>
                  <div className={`font-[var(--font-mono)] text-xl font-bold ${selectedExtinguisher.pressure < 50 ? 'text-[var(--color-red-critical)]' : 'text-[#E2E8F0]'}`}>
                    {selectedExtinguisher.pressure.toFixed(1)}%
                  </div>
                </div>
                <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Battery</div>
                  <div className={`font-[var(--font-mono)] text-xl font-bold ${selectedExtinguisher.battery < 20 ? 'text-[var(--color-amber-alert)]' : 'text-[#E2E8F0]'}`}>
                    {selectedExtinguisher.battery.toFixed(1)}%
                  </div>
                </div>
                <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                  <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase mb-1">Device ID</div>
                  <div className="font-[var(--font-mono)] text-xs text-[#E2E8F0] break-all">{selectedExtinguisher.esp32_device_id}</div>
                </div>
              </div>

              {/* Location Block */}
              <div>
                <div className="font-[var(--font-nav)] text-xs tracking-widest text-[var(--color-steel-blue)] uppercase mb-2">Location Data</div>
                <div className="border border-[var(--color-command-border)] p-3 bg-[var(--color-command-bg)]">
                  <div className="font-[var(--font-body)] text-sm text-[#E2E8F0]">Location: {getLocationName(selectedExtinguisher.location_id)}</div>
                  <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1">
                    Room {selectedExtinguisher.room || 'N/A'} <br/>
                    Lifecycle: {selectedExtinguisher.lifecycle_state}
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
                      {new Date(selectedExtinguisher.installation_date).toLocaleDateString()}
                    </div>
                  </div>
                  
                  {selectedExtinguisher.last_inspection_date && (
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-steel-blue)]"></span>
                      <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase">Last Inspected</div>
                      <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                        {new Date(selectedExtinguisher.last_inspection_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  {selectedExtinguisher.next_inspection_date && (
                    <div className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-amber-alert)]"></span>
                      <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-amber-alert)] uppercase">Next Inspection</div>
                      <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                        {new Date(selectedExtinguisher.next_inspection_date).toLocaleDateString()}
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 bg-[var(--color-red-critical)]"></span>
                    <div className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-red-critical)] uppercase">Expiry</div>
                    <div className="font-[var(--font-mono)] text-sm text-[#E2E8F0] mt-0.5">
                      {new Date(selectedExtinguisher.expiry_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Add Form Panel */}
        {showAddForm && (
          <div className="w-[340px] shrink-0 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col overflow-y-auto">
            <div className="p-4 border-b border-[var(--color-command-border)] flex justify-between items-start bg-[var(--color-command-bg)]">
              <div>
                <h2 className="font-[var(--font-mono)] text-lg text-[#E2E8F0] font-bold">ADD_EXTINGUISHER</h2>
              </div>
              <button onClick={() => setShowAddForm(false)} className="text-[var(--color-steel-blue)] hover:text-[#E2E8F0] transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">ID</label>
                <input type="text" value={newExt.extinguisher_id} onChange={e => setNewExt({...newExt, extinguisher_id: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
              </div>
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">SERIAL NUMBER</label>
                <input type="text" value={newExt.serial_number} onChange={e => setNewExt({...newExt, serial_number: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
              </div>
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">LOCATION</label>
                <select value={newExt.location_id} onChange={e => setNewExt({...newExt, location_id: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]">
                  <option value="">Select Location</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.location_type})</option>
                  ))}
                </select>
              </div>
              <div>
                  <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">ROOM (Optional)</label>
                  <input type="text" value={newExt.room} onChange={e => setNewExt({...newExt, room: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
              </div>
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">TYPE</label>
                <select value={newExt.type} onChange={e => setNewExt({...newExt, type: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]">
                  <option value="CO2">CO2</option>
                  <option value="Water">Water</option>
                  <option value="Dry Chemical">Dry Chemical</option>
                  <option value="Foam">Foam</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">CAPACITY</label>
                <input type="text" value={newExt.capacity} onChange={e => setNewExt({...newExt, capacity: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
              </div>
              <div>
                <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">DEVICE ID (ESP32)</label>
                <input type="text" value={newExt.esp32_device_id} onChange={e => setNewExt({...newExt, esp32_device_id: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
              </div>
              <div className="pt-4">
                  <button onClick={handleAddSubmit} disabled={!newExt.extinguisher_id || !newExt.location_id || !newExt.esp32_device_id} className="w-full flex items-center justify-center px-4 py-2 border border-[var(--color-amber-alert)] text-[#0F1218] bg-[var(--color-amber-alert)] hover:bg-[var(--color-amber-alert)]/90 disabled:opacity-50 font-[var(--font-nav)] text-sm uppercase tracking-widest transition-colors rounded-none">
                    Save Extinguisher
                  </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Extinguishers;
