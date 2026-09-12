import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Save, AlertCircle } from 'lucide-react';

export const ProfileTab = () => {
  const { data, loading, saving, error, lastSaved, save, setData } = useSettings('profile', {
    operator_name: 'System Admin',
    contact_email: 'admin@firetwin.edu',
    access_level: 'CMD_ADMIN'
  });

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading profile...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">OPERATOR_NAME</label>
            <input type="text" value={data.operator_name} onChange={e => setData({...data, operator_name: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">CONTACT_URI</label>
            <input type="email" value={data.contact_email} onChange={e => setData({...data, contact_email: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">ACCESS_LEVEL</label>
            <input type="text" value={data.access_level} disabled className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[#0F1218] text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm cursor-not-allowed opacity-70" />
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
