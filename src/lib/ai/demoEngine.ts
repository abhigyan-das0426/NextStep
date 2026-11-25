import { Task, PlanState } from '@/types';
import {
  calculatePlan,
  breakDownTask,
  markTaskComplete,
  formatMinutes,
  generateConcreteAction,
} from '../planner';

export interface DemoEngineResult {
  message: string;
  updatedTasks: Task[];
  availableMinutes: number | null;
  plan: PlanState;
}

/**
 * Natural language helper to parse available minutes from text
 */
export function extractAvailableMinutes(text: string): number | null {
  const lower = text.toLowerCase();

  // Pattern: "30 minutes", "45 min", "90 mins"
  const minMatch = lower.match(/(\d+)\s*(?:minutes?|mins?)/);
  // Pattern: "2 hours", "1.5 hours", "1 hour"
  const hourMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)/);
  // Pattern: "two hours", "three hours", "one hour", "half an hour"
  if (lower.includes('half an hour') || lower.includes('30 min')) return 30;
  if (lower.includes('one hour') || lower.includes('an hour')) return 60;
  if (lower.includes('two hours')) return 120;
  if (lower.includes('three hours')) return 180;
  if (lower.includes('four hours')) return 240;

  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    const extraMin = minMatch ? parseInt(minMatch[1], 10) : 0;
    return Math.round(hours * 60) + (lower.indexOf('hour') < lower.indexOf('min') ? extraMin : 0);
  }

  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }

  return null;
}

/**
 * Natural language helper to parse durations in minutes
 */
export function extractMinutesNumber(text: string): number | null {
  const lower = text.toLowerCase().trim();
  if (lower.includes('half an hour')) return 30;
  if (lower.includes('an hour') || lower === '1 hour' || lower === '1h') return 60;
  if (lower.includes('two hours') || lower === '2 hours' || lower === '2h') return 120;

  const minMatch = lower.match(/(\d+)\s*(?:minutes?|mins?|m\b)/);
  if (minMatch) return parseInt(minMatch[1], 10);

  const numOnly = lower.match(/^(\d+)$/);
  if (numOnly) return parseInt(numOnly[1], 10);

  return null;
}

/**
 * Suggest a realistic estimate based on task keyword
 */
export function suggestTaskEstimate(title: string): number {
  const lower = title.toLowerCase();
  if (lower.includes('laundry')) return 30;
  if (lower.includes('stat') || lower.includes('math') || lower.includes('assignment')) return 45;
  if (lower.includes('essay') || lower.includes('paper') || lower.includes('report')) return 60;
  if (lower.includes('email') || lower.includes('reply')) return 20;
  if (lower.includes('clean') || lower.includes('dishes')) return 25;
  if (lower.includes('presentation') || lower.includes('deck')) return 45;
  return 30;
}

/**
 * Deterministic Demo Engine that implements the exact conversational behaviors
 * specified in the NextStep prompt.
 */
