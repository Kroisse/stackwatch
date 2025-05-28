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

// Efficient task stack with Map for O(1) lookups
export interface EfficientTaskStack {
  taskMap: Map<number, Task>;
  taskOrder: number[]; // Array of task IDs in stack order
  currentTaskId?: number;
}

export function getTaskTitle(task: Task): string {
  // Handle leading/trailing newlines by trimming the entire context first
  const trimmedContext = task.context.trim();
  if (!trimmedContext) return "";

  // Use regex to extract first line more efficiently
  const firstLineMatch = trimmedContext.match(/^[^\n]*/);
  return firstLineMatch ? firstLineMatch[0].trim() : "";
}

// Helper function for displaying task title with fallback
export function getDisplayTaskTitle(task: Task): string {
  const title = getTaskTitle(task);
  return title || "Untitled Task";
}

export function getTaskDescription(task: Task): string {
  // Handle leading/trailing newlines by trimming the entire context first
  const trimmedContext = task.context.trim();
  if (!trimmedContext) return "";

  // Use regex to extract everything after the first line more efficiently
  const descriptionMatch = trimmedContext.match(/^[^\n]*\n(.*)$/s);
  if (!descriptionMatch) return ""; // No newline found, single line

  // Remove leading newline if present (preserve existing behavior)
  return descriptionMatch[1].replace(/^\n/, '');
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
