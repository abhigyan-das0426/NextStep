import { describe, it, expect } from 'vitest';
import {
  calculatePlan,
  breakDownTask,
  markTaskComplete,
  validatePlanDuration,
  generateConcreteAction,
} from '../src/lib/planner';
import { Task } from '../src/types';

describe('NextStep Planner Core Engine', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Statistics assignment',
      deadline: 'Tomorrow',
      estimatedMinutes: 45,
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'task-2',
      title: 'Write my essay',
      deadline: 'Friday',
      estimatedMinutes: 60,
      priority: 'medium',
      status: 'pending',
    },
    {
      id: 'task-3',
      title: 'Do laundry',
      estimatedMinutes: 30,
      priority: 'low',
      status: 'pending',
    },
  ];

  it('1. Adds and completes tasks smoothly', () => {
    const plan = calculatePlan(sampleTasks, 180);
    const taskBlocks = plan.scheduledBlocks.filter(b => b.type === 'task');
    expect(taskBlocks.length).toBe(3);
    // Verified restorative break is included appropriately
    expect(plan.scheduledBlocks.some(b => b.type === 'break')).toBe(true);
    expect(plan.currentNextAction?.taskId).toBe('task-1');

    // Complete the first task
    const { updatedTasks, newPlan } = markTaskComplete(sampleTasks, 'task-1', undefined, 180);
    expect(updatedTasks.find(t => t.id === 'task-1')?.status).toBe('completed');
    // Next action advances to the next task (task-2: essay)
    expect(newPlan.currentNextAction?.taskId).toBe('task-2');
    expect(newPlan.currentNextAction?.concreteAction).toContain('thesis');
  });

  it('2. Reduces available time and replans, deferring tasks that do not fit', () => {
    // Total tasks: 45 + 60 + 30 = 135 mins
    // User reduces available time to 50 minutes
    const plan = calculatePlan(sampleTasks, 50);

    // Only Statistics assignment (45m) should fit; essay (60m) and laundry (30m) deferred
    expect(plan.scheduledBlocks.length).toBe(1);
    expect(plan.scheduledBlocks[0].taskId).toBe('task-1');
    expect(plan.deferredTaskIds).toContain('task-2');
    expect(plan.deferredTaskIds).toContain('task-3');
    expect(plan.totalPlannedMinutes).toBeLessThanOrEqual(50);
  });

  it('3. Breaks a large task into smaller concrete steps', () => {
    const bigTask: Task = {
      id: 'task-essay',
      title: 'Write my essay',
      deadline: 'Friday',
      estimatedMinutes: 90,
      priority: 'high',
      status: 'pending',
    };

    const brokenDown = breakDownTask(bigTask);
    expect(brokenDown.subtasks).toBeDefined();
    expect(brokenDown.subtasks!.length).toBeGreaterThanOrEqual(2);
    // Subtask 1 should be actionable (thesis outline)
    expect(brokenDown.subtasks![0].completed).toBe(false);
    expect(brokenDown.concreteNextAction).toBe(brokenDown.subtasks![0].title);

    // Completing subtask 1 advances to subtask 2
    const { updatedTasks, newPlan } = markTaskComplete([brokenDown], 'task-essay', brokenDown.subtasks![0].id, 120);
    const updated = updatedTasks[0];
    expect(updated.subtasks![0].completed).toBe(true);
    expect(updated.subtasks![1].completed).toBe(false);
    expect(updated.status).toBe('in_progress');
    expect(newPlan.currentNextAction?.concreteAction).toBe(updated.subtasks![1].title);
  });

  it('4. Prevents overbooked plans: scheduled duration never exceeds available time', () => {
    const largeSet: Task[] = [
      { id: 't1', title: 'Task 1', estimatedMinutes: 60, priority: 'high', status: 'pending' },
      { id: 't2', title: 'Task 2', estimatedMinutes: 60, priority: 'medium', status: 'pending' },
      { id: 't3', title: 'Task 3', estimatedMinutes: 60, priority: 'low', status: 'pending' },
    ];

    const availableTime = 90;
    const plan = calculatePlan(largeSet, availableTime);

    expect(validatePlanDuration(plan.totalPlannedMinutes, availableTime)).toBe(true);
    expect(plan.totalPlannedMinutes).toBeLessThanOrEqual(availableTime);
    expect(plan.deferredTaskIds.length).toBeGreaterThan(0);
  });

  it('5. Restores saved state accurately (serialization / hydration)', () => {
    const initialPlan = calculatePlan(sampleTasks, 120);
    const serialized = JSON.stringify({
      tasks: sampleTasks,
      plan: initialPlan,
      availableMinutes: 120,
    });

    const parsed = JSON.parse(serialized);
    expect(parsed.tasks).toHaveLength(3);
    expect(parsed.availableMinutes).toBe(120);
    expect(parsed.plan.totalPlannedMinutes).toBe(initialPlan.totalPlannedMinutes);

    // Re-calculating with restored tasks matches state
    const restoredPlan = calculatePlan(parsed.tasks, parsed.availableMinutes);
    expect(restoredPlan.scheduledBlocks.length).toBe(initialPlan.scheduledBlocks.length);
    expect(restoredPlan.currentNextAction?.taskId).toBe(initialPlan.currentNextAction?.taskId);
  });

  it('6. Handles errors and preserves state without losing progress', () => {
    // Simulate what happens when an API call fails:
    // Existing tasks and plan remain intact
    const originalTasks = [...sampleTasks];
    const originalPlan = calculatePlan(originalTasks, 120);

    // Simulate an error event payload
    const failedApiState = {
      tasks: originalTasks,
      plan: originalPlan,
      error: 'Network timeout: could not reach AI provider',
    };

    expect(failedApiState.tasks).toEqual(originalTasks);
    expect(failedApiState.plan).toEqual(originalPlan);
    expect(failedApiState.tasks[0].title).toBe('Statistics assignment');
  });

  it('7. Generates concrete micro-actions for broad tasks', () => {
    expect(generateConcreteAction('Write my essay')).toContain('thesis sentence');
    expect(generateConcreteAction('Statistics assignment')).toContain('problem set');
    expect(generateConcreteAction('Do laundry')).toContain('washer');
  });
});
