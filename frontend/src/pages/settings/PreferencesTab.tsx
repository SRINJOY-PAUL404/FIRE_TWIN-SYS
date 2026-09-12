import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Save, AlertCircle } from 'lucide-react';

export const PreferencesTab = () => {
  const { data, loading, saving, error, lastSaved, save, setData } = useSettings('preferences', {
    theme: 'dark',
    default_view: 'DASHBOARD',
    pressure_units: 'psi'
  });

  React.useEffect(() => {
    if (data && data.theme) {
      if (data.theme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
      }
    }
  }, [data.theme]);

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading preferences...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-command-border)]">
            <div>
            <p className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">THEME</p>
            <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-body)]">UI color palette mode.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                <select value={data.theme} onChange={e => setData({...data, theme: e.target.value})} className="px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]">
                    <option value="dark">DARK</option>
                    <option value="light">LIGHT</option>
                </select>
                {error?.find(e => e.field === 'theme') && (
                    <div className="text-red-400 text-xs font-[var(--font-mono)] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {error.find(e => e.field === 'theme')?.message}
                    </div>
                )}
            </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-command-border)]">
            <div>
            <p className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">DEFAULT_VIEW</p>
            <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-body)]">System entry point upon authentication.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                <select value={data.default_view} onChange={e => setData({...data, default_view: e.target.value})} className="px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]">
                    <option value="DASHBOARD">DASHBOARD</option>
                    <option value="BLUEPRINT">BLUEPRINT</option>
                    <option value="INVENTORY">INVENTORY</option>
                </select>
                {error?.find(e => e.field === 'default_view') && (
                    <div className="text-red-400 text-xs font-[var(--font-mono)] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {error.find(e => e.field === 'default_view')?.message}
                    </div>
                )}
            </div>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-command-border)]">
            <div>
            <p className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">PRESSURE_UNITS</p>
            <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-body)]">Measurement unit for pressure readings.</p>
            </div>
            <div className="flex flex-col items-end gap-1">
                <select value={data.pressure_units} onChange={e => setData({...data, pressure_units: e.target.value})} className="px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]">
                    <option value="psi">PSI</option>
                    <option value="bar">BAR</option>
                </select>
                {error?.find(e => e.field === 'pressure_units' || e.field === 'pressureUnits') && (
                    <div className="text-red-400 text-xs font-[var(--font-mono)] flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {error.find(e => e.field === 'pressure_units' || e.field === 'pressureUnits')?.message}
                    </div>
                )}
            </div>
        </div>
        {error && error.filter(e => e.type !== 'validation').length > 0 && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 flex flex-col gap-2">
                {error.filter(e => e.type !== 'validation').map((err, i) => (
                    <div key={i} className="flex items-center justify-between text-red-400 text-xs font-[var(--font-mono)]">
                        <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {err.message}
                        </div>
                        {err.type === 'auth' ? (
                            <button onClick={() => window.location.href = '/login'} className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 transition-colors uppercase tracking-wider">
                                Log In
                            </button>
                        ) : (
                            <button onClick={() => save(data)} disabled={saving} className="px-3 py-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 transition-colors uppercase tracking-wider disabled:opacity-50">
                                Retry
                            </button>
                        )}
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
