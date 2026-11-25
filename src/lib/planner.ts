import { Task, Subtask, PlanBlock, PlanState, NextActionInfo } from '@/types';

/**
 * Format minutes into a friendly string like "45m" or "1h 30m"
 */
export function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  return remaining === 0 ? `${hours}h` : `${hours}h ${remaining}m`;
}

/**
 * Assess deadline urgency for sorting
 */
export function getDeadlineUrgency(deadline?: string): number {
  if (!deadline) return 100;
  const lower = deadline.toLowerCase().trim();
  if (lower.includes('now') || lower.includes('asap') || lower.includes('urgent') || lower.includes('today') || lower.includes('tonight')) {
    return 1;
  }
  if (lower.includes('tomorrow')) {
    return 2;
  }
  if (lower.includes('monday') || lower.includes('tuesday') || lower.includes('wednesday') || lower.includes('thursday') || lower.includes('friday') || lower.includes('saturday') || lower.includes('sunday')) {
    return 3;
  }
  if (lower.includes('next week') || lower.includes('later')) {
    return 4;
  }
  return 5;
}

/**
 * Get priority weight for sorting
 */
export function getPriorityWeight(priority: Task['priority']): number {
  switch (priority) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 2;
  }
}

/**
 * Generates an actionable micro-step for broad or overwhelming tasks.
 */
export function generateConcreteAction(title: string, subtaskTitle?: string): string {
  if (subtaskTitle) {
    return subtaskTitle;
  }

  const lower = title.toLowerCase();

  if (lower.includes('essay') || lower.includes('paper') || lower.includes('report') || lower.includes('write')) {
    return 'Write a rough thesis sentence and jot down 3 bullet arguments';
  }
  if (lower.includes('stat') || lower.includes('math') || lower.includes('problem set') || lower.includes('physics')) {
    return 'Open problem set and solve the first 2 calculation problems';
  }
  if (lower.includes('laundry') || lower.includes('wash')) {
    return 'Sort clothes into washer and start the cycle';
  }
  if (lower.includes('read') || lower.includes('chapter')) {
    return 'Skim introduction, subheadings, and first 5 pages';
  }
  if (lower.includes('email') || lower.includes('inbox')) {
    return 'Draft and send the single most urgent reply';
  }
  if (lower.includes('clean') || lower.includes('organize') || lower.includes('room')) {
    return 'Clear and wipe down your immediate desk workspace';
  }
  if (lower.includes('presentation') || lower.includes('deck') || lower.includes('slide')) {
    return 'Draft the 3 main takeaway bullets for slide 1';
  }
  if (lower.includes('code') || lower.includes('bug') || lower.includes('program') || lower.includes('build')) {
    return 'Write the first function signature or failing test case';
  }

  return `Spend the first 10 focused minutes starting "${title}"`;
}

/**
 * Break down a task into 2-3 manageable subtasks with time estimates.
 */
