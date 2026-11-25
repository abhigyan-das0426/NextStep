import { NextRequest, NextResponse } from 'next/server';
import { signUpWithEmail } from '@/lib/auth';
import { attachSessionCookie } from '@/lib/authCookies';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name : '';
    const email = typeof body?.email === 'string' ? body.email : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    const user = signUpWithEmail(name, email, password);
    const res = NextResponse.json({ user }, { status: 201 });
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unable to create account.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
