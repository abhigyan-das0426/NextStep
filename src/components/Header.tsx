'use client';

import React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  RefreshCw,
  PanelRight,
  PanelLeft,
  Cpu,
  Key,
  LogIn,
  LogOut,
} from 'lucide-react';
import { AuthUser } from '@/types';

interface HeaderProps {
  isDemoMode: boolean;
  activeProvider: 'gemini' | 'openai' | 'demo';
  onOpenApiKeyModal: () => void;
  onOpenNewPlan: () => void;
  onToggleMobilePlan: () => void;
  mobilePlanOpen: boolean;
  desktopSidebarOpen: boolean;
  onToggleDesktopSidebar: () => void;
  mobileSidebarOpen: boolean;
  onToggleMobileSidebar: () => void;
  user?: AuthUser | null;
  onLogout?: () => void;
}

export function Header({
  activeProvider,
  onOpenApiKeyModal,
  onOpenNewPlan,
  onToggleMobilePlan,
  mobilePlanOpen,
  desktopSidebarOpen,
  onToggleDesktopSidebar,
  mobileSidebarOpen,
  onToggleMobileSidebar,
  user,
  onLogout,
}: HeaderProps) {
  const userInitial = user?.name?.trim().charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-6 py-3 flex items-center justify-between shadow-2xs">
      {/* Brand + Sidebar Toggles */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <button
          onClick={onToggleMobileSidebar}
          type="button"
          aria-label={mobileSidebarOpen ? 'Close conversations' : 'Open conversations'}
          title="Conversations"
          className={`md:hidden p-2 rounded-lg transition-colors cursor-pointer ${
            mobileSidebarOpen
              ? 'bg-indigo-50 text-indigo-600'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        {!desktopSidebarOpen && (
          <button
            onClick={onToggleDesktopSidebar}
            type="button"
            aria-label="Show conversations sidebar"
            title="Show conversations sidebar"
            className="hidden md:flex p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold shadow-xs shadow-indigo-200">
          <Sparkles className="w-5 h-5 text-indigo-50" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">NextStep</h1>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100/80">
              AI Daily Planner
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            What should I do next?
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live AI Provider Pill / Setup */}
        <button
          onClick={onOpenApiKeyModal}
          type="button"
          aria-label="Configure live AI provider"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
            activeProvider === 'gemini'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : activeProvider === 'openai'
              ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
          }`}
        >
          {activeProvider === 'gemini' ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span className="hidden sm:inline">Gemini Flash (Live)</span>
              <span className="sm:hidden">Gemini</span>
            </>
          ) : activeProvider === 'openai' ? (
            <>
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">GPT-4o mini (Live)</span>
              <span className="sm:hidden">OpenAI</span>
            </>
          ) : (
            <>
              <Key className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">Connect Live AI (.env.local)</span>
              <span className="sm:hidden">API Key</span>
            </>
          )}
        </button>

        {/* New Plan Button */}
        <button
          onClick={onOpenNewPlan}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200/60"
          title="Clear current plan and start fresh"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Plan</span>
        </button>

        {/* Auth Control */}
        {user ? (
          <div className="flex items-center gap-1.5 pl-2 pr-1.5 py-1 rounded-full bg-slate-100 border border-slate-200/80">
            <span
              className="w-6 h-6 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center shrink-0"
              title={`${user.name} (${user.email})`}
            >
              {userInitial}
            </span>
            <span className="hidden md:inline text-xs font-semibold text-slate-700 max-w-[110px] truncate">
              {user.name}
            </span>
            {onLogout && (
              <button
                onClick={onLogout}
                type="button"
                aria-label="Sign out"
                title="Sign out"
                className="p-1 rounded-full text-slate-500 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign in</span>
          </Link>
        )}

        {/* Mobile Plan Toggle Button */}
        <button
          onClick={onToggleMobilePlan}
          type="button"
          aria-label={mobilePlanOpen ? 'Switch to chat' : 'Switch to day plan'}
          className={`lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            mobilePlanOpen
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <PanelRight className="w-4 h-4" />
          <span>{mobilePlanOpen ? 'Chat' : 'Plan'}</span>
        </button>
      </div>
    </header>
  );
}
