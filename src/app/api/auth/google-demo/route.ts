import { NextRequest, NextResponse } from 'next/server';
import { isGoogleOAuthConfigured, upsertGoogleUser } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/authCookies';

export async function POST(req: NextRequest) {
  if (isGoogleOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Live Google OAuth is enabled; use /api/auth/google.' },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const name = typeof body?.name === 'string' ? body.name : '';

    const user = upsertGoogleUser({ email, name });
    const res = NextResponse.json({ user });
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to sign in with Google.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
