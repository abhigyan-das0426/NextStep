import { ChatMessage, Conversation, Task } from '@/types';

export const CONVERSATIONS_STORAGE_KEY = 'nextstep_conversations_v1';
export const LEGACY_STORAGE_KEY = 'nextstep_session_state_v2';
export const DEFAULT_CONVERSATION_TITLE = 'New conversation';

/**
 * Derive a concise conversation title from the first user message or first task.
 */
export function deriveConversationTitle(
  messages: ChatMessage[],
  tasks: Task[],
  currentTitle?: string,
  isCustomTitle?: boolean
): string {
  if (isCustomTitle && currentTitle?.trim()) {
    return currentTitle.trim();
  }

  const firstUserMsg = messages.find(m => m.role === 'user' && m.content.trim().length > 0);
  const rawSource = firstUserMsg?.content ?? tasks[0]?.title ?? '';
  const normalized = rawSource.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return DEFAULT_CONVERSATION_TITLE;
  }

  const maxLength = 42;
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

/**
 * Create a new conversation record with sensible defaults.
 */
export function createConversation(overrides: Partial<Conversation> = {}): Conversation {
  const now = new Date().toISOString();
  const id =
    overrides.id ??
    `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  return {
    id,
    title: overrides.title ?? DEFAULT_CONVERSATION_TITLE,
    isCustomTitle: overrides.isCustomTitle ?? false,
    messages: overrides.messages ?? [],
    tasks: overrides.tasks ?? [],
    availableMinutes: overrides.availableMinutes ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

/**
 * Sort conversations by most recently updated first.
 */
export function sortConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Format an ISO timestamp for display inside the conversations sidebar.
 */
export function formatConversationTimestamp(isoDate: string, now = new Date()): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '';

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Produce a clean single-line preview snippet from a conversation's latest message.
 */
export function getConversationPreview(conversation: Conversation): string {
  const lastMsg = conversation.messages[conversation.messages.length - 1];
  if (!lastMsg) {
    if (conversation.tasks.length > 0) {
      return `${conversation.tasks.length} task${conversation.tasks.length === 1 ? '' : 's'} planned`;
    }
    return 'No messages yet';
  }

  return lastMsg.content.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

export function getUserConversationsKey(userId?: string): string {
  if (userId && userId.trim()) {
    return `${CONVERSATIONS_STORAGE_KEY}_user_${userId.trim()}`;
  }
  return CONVERSATIONS_STORAGE_KEY;
}

/**
 * Load conversations from storage, migrating any legacy single-session state if present.
 */
export function loadConversationsState(
  storageOrUserId?: Pick<Storage, 'getItem'> | string,
  maybeStorage?: Pick<Storage, 'getItem'>
): { conversations: Conversation[]; activeConversationId: string } {
  let userId: string | undefined;
  let store: Pick<Storage, 'getItem'> | undefined;

  if (typeof storageOrUserId === 'string') {
    userId = storageOrUserId;
    store = maybeStorage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  } else {
    store = storageOrUserId ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  }

  const storageKey = getUserConversationsKey(userId);

  if (store) {
    try {
      const raw = store.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.conversations) && parsed.conversations.length > 0) {
          const valid: Conversation[] = parsed.conversations.map((c: Partial<Conversation>) => {
            const messages = Array.isArray(c.messages) ? c.messages : [];
            const tasks = Array.isArray(c.tasks) ? c.tasks : [];
            return createConversation({
              ...c,
              messages,
              tasks,
              availableMinutes: typeof c.availableMinutes === 'number' ? c.availableMinutes : null,
              title: deriveConversationTitle(messages, tasks, c.title, c.isCustomTitle),
            });
          });

          const activeExists = valid.some(c => c.id === parsed.activeConversationId);
          return {
            conversations: valid,
            activeConversationId: activeExists ? parsed.activeConversationId : valid[0].id,
          };
        }
      }

      // If looking up guest key, check for legacy migration
      if (storageKey === CONVERSATIONS_STORAGE_KEY) {
        const legacyRaw = store.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw) {
          const legacy = JSON.parse(legacyRaw);
          const messages: ChatMessage[] = Array.isArray(legacy?.messages) ? legacy.messages : [];
          const tasks: Task[] = Array.isArray(legacy?.tasks) ? legacy.tasks : [];
          const availableMinutes =
            typeof legacy?.availableMinutes === 'number' ? legacy.availableMinutes : null;

          if (messages.length > 0 || tasks.length > 0) {
            const migrated = createConversation({
              messages,
              tasks,
              availableMinutes,
              title: deriveConversationTitle(messages, tasks),
            });
            return {
              conversations: [migrated],
              activeConversationId: migrated.id,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load conversations from localStorage:', e);
    }
  }

  const initial = createConversation();
  return {
    conversations: [initial],
    activeConversationId: initial.id,
  };
}

/**
 * Persist conversations and active selection to storage.
 */
export function saveConversationsState(
  conversations: Conversation[],
  activeConversationId: string,
  storageOrUserId?: Pick<Storage, 'setItem'> | string,
  maybeStorage?: Pick<Storage, 'setItem'>
): void {
  let userId: string | undefined;
  let store: Pick<Storage, 'setItem'> | undefined;

  if (typeof storageOrUserId === 'string') {
    userId = storageOrUserId;
    store = maybeStorage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  } else {
    store = storageOrUserId ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  }

  if (!store) return;
  const storageKey = getUserConversationsKey(userId);

  try {
    store.setItem(
      storageKey,
      JSON.stringify({
        conversations,
        activeConversationId,
      })
    );
  } catch (e) {
    console.warn('Failed to persist conversations to localStorage:', e);
  }
}
