import React from 'react';
import { useSettings } from '../../hooks/useSettings';
import { Save, AlertCircle, Wifi } from 'lucide-react';

export const IoTTab = () => {
  const { data, loading, saving, error, lastSaved, save, setData } = useSettings('iot_mqtt', {
    broker_host: 'mqtt.firetwin.edu',
    broker_port: 1883,
    topic_prefix: 'firetwin/sensors'
  });

  if (loading) return <div className="p-6 text-[var(--color-steel-blue)] font-[var(--font-mono)] text-sm animate-pulse">Loading IoT config...</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">BROKER_HOST</label>
            <input type="text" value={data.broker_host} onChange={e => setData({...data, broker_host: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">BROKER_PORT</label>
            <input type="number" value={data.broker_port} onChange={e => setData({...data, broker_port: Number(e.target.value)})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
          <div>
            <label className="block text-xs font-[var(--font-mono)] text-[var(--color-steel-blue)] mb-1">TOPIC_PREFIX</label>
            <input type="text" value={data.topic_prefix} onChange={e => setData({...data, topic_prefix: e.target.value})} className="w-full px-3 py-2 border border-[var(--color-command-border)] rounded-none bg-[var(--color-command-bg)] text-[#E2E8F0] font-[var(--font-mono)] text-sm focus:outline-none focus:border-[var(--color-amber-alert)]" />
          </div>
        </div>

        <div className="mt-8">
            <h3 className="text-sm font-[var(--font-nav)] uppercase tracking-widest text-[var(--color-steel-blue)] mb-4">LIVE_SENSOR_STATUS</h3>
            <div className="bg-[#0F1218] border border-[var(--color-command-border)] p-4 flex items-center justify-between">
                <div>
                    <div className="text-[#E2E8F0] font-[var(--font-mono)] text-sm flex items-center">
                        <Wifi className="w-4 h-4 mr-2 text-[var(--color-amber-alert)]" />
                        MQTT_CONNECTION: ACTIVE
                    </div>
                    <div className="text-[var(--color-steel-blue)] text-xs font-[var(--font-mono)] mt-1">
                        LAST_MESSAGE: {new Date().toLocaleTimeString()} (simulated)
                    </div>
                </div>
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
