import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  RefreshCw,
  Mail,
  Lock,
  Search,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { VaultCredential } from '../../types';

interface PasswordVaultProps {
  onStatusChange: (msg: string) => void;
}

export const PasswordVault: React.FC<PasswordVaultProps> = ({ onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'vault'>('create');

  // Generator State
  const [length, setLength] = useState<number>(16);
  const [useUpper, setUseUpper] = useState<boolean>(true);
  const [useLower, setUseLower] = useState<boolean>(true);
  const [useDigits, setUseDigits] = useState<boolean>(true);
  const [useSymbols, setUseSymbols] = useState<boolean>(true);
  const [password, setPassword] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Vault State
  const [vault, setVault] = useState<VaultCredential[]>(() => {
    const saved = localStorage.getItem('omnikit_vault_store');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [newSite, setNewSite] = useState<string>('');
  const [newUser, setNewUser] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('omnikit_vault_store', JSON.stringify(vault));
  }, [vault]);

  useEffect(() => {
    generatePassword();
  }, [length, useUpper, useLower, useDigits, useSymbols]);

  const generatePassword = () => {
    let pool = '';
    if (useUpper) pool += 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    if (useLower) pool += 'abcdefghijkmnpqrstuvwxyz';
    if (useDigits) pool += '23456789';
    if (useSymbols) pool += '!@#$%&*+?';

    if (!pool) pool = 'abcdefghijkmnpqrstuvwxyz23456789';

    let result = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += pool[array[i] % pool.length];
    }
    setPassword(result);
    onStatusChange(`Generated ${length}-character secure password.`);
  };

  const copyPassword = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onStatusChange('Password copied to clipboard!');
  };

  const saveCredential = () => {
    if (!newSite || !newPass) {
      alert('Please fill in the account name and password.');
      return;
    }
    const cred: VaultCredential = {
      id: Date.now().toString(),
      site: newSite,
      username: newUser || 'Personal',
      password: newPass,
      created: 'Just now',
    };
    setVault((prev) => [cred, ...prev]);
    setNewSite('');
    setNewUser('');
    setNewPass('');
    setActiveTab('vault');
    onStatusChange(`Saved password for ${cred.site} in safe.`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
          <KeyRound className="w-4 h-4" />
          <span>Neumorphic Password Safe</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          Password Generator & Secure Vault
        </h2>
        <p className="text-xs text-slate-500">
          Craft uncrackable passwords and manage your account credentials with soft tactile UI.
        </p>
      </div>

      {/* Main Grid: Form Card (Matching Reference Login Card) + Vault List */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Card Styled Like the Reference "Login" Card */}
        <div className="md:col-span-5 neu-flat p-7 rounded-3xl relative flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-xl font-bold text-slate-800">
              New Account
            </h3>
            <span className="text-xs font-semibold text-blue-600">
              Auto-Encrypt
            </span>
          </div>

          {/* Recessed Email/Site Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Account / Website</label>
            <div className="neu-inset px-4 py-3 rounded-2xl flex items-center justify-between">
              <input
                type="text"
                placeholder="username@mail.com"
                value={newSite}
                onChange={(e) => setNewSite(e.target.value)}
                className="w-full bg-transparent border-0 text-xs text-slate-800 font-medium focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
            </div>
          </div>

          {/* Recessed Password Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-slate-400">Secure Password</label>
            <div className="neu-inset px-4 py-3 rounded-2xl flex items-center justify-between">
              <input
                type="text"
                placeholder="••••••••••"
                value={newPass || password}
                onChange={(e) => setNewPass(e.target.value)}
                className="w-full bg-transparent border-0 text-xs font-mono font-bold text-slate-800 focus:outline-none"
              />
              <button
                onClick={() => copyPassword(newPass || password)}
                className="text-slate-400 hover:text-blue-600 transition ml-2"
                title="Copy Password"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
            <button
              onClick={generatePassword}
              className="text-blue-600 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Generate Random</span>
            </button>
            <span className="text-[11px] font-mono font-bold text-emerald-600">
              High Entropy
            </span>
          </div>

          {/* Big Floating Blue Pill Button (Just like "Sign Up" in reference image) */}
          <div className="pt-3">
            <button
              onClick={saveCredential}
              className="w-full neu-blue-pill py-3.5 rounded-full text-xs font-bold flex items-center justify-center gap-2"
            >
              <span>Save Credential</span>
            </button>
          </div>
        </div>

        {/* Right Column: Customizer & Saved Passwords */}
        <div className="md:col-span-7 space-y-5">
          {/* Slider Card (Direct match to reference horizontal slider) */}
          <div className="neu-flat p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Password Length</span>
              {/* Reference style bubble percentage badge */}
              <span className="neu-flat-sm px-3 py-1 rounded-full text-xs font-bold font-mono text-blue-600">
                {length} chars
              </span>
            </div>

            {/* Neumorphic Slider Track */}
            <div className="relative py-2">
              <input
                type="range"
                min="8"
                max="32"
                value={length}
                onChange={(e) => setLength(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium mt-1">
                <span>Fast (8)</span>
                <span>Recommended (16)</span>
                <span>Ultra (32)</span>
              </div>
            </div>

            {/* Checkbox pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { label: 'A-Z', val: useUpper, set: setUseUpper },
                { label: 'a-z', val: useLower, set: setUseLower },
                { label: '0-9', val: useDigits, set: setUseDigits },
                { label: '#$%', val: useSymbols, set: setUseSymbols },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => c.set(!c.val)}
                  className={`py-2 px-3 rounded-2xl text-xs font-bold transition-all ${
                    c.val
                      ? 'neu-blue-pill text-white'
                      : 'neu-btn text-slate-500'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Saved Credentials List */}
          <div className="neu-flat p-6 rounded-3xl space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-[#DCE4F0]">
              <span className="text-xs font-bold text-slate-700">Saved in Safe ({vault.length})</span>
              <span className="text-[10px] text-slate-400 font-medium">Click copy to use</span>
            </div>

            <div className="space-y-2">
              {vault.map((item) => (
                <div
                  key={item.id}
                  className="neu-flat-sm p-3.5 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-800">{item.site}</div>
                    <div className="text-[11px] font-mono text-slate-500">{item.password.slice(0, 4)}••••••••</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyPassword(item.password)}
                      className="neu-btn px-3 py-1 rounded-xl text-xs font-bold text-blue-600"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => setVault((prev) => prev.filter((v) => v.id !== item.id))}
                      className="neu-btn p-1.5 rounded-xl text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
