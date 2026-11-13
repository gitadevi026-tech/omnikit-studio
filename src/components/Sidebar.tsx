import React from 'react';
import {
  FolderKanban,
  Image as ImageIcon,
  KeyRound,
  Cpu,
  FileText,
  FileCode,
  QrCode,
  Scale,
  CheckSquare,
  Activity,
  Sparkles,
  Sun,
  Moon,
  Home,
  CheckCircle2
} from 'lucide-react';
import { ModuleId } from '../types';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  cpuPercent: number | null;
  ramPercent: number | null;
  engineOnline: boolean;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onSelectModule,
  cpuPercent,
  ramPercent,
  engineOnline,
  isDarkMode,
  onToggleTheme,
}) => {
  const navItems: { id: ModuleId; label: string; icon: React.ReactNode }[] = [
    { id: 'organizer', label: 'File Organizer', icon: <FolderKanban className="w-4 h-4" /> },
    { id: 'compressor', label: 'Image Compressor', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'vault', label: 'Password Safe', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'system', label: 'System Health', icon: <Cpu className="w-4 h-4" /> },
    { id: 'pdf', label: 'PDF Tools', icon: <FileText className="w-4 h-4" /> },
    { id: 'text', label: 'Text & Notes', icon: <FileCode className="w-4 h-4" /> },
    { id: 'qr', label: 'QR Code Maker', icon: <QrCode className="w-4 h-4" /> },
    { id: 'converter', label: 'Unit Converter', icon: <Scale className="w-4 h-4" /> },
    { id: 'notes', label: 'To-Do & Notes', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'network', label: 'Internet Checker', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <aside className={`w-64 p-4 flex flex-col justify-between select-none shrink-0 h-full border-r transition-colors duration-200 ${
      isDarkMode
        ? 'bg-[#0F172A] border-[#1E293B]'
        : 'bg-[#EBF0F7] border-[#D9E1ED]'
    }`}>
      <div className="flex flex-col">
        {/* Brand Header: Neumorphic Soft Card */}
        <div
          onClick={() => onSelectModule('organizer')}
          className={`p-3.5 rounded-3xl neu-flat mb-4 flex items-center gap-3 cursor-pointer transition-transform hover:scale-[1.01]`}
          title="OmniKit Studio - Click to return to Home"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 shrink-0">
            <Sparkles className="w-5 h-5 fill-current" />
          </div>
          <div className="overflow-hidden">
            <h1 className={`font-bold text-sm tracking-tight truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
              OmniKit Studio
            </h1>
            <p className={`text-[11px] font-medium truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              10-in-1 Power Suite
            </p>
          </div>
        </div>

        {/* Quick Functional Squircle Action Bar (100% Fully Functional) */}
        <div className="grid grid-cols-4 gap-2 mb-4 px-0.5">
          {/* Button 1: Home / Organizer */}
          <button
            onClick={() => onSelectModule('organizer')}
            className={`h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeModule === 'organizer'
                ? 'neu-inset text-blue-600 font-bold'
                : 'neu-btn text-slate-500 hover:text-blue-600'
            }`}
            title="Home / File Organizer"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Button 2: Quick Notes & To-Do */}
          <button
            onClick={() => onSelectModule('notes')}
            className={`h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeModule === 'notes'
                ? 'neu-inset text-blue-600 font-bold'
                : 'neu-btn text-slate-500 hover:text-blue-600'
            }`}
            title="Tasks & Quick Notes"
          >
            <CheckSquare className="w-4 h-4" />
          </button>

          {/* Button 3: System Health & Hardware */}
          <button
            onClick={() => onSelectModule('system')}
            className={`h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              activeModule === 'system'
                ? 'neu-inset text-blue-600 font-bold'
                : 'neu-btn text-slate-500 hover:text-blue-600'
            }`}
            title="Live System Monitor"
          >
            <Activity className="w-4 h-4" />
          </button>

          {/* Button 4: Theme Toggle (Light / Dark) */}
          <button
            onClick={onToggleTheme}
            className={`h-10 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
              isDarkMode
                ? 'neu-inset text-amber-400'
                : 'neu-btn text-slate-500 hover:text-blue-600'
            }`}
            title={isDarkMode ? 'Switch to Clean Light Mode' : 'Switch to Soft Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation List in Soft Neumorphic Style */}
        <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-270px)] pr-0.5">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Core Modules
          </div>
          {navItems.map((item) => {
            const isActive = activeModule === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectModule(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'neu-blue-pill text-white'
                    : isDarkMode
                    ? 'neu-btn text-slate-200 hover:text-blue-400'
                    : 'neu-btn text-slate-700 hover:text-blue-600'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className={isActive ? 'text-white' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-white shadow-xs shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Neumorphic Health Card */}
      <div
        onClick={() => onSelectModule('system')}
        className={`p-3.5 rounded-3xl neu-flat mt-3 space-y-2 cursor-pointer transition-transform hover:scale-[1.01]`}
        title="Click to view detailed System Monitor"
      >
        <div className="flex items-center justify-between text-xs font-bold">
          <span className={`flex items-center gap-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${engineOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            {engineOnline ? 'Engine Online' : 'Engine Unavailable'}
          </span>
          <span className="text-[11px] font-mono text-blue-500 font-bold">{cpuPercent === null ? '—' : `${cpuPercent.toFixed(0)}%`}</span>
        </div>

        {/* Soft Recessed Progress Track */}
        <div className="h-2 rounded-full neu-inset p-0.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
            style={{ width: `${cpuPercent === null ? 0 : Math.min(100, Math.max(0, cpuPercent))}%` }}
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>CPU: {cpuPercent === null ? '—' : `${cpuPercent.toFixed(0)}%`}</span>
          <span>RAM: {ramPercent === null ? '—' : `${ramPercent.toFixed(0)}%`}</span>
        </div>
      </div>
    </aside>
  );
};
