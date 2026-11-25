# NextStep - One-on-One AI Task-Planning Chatbot

**Live Demo:** [https://next-step-khaki-eta.vercel.app/](https://next-step-khaki-eta.vercel.app/)

NextStep turns overwhelming to-do lists into a realistic daily plan through a simple conversation. Its main purpose is to answer one core question: *"What should I do next?"*

NextStep is built as a focused, high-clarity MVP that avoids unnecessary fluff (no account walls, payments, calendar integrations, push notifications, or collaboration).

## Features & Core Experience

1. **Natural Language Intake**: Describe tasks freely (e.g. *"I have a statistics assignment, an essay, and laundry. I have two hours."*).
2. **One Question at a Time**: The chatbot asks short, practical follow-ups to gather missing information (deadlines, durations, and available time) without repeating questions you already answered.
3. **Deterministic Guardrails & Never Overbooking**: Tasks are scheduled strictly within your available time budget. Any tasks that do not fit are gracefully moved to *Deferred* status so nothing is lost.
4. **Concrete Next Action**: Rather than broad, intimidating tasks (like *"write my essay"*), NextStep suggests immediate micro-steps (e.g. *"Write a rough thesis sentence and 3-part outline"*).
5. **Restorative Breaks**: Automatically inserts restful 10-minute breaks into long work sessions without exceeding your time budget.
6. **Local Persistence**: Chat history and structured plan state are synchronized and saved in browser storage (`localStorage`), so refreshing the page never loses your session.
7. **Key Natural Language Commands**:
   - **What next?** → Pinpoints one concrete, actionable next action.
   - **Done** → Marks the current task complete and recalculates the next step.
   - **That feels too big** (or **Break it down**) → Subdivides large tasks into bite-sized steps.
   - **I only have 30 minutes now** (or **Change my time**) → Rebuilds the plan within the new time budget.
   - **Add [task]** → Adds a new task and asks for missing details.
   - **Show my plan** → Summarizes the current schedule and progress.

## Tech Stack & Architecture

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS (clean, minimal slate palette with indigo accent)
- **Icons**: Lucide React
- **Testing**: Vitest (`vitest run`)
- **Server API**: Server-side route `/api/chat` isolating AI provider calls and data validation.
- **Provider Layer**: `src/lib/ai/provider.ts` supports Google Gemini and OpenAI with graceful fallback to an offline deterministic engine.

## Getting Started

### Prerequisites

- Node.js v20.18.0 or higher
- npm

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables (Optional)

NextStep works *100% out-of-the-box in Demo Mode without any API keys*.

To connect a live AI model:

```bash
cp .env.example .env.local
```

Then set your API key in `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here # or OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm run start
```

## How Demo Mode Works

When no API key is configured, NextStep runs in *Demo Mode*:

- **Clearly Labeled**: A badge in the header shows *Demo Mode* with an info dialog. Demo responses are deterministic and do not claim to come from a live AI model.
- **Full Conversational Flow**: You can test the exact flow from the specification:
  - User: *"I have a statistics assignment, an essay, and laundry. I have two hours."*
  - Bot: *"When are the assignments due?"*
  - User: *"Statistics tomorrow and the essay Friday."*
  - Bot: *"About how long will statistics take? (I'd estimate ~45m)"*
  - User: *"45 minutes"*
- **All Commands Work**: Click any quick action button (`⚡ What next?`, `✓ Done`, `🔨 Break it down`, `⏱️ Change my time`) or type them directly into the chat.

## Running Tests

NextStep comes with test suites covering the core planner logic and conversational command engine:

- Adding and completing tasks
- Reducing available time and replanning
- Breaking a large task into smaller steps
- Preventing overbooked plans (duration <= available time)
- Restoring saved state (serialization / hydration)
- Handling API errors without losing progress
- Conversational flow & key commands

Run the test suite:

```bash
npm test
```

## Project Structure

```text
├── src/
│   ├── app/
│   │   ├── api/chat/route.ts      # Server-side model endpoint & error fallback
│   │   ├── globals.css            # Tailwind CSS imports & theme
│   │   ├── layout.tsx             # Root HTML layout with system typography
│   │   └── page.tsx               # Main page layout (Header + Chat + PlanPanel)
│   ├── components/
│   │   ├── ChatArea.tsx           # Chat stream, starters, quick actions, auto-resize input
│   │   ├── DemoInfoModal.tsx      # Modal explaining Demo Mode vs Live AI
│   │   ├── Header.tsx             # App brand, mode badge, new plan action, mobile toggle
│   │   ├── NewPlanModal.tsx       # Confirmation dialog before clearing data
│   │   ├── PlanPanel.tsx          # Current next action, time budget, scheduled & deferred tasks
│   │   └── TimeChangeModal.tsx    # Preset and custom time budget adjuster
│   ├── hooks/
│   │   └── useNextStepSession.ts  # Session hook with localStorage persistence & sync
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── demoEngine.ts      # Deterministic rule engine for offline demo mode
│   │   │   └── provider.ts        # Model integration module (Gemini/OpenAI + fallback)
│   │   └── planner.ts             # Deterministic scheduling, guardrails, & micro-actions
│   └── types/
│       └── index.ts               # Task, Subtask, PlanBlock, PlanState, ChatMessage definitions
├── tests/
│   ├── demoEngine.test.ts         # Conversational flow and command tests
│   └── planner.test.ts            # Planner guardrails and state tests
├── .env.example                   # Clean template for environment variables
├── package.json                   # Scripts and dependencies
└── vitest.config.mts              # Vitest test configuration
```
