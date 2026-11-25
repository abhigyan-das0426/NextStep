import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE_NAME, isGoogleOAuthConfigured } from '@/lib/auth';
import { readEnvLocalKey } from '@/lib/envConfig';

export async function GET(req: NextRequest) {
  const clientId = readEnvLocalKey('GOOGLE_CLIENT_ID');
  if (!isGoogleOAuthConfigured() || !clientId) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  const state = crypto.randomBytes(16).toString('hex');
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', clientId);
  googleUrl.searchParams.set('redirect_uri', redirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('prompt', 'select_account');
  googleUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(googleUrl.toString());
  res.cookies.set(OAUTH_STATE_COOKIE_NAME, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10,
  });
  return res;
}
