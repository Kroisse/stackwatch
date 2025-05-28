import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from './useDatabase';
import { TaskStack } from '../utils/task';

export function useTaskStack() {
  const db = useDatabase();
  const [taskStack, setTaskStack] = useState<TaskStack>({ 
    tasks: [], 
    current_task: undefined 
  });
  const [loading, setLoading] = useState(true);

  // Load tasks from database
  const loadTasks = useCallback(async () => {
    try {
      const tasks = await db.getTaskStack();
      const currentTask = await db.getCurrentTask();
      
      setTaskStack({
        tasks,
        current_task: currentTask
      });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Push a new task
  const pushTask = useCallback(async (context?: string) => {
    try {
      await db.pushTask(context);
      await loadTasks();
    } catch (error) {
      console.error('Failed to push task:', error);
    }
  }, [loadTasks]);

  // Pop current task
  const popTask = useCallback(async () => {
    try {
      await db.popTask();
      await loadTasks();
    } catch (error) {
      console.error('Failed to pop task:', error);
    }
  }, [loadTasks]);

  // Update task context
  const updateTask = useCallback(async (id: number, context: string) => {
    try {
      await db.updateTask(id, context);
      await loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [loadTasks]);

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Listen for database changes (if multiple tabs/windows)
  useEffect(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'db-changed') {
        loadTasks();
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [loadTasks]);

  // Broadcast changes
  const broadcast = useCallback(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    channel.postMessage({ type: 'db-changed' });
    channel.close();
  }, []);

  // Wrap methods to broadcast changes
  const pushTaskWithBroadcast = useCallback(async (context?: string) => {
    await pushTask(context);
    broadcast();
  }, [pushTask, broadcast]);

  const popTaskWithBroadcast = useCallback(async () => {
    await popTask();
    broadcast();
  }, [popTask, broadcast]);

  const updateTaskWithBroadcast = useCallback(async (id: number, context: string) => {
    await updateTask(id, context);
    broadcast();
  }, [updateTask, broadcast]);

  return {
    taskStack,
    loading,
    pushTask: pushTaskWithBroadcast,
    popTask: popTaskWithBroadcast,
    updateTask: updateTaskWithBroadcast,
    reload: loadTasks
  };
}