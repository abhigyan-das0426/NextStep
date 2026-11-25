import fs from 'fs';
import os from 'os';
import path from 'path';
import { Conversation } from '@/types';

export interface UserConversationsRecord {
  conversations: Conversation[];
  activeConversationId: string;
  updatedAt: string;
}

type ConversationsDatabase = Record<string, UserConversationsRecord>;

function getConversationsFilePath(): string {
  const dir = process.env.VERCEL ? os.tmpdir() : process.cwd();
  return path.resolve(dir, '.nextstep-conversations.json');
}

function readAllConversations(): ConversationsDatabase {
  const filePath = getConversationsFilePath();
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (err) {
    console.warn('Failed to read .nextstep-conversations.json:', err);
    return {};
  }
}

function writeAllConversations(db: ConversationsDatabase): void {
  const filePath = getConversationsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(db, null, 2) + '\n', {
      encoding: 'utf8',
      mode: 0o600,
    });
  } catch (err) {
    console.error('Failed to write .nextstep-conversations.json:', err);
  }
}

export function getUserConversations(userId: string): UserConversationsRecord | null {
  if (!userId) return null;
  const db = readAllConversations();
  return db[userId] ?? null;
}

export function saveUserConversations(
  userId: string,
  conversations: Conversation[],
  activeConversationId: string
): void {
  if (!userId) return;
  const db = readAllConversations();
  db[userId] = {
    conversations: Array.isArray(conversations) ? conversations : [],
    activeConversationId: activeConversationId || conversations[0]?.id || '',
    updatedAt: new Date().toISOString(),
  };
  writeAllConversations(db);
}
