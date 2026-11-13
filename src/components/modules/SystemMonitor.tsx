import React from 'react';
import { Activity, Battery, Cpu, HardDrive, Laptop, MemoryStick } from 'lucide-react';
import { SystemMetrics } from '../../types';

interface SystemMonitorProps {
  metrics: SystemMetrics | null;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({ metrics }) => {
  const readings = [
    { label: 'Processor', value: metrics?.cpu, icon: Cpu },
    { label: 'Memory', value: metrics?.ram, icon: MemoryStick },
    { label: 'Storage', value: metrics?.disk, icon: HardDrive },
    { label: 'Battery', value: metrics?.battery, icon: Battery },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4" />
          <span>System Health</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800">Live hardware readings</h2>
        <p className="text-xs text-slate-500">
          Values are sampled from this device by the local Python system-monitoring backend.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {readings.map(({ label, value, icon: Icon }) => {
          const available = typeof value === 'number' && Number.isFinite(value);
          return (
            <article key={label} className="neu-flat p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">{label}</span>
                <Icon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-800">
                {available ? `${value.toFixed(1)}%` : 'Unavailable'}
              </div>
              <div className="h-2 rounded-full neu-inset overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: available ? `${Math.min(100, Math.max(0, value))}%` : '0%' }}
                />
              </div>
              {label === 'Memory' && metrics?.ram_used && metrics.ram_total && (
                <p className="text-[11px] text-slate-500">{metrics.ram_used} of {metrics.ram_total} in use</p>
              )}
              {label === 'Battery' && metrics !== null && metrics.battery == null && (
                <p className="text-[11px] text-slate-500">No battery reading reported by this device.</p>
              )}
              {label === 'Battery' && metrics?.battery != null && (
                <p className="text-[11px] text-slate-500">{metrics.charging ? 'Charging' : 'Not charging'}</p>
              )}
            </article>
          );
        })}
      </div>

      <section className="neu-flat p-5 rounded-3xl space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <Laptop className="w-4 h-4 text-blue-600" />
          Device details
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div><dt className="text-slate-400">Operating system</dt><dd className="font-semibold text-slate-700">{metrics?.os ?? 'Unavailable'}</dd></div>
          <div><dt className="text-slate-400">Device</dt><dd className="font-semibold text-slate-700">{metrics?.host ?? 'Unavailable'}</dd></div>
          <div><dt className="text-slate-400">Python runtime</dt><dd className="font-semibold text-slate-700">{metrics?.python ?? 'Unavailable'}</dd></div>
          <div><dt className="text-slate-400">Last sample</dt><dd className="font-semibold text-slate-700">{metrics?.sampled_at ? new Date(metrics.sampled_at).toLocaleTimeString() : 'Waiting for backend'}</dd></div>
        </dl>
      </section>
    </div>
  );
};
