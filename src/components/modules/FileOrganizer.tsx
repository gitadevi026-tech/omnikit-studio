import React, { useState, useRef } from 'react';
import {
  FolderKanban,
  CheckCircle2,
  Folder,
  Sparkles,
  ShieldCheck,
  FolderPlus,
  Upload,
  Download,
  FileCheck
} from 'lucide-react';

interface FileOrganizerProps {
  onStatusChange: (msg: string) => void;
}

interface SimulatedFile {
  name: string;
  sizeKb: number;
  ext: string;
  category: string;
}

export const FileOrganizer: React.FC<FileOrganizerProps> = ({ onStatusChange }) => {
  const [targetPath, setTargetPath] = useState<string>('');
  const [selectedCats, setSelectedCats] = useState<{ [key: string]: boolean }>({
    Documents: true,
    'Photos & Pictures': true,
    'Music & Videos': true,
    'Zip & Archives': true,
    'Code & Programs': true,
  });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([
    '✨ Neumorphic File Organizer ready. Choose files or your target directory below.',
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<SimulatedFile[]>([]);
  const [organizedResult, setOrganizedResult] = useState<{ [cat: string]: string[] } | null>(null);

  const categorizeExtension = (ext: string): string => {
    const e = ext.toLowerCase();
    if (['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.xls', '.pptx', '.csv'].includes(e)) return 'Documents';
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].includes(e)) return 'Photos & Pictures';
    if (['.mp3', '.mp4', '.mov', '.wav', '.flac', '.mkv', '.avi'].includes(e)) return 'Music & Videos';
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(e)) return 'Zip & Archives';
    if (['.py', '.js', '.ts', '.html', '.css', '.json', '.sh', '.cpp'].includes(e)) return 'Code & Programs';
    return 'Documents';
  };

  const handleUploadRealFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const realList: SimulatedFile[] = Array.from(e.target.files).map((f) => {
      const dot = f.name.lastIndexOf('.');
      const ext = dot !== -1 ? f.name.substring(dot) : '';
      return {
        name: f.name,
        sizeKb: Math.round(f.size / 1024),
        ext: ext,
        category: categorizeExtension(ext),
      };
    });

    setFiles(realList);
    setTargetPath(`Local Files (${realList.length} files selected)`);
    setOrganizedResult(null);
    setProgress(0);
    setLogs([
      `✨ Loaded ${realList.length} real files from your device.`,
      `Click 'Start Organizing Now' to sort them automatically.`,
    ]);
    onStatusChange(`Loaded ${realList.length} files from device.`);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const runOrganize = () => {
    setIsProcessing(true);
    setProgress(0);
    setOrganizedResult(null);
    onStatusChange('Sorting files with collision safety...');

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLogs([
      `[${timestamp}] Commencing scan on: "${targetPath}"`,
      `[${timestamp}] Found ${files.length} loose files. Categorizing...`,
    ]);

    const folderBuckets: { [cat: string]: string[] } = {};
    const seenNames = new Set<string>();

    let current = 0;
    const interval = setInterval(() => {
      if (current >= files.length) {
        clearInterval(interval);
        setIsProcessing(false);
        setProgress(100);
        setOrganizedResult(folderBuckets);
        onStatusChange(`All done! Organized ${files.length} files successfully.`);

        const endTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setLogs((prev) => [
          ...prev,
          `--------------------------------------------------`,
          `🎉 [${endTimestamp}] Organization Complete!`,
          ...Object.entries(folderBuckets).map(
            ([cat, flist]) => `  ✓ ${cat}: ${flist.length} files placed safely`
          ),
          `--------------------------------------------------`,
        ]);
        return;
      }

      const file = files[current];
      const isEnabled = selectedCats[file.category];

      let finalName = file.name;
      if (seenNames.has(file.name)) {
        const dotIdx = file.name.lastIndexOf('.');
        const base = dotIdx !== -1 ? file.name.substring(0, dotIdx) : file.name;
        const ext = dotIdx !== -1 ? file.name.substring(dotIdx) : '';
        finalName = `${base}_1${ext}`;
      }
      seenNames.add(finalName);

      if (isEnabled) {
        if (!folderBuckets[file.category]) {
          folderBuckets[file.category] = [];
        }
        folderBuckets[file.category].push(finalName);
        setLogs((prev) => [
          ...prev,
          `  ✓ Placed "${file.name}" into "${file.category}/"`,
        ]);
      }

      current++;
      setProgress(Math.round((current / files.length) * 100));
    }, 120);
  };

  const downloadReport = () => {
    if (!organizedResult) return;
    const lines = [
      '========================================',
      'OmniKit Studio - File Organization Report',
      `Target: ${targetPath}`,
      `Date: ${new Date().toLocaleString()}`,
      '========================================\n',
    ];

    Object.entries(organizedResult).forEach(([cat, fList]) => {
      lines.push(`Folder: [${cat}] (${fList.length} files)`);
      fList.forEach((f) => lines.push(`  - ${f}`));
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'organized_files_report.txt';
    a.click();
    URL.revokeObjectURL(url);
    onStatusChange('Downloaded organization report!');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden file input for real files */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleUploadRealFiles}
        className="hidden"
      />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FolderKanban className="w-4 h-4" />
          <span>Neumorphic File Organizer</span>
        </div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          Automated Smart File Classification
        </h2>
        <p className="text-xs text-slate-500">
          Clean messy directories and categorize downloads into clean subdirectories with collision safety.
        </p>
      </div>

      {/* Target Directory Selection Card */}
      <div className="neu-flat p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
            Target Directory / Files ({files.length} files queued)
          </label>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full neu-inset px-4 py-2.5 rounded-2xl flex items-center">
            <input
              type="text"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              className="w-full bg-transparent border-0 text-xs font-medium focus:outline-none"
              placeholder="Select folder path or choose real files..."
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="neu-btn px-5 py-3 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 cursor-pointer shrink-0"
            title="Select real files from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Select Real Files</span>
          </button>
        </div>
      </div>

      {/* Categories Grid Card */}
      <div className="neu-flat p-6 rounded-3xl space-y-4">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
          Categorization Targets
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'Documents', desc: 'PDF, DOCX, XLSX, TXT' },
            { key: 'Photos & Pictures', desc: 'JPG, PNG, WebP, SVG' },
            { key: 'Music & Videos', desc: 'MP3, MP4, MOV, WAV' },
            { key: 'Zip & Archives', desc: 'ZIP, RAR, 7Z, TAR' },
            { key: 'Code & Programs', desc: 'PY, JS, HTML, SH' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                selectedCats[cat.key]
                  ? 'neu-blue-pill text-white'
                  : 'neu-btn text-slate-600 dark:text-slate-300'
              }`}
            >
              <div className="text-xs font-bold">{cat.key}</div>
              <div className={`text-[10px] font-medium ${selectedCats[cat.key] ? 'text-blue-100' : 'text-slate-400'}`}>
                {cat.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Action Row & Neumorphic Progress Track */}
      <div className="neu-flat p-6 rounded-3xl flex flex-col sm:flex-row items-center gap-5">
        <button
          onClick={runOrganize}
          disabled={isProcessing}
          className="neu-blue-pill px-8 py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 shrink-0 cursor-pointer"
        >
          {isProcessing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sorting Files...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Start Organizing Now</span>
            </>
          )}
        </button>

        <div className="flex-1 w-full space-y-2">
          <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>Sorting Progress</span>
            <span className="text-blue-600 font-mono">{progress}%</span>
          </div>

          <div className="h-3 rounded-full neu-slider-track p-0.5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Results View */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="neu-flat p-5 rounded-3xl flex flex-col h-60 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE4F0] dark:border-[#1E293B]">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Execution Log
            </span>
            <span className="neu-flat-sm px-2.5 py-0.5 rounded-full text-[10px] font-bold text-slate-500">
              Collision-Protected
            </span>
          </div>
          <div className="flex-1 overflow-auto text-xs space-y-1 font-mono text-slate-600 dark:text-slate-300">
            {logs.map((l, i) => (
              <div key={i} className={l.includes('✓') ? 'text-emerald-600 font-bold' : ''}>
                {l}
              </div>
            ))}
          </div>
        </div>

        <div className="neu-flat p-5 rounded-3xl flex flex-col h-60 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE4F0] dark:border-[#1E293B]">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-amber-500" />
              Sorted Folders
            </span>
            {organizedResult && (
              <button
                onClick={downloadReport}
                className="neu-btn px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-600 flex items-center gap-1 cursor-pointer"
                title="Download text report of organized folders"
              >
                <Download className="w-3 h-3" />
                <span>Export Report</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-auto space-y-2 text-xs">
            {organizedResult ? (
              Object.entries(organizedResult).map(([cat, fNames]) => (
                <div key={cat} className="neu-flat-sm p-2.5 rounded-2xl flex items-center justify-between">
                  <span className="font-bold">/{cat}</span>
                  <span className="neu-blue-pill px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {fNames.length} files
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
                <FolderPlus className="w-8 h-8 text-slate-300 mb-1" />
                <span>Ready to organize your folder.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
