import fs from 'fs';
import path from 'path';

export type SupportedEnvKey =
  | 'GEMINI_API_KEY'
  | 'OPENAI_API_KEY'
  | 'GOOGLE_CLIENT_ID'
  | 'GOOGLE_CLIENT_SECRET'
  | 'AUTH_SECRET';

function getEnvLocalPath(): string {
  return path.resolve(process.cwd(), '.env.local');
}

function parseEnvValue(envContent: string, keyName: SupportedEnvKey): string | undefined {
  const lines = envContent.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match || match[1] !== keyName) continue;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1).trim();
    }
    if (value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Read an API key from .env.local first (so updates persist across route handlers
 * and edits take effect immediately), falling back to process.env.
 */
export function readEnvLocalKey(keyName: SupportedEnvKey): string | undefined {
  try {
    const envLocalPath = getEnvLocalPath();
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8');
      const parsed = parseEnvValue(content, keyName);
      if (parsed) {
        process.env[keyName] = parsed;
        return parsed;
      } else {
        // If key is empty or missing from .env.local, clear stale in-memory value
        delete process.env[keyName];
        return undefined;
      }
    }
  } catch (e) {
    console.warn(`Failed to read ${keyName} from .env.local:`, e);
  }

  const fromEnv = process.env[keyName]?.trim();
  return fromEnv || undefined;
}

/**
 * Persist an API key or OAuth configuration into both process.env and .env.local.
 */
export function saveEnvLocalKey(
  providerOrKey: 'gemini' | 'openai' | SupportedEnvKey,
  apiKey: string
): void {
  const trimmedKey = apiKey.trim();
  let keyName: SupportedEnvKey;
  if (providerOrKey === 'gemini') {
    keyName = 'GEMINI_API_KEY';
  } else if (providerOrKey === 'openai') {
    keyName = 'OPENAI_API_KEY';
  } else {
    keyName = providerOrKey;
  }

  process.env[keyName] = trimmedKey;

  const envLocalPath = getEnvLocalPath();
  let envContent = '';
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
  }

  const keyRegex = new RegExp(`^${keyName}=.*$`, 'm');
  if (keyRegex.test(envContent)) {
    envContent = envContent.replace(keyRegex, `${keyName}=${trimmedKey}`);
  } else {
    envContent = `${envContent.trimEnd()}\n${keyName}=${trimmedKey}\n`;
  }

  try {
    fs.writeFileSync(envLocalPath, envContent.trim() + '\n', 'utf8');
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EROFS' || code === 'EACCES') {
      throw new Error(
        'Cannot write .env.local in this hosted environment. Please set GEMINI_API_KEY or OPENAI_API_KEY in your hosting Environment Variables.'
      );
    }
    throw err;
  }
}
