import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface StatusBarProps {
  message: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ message }) => {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="h-9 bg-[#EBF0F7] dark:bg-[#0F172A] border-t border-[#DCE4F0] dark:border-[#1E293B] px-5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 select-none shrink-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-2 overflow-hidden">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs shadow-blue-500/50 shrink-0" />
        <span className="font-bold text-slate-700 dark:text-slate-200 shrink-0">Status:</span>
        <span className="text-slate-600 dark:text-slate-300 truncate font-medium">{message}</span>
      </div>

      <div className="flex items-center gap-4 shrink-0 text-slate-400 text-[11px]">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold neu-flat-sm px-2.5 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Engine Active
        </span>
        <span className="text-slate-600 dark:text-slate-300 neu-inset-sm px-3 py-1 rounded-full font-mono text-[10px] font-bold">
          {time}
        </span>
      </div>
    </footer>
  );
};
