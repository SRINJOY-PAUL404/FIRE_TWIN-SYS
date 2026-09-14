import React, { useState } from 'react';
import { useResourceList } from '../../hooks/useResourceList';
import { Trash, AlertCircle, Key, Copy, Check } from 'lucide-react';
import { api } from '../../api';

interface ApiKey {
  id: number;
  name: string;
  masked_key: string;
  is_active: boolean;
  created_at: string;
  full_key?: string;
}

export const ApiKeysTab = () => {
  const { items, loading, actionLoading, error, remove, refetch } = useResourceList<ApiKey>('api-keys');
  const [newKeyName, setNewKeyName] = useState('');
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading API keys...</div>;

  const handleCreate = async () => {
    if (!newKeyName) return;
    setLastCreatedKey(null);
    setCopied(false);
    
    try {
        const response = await api.post('/api-keys/', { name: newKeyName });
        setLastCreatedKey(response.data.full_key);
        setNewKeyName('');
        refetch();
    } catch(err) {
        console.error(err);
    }
  };

  const copyToClipboard = () => {
      if (lastCreatedKey) {
          navigator.clipboard.writeText(lastCreatedKey);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 flex items-center text-red-400 text-xs font-[var(--font-mono)] mb-4">
                <AlertCircle className="w-3 h-3 mr-2" /> {error}
            </div>
        )}
        
        {lastCreatedKey && (
            <div className="bg-[#12151C] border border-[var(--color-amber-alert)] p-4 mb-6">
                <h4 className="text-[var(--color-amber-alert)] text-sm font-[var(--font-nav)] uppercase tracking-widest mb-2">NEW_API_KEY_GENERATED</h4>
                <p className="text-[var(--color-steel-blue)] text-xs mb-4">Please copy this key now. You will not be able to see it again.</p>
                <div className="flex items-center space-x-2">
                    <code className="bg-[#0F1218] border border-[var(--color-command-border)] px-4 py-2 text-[#E2E8F0] font-[var(--font-mono)] text-sm flex-1">{lastCreatedKey}</code>
                    <button onClick={copyToClipboard} className="p-2 border border-[var(--color-command-border)] bg-[var(--color-command-bg)] text-[#E2E8F0] hover:border-[var(--color-steel-blue)]">
                        {copied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        )}

        <div className="bg-[#0F1218] p-4 border border-[var(--color-command-border)] space-y-4">
          <h3 className="text-sm font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)]">GENERATE_NEW_KEY</h3>
          <div className="flex space-x-4">
            <input type="text" placeholder="Key Name (e.g. Mobile App Integration)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="flex-1 px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
            <button onClick={handleCreate} disabled={!newKeyName} className="flex items-center px-4 py-2 bg-[var(--color-command-bg)] border border-[var(--color-steel-blue)] text-[var(--color-steel-blue)] hover:border-[#E2E8F0] hover:text-[#E2E8F0] disabled:opacity-50 font-[var(--font-nav)] text-sm uppercase tracking-widest transition-colors rounded-none">
            <Key className="w-4 h-4 mr-2" /> GENERATE
            </button>
          </div>
        </div>

        <div className="border border-[var(--color-command-border)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-command-bg)] border-b border-[var(--color-command-border)]">
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">NAME</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">KEY</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">CREATED</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">STATUS</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className={`border-b border-[var(--color-command-border)] ${!item.is_active ? 'opacity-50' : ''} bg-[#12151C] hover:bg-[var(--color-command-bg)]`}>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[#E2E8F0]">{item.name}</td>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[var(--color-steel-blue)]">{item.masked_key}</td>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[#E2E8F0]">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[var(--color-amber-alert)]">{item.is_active ? 'ACTIVE' : 'REVOKED'}</td>
                  <td className="p-3">
                    <button onClick={() => remove(item.id)} disabled={actionLoading === item.id || !item.is_active} className="text-red-400 hover:text-red-300 disabled:opacity-50 p-1">
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
