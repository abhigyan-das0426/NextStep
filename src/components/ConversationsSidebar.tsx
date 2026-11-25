'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
  CheckCircle2,
} from 'lucide-react';
import { Conversation } from '@/types';
import {
  sortConversations,
  formatConversationTimestamp,
  getConversationPreview,
} from '@/lib/conversations';

interface ConversationsSidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  isOpenDesktop: boolean;
  isOpenMobile: boolean;
  onCloseDesktop: () => void;
  onCloseMobile: () => void;
}

export function ConversationsSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpenDesktop,
  isOpenMobile,
  onCloseDesktop,
  onCloseMobile,
}: ConversationsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(timer);
  }, [conversations]);

  const sortedConversations = useMemo(
    () => sortConversations(conversations),
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedConversations;
    return sortedConversations.filter(conv => {
      if (conv.title.toLowerCase().includes(q)) return true;
      if (conv.messages.some(m => m.content.toLowerCase().includes(q))) return true;
      if (conv.tasks.some(t => t.title.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [sortedConversations, searchQuery]);

  const startEditing = (e: React.MouseEvent, conv: Conversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const commitEdit = (id: string) => {
    if (editValue.trim()) {
      onRenameConversation(id, editValue);
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSelect = (id: string) => {
    if (editingId === id) return;
    onSelectConversation(id);
    onCloseMobile();
  };

  const handleNewChat = () => {
    onNewConversation();
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar */}
      <div className="p-3.5 border-b border-slate-200/80 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">Conversations</h2>
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {conversations.length}
            </span>
          </div>

          <button
            onClick={onCloseDesktop}
            type="button"
            className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Collapse conversations sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button
            onClick={onCloseMobile}
            type="button"
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close conversations sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          type="button"
          className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>New Chat</span>
        </button>

        {/* Search Conversations */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            aria-label="Search conversations"
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              aria-label="Clear search"
              className="absolute right-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <nav
        aria-label="Chat conversations"
        className="flex-1 overflow-y-auto p-2 space-y-1"
      >
        {filteredConversations.map(conv => {
          const isActive = conv.id === activeConversationId;
          const isEditing = editingId === conv.id;
          const preview = getConversationPreview(conv);
          const timestamp = now ? formatConversationTimestamp(conv.updatedAt, now) : '';
          const allTasksDone =
            conv.tasks.length > 0 && conv.tasks.every(t => t.status === 'completed');

          return (
            <div
              key={conv.id}
              onClick={() => handleSelect(conv.id)}
              onKeyDown={e => {
                if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleSelect(conv.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative rounded-xl p-2.5 border transition-all cursor-pointer select-none ${
                isActive
                  ? 'bg-indigo-50/90 border-indigo-200/90 shadow-2xs'
                  : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200/70'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                {isEditing ? (
                  <div
                    className="flex items-center gap-1 flex-1 min-w-0"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEdit(conv.id);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      aria-label="Conversation title"
                      className="flex-1 min-w-0 px-2 py-0.5 text-xs font-semibold bg-white border border-indigo-300 rounded-md text-slate-900 focus:outline-none"
                    />
                    <button
                      onClick={() => commitEdit(conv.id)}
                      type="button"
                      aria-label="Save title"
                      className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      type="button"
                      aria-label="Cancel rename"
                      className="p-1 rounded-md text-slate-400 hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-indigo-950' : 'text-slate-800'
                        }`}
                      >
                        {conv.title}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400 shrink-0 mt-0.5 group-hover:hidden">
                      {timestamp}
                    </span>

                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={e => startEditing(e, conv)}
                        type="button"
                        aria-label={`Rename ${conv.title}`}
                        title="Rename"
                        className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-white transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteConversation(conv.id);
                        }}
                        type="button"
                        aria-label={`Delete ${conv.title}`}
                        title="Delete"
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-white transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              <p
                className={`text-[11px] truncate mt-1 ${
                  isActive ? 'text-indigo-700/80' : 'text-slate-500'
                }`}
              >
                {preview}
              </p>

              {(conv.tasks.length > 0 || conv.messages.length > 0) && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  {conv.messages.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/80 border border-slate-200/80 text-slate-500 font-medium">
                      {conv.messages.length} msg{conv.messages.length === 1 ? '' : 's'}
                    </span>
                  )}
                  {conv.tasks.length > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium inline-flex items-center gap-1 ${
                        allTasksDone
                          ? 'bg-emerald-50 border-emerald-200/80 text-emerald-700'
                          : 'bg-white/80 border-slate-200/80 text-slate-500'
                      }`}
                    >
                      {allTasksDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {conv.tasks.length} task{conv.tasks.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredConversations.length === 0 && (
          <div className="text-center py-8 px-3 text-xs text-slate-400">
            No matching conversations.
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3.5 py-2.5 border-t border-slate-200/80 text-[11px] text-slate-400 shrink-0">
        Saved locally in your browser
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      {isOpenDesktop && (
        <aside className="hidden md:flex flex-col w-64 xl:w-72 shrink-0 h-full border-r border-slate-200/80 bg-white">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Drawer Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-xs md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-Over Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200/80 shadow-xl transition-transform duration-200 ease-in-out md:hidden ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Conversations drawer"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
