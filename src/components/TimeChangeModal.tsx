'use client';

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { formatMinutes } from '@/lib/planner';

interface TimeChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTime: number | null;
  onUpdateTime: (minutes: number) => void;
}

const PRESETS = [30, 45, 60, 90, 120, 180, 240];

export function TimeChangeModal({
  isOpen,
  onClose,
  currentTime,
  onUpdateTime,
}: TimeChangeModalProps) {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(currentTime || 60);
  const [customValue, setCustomValue] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectPreset = (mins: number) => {
    setSelectedMinutes(mins);
    setCustomValue('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomValue(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedMinutes(parsed);
    }
  };

  const handleSave = () => {
    if (selectedMinutes > 0) {
      onUpdateTime(selectedMinutes);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="time-modal-title"
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 id="time-modal-title" className="font-bold text-slate-900 text-base">
              Change Available Time
            </h3>
            <p className="text-xs text-slate-500">How much time do you have today?</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Updating your time will rebuild your schedule. Any tasks that no longer fit will be
          deferred so your plan stays realistic.
        </p>

        {/* Presets */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {PRESETS.map(mins => (
            <button
              key={mins}
              onClick={() => handleSelectPreset(mins)}
              type="button"
              className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-colors cursor-pointer text-center ${
                selectedMinutes === mins && !customValue
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {formatMinutes(mins)}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Or enter custom minutes:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={10}
              max={1440}
              placeholder="e.g. 75"
              value={customValue}
              onChange={handleCustomChange}
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600"
            />
            <span className="text-xs text-slate-500">minutes</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
          >
            Update Plan ({formatMinutes(selectedMinutes)})
          </button>
        </div>
      </div>
    </div>
  );
}
