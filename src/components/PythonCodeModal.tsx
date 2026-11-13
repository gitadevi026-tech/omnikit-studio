import React, { useState } from 'react';
import { Download, Copy, Check, X, FileCode, Terminal, Sparkles, Smile } from 'lucide-react';
import { REQUIREMENTS_TXT, PYTHON_RUN_INSTRUCTIONS } from '../pythonSource';

interface PythonCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pythonCode: string;
}

export const PythonCodeModal: React.FC<PythonCodeModalProps> = ({
  isOpen,
  onClose,
  pythonCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'main' | 'req' | 'guide'>('main');

  if (!isOpen) return null;

  const handleCopy = () => {
    const textToCopy =
      activeTab === 'main' ? pythonCode : activeTab === 'req' ? REQUIREMENTS_TXT : PYTHON_RUN_INSTRUCTIONS;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMainPy = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'main.py';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadReq = () => {
    const blob = new Blob([REQUIREMENTS_TXT], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'requirements.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#18181B] border border-slate-200 dark:border-[#2E2E33] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#27272A] flex items-center justify-between bg-slate-50/80 dark:bg-[#141416]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shadow-xs">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                OmniKit Studio — Standalone Python Script
                <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                  Zero Setup Required
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Single-file <code className="text-blue-600 font-mono font-semibold">main.py</code> with all 10 friendly tools included
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMainPy}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
              title="Download main.py file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download main.py</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 py-2.5 border-b border-slate-200 dark:border-[#27272A] bg-slate-100/60 dark:bg-[#1E1E22] flex items-center justify-between">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('main')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'main'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              main.py (Complete Script)
            </button>
            <button
              onClick={() => setActiveTab('req')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'req'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              requirements.txt
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'guide'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
              }`}
            >
              Simple Run Guide
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'req' && (
              <button
                onClick={handleDownloadReq}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold mr-2"
              >
                <Download className="w-3 h-3" /> Download requirements.txt
              </button>
            )}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-300 dark:border-zinc-700 font-semibold transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs text-slate-200">
          {activeTab === 'main' && (
            <pre className="whitespace-pre overflow-x-auto leading-relaxed select-text">
              {pythonCode || 'Loading main.py script...'}
            </pre>
          )}

          {activeTab === 'req' && (
            <div className="space-y-4 font-sans">
              <pre className="whitespace-pre bg-black/40 p-4 rounded-xl border border-slate-800 font-mono text-sky-300">
                {REQUIREMENTS_TXT}
              </pre>
              <div className="bg-blue-900/30 border border-blue-700/50 p-4 rounded-xl text-xs text-blue-200 space-y-1">
                <p className="font-semibold text-white">To install all libraries in one step:</p>
                <code className="bg-black/60 px-2.5 py-1 rounded-md text-white font-mono block w-fit">
                  pip install -r requirements.txt
                </code>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs font-sans text-slate-200">
              <div className="bg-slate-800/80 p-5 rounded-xl border border-slate-700 space-y-3">
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  How to run OmniKit Studio on your Desktop:
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-slate-300">
                  <li>
                    <strong className="text-white">Download the script:</strong> Click "Download main.py" above.
                  </li>
                  <li>
                    <strong className="text-white">Open terminal or Command Prompt</strong> in that folder.
                  </li>
                  <li>
                    <strong className="text-white">Install packages:</strong>
                    <pre className="mt-1 p-2 rounded-lg bg-black/60 font-mono text-[11px] text-emerald-300">
                      pip install customtkinter pillow psutil pypdf "qrcode[pil]"
                    </pre>
                  </li>
                  <li>
                    <strong className="text-white">Start the app:</strong>
                    <pre className="mt-1 p-2 rounded-lg bg-black/60 font-mono text-[11px] text-amber-300">
                      python main.py
                    </pre>
                  </li>
                </ol>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 text-slate-300">
                <p className="font-semibold text-white mb-1">Works seamlessly on:</p>
                <p>• Windows 10 & 11 (Clean light/dark mode support)</p>
                <p>• macOS 11+ (Retina display optimization)</p>
                <p>• Linux / Ubuntu (Native desktop integration)</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-[#27272A] bg-slate-50 dark:bg-[#141416] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Clean Light Theme • Non-destructive • 100% complete script</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-white font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
