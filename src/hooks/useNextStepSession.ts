'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage, Conversation, PlanState, ApiChatResponse, AuthUser } from '@/types';
import { calculatePlan, markTaskComplete, breakDownTask } from '@/lib/planner';
import {
  DEFAULT_CONVERSATION_TITLE,
  createConversation,
  deriveConversationTitle,
  loadConversationsState,
  saveConversationsState,
} from '@/lib/conversations';

const INITIAL_PLAN: PlanState = {
  availableMinutes: null,
  totalPlannedMinutes: 0,
  totalWorkMinutes: 0,
  totalBreakMinutes: 0,
  scheduledBlocks: [],
  deferredTaskIds: [],
  currentNextAction: null,
  lastUpdated: '1970-01-01T00:00:00.000Z',
};

const PLACEHOLDER_CONVERSATION: Conversation = {
  id: 'conv-initial',
  title: DEFAULT_CONVERSATION_TITLE,
  isCustomTitle: false,
  messages: [],
  tasks: [],
  availableMinutes: null,
  createdAt: '1970-01-01T00:00:00.000Z',
  updatedAt: '1970-01-01T00:00:00.000Z',
};

export function useNextStepSession(user?: AuthUser | null) {
  const [conversations, setConversations] = useState<Conversation[]>([PLACEHOLDER_CONVERSATION]);
  const [activeConversationId, setActiveConversationId] = useState<string>(
    PLACEHOLDER_CONVERSATION.id
  );
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [activeProvider, setActiveProvider] = useState<'gemini' | 'openai' | 'demo'>('demo');
  const [loadingConversationId, setLoadingConversationId] = useState<string | null>(null);
  const [errorByConversation, setErrorByConversation] = useState<Record<string, string | null>>({});
  const [lastFailedByConversation, setLastFailedByConversation] = useState<
    Record<string, string | null>
  >({});
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const userId = user?.id;

  // Check server configuration for live API keys
  const checkConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.activeProvider !== 'none') {
          setActiveProvider(data.activeProvider);
          setIsDemoMode(false);
        } else {
          setActiveProvider('demo');
          setIsDemoMode(true);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch provider config:', e);
    }
  }, []);

  // Hydrate conversations on mount and whenever user logs in or out
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      // 1. Initial load from localStorage (scoped to user or guest)
      const local = loadConversationsState(userId);
      let workingConversations = local.conversations;
      let workingActiveId = local.activeConversationId;

      // 2. If user is logged in, sync with server-side database
      if (userId) {
        try {
          const res = await fetch('/api/conversations', { cache: 'no-store' });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.conversations) && data.conversations.length > 0) {
              workingConversations = data.conversations;
              workingActiveId = data.activeConversationId || data.conversations[0].id;
              saveConversationsState(workingConversations, workingActiveId, userId);
            } else if (
              workingConversations.length > 0 &&
              workingConversations.some(c => c.messages.length > 0 || c.tasks.length > 0)
            ) {
              // User has active conversations (e.g. from guest mode); persist to their account on server
              void fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  conversations: workingConversations,
                  activeConversationId: workingActiveId,
                }),
              });
            }
          }
        } catch (err) {
          console.warn('Failed to fetch user conversations from server:', err);
        }
      }

      if (!cancelled) {
        setConversations(workingConversations);
        setActiveConversationId(workingActiveId);
        setIsHydrated(true);
      }
      await checkConfig();
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [userId, checkConfig]);

  // Persist conversations to localStorage on update and sync to server when logged in
  useEffect(() => {
    if (!isHydrated) return;
    saveConversationsState(conversations, activeConversationId, userId);

    if (userId && conversations.length > 0) {
      const timer = setTimeout(() => {
        void fetch('/api/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversations,
            activeConversationId,
          }),
        }).catch(err => {
          console.warn('Failed to sync conversations to server:', err);
        });
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [conversations, activeConversationId, isHydrated, userId]);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) ?? conversations[0],
    [conversations, activeConversationId]
  );

  const messages = useMemo(() => activeConversation?.messages ?? [], [activeConversation]);
  const tasks = useMemo(() => activeConversation?.tasks ?? [], [activeConversation]);
  const availableMinutes = activeConversation?.availableMinutes ?? null;
  const plan = useMemo(
    () => (isHydrated ? calculatePlan(tasks, availableMinutes) : INITIAL_PLAN),
    [isHydrated, tasks, availableMinutes]
  );

  const isLoading = loadingConversationId === activeConversation?.id;
  const error = activeConversation ? errorByConversation[activeConversation.id] ?? null : null;
  const lastFailedMessage = activeConversation
    ? lastFailedByConversation[activeConversation.id] ?? null
    : null;

  const updateConversationById = useCallback(
    (targetId: string, updater: (conv: Conversation) => Conversation) => {
      setConversations(prev =>
        prev.map(conv => {
          if (conv.id !== targetId) return conv;
          const updated = updater(conv);
          return {
            ...updated,
            title: deriveConversationTitle(
              updated.messages,
              updated.tasks,
              updated.title,
              updated.isCustomTitle
            ),
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  // Send message to server endpoint for the active conversation
  const sendMessage = useCallback(
    async (text: string, action?: string) => {
      if (!activeConversation) return;
      const trimmed = text.trim();
      if (!trimmed && !action) return;

      const targetId = activeConversation.id;
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: trimmed || (action ? action.replace('_', ' ') : ''),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const newMessages = [...activeConversation.messages, userMsg];
      const currentTasks = activeConversation.tasks;
      const currentAvailableMinutes = activeConversation.availableMinutes;

      updateConversationById(targetId, conv => ({
        ...conv,
        messages: [...conv.messages, userMsg],
      }));

      setLoadingConversationId(targetId);
      setErrorByConversation(prev => ({ ...prev, [targetId]: null }));
      setLastFailedByConversation(prev => ({ ...prev, [targetId]: null }));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            currentTasks,
            availableMinutes: currentAvailableMinutes,
            action,
          }),
        });

        if (!res.ok) {
          throw new Error(`Server returned error ${res.status}`);
        }

        const data: ApiChatResponse = await res.json();

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        updateConversationById(targetId, conv => ({
          ...conv,
          messages: [...conv.messages, assistantMsg],
          tasks: data.tasks,
          availableMinutes: data.availableMinutes,
        }));

        setIsDemoMode(data.isDemoMode);
        if (data.activeProvider) {
          setActiveProvider(data.activeProvider);
        }
      } catch (err: unknown) {
        console.error('Failed to communicate with NextStep chat API:', err);
        setErrorByConversation(prev => ({
          ...prev,
          [targetId]: 'Network issue or model timeout. Your tasks and plan are safe.',
        }));
        setLastFailedByConversation(prev => ({ ...prev, [targetId]: trimmed }));
      } finally {
        setLoadingConversationId(prev => (prev === targetId ? null : prev));
      }
    },
    [activeConversation, updateConversationById]
  );

  // Quick Action: Retry failed message
  const retryLastMessage = useCallback(() => {
    if (lastFailedMessage) {
      sendMessage(lastFailedMessage);
    }
  }, [lastFailedMessage, sendMessage]);

  // Direct Action: Mark task complete
  const handleTaskComplete = useCallback(
    (taskId: string, subtaskId?: string) => {
      if (!activeConversation) return;
      const targetId = activeConversation.id;
      const { updatedTasks, newPlan } = markTaskComplete(
        activeConversation.tasks,
        taskId,
        subtaskId,
        activeConversation.availableMinutes
      );

      const completedTask = activeConversation.tasks.find(t => t.id === taskId);
      const taskLabel = subtaskId
        ? completedTask?.subtasks?.find(s => s.id === subtaskId)?.title || 'subtask'
        : completedTask?.title || 'task';

      const nextActionNotice = newPlan.currentNextAction
        ? ` Next step: **${newPlan.currentNextAction.concreteAction}** (~${newPlan.currentNextAction.estimatedMinutes}m).`
        : ' All scheduled tasks are done!';

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-done`,
        role: 'assistant',
        content: `Marked "${taskLabel}" complete!${nextActionNotice}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateConversationById(targetId, conv => ({
        ...conv,
        tasks: updatedTasks,
        messages: [...conv.messages, botMsg],
      }));
    },
    [activeConversation, updateConversationById]
  );

  // Direct Action: Break down task
  const handleBreakDown = useCallback(
    (taskId: string) => {
      if (!activeConversation) return;
      const targetId = activeConversation.id;
      const target = activeConversation.tasks.find(t => t.id === taskId);
      if (!target) return;

      const broken = breakDownTask(target);
      const updatedTasks = activeConversation.tasks.map(t => (t.id === taskId ? broken : t));

      const firstSub = broken.subtasks?.[0];
      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-break`,
        role: 'assistant',
        content: `Broke down "${target.title}" into bite-sized steps. First action: **${firstSub?.title}** (~${firstSub?.estimatedMinutes}m).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateConversationById(targetId, conv => ({
        ...conv,
        tasks: updatedTasks,
        messages: [...conv.messages, botMsg],
      }));
    },
    [activeConversation, updateConversationById]
  );

  // Direct Action: Change available time
  const handleUpdateTime = useCallback(
    (minutes: number) => {
      if (!activeConversation) return;
      const targetId = activeConversation.id;

      const botMsg: ChatMessage = {
        id: `msg-${Date.now()}-time`,
        role: 'assistant',
        content: `Updated your available time to ${minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}`}. Rebuilt your plan.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      updateConversationById(targetId, conv => ({
        ...conv,
        availableMinutes: minutes,
        messages: [...conv.messages, botMsg],
      }));
    },
    [activeConversation, updateConversationById]
  );

  // Reset active conversation plan & messages
  const resetPlan = useCallback(() => {
    if (!activeConversation) return;
    const targetId = activeConversation.id;

    setConversations(prev =>
      prev.map(conv =>
        conv.id === targetId
          ? {
              ...conv,
              title: DEFAULT_CONVERSATION_TITLE,
              isCustomTitle: false,
              messages: [],
              tasks: [],
              availableMinutes: null,
              updatedAt: new Date().toISOString(),
            }
          : conv
      )
    );
    setErrorByConversation(prev => ({ ...prev, [targetId]: null }));
    setLastFailedByConversation(prev => ({ ...prev, [targetId]: null }));
  }, [activeConversation]);

  // Create and switch to a new conversation (reuses an existing empty conversation if present)
  const newConversation = useCallback(() => {
    const existingEmpty = conversations.find(
      c => c.messages.length === 0 && c.tasks.length === 0
    );
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id);
      return existingEmpty.id;
    }

    const created = createConversation();
    setConversations(prev => [created, ...prev]);
    setActiveConversationId(created.id);
    return created.id;
  }, [conversations]);

  // Switch active conversation
  const selectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  // Delete a conversation; keep at least one active conversation available
  const deleteConversation = useCallback(
    (id: string) => {
      setConversations(prev => {
        const remaining = prev.filter(c => c.id !== id);
        if (remaining.length === 0) {
          const fresh = createConversation();
          setActiveConversationId(fresh.id);
          return [fresh];
        }
        if (id === activeConversationId) {
          setActiveConversationId(remaining[0].id);
        }
        return remaining;
      });
    },
    [activeConversationId]
  );

  // Rename a conversation
  const renameConversation = useCallback((id: string, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setConversations(prev =>
      prev.map(conv =>
        conv.id === id
          ? {
              ...conv,
              title: trimmed,
              isCustomTitle: true,
              updatedAt: new Date().toISOString(),
            }
          : conv
      )
    );
  }, []);

  return {
    conversations,
    activeConversationId: activeConversation?.id ?? activeConversationId,
    messages,
    tasks,
    availableMinutes,
    plan,
    isDemoMode,
    activeProvider,
    isLoading,
    error,
    isHydrated,
    sendMessage,
    retryLastMessage,
    handleTaskComplete,
    handleBreakDown,
    handleUpdateTime,
    resetPlan,
    newConversation,
    selectConversation,
    deleteConversation,
    renameConversation,
    checkConfig,
  };
}
