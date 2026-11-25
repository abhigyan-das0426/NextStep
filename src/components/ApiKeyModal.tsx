'use client';

import React, { useState } from 'react';
import { Key, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProvider: 'gemini' | 'openai' | 'demo';
  onKeySaved: () => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  activeProvider,
  onKeySaved,
}: ApiKeyModalProps) {
  const [provider, setProvider] = useState<'gemini' | 'openai'>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setErrorMessage('Please enter a valid API key.');
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      setStatusMessage(data.message || 'API key successfully configured!');
      setApiKey('');
      onKeySaved();
      setTimeout(() => {
        onClose();
        setStatusMessage(null);
      }, 1200);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Error saving key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="api-modal-title"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 id="api-modal-title" className="font-bold text-slate-900 text-base">
              Live AI Provider Setup
            </h3>
            <p className="text-xs text-slate-500">
              {activeProvider === 'demo'
                ? 'Connect Gemini or OpenAI from .env.local'
                : `Currently connected to Live ${activeProvider.toUpperCase()}`}
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          NextStep uses server-side calls with validated structured outputs. You can add your API key
          directly below (which saves to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">.env.local</code>) or edit the file manually.
        </p>

        {/* Provider Selector Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
          <button
            type="button"
            onClick={() => setProvider('gemini')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              provider === 'gemini'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Gemini (Recommended)
          </button>
          <button
            type="button"
            onClick={() => setProvider('openai')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              provider === 'openai'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            OpenAI (GPT-4o mini)
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {provider === 'gemini' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY'}
            </label>
            <input
              type="password"
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-proj-...'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {provider === 'gemini' ? (
                <>
                  Get a free key from{' '}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    Google AI Studio
                  </a>
                </>
              ) : (
                <>
                  Get a key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline"
                  >
                    OpenAI Platform
                  </a>
                </>
              )}
            </p>
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              type="button"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !apiKey.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSaving ? 'Connecting...' : 'Save & Activate Live AI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
