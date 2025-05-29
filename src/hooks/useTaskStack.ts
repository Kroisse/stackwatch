import { useEffect, useCallback, useRef, useMemo, useReducer } from 'react';
import { useDatabase } from './useDatabase';
import { Task, TaskStack, EfficientTaskStack } from '../utils/task';
import { BroadcastMessage } from '../types/broadcast';

// Action types for the reducer
type StackAction = 
  | { type: 'LOAD_TASKS'; tasks: Task[]; currentTask?: Task }
  | { type: 'TASK_CREATED'; task: Task }
  | { type: 'TASK_POPPED'; taskId: number }
  | { type: 'TASK_UPDATED'; task: Task };

// Reducer function
function taskStackReducer(state: EfficientTaskStack, action: StackAction): EfficientTaskStack {
  switch (action.type) {
    case 'LOAD_TASKS': {
      const taskMap = new Map(action.tasks.map(task => [task.id, task]));
      const taskOrder = action.tasks
        .sort((a, b) => a.stack_position - b.stack_position)
        .map(task => task.id);
      
      return {
        taskMap,
        taskOrder,
        currentTaskId: action.currentTask?.id
      };
    }
    
    case 'TASK_CREATED': {
      const newMap = new Map(state.taskMap);
      newMap.set(action.task.id, action.task);
      
      return {
        taskMap: newMap,
        taskOrder: [...state.taskOrder, action.task.id],
        currentTaskId: action.task.id
      };
    }
    
    case 'TASK_POPPED': {
      const newMap = new Map(state.taskMap);
      newMap.delete(action.taskId);
      
      const newOrder = state.taskOrder.filter(id => id !== action.taskId);
      const newCurrentId = newOrder.length > 0 ? newOrder[newOrder.length - 1] : undefined;
      
      return {
        taskMap: newMap,
        taskOrder: newOrder,
        currentTaskId: newCurrentId
      };
    }
    
    case 'TASK_UPDATED': {
      const newMap = new Map(state.taskMap);
      newMap.set(action.task.id, action.task);
      
      return {
        ...state,
        taskMap: newMap
      };
    }
    
    default:
      return state;
  }
}

export function useTaskStack() {
  const db = useDatabase();
  const [efficientStack, dispatch] = useReducer(taskStackReducer, {
    taskMap: new Map(),
    taskOrder: [],
    currentTaskId: undefined
  });
  const [loading, setLoading] = useReducer((state: boolean, loaded: boolean) => loaded ? false : state, true);

  // Convert EfficientTaskStack to TaskStack for backward compatibility
  const taskStack = useMemo<TaskStack>(() => {
    const tasks = efficientStack.taskOrder
      .map(id => efficientStack.taskMap.get(id))
      .filter((task): task is Task => task != null);

    const current_task = efficientStack.currentTaskId
      ? efficientStack.taskMap.get(efficientStack.currentTaskId)
      : undefined;

    return { tasks, current_task };
  }, [efficientStack]);

  // Load tasks from database
  const loadTasks = useCallback(async () => {
    try {
      const tasks = await db.getTaskStack();
      const currentTask = await db.getCurrentTask();

      dispatch({ type: 'LOAD_TASKS', tasks, currentTask });
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [db]);

  // Push a new task
  const pushTask = useCallback(async (context?: string) => {
    try {
      await db.pushTask(context);
      // State will be updated via broadcast message
    } catch (error) {
      console.error('Failed to push task:', error);
    }
  }, [db]);

  // Pop current task
  const popTask = useCallback(async () => {
    try {
      await db.popTask();
      // State will be updated via broadcast message
    } catch (error) {
      console.error('Failed to pop task:', error);
    }
  }, [db]);

  // Update task context
  const updateTask = useCallback(async (id: number, context: string) => {
    try {
      await db.updateTask(id, context);
      // State will be updated via broadcast message
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [db]);

  // Initial load
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Shared BroadcastChannel for both listening and sending
  const channelRef = useRef<BroadcastChannel | null>(null);

  // Listen for database changes (if multiple tabs/windows)
  useEffect(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    channelRef.current = channel;

    const handleMessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'task-created':
          dispatch({ type: 'TASK_CREATED', task: message.task });
          break;

        case 'task-popped':
          dispatch({ type: 'TASK_POPPED', taskId: message.task.id });
          break;

        case 'task-updated':
          dispatch({ type: 'TASK_UPDATED', task: message.task });
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
