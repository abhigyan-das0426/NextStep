import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmail } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/authCookies';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const user = signInWithEmail(email, password);
    const res = NextResponse.json({ user });
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid email or password.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
