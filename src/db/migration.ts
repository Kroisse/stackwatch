import { invoke } from '@tauri-apps/api/core';
import { StackWatchDatabase } from './database';
import { TaskStack } from '../utils/task';

export async function migrateFromSQLite(db: StackWatchDatabase): Promise<void> {
  try {
    // Check if we already have data in IndexedDB
    const existingCount = await db.tasks.count();
    if (existingCount > 0) {
      console.log('IndexedDB already has data, skipping migration');
      return;
    }

    // Get all tasks from SQLite through Tauri
    const response = await invoke<TaskStack>('get_task_stack');
    
    // No data to migrate
    if (!response.tasks || response.tasks.length === 0) {
      // Create initial idle task
      await db.checkIdleTask();
      return;
    }

    // Migrate all tasks (avoiding duplicates)
    const taskMap = new Map<number, typeof response.tasks[0]>();
    
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
    console.error('Migration failed:', error);
    // Create idle task anyway
    await db.checkIdleTask();
  }
}