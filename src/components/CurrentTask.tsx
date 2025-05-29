import { useState, useEffect } from 'react';
import { Task } from '../utils/task';
import { TaskTimer } from './TaskTimer';

interface CurrentTaskProps {
  currentTask: Task | undefined;
  onUpdateTask: (taskId: number, context: string) => Promise<void>;
}

export function CurrentTask({ currentTask, onUpdateTask }: CurrentTaskProps) {
  const [editingContext, setEditingContext] = useState('');

  // Update editing context when current task changes
  useEffect(() => {
    if (currentTask) {
      setEditingContext(currentTask.context);
    } else {
      setEditingContext('');
    }
  }, [currentTask]);

  const handleUpdateTaskContext = async () => {
    if (!currentTask) return;

    try {
      await onUpdateTask(currentTask.id, editingContext);
    } catch (error) {
      console.error('Failed to update task context:', error);
    }
  };

  return (
    <div className="current-task-section">
      <h2>Current Task</h2>
      {currentTask ? (
        <div className="current-task">
          <div className="context-edit-form">
            <textarea
              value={editingContext}
              onChange={(e) => setEditingContext(e.target.value)}
              onBlur={() => void handleUpdateTaskContext()}
              placeholder="Task name (first line)&#10;Additional context..."
              rows={5}
            />
          </div>
          <p className="task-timer">
            <TaskTimer task={currentTask} />
          </p>
        </div>
      ) : (
        <div className="current-task idle">
          <p className="idle-state">Idle</p>
          <p className="task-timer">
            <TaskTimer />
          </p>
        </div>
      )}
    </div>
  );
}