export function breakDownTask(task: Task): Task {
  const title = task.title;
  const lower = title.toLowerCase();
  const totalMin = task.estimatedMinutes || 60;
  let subtasks: Subtask[] = [];

  if (lower.includes('essay') || lower.includes('write') || lower.includes('paper')) {
    const s1 = Math.round(totalMin * 0.25);
    const s2 = Math.round(totalMin * 0.5);
    const s3 = Math.max(15, totalMin - s1 - s2);
    subtasks = [
      { id: `${task.id}-sub-1`, title: 'Write thesis sentence and 3-part outline', completed: false, estimatedMinutes: s1 },
      { id: `${task.id}-sub-2`, title: 'Draft first two body paragraphs', completed: false, estimatedMinutes: s2 },
      { id: `${task.id}-sub-3`, title: 'Review flow and draft conclusion', completed: false, estimatedMinutes: s3 },
    ];
  } else if (lower.includes('stat') || lower.includes('math') || lower.includes('problem set')) {
    const half = Math.round(totalMin / 2);
    subtasks = [
      { id: `${task.id}-sub-1`, title: 'Review formula sheet and complete problems 1-3', completed: false, estimatedMinutes: half },
      { id: `${task.id}-sub-2`, title: 'Work through remaining problems and verify answers', completed: false, estimatedMinutes: totalMin - half },
    ];
  } else if (lower.includes('presentation') || lower.includes('slide')) {
    const s1 = Math.round(totalMin * 0.3);
    const s2 = Math.round(totalMin * 0.4);
    const s3 = Math.max(10, totalMin - s1 - s2);
    subtasks = [
      { id: `${task.id}-sub-1`, title: 'Outline key message and slide bullet points', completed: false, estimatedMinutes: s1 },
      { id: `${task.id}-sub-2`, title: 'Fill in slide visuals and notes', completed: false, estimatedMinutes: s2 },
      { id: `${task.id}-sub-3`, title: 'Run a 5-minute timed rehearsal', completed: false, estimatedMinutes: s3 },
    ];
  } else {
    // Generic breakdown into 3 manageable chunks
    const chunk1 = Math.max(10, Math.round(totalMin * 0.3));
    const chunk2 = Math.max(15, Math.round(totalMin * 0.4));
    const chunk3 = Math.max(10, totalMin - chunk1 - chunk2);
    subtasks = [
      { id: `${task.id}-sub-1`, title: `Phase 1: Setup and outline for ${task.title}`, completed: false, estimatedMinutes: chunk1 },
      { id: `${task.id}-sub-2`, title: `Phase 2: Core execution on ${task.title}`, completed: false, estimatedMinutes: chunk2 },
      { id: `${task.id}-sub-3`, title: `Phase 3: Final check and polish`, completed: false, estimatedMinutes: chunk3 },
    ];
  }

  const firstSub = subtasks.find(s => !s.completed);
  return {
    ...task,
    subtasks,
    concreteNextAction: firstSub?.title || task.concreteNextAction,
  };
}

/**
 * Validates that total planned minutes do not exceed available minutes.
 */
export function validatePlanDuration(totalPlanned: number, availableMinutes: number | null): boolean {
  if (availableMinutes === null || availableMinutes === undefined) return true;
  return totalPlanned <= availableMinutes;
}

/**
 * Core deterministic planner:
 * Schedules tasks into available time, prioritizing deadlines and urgency.
 * Guarantees planned time <= available time.
 * Automatically marks tasks that do not fit as 'deferred'.
 * Inserts breaks when appropriate.
 */
