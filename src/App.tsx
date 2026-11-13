import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { PythonCodeModal } from './components/PythonCodeModal';
import { ModuleId, SystemMetrics } from './types';
import { FileOrganizer } from './components/modules/FileOrganizer';
import { ImageCompressor } from './components/modules/ImageCompressor';
import { PasswordVault } from './components/modules/PasswordVault';
import { SystemMonitor } from './components/modules/SystemMonitor';
import { PdfTools } from './components/modules/PdfTools';
import { TextMarkdown } from './components/modules/TextMarkdown';
import { QrCodeStudio } from './components/modules/QrCodeStudio';
import { UnitConverter } from './components/modules/UnitConverter';
import { NotesTodo } from './components/modules/NotesTodo';
import { NetworkDiagnostic } from './components/modules/NetworkDiagnostic';
import {
  Download,
  FileCode,
  Share2,
  Plus,
  FolderDown,
  Sun,
  Moon
} from 'lucide-react';

import mainPyRaw from '../main.py?raw';

declare global {
  interface Window {
    pywebview?: {
      api?: {
        get_system_metrics: () => Promise<SystemMetrics>;
        pick_path: (mode: string, kind: string) => Promise<string>;
        generate_qr: (text: string, output: string, color: string) => Promise<{ message: string }>;
        network_test: (host: string) => Promise<{
          host: string;
          latency_ms: number;
          local_ip: string;
          hostname: string;
        }>;
      };
    };
  }
}

