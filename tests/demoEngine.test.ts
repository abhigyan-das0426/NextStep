import { describe, it, expect } from 'vitest';
import { processDemoMessage, extractAvailableMinutes } from '../src/lib/ai/demoEngine';
import { Task } from '../src/types';

describe('Demo Engine & Key Commands Flow', () => {
  it('parses available minutes from text accurately', () => {
    expect(extractAvailableMinutes('I have two hours')).toBe(120);
    expect(extractAvailableMinutes('I have 45 minutes')).toBe(45);
    expect(extractAvailableMinutes('I only have 30 minutes now')).toBe(30);
    expect(extractAvailableMinutes('1.5 hours')).toBe(90);
  });

  it('handles the conversational flow from the specification', () => {
    // Step 1: User provides tasks and time
    // User: "I have a statistics assignment, an essay, and laundry. I have two hours."
    let res = processDemoMessage(
      'I have a statistics assignment, an essay, and laundry. I have two hours.',
      [],
      null
    );

    expect(res.availableMinutes).toBe(120);
    expect(res.updatedTasks.length).toBe(3);
    // Bot asks ONE question for missing deadlines:
    expect(res.message).toMatch(/When are .* due\?/);

    // Step 2: User provides deadlines
    // User: "Statistics tomorrow and the essay Friday."
    res = processDemoMessage(
      'Statistics tomorrow and the essay Friday.',
      res.updatedTasks,
      res.availableMinutes
    );

    // Bot asks for estimated duration of statistics:
    expect(res.message).toMatch(/About how long will .* take\?/);
    expect(res.message).toContain('estimate');

    // Step 3: User answers duration
    // User: "45 minutes"
    res = processDemoMessage('45 minutes', res.updatedTasks, res.availableMinutes);
    // Next missing duration is essay
    expect(res.message).toMatch(/About how long will .* take\?/);

    // Step 4: User answers duration for essay
    res = processDemoMessage('60 minutes', res.updatedTasks, res.availableMinutes);
    // Next missing duration is laundry
    expect(res.message).toMatch(/About how long will .* take\?/);

    // Step 5: Laundry duration
    res = processDemoMessage('30 minutes', res.updatedTasks, res.availableMinutes);
    // All info collected: bot presents realistic plan and single next action
    expect(res.message).toContain('realistic plan');
    expect(res.plan.currentNextAction).not.toBeNull();
    expect(res.plan.currentNextAction?.concreteAction).toBeDefined();
  });

  it('supports Key Command: "What next?"', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Statistics assignment',
        estimatedMinutes: 45,
        priority: 'high',
        status: 'pending',
      },
    ];
    const res = processDemoMessage('What next?', tasks, 120, 'what_next');
    expect(res.message).toContain('Your next action is');
    expect(res.plan.currentNextAction?.taskId).toBe('t1');
  });

  it('supports Key Command: "Done"', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Statistics assignment',
        estimatedMinutes: 45,
        priority: 'high',
        status: 'pending',
      },
      {
        id: 't2',
        title: 'Write my essay',
        estimatedMinutes: 60,
        priority: 'medium',
        status: 'pending',
      },
    ];

    const res = processDemoMessage('Done', tasks, 120, 'done');
    expect(res.message).toContain('Great job completing that');
    expect(res.updatedTasks.find(t => t.id === 't1')?.status).toBe('completed');
    expect(res.plan.currentNextAction?.taskId).toBe('t2');
  });

  it('supports Key Command: "That feels too big"', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Write my essay',
        estimatedMinutes: 90,
        priority: 'high',
        status: 'pending',
      },
    ];

    const res = processDemoMessage('That feels too big', tasks, 120, 'break_down');
    expect(res.message).toContain('Broken down into bite-sized steps');
    const brokenTask = res.updatedTasks[0];
    expect(brokenTask.subtasks?.length).toBeGreaterThanOrEqual(2);
    expect(res.plan.currentNextAction?.subtaskId).toBe(brokenTask.subtasks![0].id);
  });

  it('supports Key Command: "I only have 30 minutes now"', () => {
    const tasks: Task[] = [
      {
        id: 't1',
        title: 'Statistics assignment',
        estimatedMinutes: 45,
        priority: 'high',
        status: 'pending',
      },
      {
        id: 't2',
        title: 'Quick review',
        estimatedMinutes: 20,
        priority: 'low',
        status: 'pending',
      },
    ];

    const res = processDemoMessage('I only have 30 minutes now', tasks, 120, 'change_time');
    expect(res.availableMinutes).toBe(30);
    // Task 1 takes 45m which exceeds 30m; Task 2 takes 20m which fits
    expect(res.plan.totalPlannedMinutes).toBeLessThanOrEqual(30);
    expect(res.message).toContain('30m');
  });

  it('supports Key Command: "Add [task]"', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Existing task', priority: 'medium', status: 'pending' },
    ];

    const res = processDemoMessage('Add buy groceries', tasks, 60);
    expect(res.updatedTasks.some(t => t.title.toLowerCase().includes('buy groceries'))).toBe(true);
    expect(res.message).toMatch(/Added "buy groceries"/);
  });

  it('supports Key Command: "Show my plan"', () => {
    const tasks: Task[] = [
      { id: 't1', title: 'Task 1', estimatedMinutes: 30, priority: 'medium', status: 'pending' },
    ];

    const res = processDemoMessage('Show my plan', tasks, 60, 'show_plan');
    expect(res.message).toContain('planned');
  });
});
