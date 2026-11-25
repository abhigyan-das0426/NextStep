import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { AuthUser } from '@/types';
import { readEnvLocalKey } from '@/lib/envConfig';

export const SESSION_COOKIE_NAME = 'nextstep_session';
export const OAUTH_STATE_COOKIE_NAME = 'nextstep_google_state';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface StoredUserRecord extends AuthUser {
  passwordHash?: string;
}

interface SessionPayload {
  user: AuthUser;
  exp: number;
}

function getStorageDir(): string {
  // Serverless platforms like Vercel mount the app directory read-only; use os.tmpdir() there.
  if (process.env.VERCEL) {
    return os.tmpdir();
  }
  return process.cwd();
}

function getUsersFilePath(): string {
  return path.resolve(getStorageDir(), '.nextstep-users.json');
}

function getSecretFilePath(): string {
  return path.resolve(getStorageDir(), '.nextstep-auth-secret');
}

export function getOrCreateAuthSecret(): string {
  const fromEnv = readEnvLocalKey('AUTH_SECRET');
  if (fromEnv) return fromEnv;

  const secretPath = getSecretFilePath();
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretPath, generated + '\n', { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch (e) {
    console.warn('Unable to persist auth secret, using ephemeral secret:', e);
    return crypto.randomBytes(32).toString('hex');
  }
}

export function isGoogleOAuthConfigured(): boolean {
  const cId = readEnvLocalKey('GOOGLE_CLIENT_ID');
  const cSec = readEnvLocalKey('GOOGLE_CLIENT_SECRET');
  if (!cId || !cSec) return false;
  const trimmedId = cId.trim();
  const trimmedSec = cSec.trim();
  if (trimmedId.length === 0 || trimmedSec.length === 0) return false;
  // Ensure it is a valid Google OAuth Client ID and not a placeholder
  if (!trimmedId.endsWith('.apps.googleusercontent.com') || trimmedId.startsWith('test-')) {
    return false;
  }
  return true;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(keyHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export function signSessionToken(user: AuthUser, secret = getOrCreateAuthSecret()): string {
  const payload: SessionPayload = {
    user,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret = getOrCreateAuthSecret()
): AuthUser | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, providedSig] = parts;
  if (!encodedPayload || !providedSig) return null;

  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

  const providedBuf = Buffer.from(providedSig);
  const expectedBuf = Buffer.from(expectedSig);
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    ) as SessionPayload;

    if (!parsed?.user?.email || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function readStoredUsers(): StoredUserRecord[] {
  const filePath = getUsersFilePath();
  if (!fs.existsSync(filePath)) return [];
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredUsers(users: StoredUserRecord[]): void {
  const filePath = getUsersFilePath();
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2) + '\n', {
    encoding: 'utf8',
    mode: 0o600,
  });
}

function toPublicUser(record: StoredUserRecord): AuthUser {
  return {
    id: record.id,
    name: record.name,
    email: record.email,
    provider: record.provider,
    avatarUrl: record.avatarUrl,
    createdAt: record.createdAt,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function signUpWithEmail(name: string, email: string, password: string): AuthUser {
  const cleanName = name.trim();
  const cleanEmail = normalizeEmail(email);

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please enter your name (at least 2 characters).');
  }
  if (!isValidEmail(cleanEmail)) {
    throw new Error('Please enter a valid email address.');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long.');
  }

  const users = readStoredUsers();
  const existing = users.find(u => normalizeEmail(u.email) === cleanEmail);
  if (existing) {
    if (existing.provider === 'google' && !existing.passwordHash) {
      throw new Error('This email is already registered with Google. Please sign in with Google.');
    }
    throw new Error('An account with this email already exists. Please sign in instead.');
  }

  const record: StoredUserRecord = {
    id: `usr-${crypto.randomUUID()}`,
    name: cleanName,
    email: cleanEmail,
    provider: 'email',
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  writeStoredUsers(users);
  return toPublicUser(record);
}

export function signInWithEmail(email: string, password: string): AuthUser {
  const cleanEmail = normalizeEmail(email);
  if (!isValidEmail(cleanEmail) || !password) {
    throw new Error('Please enter your email and password.');
  }

  const users = readStoredUsers();
  const existing = users.find(u => normalizeEmail(u.email) === cleanEmail);
  if (!existing) {
    throw new Error('Invalid email or password.');
  }
  if (!existing.passwordHash) {
    throw new Error('This account uses Google Sign-In. Please click "Continue with Google".');
  }
  if (!verifyPassword(password, existing.passwordHash)) {
    throw new Error('Invalid email or password.');
  }

  return toPublicUser(existing);
}

export function upsertGoogleUser(profile: {
  email: string;
  name: string;
  avatarUrl?: string;
}): AuthUser {
  const cleanEmail = normalizeEmail(profile.email);
  const cleanName = profile.name.trim() || cleanEmail.split('@')[0];

  if (!isValidEmail(cleanEmail)) {
    throw new Error('Google account did not return a valid email address.');
  }

  const users = readStoredUsers();
  const idx = users.findIndex(u => normalizeEmail(u.email) === cleanEmail);

  if (idx >= 0) {
    const updated: StoredUserRecord = {
      ...users[idx],
      name: cleanName || users[idx].name,
      avatarUrl: profile.avatarUrl || users[idx].avatarUrl,
      provider: 'google',
    };
    users[idx] = updated;
    writeStoredUsers(users);
    return toPublicUser(updated);
  }

  const record: StoredUserRecord = {
    id: `usr-${crypto.randomUUID()}`,
    name: cleanName,
    email: cleanEmail,
    provider: 'google',
    avatarUrl: profile.avatarUrl,
    createdAt: new Date().toISOString(),
  };

  users.push(record);
  writeStoredUsers(users);
  return toPublicUser(record);
}