export default function App() {
  const [activeModule, setActiveModule] = useState<ModuleId>('organizer');
  const [statusMessage, setStatusMessage] = useState<string>('Welcome to OmniKit Studio. Select any tool to begin.');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let active = true;
    let requestInFlight = false;
    const refresh = async () => {
      const bridge = window.pywebview?.api;
      if (!bridge || requestInFlight) {
        if (!bridge && active) setSystemMetrics(null);
        return;
      }
      requestInFlight = true;
      try {
        const metrics = await bridge.get_system_metrics();
        if (active) setSystemMetrics(metrics);
      } catch (error) {
        if (active) {
          setSystemMetrics(null);
          setStatusMessage(error instanceof Error ? error.message : 'System metrics are unavailable.');
        }
      } finally {
        requestInFlight = false;
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 1000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleSelectModule = (id: ModuleId) => {
    setActiveModule(id);
    const names: { [key in ModuleId]: string } = {
      organizer: 'Smart File Organizer',
      compressor: 'Image Compressor & Resizer',
      vault: 'Password Safe & Vault',
      system: 'System Health & Resource Monitor',
      pdf: 'Simple PDF Tools (Merge & Split)',
      text: 'Text & Markdown Utility',
      qr: 'QR Code Studio',
      converter: 'Everyday Unit Converter',
      notes: 'To-Do List & Quick Notepad',
      network: 'Internet & Latency Tester',
    };
    setStatusMessage(`Loaded ${names[id]}.`);
  };

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      setStatusMessage(next ? 'Appearance set to Soft Dark Mode.' : 'Appearance set to Clean Light Mode.');
      return next;
    });
  };

  const handleDownloadMainPy = () => {
    const blob = new Blob([mainPyRaw], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage('Downloaded standalone main.py script! Run with: python main.py');
  };

  return (
    <div className={`${isDarkMode ? 'dark bg-[#0F172A] text-slate-100' : 'bg-[#EBF0F7] text-slate-800'} h-screen w-screen flex flex-col overflow-hidden font-sans select-none transition-colors duration-200`}>
      {/* Neumorphic App Top Bar */}
      <header className={`h-16 px-6 flex items-center justify-between shrink-0 border-b transition-colors duration-200 ${
        isDarkMode
          ? 'bg-[#0F172A] border-[#1E293B]'
          : 'bg-[#EBF0F7] border-[#DCE4F0]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl neu-flat flex items-center justify-center text-blue-600 font-bold">
            ⚡
          </div>
          <div>
            <h2 className={`text-sm font-bold leading-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              OmniKit Studio
            </h2>
            <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              10-in-1 Production Utility Suite
            </p>
          </div>
        </div>

        {/* Center Quick Action Buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={() => handleSelectModule('notes')}
            className={`neu-btn px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-700'
            }`}
            title="Create a new task in To-Do List"
          >
            <Plus className="w-3.5 h-3.5 text-blue-600" />
            <span>New Task</span>
          </button>

          <button
            onClick={() => handleSelectModule('qr')}
            className={`neu-btn px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-700'
            }`}
            title="Create a QR code link"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Share Link</span>
          </button>

          <button
            onClick={handleDownloadMainPy}
            className={`neu-btn px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-700'
            }`}
            title="Download standalone main.py script"
          >
            <FolderDown className="w-3.5 h-3.5 text-blue-600" />
            <span>Download Python Script</span>
          </button>
        </div>

        {/* Right side: Neumorphic Switch & Script Exporter */}
        <div className="flex items-center gap-3">
          {/* Functional Light / Dark Mode Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {isDarkMode ? 'Dark' : 'Light'}
            </span>
            <button
              onClick={toggleTheme}
              className={`w-16 h-8 rounded-full p-1 transition-all relative flex items-center cursor-pointer ${
                isDarkMode ? 'neu-switch-active' : 'neu-inset'
              }`}
              title={isDarkMode ? 'Switch to Clean Light Mode' : 'Switch to Soft Dark Mode'}
            >
              <div
                className={`w-6 h-6 rounded-full neu-switch-handle flex items-center justify-center text-[9px] font-bold transition-all duration-300 ${
                  isDarkMode ? 'translate-x-8 text-blue-600' : 'translate-x-0 text-slate-400'
                }`}
              >
                {isDarkMode ? <Moon className="w-3 h-3 text-blue-600" /> : <Sun className="w-3 h-3 text-amber-500" />}
              </div>
              <span
                className={`absolute text-[10px] font-bold tracking-tight uppercase ${
                  isDarkMode ? 'left-2.5 text-white' : 'right-2.5 text-slate-400'
                }`}
              >
                {isDarkMode ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Inspect Python Code */}
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className={`neu-btn px-3.5 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              isDarkMode ? 'text-slate-200 hover:text-white' : 'text-slate-700'
            }`}
            title="Inspect full source code of main.py"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Inspect Code</span>
          </button>

          {/* Download main.py Pill */}
          <button
            onClick={handleDownloadMainPy}
            className="neu-blue-pill px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform hover:scale-105 cursor-pointer shadow-md"
            title="Download complete standalone main.py file"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Get main.py</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeModule={activeModule}
          onSelectModule={handleSelectModule}
          cpuPercent={systemMetrics?.cpu ?? null}
          ramPercent={systemMetrics?.ram ?? null}
          engineOnline={systemMetrics !== null}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
        />

        {/* Dynamic Workspace */}
        <main className={`flex-1 overflow-y-auto p-6 transition-colors duration-200 ${
          isDarkMode ? 'bg-[#0B1120]' : 'bg-[#EBF0F7]'
        }`}>
          <div className="max-w-5xl mx-auto space-y-6">
            {activeModule === 'organizer' && (
              <FileOrganizer onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'compressor' && (
              <ImageCompressor onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'vault' && (
              <PasswordVault onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'system' && (
              <SystemMonitor
                metrics={systemMetrics}
              />
            )}
            {activeModule === 'pdf' && (
              <PdfTools onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'text' && (
              <TextMarkdown onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'qr' && (
              <QrCodeStudio onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'converter' && (
              <UnitConverter onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'notes' && (
              <NotesTodo onStatusChange={setStatusMessage} />
            )}
            {activeModule === 'network' && (
              <NetworkDiagnostic onStatusChange={setStatusMessage} />
            )}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <StatusBar message={statusMessage} />

      {/* Python Code Inspection & Export Modal */}
      <PythonCodeModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        pythonCode={mainPyRaw}
      />
    </div>
  );
}
