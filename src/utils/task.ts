export interface Task {
  id: number;
  context: string;
  stack_position: number;
  created_at: Date;
  ended_at?: Date;
  updated_at: Date;
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

/**
 * Format elapsed time between two dates as HH:MM:SS
 * @param startDate - Start date
 * @param endDate - End date (defaults to now)
 * @returns Formatted string as HH:MM:SS
 */
export function formatElapsedTime(startDate: Date, endDate?: Date): string {
  const end = endDate || new Date();
  const diffMs = end.getTime() - startDate.getTime();
  
  const totalSeconds = Math.floor(diffMs / 1000);
  return formatDuration(totalSeconds);
}

/**
 * Format duration in seconds as HH:MM:SS
 * @param totalSeconds - Total seconds
 * @returns Formatted string as HH:MM:SS
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

