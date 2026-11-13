import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Scissors,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

interface PdfToolsProps {
  onStatusChange: (msg: string) => void;
}

interface QueuedPdf {
  id: string;
  name: string;
  sizeKb: number;
  data: ArrayBuffer;
  pageCount: number;
}

export const PdfTools: React.FC<PdfToolsProps> = ({ onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'merge' | 'split'>('merge');
  const [mergeQueue, setMergeQueue] = useState<QueuedPdf[]>([]);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  const [splitFile, setSplitFile] = useState<QueuedPdf | null>(null);
  const [pageRange, setPageRange] = useState<string>('1-2');
  const [isSplitting, setIsSplitting] = useState<boolean>(false);

  const handleUploadMergeFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    onStatusChange(`Loading ${files.length} PDF(s)...`);
    const newItems: QueuedPdf[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const buffer = await file.arrayBuffer();
      try {
        const doc = await PDFDocument.load(buffer);
        newItems.push({
          id: crypto.randomUUID(),
          name: file.name,
          sizeKb: Math.round(file.size / 1024),
          data: buffer,
          pageCount: doc.getPageCount(),
        });
      } catch (err) {
        console.error(err);
      }
    }

    setMergeQueue((prev) => [...prev, ...newItems]);
    onStatusChange(`Added ${newItems.length} PDF(s).`);
  };

  const handleMergePdfs = async () => {
    if (mergeQueue.length < 2) {
      alert('Please add at least 2 PDF documents to combine!');
      return;
    }

    setIsMerging(true);
    onStatusChange('Combining your PDF files together...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of mergeQueue) {
        const loadedPdf = await PDFDocument.load(item.data);
        const copiedPages = await mergedPdf.copyPages(loadedPdf, loadedPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `combined_document.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onStatusChange(`Success! Combined ${mergeQueue.length} PDFs into combined_document.pdf`);
    } catch (err) {
      alert('Notice: ' + String(err));
    } finally {
      setIsMerging(false);
    }
  };

  const handleUploadSplitFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer);
      setSplitFile({
        id: crypto.randomUUID(),
        name: file.name,
        sizeKb: Math.round(file.size / 1024),
        data: buffer,
        pageCount: doc.getPageCount(),
      });
      setPageRange(`1-${Math.min(2, doc.getPageCount())}`);
      onStatusChange(`Loaded PDF: ${file.name} (${doc.getPageCount()} pages)`);
    } catch (err) {
      alert('Could not open PDF: ' + String(err));
    }
  };

  const handleSplitPdf = async () => {
    if (!splitFile) {
      alert('Please select a PDF file first!');
      return;
    }

    setIsSplitting(true);
    onStatusChange(`Extracting page range "${pageRange}"...`);

    try {
      const srcDoc = await PDFDocument.load(splitFile.data);
      const totalPages = srcDoc.getPageCount();

      const pagesToExtract = new Set<number>();
      for (const part of pageRange.split(',')) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const s = parseInt(startStr, 10);
          const e = parseInt(endStr, 10);
          for (let p = s; p <= e; p++) {
            if (p >= 1 && p <= totalPages) pagesToExtract.add(p - 1);
          }
        } else {
          const p = parseInt(trimmed, 10);
          if (p >= 1 && p <= totalPages) pagesToExtract.add(p - 1);
        }
      }

      if (pagesToExtract.size === 0) {
        alert(`No valid pages selected. Document has ${totalPages} pages.`);
        setIsSplitting(false);
        return;
      }

      const outDoc = await PDFDocument.create();
      const pageIndices = Array.from(pagesToExtract).sort((a, b) => a - b);
      const copiedPages = await outDoc.copyPages(srcDoc, pageIndices);
      copiedPages.forEach((p) => outDoc.addPage(p));

      const outBytes = await outDoc.save();
      const blob = new Blob([outBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `extracted_pages_${splitFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onStatusChange(`Extracted ${pageIndices.length} pages into new document!`);
    } catch (err) {
      alert('Could not extract pages: ' + String(err));
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileText className="w-4 h-4" />
          <span>Neumorphic PDF Studio</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          PDF Binder & Page Splitter
        </h2>
        <p className="text-xs text-slate-500">
          Merge multiple PDF documents or extract selected page ranges.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-3">
        <button
          onClick={() => setActiveTab('merge')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'merge'
              ? 'neu-blue-pill text-white'
              : 'neu-btn text-slate-600'
          }`}
        >
          Combine PDFs ({mergeQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('split')}
          className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
            activeTab === 'split'
              ? 'neu-blue-pill text-white'
              : 'neu-btn text-slate-600'
          }`}
        >
          Extract Pages
        </button>
      </div>

      {activeTab === 'merge' && (
        <div className="space-y-4">
          <div className="neu-flat p-6 rounded-3xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <label className="neu-btn px-5 py-2.5 rounded-full text-xs font-bold text-slate-700 flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>+ Add PDF Files</span>
                <input
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={handleUploadMergeFiles}
                  className="hidden"
                />
              </label>

              {mergeQueue.length > 0 && (
                <button
                  onClick={() => setMergeQueue([])}
                  className="neu-btn px-3 py-2 text-xs font-bold text-rose-500 rounded-full"
                >
                  Clear All
                </button>
              )}
            </div>

            <button
              onClick={handleMergePdfs}
              disabled={mergeQueue.length < 2 || isMerging}
              className="neu-blue-pill px-7 py-3 rounded-full text-xs font-bold flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isMerging ? 'Combining...' : 'Combine into Single PDF'}</span>
            </button>
          </div>

          <div className="space-y-2">
            {mergeQueue.map((item, idx) => (
              <div
                key={item.id}
                className="neu-flat-sm p-4 rounded-2xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-blue-600">{idx + 1}.</span>
                  <div>
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-[11px] text-slate-400 font-medium">{item.pageCount} pages • {item.sizeKb} KB</div>
                  </div>
                </div>

                <button
                  onClick={() => setMergeQueue((prev) => prev.filter((i) => i.id !== item.id))}
                  className="neu-btn p-1.5 rounded-xl text-slate-400 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'split' && (
        <div className="neu-flat p-7 rounded-3xl space-y-4">
          <span className="text-xs font-bold text-slate-700 block">Select Document</span>
          <label className="neu-inset p-8 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>{splitFile ? splitFile.name : 'Click to select or drop a PDF'}</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleUploadSplitFile}
              className="hidden"
            />
          </label>

          <span className="text-xs font-bold text-slate-700 block pt-1">Specify Page Ranges</span>
          <div className="neu-inset px-4 py-2.5 rounded-2xl">
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-2, 4"
              className="w-full bg-transparent border-0 text-xs text-slate-800 font-bold focus:outline-none"
            />
          </div>

          <button
            onClick={handleSplitPdf}
            disabled={!splitFile || isSplitting}
            className="w-full neu-blue-pill py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2 mt-2"
          >
            <Scissors className="w-4 h-4" />
            <span>Extract Selected Pages</span>
          </button>
        </div>
      )}
    </div>
  );
};
