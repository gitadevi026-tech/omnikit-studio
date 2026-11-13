import React, { useState } from 'react';
import {
  Activity,
  Wifi
} from 'lucide-react';

interface NetworkDiagnosticProps {
  onStatusChange: (msg: string) => void;
}

export const NetworkDiagnostic: React.FC<NetworkDiagnosticProps> = ({ onStatusChange }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [status, setStatus] = useState<'ready' | 'connected' | 'offline'>('ready');
  const [pingMs, setPingMs] = useState<number | null>(null);

  const checkConnection = async () => {
    setIsRunning(true);
    onStatusChange('Measuring connection to 1.1.1.1 through the local system backend...');
    try {
      const api = window.pywebview?.api;
      if (!api) throw new Error('The local desktop backend is unavailable.');
      const result = await api.network_test('1.1.1.1');
      setPingMs(result.latency_ms);
      setStatus('connected');
      onStatusChange(`Connection to ${result.host} completed in ${result.latency_ms} ms.`);
    } catch (error) {
      setPingMs(null);
      setStatus('offline');
      onStatusChange(error instanceof Error ? `Network check failed: ${error.message}` : 'Network check failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Activity className="w-4 h-4" />
          <span>Neumorphic Network Diagnostic</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Internet & Latency Diagnostic Tool
        </h2>
        <p className="text-xs text-slate-500">
          Asynchronous round-trip latency probe with soft telemetry widgets.
        </p>
      </div>

      {/* Main Status Card */}
      <div className="neu-flat p-8 rounded-3xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl neu-flat flex items-center justify-center text-blue-600 shrink-0">
              <Wifi className="w-8 h-8" />
            </div>

            <div>
              <div className="text-lg font-bold text-slate-800">
                {status === 'connected' ? 'Connected to Internet' : status === 'offline' ? 'Connection unavailable' : 'Ready to Check Latency'}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {status === 'connected' && pingMs !== null
                  ? `Measured response time: ${pingMs} ms.`
                  : status === 'offline'
                    ? 'The network request failed. Check your connection and try again.'
                    : 'Click below to measure the connection.'}
              </p>
            </div>
          </div>

          <button
            onClick={checkConnection}
            disabled={isRunning}
            className="neu-blue-pill px-8 py-3.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-lg shrink-0 disabled:opacity-50"
          >
            <Activity className="w-4 h-4" />
            <span>{isRunning ? 'Measuring Ping...' : 'Check Connection Now'}</span>
          </button>
        </div>

        {/* Telemetry Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="neu-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Gateway Latency</span>
            <span className="font-mono font-bold text-blue-600">{pingMs === null ? '—' : `${pingMs} ms`}</span>
          </div>

          <div className="neu-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Network State</span>
            <span className={`font-bold flex items-center gap-1 ${status === 'connected' ? 'text-emerald-600' : status === 'offline' ? 'text-rose-500' : 'text-slate-500'}`}>
              <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : status === 'offline' ? 'bg-rose-500' : 'bg-slate-400'}`} />
              {status === 'connected' ? 'Online' : status === 'offline' ? 'Offline' : 'Not checked'}
            </span>
          </div>

          <div className="neu-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Packet Loss</span>
            <span className="font-mono font-bold text-slate-700">Not measured</span>
          </div>
        </div>
      </div>
    </div>
  );
};
