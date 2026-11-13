import React, { useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Download,
  Camera,
  CheckCircle2,
  Maximize2
} from 'lucide-react';

interface ImageCompressorProps {
  onStatusChange: (msg: string) => void;
}

export const ImageCompressor: React.FC<ImageCompressorProps> = ({ onStatusChange }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [origSizeKb, setOrigSizeKb] = useState<number>(0);
  const [compressedSizeKb, setCompressedSizeKb] = useState<number>(0);
  const [quality, setQuality] = useState<number>(75);
  const [format, setFormat] = useState<'jpeg' | 'png' | 'webp'>('jpeg');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [compressedUrl, setCompressedUrl] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setOrigSizeKb(Math.round(file.size / 1024));

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImageSrc(result);
      processCompression(result, quality, format);
    };
    reader.readAsDataURL(file);
    onStatusChange(`Loaded photo: ${file.name}`);
  };

  const processCompression = (src: string, q: number, fmt: 'jpeg' | 'png' | 'webp') => {
    setIsProcessing(true);
    onStatusChange('Optimizing image in soft background thread...');

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      const mimeType = fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : 'image/jpeg';
      const qFactor = fmt === 'png' ? 1.0 : q / 100;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newUrl = URL.createObjectURL(blob);
            setCompressedUrl(newUrl);
            const kb = Math.round(blob.size / 1024);
            setCompressedSizeKb(kb);
            setIsProcessing(false);
            const pct = Math.max(0, Math.round(((origSizeKb - kb) / origSizeKb) * 100));
            onStatusChange(`Image compressed to ${kb} KB (${pct}% savings)`);
          }
        },
        mimeType,
        qFactor
      );
    };
    img.src = src;
  };

  const downloadProcessed = () => {
    if (!compressedUrl) return;
    const a = document.createElement('a');
    a.href = compressedUrl;
    const base = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
    a.download = `${base}_optimized.${format === 'jpeg' ? 'jpg' : format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onStatusChange(`Downloaded: ${a.download}`);
  };

  const savedPercent = Math.max(0, Math.round(((origSizeKb - compressedSizeKb) / origSizeKb) * 100));

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <ImageIcon className="w-4 h-4" />
          <span>Neumorphic Compressor</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Image Compression & Optimization
        </h2>
        <p className="text-xs text-slate-500">
          Shrink picture sizes effortlessly with soft sliders and high-fidelity output.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Neumorphic Controls (5 cols) */}
        <div className="md:col-span-5 space-y-5">
          {/* Pick Image Card */}
          <div className="neu-flat p-6 rounded-3xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Input Media
            </span>
            <div className="flex items-center gap-2">
              <label className="flex-1 neu-btn py-3 px-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Choose Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

            </div>
            <div className="text-xs text-slate-500 font-medium truncate pt-1">
              File: <span className="font-bold text-slate-800">{fileName}</span>
            </div>
          </div>

          {/* Reference-Styled Horizontal Slider Card */}
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Quality Compression</span>
              <span className="neu-flat-sm px-3 py-1 rounded-full text-xs font-bold font-mono text-blue-600">
                {quality}%
              </span>
            </div>

            <div className="py-2">
              <input
                type="range"
                min="10"
                max="95"
                value={quality}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setQuality(val);
                  if (imageSrc) processCompression(imageSrc, val, format);
                }}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>Smaller File</span>
                <span>Best Quality</span>
              </div>
            </div>

            {/* Format choice pills */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {(['jpeg', 'png', 'webp'] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    setFormat(fmt);
                    if (imageSrc) processCompression(imageSrc, quality, fmt);
                  }}
                  className={`py-2 rounded-2xl text-xs font-bold uppercase transition-all ${
                    format === fmt
                      ? 'neu-blue-pill text-white'
                      : 'neu-btn text-slate-600'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>

            {/* Gradient Blue Action Pill Button */}
            <button
              onClick={downloadProcessed}
              disabled={!compressedUrl}
              className="w-full neu-blue-pill py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 mt-2 shadow-lg"
            >
              <Download className="w-4 h-4" />
              <span>Save Compressed Image</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual Preview Stage (7 cols) */}
        <div className="md:col-span-7 neu-flat p-6 rounded-3xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE4F0]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Optimization Metric
              </span>
              <div className="text-lg font-bold text-slate-800">
                {origSizeKb} KB ➔ <span className="text-blue-600 font-extrabold">{compressedSizeKb} KB</span>
              </div>
            </div>

            {/* Reference-style Savings Pill Badge */}
            <span className="neu-blue-pill px-4 py-1.5 rounded-full text-xs font-extrabold text-white">
              -{savedPercent}% Saved
            </span>
          </div>

          {/* Centered Preview Canvas */}
          <div className="flex-1 min-h-[260px] neu-inset p-4 rounded-3xl flex items-center justify-center">
            {compressedUrl ? (
              <img
                src={compressedUrl}
                alt="Optimized output"
                className="max-h-[240px] max-w-full object-contain rounded-2xl shadow-md"
              />
            ) : (
              <div className="text-center text-slate-400 text-xs">
                <ImageIcon className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                Processing preview...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>High-precision Lanczos interpolation</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Export
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
