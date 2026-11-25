import { NextRequest, NextResponse } from 'next/server';
import { OAUTH_STATE_COOKIE_NAME, upsertGoogleUser } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/authCookies';
import { readEnvLocalKey } from '@/lib/envConfig';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const oauthError = req.nextUrl.searchParams.get('error');
  const expectedState = req.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (oauthError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(oauthError)}`, req.url));
  }

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL('/login?error=invalid_oauth_state', req.url));
  }

  const clientId = readEnvLocalKey('GOOGLE_CLIENT_ID');
  const clientSecret = readEnvLocalKey('GOOGLE_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', req.url));
  }

  try {
    const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange error details:', errText);
      throw new Error(`Google token exchange failed (${tokenRes.status}): ${errText}`);
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new Error('Missing Google access token');
    }

    const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userInfoRes.ok) {
      throw new Error(`Failed to fetch Google profile (${userInfoRes.status})`);
    }

    const profile = (await userInfoRes.json()) as {
      email?: string;
      name?: string;
      picture?: string;
    };

    if (!profile.email) {
      throw new Error('Google profile did not include an email address');
    }

    const user = upsertGoogleUser({
      email: profile.email,
      name: profile.name || profile.email.split('@')[0],
      avatarUrl: profile.picture,
    });

    const res = NextResponse.redirect(new URL('/', req.url));
    res.cookies.delete(OAUTH_STATE_COOKIE_NAME);
    return attachSessionCookie(res, user);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(new URL('/login?error=google_auth_failed', req.url));
  }
}
