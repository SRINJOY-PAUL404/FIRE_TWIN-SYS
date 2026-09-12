import React, { useState } from 'react';
import { useBuildings } from '../../hooks/useBuildings';
import { Plus, Trash, AlertCircle } from 'lucide-react';

export const BuildingsTab = () => {
  const { items, loading, actionLoading, error, create, remove } = useBuildings();
  const [newBuilding, setNewBuilding] = useState({ name: '', description: '', blocks: '' });

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading buildings...</div>;

  const handleCreate = async () => {
    if (!newBuilding.name) return;
    const blocksList = newBuilding.blocks.split(',').map(b => b.trim()).filter(b => b);
    const success = await create({ name: newBuilding.name, description: newBuilding.description, blocks: blocksList });
    if (success) {
      setNewBuilding({ name: '', description: '', blocks: '' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/50 flex items-center text-red-400 text-xs font-[var(--font-mono)] mb-4">
                <AlertCircle className="w-3 h-3 mr-2" /> {error}
            </div>
        )}
        <div className="bg-[#0F1218] p-4 border border-[var(--color-command-border)] space-y-4">
          <h3 className="text-sm font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)]">ADD_BUILDING</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="text" placeholder="Name (e.g. Science Block)" value={newBuilding.name} onChange={e => setNewBuilding({...newBuilding, name: e.target.value})} className="px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
            <input type="text" placeholder="Description" value={newBuilding.description} onChange={e => setNewBuilding({...newBuilding, description: e.target.value})} className="px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
            <input type="text" placeholder="Blocks (comma separated)" value={newBuilding.blocks} onChange={e => setNewBuilding({...newBuilding, blocks: e.target.value})} className="px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <button onClick={handleCreate} disabled={actionLoading === 'create' || !newBuilding.name} className="flex items-center px-4 py-2 bg-[var(--color-command-bg)] border border-[var(--color-steel-blue)] text-[var(--color-steel-blue)] hover:border-[#E2E8F0] hover:text-[#E2E8F0] disabled:opacity-50 font-[var(--font-nav)] text-sm uppercase tracking-widest transition-colors rounded-none">
            <Plus className={`w-4 h-4 mr-2 ${actionLoading === 'create' ? 'animate-spin' : ''}`} /> ADD
          </button>
        </div>

        <div className="border border-[var(--color-command-border)]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--color-command-bg)] border-b border-[var(--color-command-border)]">
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">ID</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">NAME</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">DESCRIPTION</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">BLOCKS</th>
                <th className="p-3 text-xs font-[var(--font-nav)] tracking-widest uppercase text-[var(--color-steel-blue)]">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-[var(--color-command-border)] bg-[#12151C] hover:bg-[var(--color-command-bg)]">
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[#E2E8F0]">{item.id}</td>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[#E2E8F0]">{item.name}</td>
                  <td className="p-3 text-sm font-[var(--font-body)] text-[var(--color-steel-blue)]">{item.description}</td>
                  <td className="p-3 text-sm font-[var(--font-mono)] text-[var(--color-steel-blue)]">{item.blocks?.join(', ') || 'NONE'}</td>
                  <td className="p-3">
                    <button onClick={() => remove(item.id)} disabled={actionLoading === item.id} className="text-red-400 hover:text-red-300 disabled:opacity-50 p-1">
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm font-[var(--font-mono)] text-[var(--color-steel-blue)]">NO_BUILDINGS_FOUND</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
