import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { Task, TaskStack, getTaskTitle } from './utils/task';
import { Temporal } from '@js-temporal/polyfill';
import './FloatingTimer.css';

interface CurrentTaskInfo {
  task: Task;
  elapsed_seconds: number;
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function FloatingTimer() {
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [startTime, setStartTime] = useState<Temporal.Instant | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Handle mouse down to track potential drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setIsDragging(false);
  };

  // Handle mouse move to detect dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    const distance = Math.sqrt(
      Math.pow(e.clientX - dragStart.x, 2) +
      Math.pow(e.clientY - dragStart.y, 2)
    );
    if (distance > 5) {
      setIsDragging(true);
    }
  };

  // Handle click to focus main window (only if not dragging)
  const handleMouseUp = async () => {
    if (!isDragging) {
      try {
        await invoke('focus_main_window');
      } catch (error) {
        console.error('Failed to focus main window:', error);
      }
    }
    setIsDragging(false);
  };

  // Load initial task info
  useEffect(() => {
    const loadInitialTask = async () => {
      try {
        const info = await invoke<CurrentTaskInfo | null>('get_current_task_info');
        if (info) {
          setCurrentTask(info.task);
          setStartTime(info.task.created_at);
          setElapsedTime(info.elapsed_seconds);
        } else {
          setCurrentTask(null);
          setStartTime(null);
          setElapsedTime(0);
        }
      } catch (error) {
        console.error('Failed to fetch initial task info:', error);
      }
    };

    loadInitialTask();
  }, []);

  // Listen for task events
  useEffect(() => {
    const unlistenPromises: Promise<() => void>[] = [];

    // Listen for stack updates (handles all task changes)
    unlistenPromises.push(
      listen<TaskStack>('stack:updated', (event) => {
        const stack = event.payload;
        if (stack.current_task) {
          setCurrentTask(stack.current_task);
          setStartTime(stack.current_task.created_at);
          // Calculate initial elapsed time using Temporal
          const now = Temporal.Now.instant();
          const duration = now.since(stack.current_task.created_at);
          setElapsedTime(Math.floor(duration.total('seconds')));
        } else {
          setCurrentTask(null);
          setStartTime(null);
          setElapsedTime(0);
        }
      })
    );

    // Cleanup
    return () => {
      unlistenPromises.forEach(promise => {
        promise.then(unlisten => unlisten());
      });
    };
  }, []);

  // Update elapsed time every second
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (currentTask && startTime) {
      intervalId = setInterval(() => {
        const now = Temporal.Now.instant();
        const duration = now.since(startTime);
        setElapsedTime(Math.floor(duration.total('seconds')));
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentTask, startTime]);

  const isIdle = currentTask && getTaskTitle(currentTask).toLowerCase() === 'idle';

  return (
    <div
      className="floating-timer"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {currentTask ? (
        <>
          <div className="task-context">{getTaskTitle(currentTask)}</div>
          <div className={`elapsed-time ${isIdle ? 'idle' : ''}`}>
            {formatTime(elapsedTime)}
          </div>
        </>
      ) : (
        <div className="no-task">No active task</div>
      )}
    </div>
  );
}
