import { describe, it, expect } from 'vitest';
import {
  CONVERSATIONS_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  DEFAULT_CONVERSATION_TITLE,
  createConversation,
  deriveConversationTitle,
  sortConversations,
  formatConversationTimestamp,
  getConversationPreview,
  loadConversationsState,
  saveConversationsState,
} from '../src/lib/conversations';
import { ChatMessage, Task } from '../src/types';

function createMemoryStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('Conversations Store Helpers', () => {
  it('derives title from the first user message and truncates long text', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'assistant', content: 'Welcome!', timestamp: '10:00 AM' },
      {
        id: '2',
        role: 'user',
        content: 'I have a statistics assignment, an essay, and laundry to finish today.',
        timestamp: '10:01 AM',
      },
    ];

    const title = deriveConversationTitle(messages, []);
    expect(title.length).toBeLessThanOrEqual(42);
    expect(title.endsWith('…')).toBe(true);
    expect(title.startsWith('I have a statistics assignment')).toBe(true);
  });

  it('preserves custom titles when isCustomTitle is true', () => {
    const messages: ChatMessage[] = [
      { id: '1', role: 'user', content: 'Some message', timestamp: '10:00 AM' },
    ];
    expect(deriveConversationTitle(messages, [], 'Finals Week Plan', true)).toBe(
      'Finals Week Plan'
    );
  });

  it('falls back to default title when no messages or tasks exist', () => {
    expect(deriveConversationTitle([], [])).toBe(DEFAULT_CONVERSATION_TITLE);
  });

  it('sorts conversations most recently updated first', () => {
    const older = createConversation({
      id: 'c1',
      updatedAt: '2026-11-23T10:00:00.000Z',
    });
    const newer = createConversation({
      id: 'c2',
      updatedAt: '2026-11-24T12:00:00.000Z',
    });

    const sorted = sortConversations([older, newer]);
    expect(sorted.map(c => c.id)).toEqual(['c2', 'c1']);
  });

  it('formats timestamps for today, yesterday, and older dates', () => {
    const now = new Date('2026-11-24T15:00:00.000Z');
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const older = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString();

    expect(formatConversationTimestamp(yesterday, now)).toBe('Yesterday');
    expect(formatConversationTimestamp(older, now)).not.toBe('Yesterday');
    expect(formatConversationTimestamp(now.toISOString(), now).length).toBeGreaterThan(0);
  });

  it('strips markdown bold markers from preview text', () => {
    const conv = createConversation({
      messages: [
        {
          id: 'm1',
          role: 'assistant',
          content: 'Next step: **Write thesis** (~15m)',
          timestamp: '10:00 AM',
        },
      ],
    });
    expect(getConversationPreview(conv)).toBe('Next step: Write thesis (~15m)');
  });

  it('migrates legacy single-session storage when multi-conversation key is absent', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Statistics assignment',
        estimatedMinutes: 45,
        priority: 'high',
        status: 'pending',
      },
    ];
    const messages: ChatMessage[] = [
      { id: 'm1', role: 'user', content: 'Finish statistics assignment', timestamp: '9:00 AM' },
    ];
    const storage = createMemoryStorage({
      [LEGACY_STORAGE_KEY]: JSON.stringify({
        messages,
        tasks,
        availableMinutes: 90,
      }),
    });

    const state = loadConversationsState(storage);
    expect(state.conversations.length).toBe(1);
    expect(state.conversations[0].title).toBe('Finish statistics assignment');
    expect(state.conversations[0].tasks).toHaveLength(1);
    expect(state.conversations[0].availableMinutes).toBe(90);
    expect(state.activeConversationId).toBe(state.conversations[0].id);
  });

  it('saves and restores multiple conversations and active selection', () => {
    const storage = createMemoryStorage();
    const c1 = createConversation({ id: 'conv-1', title: 'Morning Plan', isCustomTitle: true });
    const c2 = createConversation({ id: 'conv-2', title: 'Evening Errands', isCustomTitle: true });

    saveConversationsState([c1, c2], 'conv-2', storage);
    expect(storage.getItem(CONVERSATIONS_STORAGE_KEY)).not.toBeNull();

    const restored = loadConversationsState(storage);
    expect(restored.conversations.map(c => c.id)).toEqual(['conv-1', 'conv-2']);
    expect(restored.activeConversationId).toBe('conv-2');
  });

  it('keeps user conversations isolated by userId', () => {
    const storage = createMemoryStorage();
    const user1Conv = createConversation({ id: 'u1-c1', title: 'User 1 Work', isCustomTitle: true });
    const user2Conv = createConversation({ id: 'u2-c1', title: 'User 2 Chores', isCustomTitle: true });

    saveConversationsState([user1Conv], 'u1-c1', 'usr-123', storage);
    saveConversationsState([user2Conv], 'u2-c1', 'usr-456', storage);

    const user1State = loadConversationsState('usr-123', storage);
    const user2State = loadConversationsState('usr-456', storage);

    expect(user1State.conversations[0].title).toBe('User 1 Work');
    expect(user2State.conversations[0].title).toBe('User 2 Chores');
  });
});
