import { NextRequest, NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/ai/provider';
import { ApiChatRequest, ApiChatResponse } from '@/types';
import { calculatePlan } from '@/lib/planner';

export async function POST(req: NextRequest) {
  try {
    const body: ApiChatRequest = await req.json();
    const { messages = [], currentTasks = [], availableMinutes = null, action } = body;

    const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : '';
    const history = messages.slice(0, -1);

    const result = await getChatResponse(
      lastMessage,
      history,
      currentTasks,
      availableMinutes,
      action
    );

    const responsePayload: ApiChatResponse = {
      message: result.message,
      tasks: result.tasks,
      availableMinutes: result.availableMinutes,
      plan: result.plan,
      isDemoMode: result.isDemoMode,
      activeProvider: result.activeProvider,
    };

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('Chat API Error:', err);

    return NextResponse.json(
      {
        message: "I ran into a temporary error, but I kept your plan safe. What should we do next?",
        tasks: [],
        availableMinutes: null,
        plan: calculatePlan([], null),
        isDemoMode: true,
        activeProvider: 'demo',
        error: err.message || 'Internal server error',
      },
      { status: 200 }
    );
  }
}
