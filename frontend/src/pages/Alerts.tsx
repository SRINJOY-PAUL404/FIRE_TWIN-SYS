import React, { useEffect, useState } from 'react';
import { getExtinguishers, performMaintenance } from '../api';
import type { Extinguisher } from '../types';
import { ShieldAlert, Search, Check, Wrench, Clock } from 'lucide-react';

const CircularGauge = ({ value, color }: { value: number, color: string }) => {
  const radius = 42;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Ensure value stays within 0-100 bounds for the visual
  const boundedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (boundedValue / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: radius * 2, height: radius * 2 }}>
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90 absolute">
        <circle
          stroke="#242B3D"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute font-[var(--font-mono)] font-bold text-lg text-[#F0F6FC]">
        {Math.round(value)}<span className="text-xs text-[#8B949E]">%</span>
      </div>
    </div>
  );
};

const Alerts = () => {
  const [alerts, setAlerts] = useState<Extinguisher[]>([]);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'Critical' | 'Warning'>('All');
  
  // Mock local state for dispatched and acknowledged
  const [dispatchedIds, setDispatchedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [errorIds, setErrorIds] = useState<Record<number, string>>({});

  const fetchAlerts = () => {
    getExtinguishers().then(data => {
      setAlerts(data.filter(e => e.pressure < 40.0));
    }).catch(console.error);
  };

  useEffect(() => {
    fetchAlerts();

    // WebSocket connection for real-time updates
    const ws = new WebSocket('ws://localhost:8000/ws');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'UPDATE' || data.type === 'EMERGENCY') {
          setAlerts(prev => {
            const exists = prev.find(ex => ex.id === data.extinguisher_id);
            // If pressure is normal again, remove from list
            if (data.pressure >= 40.0) {
              return prev.filter(ex => ex.id !== data.extinguisher_id);
            }
            // Update existing
            if (exists) {
              return prev.map(ex => 
                ex.id === data.extinguisher_id 
                  ? { ...ex, pressure: data.pressure, status: data.status }
                  : ex
              );
            } else {
              // It's a new alert; refetch to get location metadata etc.
              setTimeout(fetchAlerts, 100);
              return prev;
            }
          });
        }
      } catch (e) {
        console.error('Error parsing WS message', e);
      }
    };
    return () => ws.close();
  }, []);

  const handleAck = async (id: number) => {
    setLoadingIds(prev => new Set(prev).add(id));
    setErrorIds(prev => { const n = {...prev}; delete n[id]; return n; });
    try {
      // Optimistic API call - we use performMaintenance to mark it healthy/100%
      await performMaintenance(id);
      
      // Update local state to immediately remove it
      setAlerts(prev => prev.filter(a => a.id !== id));
      setDispatchedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      setErrorIds(prev => ({ ...prev, [id]: 'Action failed' }));
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleDispatch = (id: number) => {
    setDispatchedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleAckAllWarnings = async () => {
    const warnings = alerts.filter(a => a.pressure >= 25 && a.pressure < 40 && !dispatchedIds.has(a.id));
    for (const w of warnings) {
      await handleAck(w.id);
    }
  };

  const criticalCount = alerts.filter(a => a.pressure < 25).length;
  const warningCount = alerts.filter(a => a.pressure >= 25 && a.pressure < 40).length;
  const dispatchedCount = dispatchedIds.size;

  const displayAlerts = alerts
    .filter(a => {
      if (severityFilter === 'Critical') return a.pressure < 25;
      if (severityFilter === 'Warning') return a.pressure >= 25 && a.pressure < 40;
      return true;
    })
    .filter(a => 
      a.extinguisher_id.toLowerCase().includes(search.toLowerCase()) ||
      (a.block || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.pressure - b.pressure);

  // Use a custom style object for the parent to ensure dark theme bleed
  return (
    <div className="h-full flex flex-col space-y-5 overflow-y-auto w-full font-[var(--font-body)] p-1 pb-10" style={{ backgroundColor: '#0D1117' }}>
      
      {/* 1. TOP KPI METRIC HEADER ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical Emergencies */}
        <div className="bg-[#161B26] border border-[#FF453A]/40 rounded-xl p-5 shadow-[0_0_15px_rgba(255,69,58,0.1)] flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF453A]" />
            Critical Emergencies
          </div>
          <div className="text-4xl font-[var(--font-mono)] font-bold text-[#F0F6FC]">{criticalCount}</div>
        </div>

        {/* Low Pressure Warnings */}
        <div className="bg-[#161B26] border border-[#FF9F0A]/40 rounded-xl p-5 shadow-[0_0_15px_rgba(255,159,10,0.05)] flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#FF9F0A]" />
            Low Pressure Warnings
          </div>
          <div className="text-4xl font-[var(--font-mono)] font-bold text-[#F0F6FC]">{warningCount}</div>
        </div>

        {/* Techs Dispatched */}
        <div className="bg-[#161B26] border border-[#242B3D] rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-[#4FD1E0]" />
            Techs Dispatched
          </div>
          <div className="text-4xl font-[var(--font-mono)] font-bold text-[#F0F6FC]">{dispatchedCount}</div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-[#161B26] border border-[#242B3D] rounded-xl p-5 flex flex-col justify-between">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#8B949E] mb-3 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8B949E]" />
            Avg Response Time
          </div>
          <div className="text-4xl font-[var(--font-mono)] font-bold text-[#F0F6FC]">4.2<span className="text-base text-[#8B949E] ml-1">min</span></div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER CONTROLS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#161B26] border border-[#242B3D] rounded-xl p-3">
        <div className="flex items-center gap-1 p-1 bg-[#0D1117] rounded-lg border border-[#242B3D]">
          {(['All', 'Critical', 'Warning'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSeverityFilter(tab)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                severityFilter === tab
                  ? 'bg-[#242B3D] text-[#F0F6FC] shadow-sm'
                  : 'text-[#8B949E] hover:text-[#F0F6FC]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B949E]" />
            <input
              type="text"
              placeholder="Filter alerts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#0D1117] border border-[#242B3D] rounded-lg text-sm text-[#F0F6FC] placeholder-[#8B949E] focus:outline-none focus:border-[#4FD1E0]"
            />
          </div>
          <button 
            onClick={handleAckAllWarnings}
            className="shrink-0 px-4 py-1.5 bg-[#FF9F0A]/10 border border-[#FF9F0A]/30 text-[#FF9F0A] hover:bg-[#FF9F0A]/20 hover:text-[#FF9F0A] text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors"
          >
            ACK ALL WARNINGS
          </button>
        </div>
      </div>

      {/* 3. ALERT CARDS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayAlerts.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-[#242B3D] rounded-xl bg-[#161B26]/30">
            <Check className="w-8 h-8 text-[#4FD1E0] mx-auto mb-3 opacity-50" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#F0F6FC]">No matching alerts</h3>
            <p className="text-[10px] font-[var(--font-mono)] text-[#4FD1E0] mt-2 tracking-widest">SYS_STATUS: NOMINAL</p>
          </div>
        ) : (
          displayAlerts.map(alert => {
            const isCritical = alert.pressure < 25;
            const accentColor = isCritical ? '#FF453A' : '#FF9F0A';
            const badgeClass = isCritical 
              ? 'bg-[#FF453A]/10 border-[#FF453A]/30 text-[#FF453A] shadow-[0_0_10px_rgba(255,69,58,0.15)]'
              : 'bg-[#FF9F0A]/10 border-[#FF9F0A]/30 text-[#FF9F0A]';
            const isDispatched = dispatchedIds.has(alert.id);
            const isAcknowledging = loadingIds.has(alert.id);
            const errorMsg = errorIds[alert.id];

            return (
              <div key={alert.id} className="bg-[#161B26] border border-[#242B3D] rounded-xl flex flex-col overflow-hidden shadow-sm hover:border-[#242B3D]/80 transition-colors">
                
                {/* Header */}
                <div className="flex justify-between items-center p-3 border-b border-[#242B3D] bg-[#0D1117]/30">
                  <div className={`px-2 py-0.5 border rounded text-[9px] font-bold tracking-widest uppercase ${badgeClass}`}>
                    {isCritical ? 'Emergency' : 'Low Pressure'}
                  </div>
                  <div className="text-[#8B949E] text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Just now
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex items-center justify-between flex-1">
                  <div className="flex flex-col gap-4 w-full">
                    <div className="text-xl font-bold text-[#F0F6FC] font-[var(--font-mono)] tracking-tight">
                      {alert.extinguisher_id}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-[#242B3D]/50 border border-[#242B3D] text-[#8B949E] rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Loc ID {alert.location_id}
                      </span>
                      {alert.room && (
                        <span className="px-2 py-0.5 bg-[#242B3D]/50 border border-[#242B3D] text-[#8B949E] rounded-full text-[10px] font-bold uppercase tracking-wider">
                          Rm {alert.room}
                        </span>
                      )}
                    </div>

                    {errorMsg && (
                      <div className="text-[10px] text-[#FF453A] font-bold flex items-center gap-1 mt-1 bg-[#FF453A]/10 px-2 py-1 rounded">
                        <ShieldAlert className="w-3 h-3" />
                        {errorMsg}
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 ml-4">
                    <CircularGauge value={alert.pressure} color={accentColor} />
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-[#0D1117]/50 border-t border-[#242B3D] grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleDispatch(alert.id)}
                    disabled={isDispatched || isAcknowledging}
                    className="flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all"
                    style={{ 
                      backgroundColor: isDispatched ? '#242B3D' : accentColor,
                      color: isDispatched ? '#8B949E' : '#0D1117'
                    }}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {isDispatched ? 'Dispatched' : 'Dispatch Tech'}
                  </button>
                  <button 
                    onClick={() => handleAck(alert.id)}
                    disabled={isAcknowledging}
                    className="flex items-center justify-center gap-2 py-2 border border-[#242B3D] rounded-lg text-[10px] font-bold uppercase tracking-widest text-[#8B949E] hover:text-[#F0F6FC] hover:border-[#8B949E] hover:bg-[#242B3D]/30 transition-all disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {isAcknowledging ? 'WAIT...' : 'ACK'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};

export default Alerts;
