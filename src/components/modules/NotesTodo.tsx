import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  Download,
  FileText
} from 'lucide-react';
import { TaskItem } from '../../types';

interface NotesTodoProps {
  onStatusChange: (msg: string) => void;
}

export const NotesTodo: React.FC<NotesTodoProps> = ({ onStatusChange }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('omnikit_tasks_store');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [newTaskText, setNewTaskText] = useState<string>('');

  const [notes, setNotes] = useState<string>(() => {
    return (
      localStorage.getItem('omnikit_notes_store') || ''
    );
  });

  useEffect(() => {
    localStorage.setItem('omnikit_tasks_store', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('omnikit_notes_store', notes);
  }, [notes]);

  const addTask = () => {
    if (!newTaskText.trim()) return;
    const newTask: TaskItem = {
      id: Date.now(),
      text: newTaskText.trim(),
      done: false,
      priority: 'Medium',
      created: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTasks((prev) => [newTask, ...prev]);
    setNewTaskText('');
    onStatusChange(`Added task: "${newTask.text}"`);
  };

  const toggleTask = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
    onStatusChange('Updated task status.');
  };

  const deleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    onStatusChange('Task removed.');
  };

  const exportNotesAsTxt = () => {
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'neumorphic_notes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onStatusChange('Saved notes to neumorphic_notes.txt');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <CheckSquare className="w-4 h-4" />
          <span>Neumorphic Notes & Tasks</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Daily Tasks & Persistent Notepad
        </h2>
        <p className="text-xs text-slate-500">
          Clean task tracker with checkboxes and an autosaving scratchpad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        {/* Left: Tasks Board (6 cols) */}
        <div className="md:col-span-6 space-y-4">
          <div className="neu-flat p-6 rounded-3xl space-y-3">
            <span className="text-xs font-bold text-slate-700">Add New Task</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 neu-inset px-4 py-2.5 rounded-2xl flex items-center">
                <input
                  type="text"
                  placeholder="What would you like to achieve?..."
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                  className="w-full bg-transparent border-0 text-xs text-slate-800 font-medium focus:outline-none"
                />
              </div>

              <button
                onClick={addTask}
                className="neu-blue-pill px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2.5">
            {tasks.map((t) => (
              <div
                key={t.id}
                className={`neu-flat p-4 rounded-2xl flex items-center justify-between gap-3 transition-opacity ${
                  t.done ? 'opacity-60' : ''
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() => toggleTask(t.id)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs font-semibold ${
                      t.done ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}
                  >
                    {t.text}
                  </span>
                </label>

                <button
                  onClick={() => deleteTask(t.id)}
                  className="neu-btn p-1.5 rounded-xl text-slate-400 hover:text-rose-500"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Notepad (6 cols) */}
        <div className="md:col-span-6 neu-flat p-6 rounded-3xl flex flex-col justify-between space-y-3 h-[420px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#DCE4F0]">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Autosaved Notepad
            </span>
            <button
              onClick={exportNotesAsTxt}
              className="neu-btn px-3 py-1 rounded-full text-xs font-bold text-blue-600 flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export .txt</span>
            </button>
          </div>

          <div className="flex-1 neu-inset p-4 rounded-2xl flex flex-col">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full flex-1 bg-transparent border-0 resize-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none leading-relaxed font-sans"
              placeholder="Write your notes here..."
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
            <span>{notes.length} characters</span>
            <span className="text-emerald-600 font-bold">✓ Saved to PC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
