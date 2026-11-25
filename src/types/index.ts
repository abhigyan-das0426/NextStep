export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deferred';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  estimatedMinutes?: number;
}

export interface Task {
  id: string;
  title: string;
  deadline?: string;
  estimatedMinutes?: number;
  priority: Priority;
  status: TaskStatus;
  subtasks?: Subtask[];
  concreteNextAction?: string; // Actionable micro-step (e.g., "Write rough thesis sentence")
  notes?: string;
}

export interface PlanBlock {
  id: string;
  taskId?: string;
  subtaskId?: string;
  title: string;
  concreteAction?: string;
  durationMinutes: number;
  type: 'task' | 'break';
  completed: boolean;
  order: number;
}

export interface NextActionInfo {
  taskId: string;
  subtaskId?: string;
  taskTitle: string;
  concreteAction: string;
  estimatedMinutes?: number;
  deadline?: string;
}

export interface PlanState {
  availableMinutes: number | null; // Total minutes user has today
  totalPlannedMinutes: number;     // Minutes scheduled for tasks + breaks
  totalWorkMinutes: number;        // Minutes scheduled strictly for tasks
  totalBreakMinutes: number;       // Minutes scheduled for breaks
  scheduledBlocks: PlanBlock[];    // Blocks scheduled within available time
  deferredTaskIds: string[];       // Task IDs that do not fit into available time
  currentNextAction: NextActionInfo | null;
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  suggestedQuickActions?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  isCustomTitle?: boolean;
  messages: ChatMessage[];
  tasks: Task[];
  availableMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentTasks: Task[];
  availableMinutes: number | null;
  action?: 'what_next' | 'done' | 'break_down' | 'change_time' | 'show_plan' | 'chat';
}

export interface ApiChatResponse {
  message: string;
  tasks: Task[];
  availableMinutes: number | null;
  plan: PlanState;
  isDemoMode: boolean;
  activeProvider?: 'gemini' | 'openai' | 'demo';
  error?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google';
  avatarUrl?: string;
  createdAt: string;
}
