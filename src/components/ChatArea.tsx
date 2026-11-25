'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ArrowUp,
  ListTodo,
  Check,
  Hammer,
  Clock,
  Bot,
  User,
  Zap,
  CornerDownLeft,
} from 'lucide-react';
import { ChatMessage } from '@/types';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  activeProvider: 'gemini' | 'openai' | 'demo';
  onSendMessage: (text: string, action?: string) => void;
  onRetry: () => void;
  onSelectStarter: (prompt: string) => void;
  onOpenTimeModal: () => void;
  onOpenApiKeyModal: () => void;
}

const STARTER_PROMPTS = [
  {
    tag: 'Assignments & Chores',
    text: 'I have a statistics assignment, an essay, and laundry. I have 2 hours.',
  },
  {
    tag: 'Work Sprint',
    text: 'I need to prep for my presentation tomorrow and reply to 3 urgent emails. I have 45 minutes.',
  },
  {
    tag: 'Study & Errands',
    text: 'I have a math problem set due Friday, groceries, and cleaning my room. I have 90 minutes.',
  },
];

export function ChatArea({
  messages,
  isLoading,
  error,
  activeProvider,
  onSendMessage,
  onRetry,
  onSelectStarter,
  onOpenTimeModal,
  onOpenApiKeyModal,
}: ChatAreaProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of message list on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Helper to render bold markdown in messages
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const renderedLine = parts.map((part, partIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIdx} className="font-semibold text-slate-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIdx}>{part}</span>;
      });

      return (
        <span key={lineIdx} className={lineIdx > 0 ? 'block mt-1.5' : 'inline'}>
          {renderedLine}
        </span>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative overflow-hidden">
      {/* Chat Sub-header: AI Bot Status */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800 text-xs sm:text-sm">NextStep AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {activeProvider === 'gemini' ? 'Gemini Flash (Live)' : activeProvider === 'openai' ? 'GPT-4o mini (Live)' : 'Offline Planner'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">One question at a time · Strict time budgeting</p>
          </div>
        </div>

        {activeProvider === 'demo' && (
          <button
            onClick={onOpenApiKeyModal}
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-full border border-indigo-200/60 transition-colors cursor-pointer"
          >
            Connect API Key
          </button>
        )}
      </div>

      {/* Messages Scroll Feed */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Default Welcome Message when starting a conversation */}
        <div className="flex items-start gap-3 justify-start max-w-2xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 text-slate-800 rounded-2xl rounded-tl-xs px-4 py-3.5 text-xs sm:text-sm leading-relaxed shadow-xs">
              <p className="font-semibold text-slate-900 mb-1">
                👋 Welcome! What's on your plate today?
              </p>
              <p className="text-slate-600">
                Tell me what you need to get done, and how much time you have. I'll ask one quick question at a time, fit everything into your time budget, and give you your single concrete next action.
              </p>
            </div>

            {/* Quick Starters inside chat */}
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Try asking:
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectStarter(prompt.text)}
                      type="button"
                      className="text-left px-3.5 py-2.5 rounded-xl bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 text-xs text-slate-700 transition-all cursor-pointer shadow-xs group"
                    >
                      <span className="font-semibold text-indigo-600 mr-1.5">[{prompt.tag}]</span>
                      <span>"{prompt.text}"</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render Conversation Messages */}
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-white border border-slate-200/90 text-slate-800 rounded-tl-xs'
              }`}
            >
              <div className="whitespace-pre-wrap">{renderMessageContent(msg.content)}</div>
              <div
                className={`text-[10px] mt-1.5 ${
                  msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400 text-left'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
              </div>
              <span className="text-xs text-slate-500 ml-1 font-medium">NextStep is thinking...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-800 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={onRetry}
              type="button"
              className="flex items-center gap-1 font-semibold text-red-700 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Section & Action Bar */}
      <div className="p-4 bg-white border-t border-slate-200/80 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick Command Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              onClick={() => onSendMessage('', 'what_next')}
              disabled={isLoading}
              type="button"
              className="px-3 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200/80 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-600" />
              <span>What next?</span>
            </button>
            <button
              onClick={() => onSendMessage('', 'done')}
              disabled={isLoading}
              type="button"
              className="px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200/80 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Done</span>
            </button>
            <button
              onClick={() => onSendMessage('', 'break_down')}
              disabled={isLoading}
              type="button"
              className="px-3 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold border border-amber-200/80 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Hammer className="w-3.5 h-3.5 text-amber-600" />
              <span>Break it down</span>
            </button>
            <button
              onClick={onOpenTimeModal}
              disabled={isLoading}
              type="button"
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Change my time</span>
            </button>
            <button
              onClick={() => onSendMessage('', 'show_plan')}
              disabled={isLoading}
              type="button"
              className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
            >
              <ListTodo className="w-3.5 h-3.5 text-slate-500" />
              <span>Show plan</span>
            </button>
          </div>

          {/* Prompt Input Box */}
          <div className="relative flex items-end rounded-2xl border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 shadow-sm transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              rows={1}
              placeholder="Tell me what you need to do, or ask 'What next?'..."
              className="w-full resize-none bg-transparent px-4 py-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-h-[44px] max-h-[130px]"
            />
            <div className="p-1.5 shrink-0">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                type="button"
                aria-label="Send message"
                className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Press <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">Shift+Enter</kbd> for new line</span>
            <span>Strict time budget scheduling</span>
          </div>
        </div>
      </div>
    </div>
  );
}
