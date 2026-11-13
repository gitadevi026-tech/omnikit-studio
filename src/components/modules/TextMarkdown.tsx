import React, { useState, useMemo } from 'react';
import {
  FileCode,
  Copy,
  Check,
  Sparkles
} from 'lucide-react';

interface TextMarkdownProps {
  onStatusChange: (msg: string) => void;
}

export const TextMarkdown: React.FC<TextMarkdownProps> = ({ onStatusChange }) => {
  const [content, setContent] = useState<string>(
    `# Neumorphic Text Utility\n\nType or paste any text here to count characters, words, sentences, and format letter case instantly with soft UI buttons.`
  );
  const [copied, setCopied] = useState<boolean>(false);

  const stats = useMemo(() => {
    const raw = content.trim();
    if (!raw) return { words: 0, chars: 0, sentences: 0, readMinutes: 0 };
    const words = raw.split(/\s+/).filter(Boolean).length;
    const chars = content.length;
    const sentences = (raw.match(/[^.!?]+[.!?]+(\s|$)/g) || []).length || 1;
    const readMinutes = Math.max(1, Math.round(words / 200));
    return { words, chars, sentences, readMinutes };
  }, [content]);

  const copyText = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onStatusChange('Text copied to clipboard!');
  };

  const transformCase = (mode: 'upper' | 'lower' | 'title' | 'clean') => {
    let result = content;
    if (mode === 'upper') {
      result = content.toUpperCase();
    } else if (mode === 'lower') {
      result = content.toLowerCase();
    } else if (mode === 'title') {
      result = content.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
    } else if (mode === 'clean') {
      result = content
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join('\n\n');
    }
    setContent(result);
    onStatusChange(`Converted text to ${mode}!`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileCode className="w-4 h-4" />
          <span>Neumorphic Text Helper</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Lexical Counter & Text Transformer
        </h2>
        <p className="text-xs text-slate-500">
          Real-time word counts, letter casing transforms, and clean spacing.
        </p>
      </div>

      {/* Stats Ribbon (Neumorphic Squircle Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="neu-flat p-4 rounded-3xl">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Words</div>
          <div className="text-xl font-extrabold text-blue-600">{stats.words}</div>
        </div>

        <div className="neu-flat p-4 rounded-3xl">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Characters</div>
          <div className="text-xl font-extrabold text-slate-800">{stats.chars}</div>
        </div>

        <div className="neu-flat p-4 rounded-3xl">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Sentences</div>
          <div className="text-xl font-extrabold text-slate-800">{stats.sentences}</div>
        </div>

        <div className="neu-flat p-4 rounded-3xl">
          <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Reading Time</div>
          <div className="text-xl font-extrabold text-emerald-600">~{stats.readMinutes} min</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="neu-flat p-4 rounded-3xl flex flex-wrap items-center gap-2.5">
        <span className="text-xs font-bold text-slate-600 px-2">Transforms:</span>
        <button
          onClick={() => transformCase('upper')}
          className="neu-btn px-4 py-2 rounded-full text-xs font-bold text-slate-700"
        >
          UPPERCASE
        </button>
        <button
          onClick={() => transformCase('lower')}
          className="neu-btn px-4 py-2 rounded-full text-xs font-bold text-slate-700"
        >
          lowercase
        </button>
        <button
          onClick={() => transformCase('title')}
          className="neu-btn px-4 py-2 rounded-full text-xs font-bold text-slate-700"
        >
          Title Case
        </button>
        <button
          onClick={() => transformCase('clean')}
          className="neu-btn px-4 py-2 rounded-full text-xs font-bold text-slate-700"
        >
          Clean Spaces
        </button>

        <div className="ml-auto">
          <button
            onClick={copyText}
            className="neu-blue-pill px-5 py-2 rounded-full text-xs font-bold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Recessed Writing Canvas */}
      <div className="neu-flat p-6 rounded-3xl flex flex-col h-[340px]">
        <div className="flex-1 neu-inset p-4 rounded-2xl flex flex-col">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full flex-1 bg-transparent border-0 resize-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed font-sans"
            placeholder="Type or paste your text here..."
          />
        </div>
      </div>
    </div>
  );
};
