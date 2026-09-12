import React, { useEffect, useState, useRef } from 'react';
import { getExtinguishers, getLocations, getRecentTelemetry } from '../api';
import type { Extinguisher, Location } from '../types';
import { Flame, Activity, ShieldAlert, Wrench, Archive, MapPin, Radio, Wifi, WifiOff } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

const Dashboard = () => {
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [wsStatus, setWsStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('CONNECTING');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  useEffect(() => {
    // Initial data fetch
    getExtinguishers().then(data => setExtinguishers(data)).catch(console.error);
    getLocations().then(data => setLocations(data)).catch(console.error);
    getRecentTelemetry(15).then(data => {
      if (data && data.length > 0) {
        setLiveEvents(data);
      }
    }).catch(console.error);

    // WebSocket setup with resilient auto-reconnect
    const connectWs = () => {
      setWsStatus('CONNECTING');
      const wsUrl = `ws://${window.location.hostname || 'localhost'}:8000/ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'UPDATE' || data.type === 'EMERGENCY') {
            setLiveEvents(prev => {
              // Avoid duplicate reading IDs if present
              const filtered = prev.filter(e => e.reading_id !== data.reading_id && e.timestamp !== data.timestamp);
              return [data, ...filtered].slice(0, 15);
            });
            
            setExtinguishers(prev => prev.map(ex => 
              ex.id === data.extinguisher_id 
                ? { ...ex, pressure: data.pressure, battery: data.battery, status: data.status }
                : ex
            ));
          }
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      ws.onclose = () => {
        setWsStatus('DISCONNECTED');
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        ws.close();
      };
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const total = extinguishers.length;
  const activeExts = extinguishers.filter(e => e.lifecycle_state === 'ACTIVE');
  const storageExts = extinguishers.filter(e => e.lifecycle_state === 'IN_STORAGE');
  const healthy = activeExts.filter(e => e.status === 'Healthy').length;
  const lowPressure = activeExts.filter(e => e.status === 'Low Pressure' || e.status === 'Emergency').length;
  const expired = activeExts.filter(e => 
    new Date(e.expiry_date) < new Date() || 
    e.status === 'Maintenance Due' || 
    e.status === 'Inspection Pending'
  ).length;

  const storageCount = storageExts.length;

  const other = activeExts.length - healthy - lowPressure - expired;

  const chartData = {
    labels: ['Healthy', 'Low Pressure', 'Expired/Maintenance', 'Other'],
    datasets: [
      {
        data: [healthy, lowPressure, expired, Math.max(0, other)],
        backgroundColor: ['#3FBF6E', '#E8A33D', '#E24C4C', '#5C7A99'],
        borderColor: '#1C1F26',
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#E2E8F0',
          font: { family: 'JetBrains Mono', size: 10 }
        }
      }
    },
    cutout: '70%',
  };
  
  const floorLocations = locations.filter(loc => loc.location_type === 'FLOOR');

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto pr-2 pb-8">
      {/* Top Console Readouts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-5 flex items-center justify-between">
          <div>
            <span className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[var(--color-steel-blue)] block mb-1">Total Units</span>
            <span className="font-[var(--font-mono)] text-3xl text-[#E2E8F0] font-bold">{total}</span>
          </div>
          <Flame className="w-8 h-8 text-[var(--color-steel-blue)] opacity-50" />
        </div>
        <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-5 flex items-center justify-between">
          <div>
            <span className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[var(--color-steel-blue)] block mb-1">Online</span>
            <span className="font-[var(--font-mono)] text-3xl text-[var(--color-success-teal)] font-bold">{healthy}</span>
          </div>
          <Activity className="w-8 h-8 text-[var(--color-success-teal)] opacity-50" />
        </div>
        <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-5 flex items-center justify-between">
          <div>
            <span className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[var(--color-steel-blue)] block mb-1">Needs Attention</span>
            <span className="font-[var(--font-mono)] text-3xl text-[var(--color-amber-alert)] font-bold">{lowPressure}</span>
          </div>
          <ShieldAlert className="w-8 h-8 text-[var(--color-amber-alert)] opacity-50" />
        </div>
        <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] p-5 flex items-center justify-between">
          <div>
            <span className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[var(--color-steel-blue)] block mb-1">Critical/Expired</span>
            <span className="font-[var(--font-mono)] text-3xl text-[var(--color-red-critical)] font-bold">{expired}</span>
          </div>
          <Wrench className="w-8 h-8 text-[var(--color-red-critical)] opacity-50" />
        </div>
        
        <div className="bg-[var(--color-command-panel)] border border-[var(--color-amber-alert)] p-5 flex items-center justify-between shadow-[0_0_10px_rgba(232,163,61,0.1)]">
          <div>
            <span className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[var(--color-amber-alert)] block mb-1">Storage Pool</span>
            <span className={`font-[var(--font-mono)] text-3xl font-bold ${storageCount === 0 ? 'text-[var(--color-red-critical)] animate-pulse' : 'text-[#E2E8F0]'}`}>{storageCount}</span>
          </div>
          <Archive className={`w-8 h-8 ${storageCount === 0 ? 'text-[var(--color-red-critical)]' : 'text-[var(--color-amber-alert)]'} opacity-50`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[400px]">
        <div className="lg:col-span-1 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-command-border)] bg-[var(--color-command-bg)]">
            <h2 className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[#E2E8F0]">System Health (Active)</h2>
          </div>
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="w-full max-w-[250px]">
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-command-border)] bg-[var(--color-command-bg)] flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-[var(--color-amber-alert)] animate-pulse" />
              <h2 className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[#E2E8F0]">Live Telemetry Feed</h2>
            </div>
            <div className="flex items-center space-x-2">
              {wsStatus === 'CONNECTED' ? (
                <>
                  <span className="w-2.5 h-2.5 bg-[var(--color-success-teal)] animate-pulse rounded-full shadow-[0_0_8px_var(--color-success-teal)]"></span>
                  <span className="text-[var(--color-success-teal)] font-[var(--font-mono)] text-xs tracking-wider">SOCKET CONNECTED (LIVE)</span>
                </>
              ) : wsStatus === 'CONNECTING' ? (
                <>
                  <span className="w-2.5 h-2.5 bg-[var(--color-amber-alert)] animate-pulse rounded-full"></span>
                  <span className="text-[var(--color-amber-alert)] font-[var(--font-mono)] text-xs tracking-wider">CONNECTING...</span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 bg-[var(--color-red-critical)] rounded-full"></span>
                  <span className="text-[var(--color-red-critical)] font-[var(--font-mono)] text-xs tracking-wider">SOCKET OFFLINE (RECONNECTING)</span>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[var(--color-command-bg)] max-h-[420px]">
            {liveEvents.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm border border-dashed border-[var(--color-command-border)] p-6">
                <Radio className="w-8 h-8 text-[var(--color-steel-blue)] mb-2 animate-pulse" />
                <span>AWAITING INCOMING TELEMETRY STREAM...</span>
              </div>
            ) : (
              liveEvents.map((ev, i) => {
                const isCrit = ev.status === 'Emergency' || (ev.pressure && ev.pressure < 28);
                const isWarn = ev.status === 'Low Pressure' || (ev.pressure && ev.pressure < 40) || ev.status === 'Maintenance Due';
                
                return (
                  <div 
                    key={`${ev.reading_id || ev.device_id}-${ev.timestamp}-${i}`} 
                    className={`flex flex-col sm:flex-row justify-between sm:items-center p-3 border transition-all duration-200 bg-[var(--color-command-panel)] ${
                      isCrit 
                        ? 'border-[var(--color-red-critical)]/60 bg-[var(--color-red-critical)]/5 shadow-[0_0_10px_rgba(226,76,76,0.1)]' 
                        : isWarn 
                        ? 'border-[var(--color-amber-alert)]/50 bg-[var(--color-amber-alert)]/5' 
                        : 'border-[var(--color-command-border)] hover:border-[var(--color-steel-blue)]'
                    }`}
                  >
                    <div className="flex flex-col mb-2 sm:mb-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-[var(--font-mono)] text-[#E2E8F0] font-bold text-sm">
                          {ev.extinguisher_code || `DEV: ${ev.device_id}`}
                        </span>
                        <span className={`text-[10px] font-[var(--font-mono)] px-1.5 py-0.5 uppercase tracking-wider ${
                          isCrit 
                            ? 'bg-[var(--color-red-critical)]/20 text-[var(--color-red-critical)] border border-[var(--color-red-critical)]/40' 
                            : isWarn 
                            ? 'bg-[var(--color-amber-alert)]/20 text-[var(--color-amber-alert)] border border-[var(--color-amber-alert)]/40' 
                            : 'bg-[var(--color-success-teal)]/20 text-[var(--color-success-teal)] border border-[var(--color-success-teal)]/40'
                        }`}>
                          {ev.status || 'Healthy'}
                        </span>
                      </div>
                      <div className="font-[var(--font-mono)] text-xs text-[var(--color-steel-blue)] mt-1 flex items-center space-x-2">
                        <span>{ev.building_name ? `${ev.building_name} (${ev.location_name || ev.room || 'Deployed'})` : `ID: ${ev.device_id}`}</span>
                        <span>•</span>
                        <span className="text-[11px] text-[var(--color-steel-blue)]/80">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-5 self-end sm:self-auto">
                      {ev.temperature !== undefined && (
                        <div className="flex flex-col text-right">
                          <span className="font-[var(--font-nav)] text-[10px] uppercase tracking-widest text-[var(--color-steel-blue)]">Temp</span>
                          <span className="font-[var(--font-mono)] text-xs text-[#CBD5E1]">
                            {typeof ev.temperature === 'number' ? ev.temperature.toFixed(1) : ev.temperature}°C
                          </span>
                        </div>
                      )}
                      <div className="flex flex-col text-right">
                        <span className="font-[var(--font-nav)] text-[10px] uppercase tracking-widest text-[var(--color-steel-blue)]">Pressure</span>
                        <span className={`font-[var(--font-mono)] text-sm font-bold ${
                          isCrit ? 'text-[var(--color-red-critical)]' : isWarn ? 'text-[var(--color-amber-alert)]' : 'text-[var(--color-success-teal)]'
                        }`}>
                          {typeof ev.pressure === 'number' ? ev.pressure.toFixed(1) : ev.pressure}%
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="font-[var(--font-nav)] text-[10px] uppercase tracking-widest text-[var(--color-steel-blue)]">Battery</span>
                        <span className={`font-[var(--font-mono)] text-sm font-bold ${
                          ev.battery < 25 ? 'text-[var(--color-red-critical)]' : 'text-[#E2E8F0]'
                        }`}>
                          {typeof ev.battery === 'number' ? ev.battery.toFixed(1) : ev.battery}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
      
      {/* Floor Capacity Overview */}
      <div className="bg-[var(--color-command-panel)] border border-[var(--color-command-border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-command-border)] bg-[var(--color-command-bg)]">
            <h2 className="font-[var(--font-nav)] text-sm tracking-widest uppercase text-[#E2E8F0]">Floor Capacity Indicators</h2>
          </div>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {floorLocations.map(loc => {
                const activeOnFloor = activeExts.filter(e => e.location_id === loc.id).length;
                const capacity = loc.capacity || 5;
                const isFull = activeOnFloor >= capacity;
                
                return (
                    <div key={loc.id} className="border border-[var(--color-command-border)] p-3 flex flex-col bg-[var(--color-command-bg)]">
                        <div className="flex items-center space-x-2 mb-2">
                            <MapPin className="w-3 h-3 text-[var(--color-steel-blue)]" />
                            <span className="font-[var(--font-mono)] text-xs text-[#E2E8F0] truncate" title={loc.name}>{loc.name}</span>
                        </div>
                        <div className="flex justify-between items-end mt-auto">
                            <span className="font-[var(--font-nav)] text-[10px] tracking-widest text-[var(--color-steel-blue)] uppercase">Active</span>
                            <span className={`font-[var(--font-mono)] text-lg font-bold ${isFull ? 'text-[var(--color-amber-alert)]' : 'text-[var(--color-success-teal)]'}`}>
                                {activeOnFloor}<span className="text-xs text-[var(--color-steel-blue)]">/{capacity}</span>
                            </span>
                        </div>
                        <div className="w-full bg-[var(--color-command-panel)] h-1 mt-2">
                            <div className={`h-full ${isFull ? 'bg-[var(--color-amber-alert)]' : 'bg-[var(--color-success-teal)]'}`} style={{ width: `${Math.min(100, (activeOnFloor/capacity)*100)}%` }}></div>
                        </div>
                    </div>
                )
            })}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
