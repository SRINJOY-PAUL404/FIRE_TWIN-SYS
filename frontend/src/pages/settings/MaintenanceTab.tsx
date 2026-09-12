import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Save, AlertCircle } from 'lucide-react';

export const MaintenanceTab = () => {
  const { data, loading, saving, error, lastSaved, save, setData } = useSettings('maintenance', {
    inspection_interval_days: 365,
    low_pressure_threshold: 40,
    low_battery_threshold: 20
  });

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading maintenance rules...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">INSPECTION_INTERVAL (DAYS)</label>
            <input type="number" value={data.inspection_interval_days} onChange={e => setData({...data, inspection_interval_days: Number(e.target.value)})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">LOW_PRESSURE_THRESHOLD (%)</label>
            <input type="number" value={data.low_pressure_threshold} onChange={e => setData({...data, low_pressure_threshold: Number(e.target.value)})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">LOW_BATTERY_THRESHOLD (%)</label>
            <input type="number" value={data.low_battery_threshold} onChange={e => setData({...data, low_battery_threshold: Number(e.target.value)})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
        </div>
        {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 flex flex-col gap-1">
                {error.map((err, i) => (
                    <div key={i} className="flex items-center text-red-400 text-xs font-[var(--font-mono)]">
                        <AlertCircle className="w-3 h-3 mr-2" />
                        {err.field ? `${err.field}: ` : ''}{err.message}
                    </div>
                ))}
            </div>
        )}
      </div>
      <div className="p-4 border-t border-[var(--color-command-border)] bg-[var(--color-command-bg)] flex justify-between items-center">
        <div className="text-xs text-[var(--color-steel-blue)] font-[var(--font-mono)]">
            {lastSaved && `LAST SAVED: ${lastSaved.toLocaleTimeString()}`}
        </div>
        <button onClick={() => save(data)} disabled={saving} className="flex items-center px-4 py-2 border border-[var(--color-steel-blue)] text-[var(--color-steel-blue)] hover:border-[#E2E8F0] hover:text-[#E2E8F0] disabled:opacity-50 font-[var(--font-nav)] text-sm uppercase tracking-widest transition-colors rounded-none">
          <Save className={`w-4 h-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          {saving ? 'COMMITTING...' : 'Commit Changes'}
        </button>
      </div>
    </div>
  );
};
