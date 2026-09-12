import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Save, AlertCircle, Download } from 'lucide-react';

export const ExportTab = () => {
  const { data, loading, saving, error, lastSaved, save, setData } = useSettings('export', {
    default_format: 'csv',
    scheduled_export: 'none'
  });

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading export config...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-command-border)]">
            <div>
            <p className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">DEFAULT_EXPORT_FORMAT</p>
            <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-body)]">Preferred format for manual data exports.</p>
            </div>
            <select value={data.default_format} onChange={e => setData({...data, default_format: e.target.value})} className="px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]">
                <option value="csv">CSV</option>
                <option value="pdf">PDF</option>
            </select>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-[var(--color-command-border)]">
            <div>
            <p className="font-[var(--font-mono)] text-sm text-[#E2E8F0]">SCHEDULED_EXPORT</p>
            <p className="text-xs text-[var(--color-steel-blue)] font-[var(--font-body)]">Automated backup frequency.</p>
            </div>
            <select value={data.scheduled_export} onChange={e => setData({...data, scheduled_export: e.target.value})} className="px-3 py-1 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-xs focus:outline-none focus:border-[var(--color-amber-alert)]">
                <option value="none">NONE</option>
                <option value="daily">DAILY</option>
                <option value="weekly">WEEKLY</option>
            </select>
        </div>
        
        <div className="pt-8">
            <button className="flex items-center px-4 py-2 border border-[var(--color-amber-alert)] text-[var(--color-amber-alert)] hover:bg-[var(--color-amber-alert)] hover:text-[#0F1218] font-[var(--font-nav)] text-sm uppercase tracking-widest transition-colors rounded-none">
            <Download className="w-4 h-4 mr-2" /> EXECUTE_MANUAL_EXPORT
            </button>
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
