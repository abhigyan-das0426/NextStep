import { NextRequest, NextResponse } from 'next/server';
import { readEnvLocalKey, saveEnvLocalKey } from '@/lib/envConfig';
import { isGoogleOAuthConfigured } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const geminiKey = readEnvLocalKey('GEMINI_API_KEY');
  const openaiKey = readEnvLocalKey('OPENAI_API_KEY');
  const googleClientId = readEnvLocalKey('GOOGLE_CLIENT_ID');
  const googleClientSecret = readEnvLocalKey('GOOGLE_CLIENT_SECRET');

  let activeProvider: 'gemini' | 'openai' | 'none' = 'none';
  if (geminiKey) activeProvider = 'gemini';
  else if (openaiKey) activeProvider = 'openai';

  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  return NextResponse.json({
    hasGeminiKey: Boolean(geminiKey),
    hasOpenaiKey: Boolean(openaiKey),
    activeProvider,
    geminiKeyPreview: geminiKey ? `${geminiKey.slice(0, 4)}...${geminiKey.slice(-4)}` : null,
    openaiKeyPreview: openaiKey ? `${openaiKey.slice(0, 3)}...${openaiKey.slice(-4)}` : null,
    googleOAuthConfigured: isGoogleOAuthConfigured(),
    googleClientIdPreview: googleClientId ? `${googleClientId.slice(0, 12)}...` : null,
    hasGoogleClientSecret: Boolean(googleClientSecret),
    redirectUri,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKey, googleClientId, googleClientSecret } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Provider is required' }, { status: 400 });
    }

    if (provider === 'google') {
      const cId = (googleClientId || '').trim();
      const cSec = (googleClientSecret || '').trim();

      if (!cId) {
        return NextResponse.json({ error: 'Google Client ID is required' }, { status: 400 });
      }
      if (!cId.endsWith('.apps.googleusercontent.com')) {
        return NextResponse.json(
          {
            error:
              'Invalid Google Client ID format. It should look like: [numbers]-[id].apps.googleusercontent.com. Make sure you created an "OAuth 2.0 Client ID" under Google Cloud Console Credentials (not an API key).',
          },
          { status: 400 }
        );
      }
      if (!cSec) {
        return NextResponse.json({ error: 'Google Client Secret is required' }, { status: 400 });
      }
      if (cSec.startsWith('http://') || cSec.startsWith('https://')) {
        return NextResponse.json(
          {
            error:
              'The Client Secret entered looks like a URL. The Google Client Secret is the secret code from the Google Cloud popup (it usually starts with GOCSPX-).',
          },
          { status: 400 }
        );
      }

      saveEnvLocalKey('GOOGLE_CLIENT_ID', cId);
      saveEnvLocalKey('GOOGLE_CLIENT_SECRET', cSec);

      return NextResponse.json({
        success: true,
        googleOAuthConfigured: true,
        message: 'Google OAuth credentials successfully configured in .env.local!',
      });
    }

    if (provider !== 'gemini' && provider !== 'openai') {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length < 5) {
      return NextResponse.json({ error: 'API key is too short' }, { status: 400 });
    }

    saveEnvLocalKey(provider, trimmedKey);

    return NextResponse.json({
      success: true,
      activeProvider: provider,
      message: `Successfully connected ${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'} in .env.local!`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update environment configuration';
    console.error('Failed to save configuration to .env.local:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
