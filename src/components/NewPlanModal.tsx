'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface NewPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function NewPlanModal({ isOpen, onClose, onConfirm }: NewPlanModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-plan-title"
        className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="new-plan-title" className="font-bold text-slate-900 text-base">
              Start a new plan?
            </h3>
            <p className="text-xs text-slate-500">This action cannot be undone.</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 mb-5 leading-relaxed">
          Starting a new plan will clear your current tasks, active schedule, and chat history so
          you can plan a fresh day.
        </p>

        <div className="flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            type="button"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors shadow-xs cursor-pointer"
          >
            Clear & Start Over
          </button>
        </div>
      </div>
    </div>
  );
}
