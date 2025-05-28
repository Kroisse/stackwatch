import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Shared BroadcastChannel for both listening and sending
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Listen for database changes (if multiple tabs/windows)
  useEffect(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    channelRef.current = channel;
    
    const handleMessage = (event: MessageEvent) => {
      // Handle various event types from database
      switch (event.data.type) {
        case 'task-created':
        case 'task-popped':
        case 'task-updated':
        case 'stack-updated':
          loadTasks();
          break;
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
      channelRef.current = null;
    };
  }, [loadTasks]);

  // No need for manual broadcast - database handles it now

  return {
    taskStack,
    loading,
    pushTask,
    popTask,
    updateTask,
    reload: loadTasks
  };
}