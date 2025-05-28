import { Temporal } from '@js-temporal/polyfill';

export interface Task {
  id: number;
  context: string;
  stack_position: number;
  created_at: Temporal.Instant;
  ended_at?: Temporal.Instant;
  updated_at: Temporal.Instant;
}

export interface TaskStack {
  tasks: Task[];
  current_task?: Task;
}

export function getTaskTitle(task: Task): string {
  const firstLine = task.context.split('\n')[0];
  return firstLine.trim() || "Untitled Task";
}

export function getTaskDescription(task: Task): string {
  const lines = task.context.split('\n');
  if (lines.length <= 1) return "";

  // Join all lines after the first one
  const description = lines.slice(1).join('\n');
  // Remove leading newline if present
  return description.replace(/^\n/, '');
}

export function isTaskActive(task: Task): boolean {
  return task.ended_at == null;
}

export function formatElapsedTime(startTime: Temporal.Instant, endTime?: Temporal.Instant): string {
  const end = endTime || Temporal.Now.instant();

  const duration = end.since(startTime);

  const hours = Math.floor(duration.total('hours'));
  const minutes = Math.floor(duration.total('minutes')) % 60;
  const seconds = Math.floor(duration.total('seconds')) % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
