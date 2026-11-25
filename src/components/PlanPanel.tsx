'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  AlertTriangle,
  Coffee,
  Check,
  Sparkles,
  Layers,
  ArrowRight,
  Hammer,
  HelpCircle,
} from 'lucide-react';
import { Task, PlanState } from '@/types';
import { formatMinutes } from '@/lib/planner';

interface PlanPanelProps {
  tasks: Task[];
  plan: PlanState;
  availableMinutes: number | null;
  onTaskComplete: (taskId: string, subtaskId?: string) => void;
  onBreakDown: (taskId: string) => void;
  onOpenTimeModal: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function PlanPanel({
  tasks,
  plan,
  availableMinutes,
  onTaskComplete,
  onBreakDown,
  onOpenTimeModal,
  isOpenMobile,
  onCloseMobile,
}: PlanPanelProps) {
  const currentAction = plan.currentNextAction;
  const scheduledBlocks = plan.scheduledBlocks;
  const deferredTaskIds = plan.deferredTaskIds;

  const deferredTasks = tasks.filter(t => deferredTaskIds.includes(t.id));
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Time calculations
  const plannedMins = plan.totalPlannedMinutes;
  const totalMins = availableMinutes || 0;
  const percentPlanned = totalMins > 0 ? Math.min(100, Math.round((plannedMins / totalMins) * 100)) : 0;
  const bufferMins = totalMins > 0 ? Math.max(0, totalMins - plannedMins) : 0;

  return (
    <aside
      className={`fixed lg:static inset-y-0 right-0 z-30 w-full sm:w-[400px] lg:w-full bg-white flex flex-col transition-transform duration-200 ease-in-out border-l lg:border-l-0 border-slate-200/80 ${
        isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}
    >
      {/* Top Header of Plan Panel */}
      <div className="p-4 sm:px-6 border-b border-slate-200/80 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h2 className="font-bold text-slate-900 text-sm sm:text-base">Your Day Plan</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTimeModal}
            type="button"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/80 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition-colors cursor-pointer"
          >
            {availableMinutes ? `${formatMinutes(availableMinutes)} budget` : 'Set available time'}
          </button>
          <button
            onClick={onCloseMobile}
            type="button"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Close plan panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:px-6 space-y-5">
        {/* HERO CARD: CURRENT NEXT ACTION */}
        <section aria-labelledby="next-action-heading">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span id="next-action-heading">Current Next Action</span>
          </div>

          {currentAction ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/50 border-2 border-indigo-300/80 shadow-xs space-y-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-600 text-white shadow-2xs">
                  Do This Next
                </span>
                <p className="text-base sm:text-lg font-bold text-slate-900 mt-2 leading-snug tracking-tight">
                  {currentAction.concreteAction}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  From: <span className="font-semibold text-slate-700">{currentAction.taskTitle}</span>
                </p>
              </div>

              {/* Meta pills */}
              <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                {currentAction.estimatedMinutes && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium shadow-2xs">
                    <Clock className="w-3 h-3 text-slate-400" />
                    ~{currentAction.estimatedMinutes}m (estimate)
                  </span>
                )}
                {currentAction.deadline && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold shadow-2xs">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    Due {currentAction.deadline}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-1 flex items-center gap-2">
                <button
                  onClick={() => onTaskComplete(currentAction.taskId, currentAction.subtaskId)}
                  type="button"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  Mark Complete
                </button>
                <button
                  onClick={() => onBreakDown(currentAction.taskId)}
                  type="button"
                  className="py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  title="Break this task into smaller steps"
                >
                  <Hammer className="w-3.5 h-3.5 text-slate-500" />
                  Break down
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-center text-slate-400 text-xs py-7">
              {tasks.length > 0 && tasks.every(t => t.status === 'completed') ? (
                <div className="text-emerald-700 font-semibold flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                  <span className="text-sm">All scheduled tasks completed!</span>
                  <span className="text-xs text-slate-500 font-normal">Add another task in chat or take a break!</span>
                </div>
              ) : (
                <span>No active action scheduled yet. Describe what you need to do in chat!</span>
              )}
            </div>
          )}
        </section>

        {/* TIME BUDGET PROGRESS BAR */}
        {availableMinutes !== null && availableMinutes > 0 && (
          <section className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Time Budget</span>
              <span className="font-semibold text-slate-600">
                {formatMinutes(plannedMins)} planned of {formatMinutes(availableMinutes)}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
              <div
                className={`h-full transition-all duration-300 ${
                  percentPlanned > 95 ? 'bg-amber-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${percentPlanned}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>
                {bufferMins > 0 ? `${formatMinutes(bufferMins)} buffer remaining` : 'Fully booked today'}
              </span>
              {plan.totalBreakMinutes > 0 && (
                <span className="text-slate-400">Includes {plan.totalBreakMinutes}m break</span>
              )}
            </div>
          </section>
        )}

        {/* SCHEDULED PLAN BLOCKS */}
        <section className="space-y-2.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Scheduled Today</span>
            <span className="text-[11px] lowercase text-slate-400 font-normal">
              {scheduledBlocks.filter(b => b.type === 'task').length} task block(s)
            </span>
          </div>

          <div className="space-y-2">
            {scheduledBlocks.map(block => {
              if (block.type === 'break') {
                return (
                  <div
                    key={block.id}
                    className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center gap-2.5 text-xs text-amber-900 shadow-2xs"
                  >
                    <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold flex-1">{block.title}</span>
                    <span className="text-[11px] text-amber-700 font-bold bg-white/70 px-2 py-0.5 rounded-md border border-amber-200/50">
                      ~{block.durationMinutes}m
                    </span>
                  </div>
                );
              }

              const task = tasks.find(t => t.id === block.taskId);
              const isCurrent = currentAction?.taskId === block.taskId;
              const hasSubtasks = task?.subtasks && task.subtasks.length > 0;

              return (
                <div
                  key={block.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-indigo-50/40 border-indigo-300 shadow-2xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => block.taskId && onTaskComplete(block.taskId)}
                      type="button"
                      aria-label={`Mark ${block.title} complete`}
                      className="mt-0.5 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                    >
                      <Circle className="w-4 h-4" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                          {block.title}
                        </p>
                        <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          ~{block.durationMinutes}m
                        </span>
                      </div>

                      {block.concreteAction && block.concreteAction !== block.title && (
                        <p className="text-xs text-indigo-700 font-medium mt-1 flex items-center gap-1">
                          <ArrowRight className="w-3 h-3 shrink-0 text-indigo-500" />
                          <span>{block.concreteAction}</span>
                        </p>
                      )}

                      {task?.deadline && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          <span>Due {task.deadline}</span>
                        </div>
                      )}

                      {/* Subtasks Accordion/List */}
                      {hasSubtasks && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1.5">
                          {task!.subtasks!.map(sub => (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between text-xs pl-1 text-slate-600"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  onClick={() => onTaskComplete(task!.id, sub.id)}
                                  type="button"
                                  className={`shrink-0 cursor-pointer ${
                                    sub.completed
                                      ? 'text-emerald-600'
                                      : 'text-slate-300 hover:text-emerald-600'
                                  }`}
                                >
                                  {sub.completed ? (
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5" />
                                  )}
                                </button>
                                <span
                                  className={`truncate font-medium ${
                                    sub.completed ? 'line-through text-slate-400' : 'text-slate-700'
                                  }`}
                                >
                                  {sub.title}
                                </span>
                              </div>
                              {sub.estimatedMinutes && (
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  ~{sub.estimatedMinutes}m
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {scheduledBlocks.length === 0 && (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No tasks scheduled today.
              </p>
            )}
          </div>
        </section>

        {/* DEFERRED TASKS SECTION */}
        {deferredTasks.length > 0 && (
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Deferred (Does Not Fit Today)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              These tasks exceed your available time today. They are kept safe for future planning.
            </p>

            <div className="space-y-1.5">
              {deferredTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700 truncate">{task.title}</p>
                    {task.deadline && (
                      <span className="text-[10px] text-amber-700 font-semibold">
                        Due {task.deadline}
                      </span>
                    )}
                  </div>
                  <span className="text-slate-400 text-[11px] font-medium shrink-0">
                    ~{task.estimatedMinutes || 30}m
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* COMPLETED TASKS SECTION */}
        {completedTasks.length > 0 && (
          <section className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Completed Today ({completedTasks.length})
            </div>
            <div className="space-y-1.5">
              {completedTasks.map(task => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-2 text-xs text-slate-500"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="line-through truncate flex-1 font-medium">{task.title}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold shrink-0">Done</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
