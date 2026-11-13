import React, { useState } from 'react';
import { QrCode } from 'lucide-react';

interface QrCodeStudioProps {
  onStatusChange: (msg: string) => void;
}

export const QrCodeStudio: React.FC<QrCodeStudioProps> = ({ onStatusChange }) => {
  const [qrText, setQrText] = useState<string>('');
  const [colorTheme, setColorTheme] = useState<string>('#2563EB');
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const generateQr = async () => {
    const api = window.pywebview?.api;
    if (!api) {
      onStatusChange('QR generation requires the local desktop backend.');
      return;
    }
    if (!qrText.trim()) {
      onStatusChange('Enter text to encode in your QR code.');
      return;
    }
    try {
      const output = await api.pick_path('save', 'save-png');
      if (!output) return;
      const color = colorTheme === '#1E293B' ? 'black' : colorTheme === '#059669' ? 'green' : 'blue';
      const result = await api.generate_qr(qrText, output, color);
      setSavedPath(output);
      onStatusChange(result.message);
    } catch (error) {
      onStatusChange(error instanceof Error ? error.message : 'Could not generate the QR code.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <QrCode className="w-4 h-4" />
          <span>Neumorphic QR Maker</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Instant QR Code Studio
        </h2>
        <p className="text-xs text-slate-500">
          Generate clean, scannable QR matrices with soft color palettes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left: Input */}
        <div className="md:col-span-6 neu-flat p-7 rounded-3xl space-y-4">
          <span className="text-xs font-bold text-slate-700 block">Payload Target</span>
          <div className="neu-inset px-4 py-3 rounded-2xl">
            <input
              type="text"
              value={qrText}
              onChange={(e) => {
                setQrText(e.target.value);
                setSavedPath(null);
              }}
              placeholder="e.g., https://mywebsite.com"
              className="w-full bg-transparent border-0 text-xs text-slate-800 font-bold focus:outline-none"
            />
          </div>

          <span className="text-xs font-bold text-slate-700 block pt-1">Palette Styling</span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { name: 'Royal Blue', color: '#2563EB' },
              { name: 'Slate Dark', color: '#1E293B' },
              { name: 'Emerald', color: '#059669' },
            ].map((p) => (
              <button
                key={p.color}
                onClick={() => setColorTheme(p.color)}
                className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all ${
                  colorTheme === p.color
                    ? 'neu-blue-pill text-white'
                    : 'neu-btn text-slate-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => void generateQr()}
            className="w-full neu-blue-pill py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 mt-4"
            type="button"
          >
            <span>Generate QR as PNG</span>
          </button>
        </div>

        {/* Right: Preview Island */}
        <div className="md:col-span-6 neu-flat p-7 rounded-3xl flex flex-col items-center justify-center text-center space-y-4">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Generated file
          </span>

          <div className="p-4 bg-white rounded-3xl shadow-lg border border-slate-200 w-full min-h-24 flex items-center justify-center">
            <span className="text-xs text-slate-500 break-all">
              {savedPath ?? 'Choose text and generate a QR code to save it on this device.'}
            </span>
          </div>

          <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
            {qrText}
          </span>
        </div>
      </div>
    </div>
  );
};
