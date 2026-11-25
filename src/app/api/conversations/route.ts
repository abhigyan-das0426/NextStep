import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';
import {
  getUserConversations,
  saveUserConversations,
} from '@/lib/serverConversations';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  if (!user) {
    return NextResponse.json({
      authenticated: false,
      conversations: [],
      activeConversationId: null,
    });
  }

  const record = getUserConversations(user.id);
  return NextResponse.json({
    authenticated: true,
    user,
    conversations: record?.conversations ?? [],
    activeConversationId: record?.activeConversationId ?? null,
  });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = verifySessionToken(token);

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized: user must be signed in to save conversation history.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { conversations, activeConversationId } = body;

    if (!Array.isArray(conversations)) {
      return NextResponse.json(
        { error: 'Invalid payload: conversations must be an array.' },
        { status: 400 }
      );
    }

    saveUserConversations(user.id, conversations, activeConversationId);

    return NextResponse.json({
      success: true,
      userId: user.id,
      savedCount: conversations.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save conversations.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
