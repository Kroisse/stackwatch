import { StackWatchDatabase } from './database';

interface RawTask {
  id: number;
  context: string;
  stack_position: number;
  created_at: string;
  ended_at?: string;  // active tasks don't have ended_at
  updated_at: string;
}

interface RawTaskStack {
  tasks: RawTask[];
  current_task?: RawTask;  // optional, may not exist
}

export async function migrateFromSQLite(db: StackWatchDatabase, signal?: AbortSignal): Promise<void> {
  try {
    // Check if already aborted
    signal?.throwIfAborted();

    const { invoke } = await import('@tauri-apps/api/core');
    
    // Check again after async import
    signal?.throwIfAborted();

    // Check if we already have data in IndexedDB
    const existingCount = await db.tasks.count();
    if (existingCount > 0) {
      console.log('IndexedDB already has data, skipping migration');
      return;
    }

    // Get all tasks from SQLite through Tauri
    const response = await invoke<RawTaskStack>('get_task_stack');

    // Check if aborted after invoke
    signal?.throwIfAborted();

    // No data to migrate
    if (!response.tasks || response.tasks.length === 0) {
      // Create initial idle task
      await db.checkIdleTask();
      return;
    }

    // Migrate all tasks (avoiding duplicates)
    const taskMap = new Map<number, RawTask>();

    // Add all tasks to map to deduplicate by ID
    for (const task of response.tasks) {
      taskMap.set(task.id, task);
    }

    // Also add current_task if it exists and not already in map
    if (response.current_task) {
      taskMap.set(response.current_task.id, response.current_task);
    }

    // Now migrate deduplicated tasks
    await db.transaction('rw', db.tasks, async () => {
      for (const task of taskMap.values()) {
        // Check if aborted during transaction
        signal?.throwIfAborted();
        
        await db.tasks.add({
          context: task.context,
          stack_position: task.stack_position,
          created_at: new Date(task.created_at),
          ended_at: task.ended_at ? new Date(task.ended_at) : 0,
          updated_at: new Date(task.updated_at)
        });
      }
    });

    console.log(`Migrated ${taskMap.size} unique tasks from SQLite to IndexedDB`);
  } catch (error) {
    // If it's an abort error, just re-throw it
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    console.error('Migration failed:', error);
    // Create idle task anyway for other errors
    await db.checkIdleTask();
  }
}