export function calculatePlan(tasks: Task[], availableMinutes: number | null): PlanState {
  const activeTasks = tasks.filter(t => t.status !== 'completed');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Sort active tasks:
  // 1. Deadline urgency (soonest first)
  // 2. Priority weight (high > medium > low)
  // 3. User order
  const sortedTasks = [...activeTasks].sort((a, b) => {
    const deadlineDiff = getDeadlineUrgency(a.deadline) - getDeadlineUrgency(b.deadline);
    if (deadlineDiff !== 0) return deadlineDiff;
    const priorityDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
    if (priorityDiff !== 0) return priorityDiff;
    return 0;
  });

  const scheduledBlocks: PlanBlock[] = [];
  const deferredTaskIds: string[] = [];

  let accumulatedPlannedMinutes = 0;
  let workSinceLastBreak = 0;
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;
  let orderIndex = 1;

  for (const task of sortedTasks) {
    const taskEst = task.estimatedMinutes || 30; // default conservative estimate if unset

    // If available time is specified, check if task fits
    if (availableMinutes !== null && availableMinutes !== undefined) {
      // Check if we should insert a break before this task (e.g. after 75m of continuous work)
      if (workSinceLastBreak >= 75 && accumulatedPlannedMinutes + 10 + taskEst <= availableMinutes) {
        const breakDuration = 10;
        scheduledBlocks.push({
          id: `break-${orderIndex}`,
          title: 'Restorative Break (stretch, hydrate, step away)',
          durationMinutes: breakDuration,
          type: 'break',
          completed: false,
          order: orderIndex++,
        });
        accumulatedPlannedMinutes += breakDuration;
        totalBreakMinutes += breakDuration;
        workSinceLastBreak = 0;
      }

      if (accumulatedPlannedMinutes + taskEst <= availableMinutes) {
        // Fits in plan
        scheduledBlocks.push({
          id: `block-${task.id}`,
          taskId: task.id,
          title: task.title,
          concreteAction: task.concreteNextAction || generateConcreteAction(task.title),
          durationMinutes: taskEst,
          type: 'task',
          completed: false,
          order: orderIndex++,
        });
        accumulatedPlannedMinutes += taskEst;
        totalWorkMinutes += taskEst;
        workSinceLastBreak += taskEst;
      } else {
        // Does not fit today
        deferredTaskIds.push(task.id);
      }
    } else {
      // No available time limit set yet; schedule all
      scheduledBlocks.push({
        id: `block-${task.id}`,
        taskId: task.id,
        title: task.title,
        concreteAction: task.concreteNextAction || generateConcreteAction(task.title),
        durationMinutes: taskEst,
        type: 'task',
        completed: false,
        order: orderIndex++,
      });
      accumulatedPlannedMinutes += taskEst;
      totalWorkMinutes += taskEst;
    }
  }

  // Determine current next action
  let currentNextAction: NextActionInfo | null = null;
  const firstScheduledTaskBlock = scheduledBlocks.find(b => b.type === 'task' && !b.completed);

  if (firstScheduledTaskBlock && firstScheduledTaskBlock.taskId) {
    const matchingTask = tasks.find(t => t.id === firstScheduledTaskBlock.taskId);
    if (matchingTask) {
      // Check for first incomplete subtask
      const incompleteSubtask = matchingTask.subtasks?.find(s => !s.completed);
      const concreteAction = incompleteSubtask
        ? incompleteSubtask.title
        : (matchingTask.concreteNextAction || generateConcreteAction(matchingTask.title));

      currentNextAction = {
        taskId: matchingTask.id,
        subtaskId: incompleteSubtask?.id,
        taskTitle: matchingTask.title,
        concreteAction,
        estimatedMinutes: incompleteSubtask?.estimatedMinutes || matchingTask.estimatedMinutes || 30,
        deadline: matchingTask.deadline,
      };
    }
  }

  // Validation assertion
  if (!validatePlanDuration(accumulatedPlannedMinutes, availableMinutes)) {
    console.warn('Planner guardrail triggered: planned minutes exceed available time!');
  }

  return {
    availableMinutes,
    totalPlannedMinutes: accumulatedPlannedMinutes,
    totalWorkMinutes,
    totalBreakMinutes,
    scheduledBlocks,
    deferredTaskIds,
    currentNextAction,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Apply task completion and return updated tasks and recalculated plan.
 */
export function markTaskComplete(
  tasks: Task[],
  taskId: string,
  subtaskId?: string,
  availableMinutes: number | null = null
): { updatedTasks: Task[]; newPlan: PlanState } {
  const updatedTasks = tasks.map(task => {
    if (task.id !== taskId) return task;

    if (subtaskId && task.subtasks && task.subtasks.length > 0) {
      const updatedSubtasks = task.subtasks.map(s =>
        s.id === subtaskId ? { ...s, completed: true } : s
      );
      const allSubtasksDone = updatedSubtasks.every(s => s.completed);
      const nextIncomplete = updatedSubtasks.find(s => !s.completed);

      return {
        ...task,
        subtasks: updatedSubtasks,
        status: (allSubtasksDone ? 'completed' : 'in_progress') as Task['status'],
        concreteNextAction: nextIncomplete ? nextIncomplete.title : task.concreteNextAction,
      };
    }

    // Mark entire task completed
    return {
      ...task,
      status: 'completed' as Task['status'],
      subtasks: task.subtasks?.map(s => ({ ...s, completed: true })),
    };
  });

  const newPlan = calculatePlan(updatedTasks, availableMinutes);
  return { updatedTasks, newPlan };
}
