export interface Task {
  id: number;
  context: string;
  stack_position: number;
  created_at: string;
  ended_at?: string;
  updated_at: string;
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

export function formatElapsedTime(startTime: Date | string, endTime?: Date | string): string {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime;
  const end = endTime 
    ? (typeof endTime === 'string' ? new Date(endTime) : endTime)
    : new Date();
  
  const elapsed = Math.floor((end.getTime() - start.getTime()) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}