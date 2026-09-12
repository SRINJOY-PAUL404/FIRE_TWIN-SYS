import React, { useEffect, useState, useCallback } from 'react';
import { getExtinguishers, getMaintenanceLogs, runAIInspect, completeMaintenance, generateFixPlan } from '../api';
import type { Extinguisher, MaintenanceLog } from '../types';
import { Wrench, BrainCircuit, CheckCircle, Clock, User, FileText, AlertTriangle, Search, Hammer, DollarSign, ListChecks, Package, Minimize2, Maximize2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds into a human-readable duration string. */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (hrs < 24) return remainMins > 0 ? `${hrs}h ${remainMins}m` : `${hrs}h`;
  const days = Math.floor(hrs / 24);
  const remainHrs = hrs % 24;
  return remainHrs > 0 ? `${days}d ${remainHrs}h` : `${days}d`;
}

/** Build a pre-filled fix notes string from a fix plan. */
function buildFixNotesFromPlan(plan: MaintenanceLog['fix_plan']): string {
  if (!plan) return '';

  const lines: string[] = [];

  lines.push(`PROBLEM: ${plan.problem_summary}`);
  lines.push('');
  lines.push('SOLUTION PERFORMED:');
  plan.solution_steps.forEach((step, i) => {
    lines.push(`${i + 1}. ${step}`);
  });
  lines.push('');
  lines.push('MATERIALS USED:');
  plan.materials.forEach(m => {
    lines.push(`- ${m.name} x${m.quantity} — ₹${(m.unit_cost * m.quantity).toLocaleString()}`);
  });
  lines.push('');
  lines.push(`TOTAL COST: ₹${plan.estimated_cost.toLocaleString()}`);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Fault Analysis section — shown after AI inspect completes. */
const FaultAnalysis: React.FC<{ log: MaintenanceLog }> = ({ log }) => {
  if (!log.fault_description) return null;

  return (
    <div className="border-t border-[#1A1A1A]/10 pt-4 mt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#C97A5B] flex items-center gap-1.5">
        <BrainCircuit className="w-3.5 h-3.5" />
        Fault Analysis
      </p>
      <p className="text-sm text-[#1A1A1A]/80 leading-relaxed">
        {log.fault_description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Root Cause</p>
          <p className="text-sm font-semibold text-[#1A1A1A]">{log.root_cause}</p>
        </div>
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Confidence</p>
          <p className="text-lg font-bold text-[#1A1A1A] font-[var(--font-mono)]">
            {((log.confidence ?? 0) * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

/** Fix Plan Display — shown after the FIX button generates a plan. */
const FixPlanDisplay: React.FC<{ plan: MaintenanceLog['fix_plan'] }> = ({ plan }) => {
  if (!plan) return null;

  return (
    <div className="border-t border-[#1A1A1A]/10 pt-4 mt-4 space-y-4">
      {/* Header */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#2563EB] flex items-center gap-1.5">
        <Hammer className="w-3.5 h-3.5" />
        Fix Plan
      </p>

      {/* Problem Summary */}
      <div className="border border-[#2563EB]/20 bg-[#2563EB]/5 p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]/70 mb-1">Problem</p>
        <p className="text-sm text-[#1A1A1A]/80 leading-relaxed">{plan.problem_summary}</p>
      </div>

      {/* Solution Steps */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-2 flex items-center gap-1">
          <ListChecks className="w-3 h-3" />
          Solution Steps
        </p>
        <ol className="list-none space-y-1.5 pl-0">
          {plan.solution_steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#1A1A1A]/80">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#1A1A1A]/10 flex items-center justify-center text-[10px] font-bold text-[#1A1A1A]/60 mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Materials Table */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-2 flex items-center gap-1">
          <Package className="w-3 h-3" />
          Materials Required
        </p>
        <div className="border border-[#1A1A1A]/15 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F5F1E8]">
                <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">Material</th>
                <th className="text-center py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">Qty</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">Unit Cost</th>
                <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {plan.materials.map((m, i) => (
                <tr key={i} className="border-t border-[#1A1A1A]/10">
                  <td className="py-2 px-3 text-[#1A1A1A]/80">{m.name}</td>
                  <td className="py-2 px-3 text-center text-[#1A1A1A]/60 font-[var(--font-mono)]">{m.quantity}</td>
                  <td className="py-2 px-3 text-right text-[#1A1A1A]/60 font-[var(--font-mono)]">₹{m.unit_cost.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-[#1A1A1A] font-[var(--font-mono)] font-semibold">₹{(m.unit_cost * m.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost & Time Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1 flex items-center gap-1">
            <DollarSign className="w-3 h-3" />
            Estimated Cost
          </p>
          <p className="text-lg font-bold text-[#1A1A1A] font-[var(--font-mono)]">
            ₹{plan.estimated_cost.toLocaleString()}
          </p>
        </div>
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Estimated Time
          </p>
          <p className="text-lg font-bold text-[#1A1A1A] font-[var(--font-mono)]">
            {plan.estimated_time_minutes} min
          </p>
        </div>
      </div>
    </div>
  );
};

/** Fix Applied section — shown once a technician has completed the work. */
const FixApplied: React.FC<{ log: MaintenanceLog }> = ({ log }) => {
  if (log.status !== 'Completed' || !log.fix_notes) return null;

  return (
    <div className="border-t border-[#1A1A1A]/10 pt-4 mt-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F6B4F] flex items-center gap-1.5">
        <CheckCircle className="w-3.5 h-3.5" />
        Fix Applied
      </p>
      <pre className="text-sm text-[#1A1A1A]/80 leading-relaxed whitespace-pre-wrap font-[var(--font-body)]">
        {log.fix_notes}
      </pre>
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Time to Fix</p>
          <p className="text-lg font-bold text-[#1A1A1A] font-[var(--font-mono)]">
            {log.time_to_fix != null ? formatDuration(log.time_to_fix) : '—'}
          </p>
        </div>
        <div className="border border-[#1A1A1A]/15 p-3 bg-[#F5F1E8]/60">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A]/50 mb-1">Technician</p>
          <p className="text-sm font-semibold text-[#1A1A1A]">
            {log.technician_name ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Maintenance Page
// ---------------------------------------------------------------------------

type TabKey = 'Pending' | 'Completed';

const Maintenance = () => {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [extinguisherMap, setExtinguisherMap] = useState<Record<number, Extinguisher>>({});
  const [activeTab, setActiveTab] = useState<TabKey>('Pending');
  const [inspectingId, setInspectingId] = useState<number | null>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [fixPlanLoadingId, setFixPlanLoadingId] = useState<number | null>(null);
  const [fixFormOpenFor, setFixFormOpenFor] = useState<number | null>(null);
  const [fixNotesText, setFixNotesText] = useState('');
  const [loading, setLoading] = useState(true);
  const [minimizedLogs, setMinimizedLogs] = useState<Set<number>>(new Set());

  const toggleMinimize = (id: number) => {
    setMinimizedLogs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- Data fetching ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, extsData] = await Promise.all([
        getMaintenanceLogs(),
        getExtinguishers(),
      ]);
      setLogs(logsData);
      const map: Record<number, Extinguisher> = {};
      for (const ext of extsData) map[ext.id] = ext;
      setExtinguisherMap(map);
    } catch (err) {
      console.error('Failed to fetch maintenance data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Filtered lists ----
  const filteredLogs = logs.filter(l => l.status === activeTab);

  // ---- Handlers ----
  const handleInspect = async (logId: number) => {
    setInspectingId(logId);
    try {
      const result = await runAIInspect(logId);
      // Merge result into local state to avoid full reload
      setLogs(prev => prev.map(l =>
        l.id === logId
          ? { ...l, fault_description: result.fault_description, root_cause: result.root_cause, confidence: result.confidence }
          : l
      ));
    } catch (err) {
      console.error('AI inspect failed', err);
    } finally {
      setInspectingId(null);
    }
  };

  const handleGenerateFixPlan = async (logId: number) => {
    setFixPlanLoadingId(logId);
    try {
      const result = await generateFixPlan(logId);
      // Merge fix_plan and inspection analysis into local state
      setLogs(prev => prev.map(l =>
        l.id === logId
          ? { 
              ...l, 
              fault_description: (result as any).fault_description || l.fault_description,
              root_cause: (result as any).root_cause || l.root_cause,
              confidence: (result as any).confidence || l.confidence,
              fix_plan: result.fix_plan 
            }
          : l
      ));
    } catch (err) {
      console.error('Generate fix plan failed', err);
    } finally {
      setFixPlanLoadingId(null);
    }
  };

  const handleOpenFixForm = (logId: number) => {
    setFixFormOpenFor(logId);
    // Auto-fill fix notes from fix plan if available
    const log = logs.find(l => l.id === logId);
    if (log?.fix_plan) {
      setFixNotesText(buildFixNotesFromPlan(log.fix_plan));
    } else {
      setFixNotesText('');
    }
  };

  const handleSubmitFix = async (logId: number) => {
    if (!fixNotesText.trim()) return;
    setCompletingId(logId);
    try {
      await completeMaintenance(logId, fixNotesText.trim());
      // Refetch to ensure logs and extinguisher states are fully synced
      await fetchData();
      setFixFormOpenFor(null);
      setFixNotesText('');
    } catch (err) {
      console.error('Complete maintenance failed', err);
    } finally {
      setCompletingId(null);
    }
  };

  const handleCancelFix = () => {
    setFixFormOpenFor(null);
    setFixNotesText('');
  };

  // ---- Counts ----
  const pendingCount = logs.filter(l => l.status === 'Pending').length;
  const completedCount = logs.filter(l => l.status === 'Completed').length;

  return (
    <div className="tech-mode h-full overflow-y-auto -m-6 p-6 font-[var(--font-body)]" style={{ backgroundColor: '#F5F1E8' }}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="border-b-2 border-black pb-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-black font-[var(--font-nav)] uppercase">Field Technician Checklist</h1>
          <p className="text-slate-600 mt-1 font-[var(--font-mono)] text-xs">WORK_ORDER_MODE: ACTIVE // AI_ASSIST: ONLINE</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border border-[#1A1A1A]">
          {(['Pending', 'Completed'] as TabKey[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors ${
                activeTab === tab
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
              }`}
            >
              {tab === 'Pending' ? `Pending (${pendingCount})` : `Recently Serviced (${completedCount})`}
            </button>
          ))}
        </div>

        {/* Log count */}
        <div className="flex items-center justify-between text-sm font-bold border-b border-slate-300 pb-2 text-slate-800">
          <span>{activeTab === 'Pending' ? 'UNITS REQUIRING SERVICE' : 'COMPLETED WORK ORDERS'}</span>
          <span>{filteredLogs.length}</span>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {filteredLogs.map(log => {
            const ext = extinguisherMap[log.extinguisher_id];
            const extId = ext?.extinguisher_id ?? `EXT-${log.extinguisher_id}`;
            const location = ext ? `LOC ID ${ext.location_id}` : '';
            const isInspected = !!log.fault_description;
            const hasFixPlan = !!log.fix_plan;
            const isFixFormOpen = fixFormOpenFor === log.id;

            return (
              <div key={log.id} className="bg-white border border-[#1A1A1A] p-5">

                {/* ── Card Header ── */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-black font-[var(--font-mono)]">{extId}</h3>
                    <p className="text-sm text-slate-600 mt-1">{location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 font-bold text-xs uppercase tracking-wider border ${
                      log.status === 'Completed'
                        ? 'bg-[#3F6B4F]/10 text-[#3F6B4F] border-[#3F6B4F]/30'
                        : 'bg-[#C97A5B]/10 text-[#C97A5B] border-[#C97A5B]/30'
                    }`}>
                      {log.status === 'Completed' ? 'SERVICED' : (ext?.status ?? 'PENDING')}
                    </div>
                    {isInspected && (
                      <button 
                        onClick={() => toggleMinimize(log.id)}
                        className="p-1.5 border border-[#1A1A1A]/20 bg-white hover:bg-[#1A1A1A]/5 transition-colors text-[#1A1A1A]/60"
                        title={minimizedLogs.has(log.id) ? "Expand details" : "Minimize details"}
                      >
                        {minimizedLogs.has(log.id) ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {!minimizedLogs.has(log.id) && (
                  <>

                {/* ── Fault Analysis (after inspect) ── */}
                <FaultAnalysis log={log} />

                {/* ── Fix Plan (after fix plan generated) ── */}
                {log.status === 'Pending' && <FixPlanDisplay plan={log.fix_plan} />}

                {/* ── Fix Applied (completed only) ── */}
                <FixApplied log={log} />

                {/* ── Fix Plan on completed cards ── */}
                {log.status === 'Completed' && log.fix_plan && (
                  <FixPlanDisplay plan={log.fix_plan} />
                )}

                {/* ── Inline Fix Form ── */}
                {isFixFormOpen && (
                  <div className="border-t border-[#1A1A1A]/10 pt-4 mt-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]/60 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Describe the fix applied
                    </p>
                    <textarea
                      value={fixNotesText}
                      onChange={e => setFixNotesText(e.target.value)}
                      placeholder="E.g. Replaced valve O-ring, repressurised to 100%..."
                      rows={fixNotesText.split('\n').length > 5 ? Math.min(fixNotesText.split('\n').length + 2, 15) : 5}
                      className="w-full border border-[#1A1A1A]/20 bg-white p-3 text-sm text-[#1A1A1A] font-[var(--font-body)] placeholder:text-[#1A1A1A]/30 focus:outline-none focus:border-[#1A1A1A]/50 resize-vertical"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSubmitFix(log.id)}
                        disabled={!fixNotesText.trim() || completingId === log.id}
                        className="flex-1 py-2.5 px-4 border-2 border-black bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {completingId === log.id ? 'SUBMITTING...' : 'SUBMIT & CLOSE'}
                      </button>
                      <button
                        onClick={handleCancelFix}
                        className="py-2.5 px-4 border border-[#1A1A1A]/20 bg-white text-[#1A1A1A]/60 font-bold text-sm uppercase tracking-widest hover:bg-[#1A1A1A]/5 transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Action Buttons (Pending only) ── */}
                {log.status === 'Pending' && !isFixFormOpen && (
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t border-[#1A1A1A]/10">
                    <button
                      onClick={() => handleInspect(log.id)}
                      disabled={inspectingId === log.id || isInspected}
                      className={`flex-1 py-3 px-4 border-2 font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50 ${
                        isInspected
                          ? 'border-[#3F6B4F]/40 bg-[#3F6B4F]/10 text-[#3F6B4F] cursor-default'
                          : 'border-[#3F6B4F] bg-[#3F6B4F] text-white hover:bg-[#2d4d38]'
                      }`}
                    >
                      {inspectingId === log.id ? 'INSPECTING...' : isInspected ? '✓ INSPECTED' : 'RUN AI INSPECT'}
                    </button>
                    <button
                      onClick={() => handleGenerateFixPlan(log.id)}
                      disabled={fixPlanLoadingId === log.id || hasFixPlan}
                      className={`flex-1 py-3 px-4 border-2 font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-50 ${
                        hasFixPlan
                          ? 'border-[#2563EB]/40 bg-[#2563EB]/10 text-[#2563EB] cursor-default'
                          : 'border-[#2563EB] bg-[#2563EB] text-white hover:bg-[#1d4ed8]'
                      }`}
                    >
                      {fixPlanLoadingId === log.id ? 'GENERATING...' : hasFixPlan ? '✓ FIX PLAN READY' : 'FIX'}
                    </button>
                    <button
                      onClick={() => handleOpenFixForm(log.id)}
                      className="flex-1 py-3 px-4 border-2 border-black bg-black text-white font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-colors"
                    >
                      MARK SERVICED
                    </button>
                  </div>
                )}
                </>
                )}
              </div>
            );
          })}

          {/* Empty state */}
          {!loading && filteredLogs.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-slate-300">
              {activeTab === 'Pending' ? (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto text-[#3F6B4F] mb-3" />
                  <p className="text-lg font-bold text-slate-800">ALL UNITS NOMINAL</p>
                  <p className="text-slate-500 font-[var(--font-mono)] text-xs mt-2">NO ACTION REQUIRED</p>
                </>
              ) : (
                <>
                  <Clock className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-lg font-bold text-slate-800">NO COMPLETED WORK ORDERS</p>
                  <p className="text-slate-500 font-[var(--font-mono)] text-xs mt-2">COMPLETED RECORDS WILL APPEAR HERE</p>
                </>
              )}
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div className="bg-white border border-[#1A1A1A] p-6 flex items-center justify-center space-x-4">
              <div className="w-6 h-6 border-2 border-black border-t-transparent animate-spin"></div>
              <span className="font-[var(--font-mono)] font-bold text-sm text-black">LOADING WORK ORDERS...</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Maintenance;