export function processDemoMessage(
  userMessage: string,
  currentTasks: Task[],
  currentAvailableMinutes: number | null,
  action?: string
): DemoEngineResult {
  const text = userMessage.trim();
  const lower = text.toLowerCase();
  let tasks = [...currentTasks];
  let availableMinutes = currentAvailableMinutes;

  // 1. Check for explicit or detected "Change my time" / "I only have X minutes now"
  const parsedTime = extractAvailableMinutes(text);
  if (
    action === 'change_time' ||
    lower.startsWith('i only have') ||
    lower.startsWith('change time') ||
    lower.startsWith('change my time') ||
    (parsedTime !== null && (lower.includes('only have') || lower.includes('have now') || lower.includes('time changed')))
  ) {
    const newTime = parsedTime || 30;
    availableMinutes = newTime;
    const plan = calculatePlan(tasks, availableMinutes);

    if (plan.currentNextAction) {
      const deferredMsg = plan.deferredTaskIds.length > 0
        ? ` Adjusted your schedule to ${formatMinutes(newTime)}. Deferred ${plan.deferredTaskIds.length} task(s) that exceed today's budget.`
        : ` Updated your schedule to ${formatMinutes(newTime)}.`;
      return {
        message: `${deferredMsg} Your next step is: **${plan.currentNextAction.concreteAction}** (~${plan.currentNextAction.estimatedMinutes}m).`,
        updatedTasks: tasks,
        availableMinutes,
        plan,
      };
    } else {
      return {
        message: `Updated your available time to ${formatMinutes(newTime)}. Add a task or say what you need to do!`,
        updatedTasks: tasks,
        availableMinutes,
        plan,
      };
    }
  }

  // 2. Check for "Done" / "Finished"
  if (action === 'done' || lower === 'done' || lower === 'finished' || lower === 'i did it' || lower === 'task done') {
    const activePlan = calculatePlan(tasks, availableMinutes);
    if (!activePlan.currentNextAction) {
      return {
        message: "You don't have any active tasks pending. What would you like to work on next?",
        updatedTasks: tasks,
        availableMinutes,
        plan: activePlan,
      };
    }

    const currentAction = activePlan.currentNextAction;
    const { updatedTasks: newTasks, newPlan } = markTaskComplete(
      tasks,
      currentAction.taskId,
      currentAction.subtaskId,
      availableMinutes
    );

    if (newPlan.currentNextAction) {
      return {
        message: `Great job completing that! Next up: **${newPlan.currentNextAction.concreteAction}** (~${newPlan.currentNextAction.estimatedMinutes}m).`,
        updatedTasks: newTasks,
        availableMinutes,
        plan: newPlan,
      };
    } else {
      return {
        message: "Fantastic! All scheduled tasks for today are complete. Take a well-earned break!",
        updatedTasks: newTasks,
        availableMinutes,
        plan: newPlan,
      };
    }
  }

  // 3. Check for "That feels too big" / "Break it down"
  if (action === 'break_down' || lower.includes('feels too big') || lower.includes('too big') || lower.includes('break it down') || lower.includes('break down')) {
    const activePlan = calculatePlan(tasks, availableMinutes);
    if (!activePlan.currentNextAction) {
      return {
        message: "You don't have an active task right now to break down. Tell me what task you want to work on!",
        updatedTasks: tasks,
        availableMinutes,
        plan: activePlan,
      };
    }

    const currentTaskId = activePlan.currentNextAction.taskId;
    const targetTask = tasks.find(t => t.id === currentTaskId);

    if (targetTask) {
      const brokenTask = breakDownTask(targetTask);
      tasks = tasks.map(t => (t.id === currentTaskId ? brokenTask : t));
      const newPlan = calculatePlan(tasks, availableMinutes);
      const firstSubtask = brokenTask.subtasks?.[0];

      return {
        message: `Broken down into bite-sized steps! Let's just focus on step 1: **${firstSubtask?.title}** (${firstSubtask?.estimatedMinutes ? `~${firstSubtask.estimatedMinutes}m` : '15m'}).`,
        updatedTasks: tasks,
        availableMinutes,
        plan: newPlan,
      };
    }
  }

  // 4. Check for "What next?"
  if (action === 'what_next' || lower === 'what next?' || lower === 'what next' || lower === 'what should i do next?' || lower === 'what should i do next') {
    const activePlan = calculatePlan(tasks, availableMinutes);
    if (activePlan.currentNextAction) {
      const est = activePlan.currentNextAction.estimatedMinutes ? ` (~${activePlan.currentNextAction.estimatedMinutes}m)` : '';
      return {
        message: `Your next action is: **${activePlan.currentNextAction.concreteAction}**${est} from "${activePlan.currentNextAction.taskTitle}".`,
        updatedTasks: tasks,
        availableMinutes,
        plan: activePlan,
      };
    } else if (tasks.length === 0) {
      return {
        message: "You haven't listed any tasks yet. What's on your mind today?",
        updatedTasks: tasks,
        availableMinutes,
        plan: activePlan,
      };
    } else {
      return {
        message: "All scheduled tasks are done! Would you like to add another task or adjust your time?",
        updatedTasks: tasks,
        availableMinutes,
        plan: activePlan,
      };
    }
  }

  // 5. Check for "Show my plan"
  if (action === 'show_plan' || lower === 'show my plan' || lower === 'show plan') {
    const activePlan = calculatePlan(tasks, availableMinutes);
    const count = activePlan.scheduledBlocks.filter(b => b.type === 'task').length;
    const timeStr = activePlan.availableMinutes ? ` within your ${formatMinutes(activePlan.availableMinutes)} budget` : '';
    const nextMsg = activePlan.currentNextAction
      ? ` Next action: **${activePlan.currentNextAction.concreteAction}**.`
      : '';
    return {
      message: `You currently have ${count} task block(s) planned${timeStr}.${nextMsg}`,
      updatedTasks: tasks,
      availableMinutes,
      plan: activePlan,
    };
  }

  // 6. Check for "Add [task]"
  if (lower.startsWith('add ')) {
    const newTaskTitle = text.slice(4).trim();
    if (newTaskTitle) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: newTaskTitle,
        priority: 'medium',
        status: 'pending',
        concreteNextAction: generateConcreteAction(newTaskTitle),
      };
      tasks.push(newTask);

      const plan = calculatePlan(tasks, availableMinutes);
      return {
        message: `Added "${newTaskTitle}". When is it due, or should we set a deadline?`,
        updatedTasks: tasks,
        availableMinutes,
        plan,
      };
    }
  }

  // 7. Extract available time if mentioned in freeform text
  if (parsedTime !== null && availableMinutes === null) {
    availableMinutes = parsedTime;
  }

  // 8. Extract tasks if user lists new tasks in freeform
  // Example: "I have a statistics assignment, an essay, and laundry. I have two hours."
  const hasTaskKeywords = lower.includes('assignment') || lower.includes('essay') ||
    lower.includes('laundry') || lower.includes('i have') || lower.includes('i need to') ||
    lower.includes('todo') || lower.includes(',') || lower.includes('and');

  if (tasks.length === 0 && hasTaskKeywords) {
    // Extract task names by splitting sentences and conjunctions
    let taskPortion = text;
    // Remove "I have two hours" or time statements from task extraction
    taskPortion = taskPortion.replace(/(?:i have|i've got)\s+\d+.*?(?:hours?|minutes?|mins?|hrs?)/gi, '');
    taskPortion = taskPortion.replace(/i have/gi, '');
    taskPortion = taskPortion.replace(/i need to/gi, '');

    const candidates = taskPortion
      .split(/,|\band\b|\.|\n/i)
      .map(s => s.trim().replace(/^a\s+|^an\s+|^to\s+/i, ''))
      .filter(s => s.length > 2 && !s.match(/^(two|one|three|four|five|\d+)\s*(hours?|minutes?|mins?)/i));

    if (candidates.length > 0) {
      candidates.forEach((cand, idx) => {
        // Clean up capitalization
        const title = cand.charAt(0).toUpperCase() + cand.slice(1);
        tasks.push({
          id: `task-${Date.now()}-${idx}`,
          title,
          priority: 'medium',
          status: 'pending',
          concreteNextAction: generateConcreteAction(title),
        });
      });
    }
  }

  // 9. Check if user is answering a previous question:
  // e.g. "Statistics tomorrow and the essay Friday."
  const isAnsweringDeadlines = lower.includes('tomorrow') || lower.includes('friday') ||
    lower.includes('today') || lower.includes('monday') || lower.includes('due') ||
    lower.includes('tonight') || lower.includes('weekend');

  if (isAnsweringDeadlines) {
    tasks = tasks.map(t => {
      const tLower = t.title.toLowerCase();
      if (tLower.includes('stat') && lower.includes('tomorrow')) {
        return { ...t, deadline: 'Tomorrow' };
      }
      if (tLower.includes('essay') && lower.includes('friday')) {
        return { ...t, deadline: 'Friday' };
      }
      if (lower.includes('tomorrow') && !lower.includes('and')) {
        return { ...t, deadline: 'Tomorrow' };
      }
      if (lower.includes('today') && !lower.includes('and')) {
        return { ...t, deadline: 'Today' };
      }
      return t;
    });
  }

  // e.g. Answering a duration question: "45 minutes" or "around 60 minutes"
  // Do not confuse available time ("I have two hours") with an individual task duration!
  const isAvailableTimeStatement = lower.includes('i have') || lower.includes('have available') || lower.includes('available time');
  const parsedDuration = isAvailableTimeStatement ? null : extractMinutesNumber(text);

  if (parsedDuration !== null && !lower.includes('available') && !lower.includes('only have')) {
    // Check if user specifically named a task: e.g., "statistics 45 min"
    let targetTask = tasks.find(t => t.status === 'pending' && !t.estimatedMinutes && lower.includes(t.title.toLowerCase().split(' ')[0]));
    if (!targetTask) {
      // Otherwise take the first pending task missing estimatedMinutes
      targetTask = tasks.find(t => t.status === 'pending' && !t.estimatedMinutes);
    }

    if (targetTask) {
      tasks = tasks.map(t =>
        t.id === targetTask!.id
          ? { ...t, estimatedMinutes: parsedDuration }
          : t
      );
    }
  }

  // 10. Missing Information Checker - Ask strictly ONE question per message!
  // If user just answered deadlines, or tasks missing deadlines are chores/non-urgent,
  // do not repeat the deadline question.
  const tasksWithoutDeadline = tasks.filter(t => {
    if (t.status !== 'pending' || t.deadline) return false;
    const lowerTitle = t.title.toLowerCase();
    // Exclude general tasks that don't need hard deadlines if user already answered deadlines
    if (isAnsweringDeadlines) return false;
    // Chores usually don't have hard external deadlines
    if (lowerTitle.includes('laundry') || lowerTitle.includes('clean') || lowerTitle.includes('dishes')) return false;
    return true;
  });

  if (tasksWithoutDeadline.length > 0 && !isAnsweringDeadlines) {
    const plan = calculatePlan(tasks, availableMinutes);
    if (tasksWithoutDeadline.length === 1) {
      return {
        message: `When is "${tasksWithoutDeadline[0].title}" due?`,
        updatedTasks: tasks,
        availableMinutes,
        plan,
      };
    } else {
      const titles = tasksWithoutDeadline.map(t => `"${t.title}"`).join(' and ');
      return {
        message: `When are ${titles} due?`,
        updatedTasks: tasks,
        availableMinutes,
        plan,
      };
    }
  }

  // Q2: Estimated durations for tasks that don't have one
  const tasksWithoutDuration = tasks.filter(t => t.status === 'pending' && !t.estimatedMinutes);
  if (tasksWithoutDuration.length > 0) {
    const target = tasksWithoutDuration[0];
    const suggestion = suggestTaskEstimate(target.title);
    const plan = calculatePlan(tasks, availableMinutes);
    return {
      message: `About how long will "${target.title}" take? (I'd estimate ~${suggestion}m)`,
      updatedTasks: tasks,
      availableMinutes,
      plan,
    };
  }

  // Q3: Available time today if missing
  if (availableMinutes === null && tasks.length > 0) {
    const plan = calculatePlan(tasks, availableMinutes);
    return {
      message: "How much total time do you have available today?",
      updatedTasks: tasks,
      availableMinutes,
      plan,
    };
  }

  // 11. All key details gathered! Generate and summarize the plan.
  const finalPlan = calculatePlan(tasks, availableMinutes);
  if (finalPlan.currentNextAction) {
    const timeNotice = finalPlan.availableMinutes
      ? `fits within your ${formatMinutes(finalPlan.availableMinutes)} budget`
      : 'is ready';
    const deferredNotice = finalPlan.deferredTaskIds.length > 0
      ? ` (${finalPlan.deferredTaskIds.length} task deferred to stay within available time)`
      : '';
    return {
      message: `Here is your realistic plan! It ${timeNotice}${deferredNotice}. Your single next action is: **${finalPlan.currentNextAction.concreteAction}** (~${finalPlan.currentNextAction.estimatedMinutes}m).`,
      updatedTasks: tasks,
      availableMinutes,
      plan: finalPlan,
    };
  }

  // Default fallback if empty
  return {
    message: "Tell me what tasks are on your plate, or pick one of the quick starters below to get started!",
    updatedTasks: tasks,
    availableMinutes,
    plan: finalPlan,
  };
}
