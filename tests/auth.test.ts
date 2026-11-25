import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  verifySessionToken,
  signUpWithEmail,
  signInWithEmail,
  upsertGoogleUser,
} from '../src/lib/auth';
import { AuthUser } from '../src/types';

describe('NextStep Auth Helpers', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextstep-auth-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('hashes and verifies passwords securely with scrypt', () => {
    const hash = hashPassword('correct-horse-battery');
    expect(hash).toContain(':');
    expect(verifyPassword('correct-horse-battery', hash)).toBe(true);
    expect(verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('signs and verifies session tokens and rejects tampered tokens', () => {
    const user: AuthUser = {
      id: 'usr-1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      provider: 'email',
      createdAt: '2026-11-24T00:00:00.000Z',
    };
    const secret = 'test-secret-0123456789abcdef0123456789';
    const token = signSessionToken(user, secret);

    const verified = verifySessionToken(token, secret);
    expect(verified).toEqual(user);

    expect(verifySessionToken(`${token}tampered`, secret)).toBeNull();
    expect(verifySessionToken(token, 'different-secret')).toBeNull();
  });

  it('registers a user with email and signs them back in', () => {
    const created = signUpWithEmail('Alex Rivera', 'Alex@Example.com', 'password123');
    expect(created.email).toBe('alex@example.com');
    expect(created.provider).toBe('email');

    const signedIn = signInWithEmail('alex@example.com', 'password123');
    expect(signedIn.id).toBe(created.id);

    expect(() => signInWithEmail('alex@example.com', 'wrongpass')).toThrow(/Invalid email or password/);
    expect(() => signUpWithEmail('Alex', 'alex@example.com', 'password123')).toThrow(/already exists/);
  });

  it('upserts Google users and blocks password sign-in for Google-only accounts', () => {
    const googleUser = upsertGoogleUser({
      email: 'user@gmail.com',
      name: 'Google User',
    });

    expect(googleUser.provider).toBe('google');
    expect(googleUser.email).toBe('user@gmail.com');

    expect(() => signInWithEmail('user@gmail.com', 'password123')).toThrow(/Google Sign-In/);
    expect(() => signUpWithEmail('User', 'user@gmail.com', 'password123')).toThrow(/registered with Google/);
  });
});
