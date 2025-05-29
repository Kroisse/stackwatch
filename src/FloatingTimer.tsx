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
      setCurrentTask(task || undefined);
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

  return (
    <div
      className="floating-timer"
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
