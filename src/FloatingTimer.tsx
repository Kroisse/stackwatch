import { useEffect, useState } from 'react';
import { Task, getDisplayTaskTitle } from './utils/task';
import { useDatabase } from './hooks/useDatabase';
import { TaskTimer } from './components/TaskTimer';
import './FloatingTimer.css';

export function FloatingTimer() {
  const db = useDatabase();
  const [currentTask, setCurrentTask] = useState<Task | undefined>(undefined);
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
        if ('__TAURI__' in window) {
          // In Tauri environment, use the focus_main_window command
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('focus_main_window');
        } else if (window.opener && !(window.opener as Window).closed) {
          // In web environment, try to focus the opener window
          (window.opener as Window).focus();
        }
      } catch (error) {
        console.error('Failed to focus main window:', error);
      }
    }
    setIsDragging(false);
  };


  // Load initial task info
  useEffect(() => {
    const abortController = new AbortController();
    
    const loadTask = async () => {
      try {
        const task = await db.getCurrentTask({ signal: abortController.signal });
        if (!abortController.signal.aborted) {
          setCurrentTask(task ?? undefined);
        }
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('Failed to fetch current task:', error);
        }
      }
    };
    
    void loadTask();
    
    return () => {
      abortController.abort();
    };
  }, [db]);

  // Listen for database changes via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('stackwatch-db');
    const abortController = new AbortController();
    
    const handleMessage = (event: MessageEvent<{type: string}>) => {
      // Handle various event types from database
      switch (event.data.type) {
        case 'task-created':
        case 'task-popped':
        case 'task-updated':
          void (async () => {
            try {
              const task = await db.getCurrentTask({ signal: abortController.signal });
              if (!abortController.signal.aborted) {
                setCurrentTask(task ?? undefined);
              }
            } catch (error) {
              if (!abortController.signal.aborted) {
                console.error('Failed to fetch current task:', error);
              }
            }
          })();
          break;
      }
    };
    
    channel.addEventListener('message', handleMessage);
    
    return () => {
      abortController.abort();
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [db]);

  return (
    <div
      className="floating-timer"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => void handleMouseUp()}
    >
      <div className="task-context">
        {currentTask ? getDisplayTaskTitle(currentTask) : 'Idle'}
      </div>
      <div className="elapsed-time">
        <TaskTimer task={currentTask} />
      </div>
    </div>
  );
}
