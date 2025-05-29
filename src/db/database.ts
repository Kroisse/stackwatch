import Dexie, { Table } from 'dexie';
import { Task } from '../utils/task';
import { BroadcastMessage } from '../types/broadcast';

export interface DBTask {
  id?: number;
  context: string;
  stack_position: number;
  created_at: Date;
  ended_at: Date | 0;  // 0 for active tasks, Date for ended tasks
  updated_at: Date;
}

// Helper to convert DBTask to Task interface
export function dbTaskToTask(dbTask: DBTask): Task {
  if (!dbTask.id) throw new Error('Task must have an id');

  return {
    id: dbTask.id,
    context: dbTask.context,
    stack_position: dbTask.stack_position,
    created_at: dbTask.created_at,
    ended_at: dbTask.ended_at === 0 ? undefined : dbTask.ended_at,
    updated_at: dbTask.updated_at
  };
}

export class StackWatchDatabase extends Dexie {
  tasks!: Table<DBTask>;
  private channel: BroadcastChannel;

  constructor(name: string = 'StackWatchDB') {
    super(name);

    // Define database schema
    // Note: 'is_active' would be better than 'ended_at' for indexing
    // but keeping ended_at for compatibility
    this.version(1).stores({
      tasks: '++id, stack_position, ended_at, created_at'
    });

    // Initialize BroadcastChannel for cross-tab communication
    this.channel = new BroadcastChannel('stackwatch-db');
  }

  // Helper method to broadcast messages
  private broadcast(message: BroadcastMessage): void {
    this.channel.postMessage(message);
  }

  // Get current active task (highest stack_position with no ended_at)
  async getCurrentTask(): Promise<Task | undefined> {
    // Use index to get active tasks efficiently
    const activeTasks = this.tasks
      .where('ended_at')
      .equals(0);

    // Find task with highest stack_position
    let highestTask: DBTask | undefined;
    await activeTasks.each((task) => {
      if (!highestTask || task.stack_position > highestTask.stack_position) {
        highestTask = task;
      }
    });

    return highestTask && dbTaskToTask(highestTask);
  }

  // Get all active tasks in stack order
  async getTaskStack(): Promise<Task[]> {
    // Use index to get active tasks efficiently
    const activeTasks = await this.tasks
      .where('ended_at')
      .equals(0)
      .sortBy('stack_position');

    // Sort by stack_position descending
    activeTasks.reverse();

    return activeTasks.map(task => dbTaskToTask(task));
  }

  // Push a new task to the stack
  async pushTask(context: string = "New Task"): Promise<Task> {
    const now = new Date();

    // Get highest stack position
    const activeTasks = this.tasks
      .where('ended_at')
      .equals(0);

    let maxPosition = -1;
    await activeTasks.each((task) => {
      maxPosition = Math.max(maxPosition, task.stack_position);
    });

    const newTask: DBTask = {
      context,
      stack_position: maxPosition + 1,
      created_at: now,
      ended_at: 0,  // Active task
      updated_at: now
    };

    const id = await this.tasks.add(newTask);
    const task = dbTaskToTask({ ...newTask, id });

    // Broadcast task creation event
    this.broadcast({
      type: 'task-created',
      task: task,
      timestamp: new Date()
    });

    return task;
  }

  // Pop the current task from the stack
  async popTask(): Promise<Task | undefined> {
    const currentTask = await this.getCurrentTask();
    if (!currentTask) return undefined;

    const now = new Date();
    await this.tasks.update(currentTask.id, {
      ended_at: now,
      updated_at: now
    });

    const poppedTask = { ...currentTask, ended_at: now, updated_at: now };

    // Broadcast task popped event
    this.broadcast({
      type: 'task-popped',
      task: poppedTask,
      timestamp: new Date()
    });

    return poppedTask;
  }

  // Update task context
  async updateTask(id: number, context: string): Promise<Task> {
    const now = new Date();

    await this.tasks.update(id, {
      context,
      updated_at: now
    });

    const task = await this.tasks.get(id);
    if (!task) throw new Error('Task not found');

    const updatedTask = dbTaskToTask(task);

    // Broadcast task updated event
    this.broadcast({
      type: 'task-updated',
      task: updatedTask,
      timestamp: new Date()
    });

    return updatedTask;
  }


  // Cleanup method to close the BroadcastChannel
  close(): void {
    this.channel.close();
  }
}

// No longer exporting singleton - use DatabaseContext instead
