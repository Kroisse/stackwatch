import Dexie, { Table } from 'dexie';
import { Task } from '../utils/task';

export interface DBTask {
  id?: number;
  context: string;
  stack_position: number;
  created_at: Date;
  ended_at: Date | 0;  // 0 for active tasks, Date for ended tasks
  updated_at: Date;
}

export class StackWatchDatabase extends Dexie {
  tasks!: Table<DBTask>;

  constructor() {
    super('StackWatchDB');

    // Define database schema
    // Note: 'is_active' would be better than 'ended_at' for indexing
    // but keeping ended_at for compatibility
    this.version(1).stores({
      tasks: '++id, stack_position, ended_at, created_at'
    });
  }

  // Get current active task (highest stack_position with no ended_at)
  async getCurrentTask(): Promise<Task | undefined> {
    // Use index to get active tasks efficiently
    const activeTasks = await this.tasks
      .where('ended_at')
      .equals(0)
      .toArray();

    if (activeTasks.length === 0) return undefined;

    // Find task with highest stack_position
    const currentTask = activeTasks.reduce((highest, task) =>
      task.stack_position > highest.stack_position ? task : highest
    );

    return this.dbTaskToTask(currentTask);
  }

  // Get all active tasks in stack order
  async getTaskStack(): Promise<Task[]> {
    // Use index to get active tasks efficiently
    const activeTasks = await this.tasks
      .where('ended_at')
      .equals(0)
      .toArray();

    // Sort by stack_position descending
    activeTasks.sort((a, b) => b.stack_position - a.stack_position);

    return activeTasks.map(task => this.dbTaskToTask(task));
  }

  // Push a new task to the stack
  async pushTask(context: string = "New Task"): Promise<Task> {
    const now = new Date();

    // Get highest stack position
    const activeTasks = await this.tasks
      .where('ended_at')
      .equals(0)
      .toArray();

    const maxPosition = activeTasks.reduce((max, task) =>
      Math.max(max, task.stack_position), -1
    );

    const newTask: DBTask = {
      context,
      stack_position: maxPosition + 1,
      created_at: now,
      ended_at: 0,  // Active task
      updated_at: now
    };

    const id = await this.tasks.add(newTask);
    return this.dbTaskToTask({ ...newTask, id });
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

    return { ...currentTask, ended_at: now.toISOString(), updated_at: now.toISOString() };
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

    return this.dbTaskToTask(task);
  }

  // Check for idle task
  async checkIdleTask(): Promise<void> {
    const idleTasks = await this.tasks
      .filter(task => task.context.startsWith('Idle') && task.ended_at === 0)
      .toArray();

    // If no idle task exists, create one
    if (idleTasks.length === 0) {
      await this.tasks.add({
        context: 'Idle\nDefault idle state',
        stack_position: 0,
        created_at: new Date(),
        ended_at: 0,  // Active idle task
        updated_at: new Date()
      });
    }
  }

  // Helper to convert DBTask to Task interface
  private dbTaskToTask(dbTask: DBTask): Task {
    if (!dbTask.id) throw new Error('Task must have an id');

    return {
      id: dbTask.id,
      context: dbTask.context,
      stack_position: dbTask.stack_position,
      created_at: dbTask.created_at.toISOString(),
      ended_at: dbTask.ended_at === 0 ? undefined : dbTask.ended_at.toISOString(),
      updated_at: dbTask.updated_at.toISOString()
    };
  }
}

// No longer exporting singleton - use DatabaseContext instead
