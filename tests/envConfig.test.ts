import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { readEnvLocalKey, saveEnvLocalKey } from '../src/lib/envConfig';

describe('envConfig persistence helpers', () => {
  let tmpDir: string;
  const origGemini = process.env.GEMINI_API_KEY;
  const origOpenai = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nextstep-env-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    delete process.env.GEMINI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (origGemini !== undefined) process.env.GEMINI_API_KEY = origGemini;
    else delete process.env.GEMINI_API_KEY;
    if (origOpenai !== undefined) process.env.OPENAI_API_KEY = origOpenai;
    else delete process.env.OPENAI_API_KEY;
  });

  it('saves and reads GEMINI_API_KEY across process.env resets', () => {
    saveEnvLocalKey('gemini', 'AQ.test-key-123456');
    expect(process.env.GEMINI_API_KEY).toBe('AQ.test-key-123456');

    // Simulate a separate worker/module without in-memory process.env
    delete process.env.GEMINI_API_KEY;
    expect(readEnvLocalKey('GEMINI_API_KEY')).toBe('AQ.test-key-123456');
    expect(process.env.GEMINI_API_KEY).toBe('AQ.test-key-123456');
  });

  it('updates an existing key in .env.local without clobbering other keys', () => {
    fs.writeFileSync(
      path.join(tmpDir, '.env.local'),
      'GEMINI_API_KEY=old-key\nOPENAI_API_KEY=sk-existing\n',
      'utf8'
    );

    saveEnvLocalKey('gemini', 'AQ.new-key-999');
    expect(readEnvLocalKey('GEMINI_API_KEY')).toBe('AQ.new-key-999');
    expect(readEnvLocalKey('OPENAI_API_KEY')).toBe('sk-existing');
  });

  it('saves and reads GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET', () => {
    saveEnvLocalKey('GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');
    saveEnvLocalKey('GOOGLE_CLIENT_SECRET', 'test-client-secret-123');

    expect(readEnvLocalKey('GOOGLE_CLIENT_ID')).toBe('test-client-id.apps.googleusercontent.com');
    expect(readEnvLocalKey('GOOGLE_CLIENT_SECRET')).toBe('test-client-secret-123');
  });
});
