import { useEffect, useState } from 'react';
import { Task, getTaskTitle, getDisplayTaskTitle, formatDuration } from './utils/task';
import { useDatabase } from './hooks/useDatabase';
import { Temporal } from '@js-temporal/polyfill';
import './FloatingTimer.css';

export function FloatingTimer() {
  const db = useDatabase();
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [startTime, setStartTime] = useState<Temporal.Instant | null>(null);
  const [duration, setDuration] = useState<Temporal.Duration>(Temporal.Duration.from({ seconds: 0 }));
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
  const handleMouseUp = () => {
    if (!isDragging) {
      // TODO: Implement focus main window for non-Tauri environment
      console.log('Focus main window requested');
    }
    setIsDragging(false);
  };

  // Load current task from database
  const loadCurrentTask = async () => {
    try {
      const task = await db.getCurrentTask();
      if (task) {
        setCurrentTask(task);
        setStartTime(task.created_at);
        // Calculate elapsed time
        const now = Temporal.Now.instant();
        const elapsed = now.since(task.created_at);
        setDuration(elapsed);
      } else {
        setCurrentTask(null);
        setStartTime(null);
        setDuration(Temporal.Duration.from({ seconds: 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch current task:', error);
    }
  };

  // Load initial task info
  useEffect(() => {
    loadCurrentTask();
  }, [db]);

  // Listen for database changes via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    
    const handleMessage = (event: MessageEvent) => {
      // Handle various event types from database
      switch (event.data.type) {
        case 'task-created':
        case 'task-popped':
        case 'task-updated':
        case 'stack-updated':
          loadCurrentTask();
          break;
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [db]);

  // Update elapsed time every second
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    if (currentTask && startTime) {
      intervalId = setInterval(() => {
        const now = Temporal.Now.instant();
        const elapsed = now.since(startTime);
        setDuration(elapsed);
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
          <div className="task-context">{getDisplayTaskTitle(currentTask)}</div>
          <div className={`elapsed-time ${isIdle ? 'idle' : ''}`}>
            {formatDuration(duration)}
          </div>
        </>
      ) : (
        <div className="no-task">No active task</div>
      )}
    </div>
  );
}
