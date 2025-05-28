import { useState, useEffect } from "react";
import { getDisplayTaskTitle, getTaskDescription, formatElapsedTime, isTaskActive, Task } from "./utils/task";
import { useTaskStack } from "./hooks/useTaskStack";
import { migrateFromSQLite } from "./db/migration";
import { useDatabase } from "./hooks/useDatabase";
import { useCurrentTime } from "./hooks/useCurrentTime";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const db = useDatabase();
  const { taskStack, pushTask, popTask, updateTask } = useTaskStack();
  const [editingContext, setEditingContext] = useState("");
  const currentTime = useCurrentTime();
  const [floatingWindow, setFloatingWindow] = useState<Window | null>(null);

  // Run migration on first load
  useEffect(() => {
    const abortController = new AbortController();
    
    migrateFromSQLite(db, abortController.signal).catch(error => {
      if (error.name !== 'AbortError') {
        console.error('Migration failed:', error);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [db]);

  // Update editing context when current task changes
  useEffect(() => {
    if (taskStack.current_task) {
      setEditingContext(taskStack.current_task.context);
    } else {
      setEditingContext("");
    }
  }, [taskStack.current_task]);


  const handlePushTask = async () => {
    try {
      await pushTask();
    } catch (error) {
      console.error("Failed to push task:", error);
    }
  };

  // Track idle start time
  const [idleStartTime, setIdleStartTime] = useState<Date | null>(null);

  // Update idle start time when task stack changes
  useEffect(() => {
    if (!taskStack.current_task && taskStack.tasks.length === 0) {
      // Just became idle - always reset to current time
      setIdleStartTime(new Date());
    } else {
      // Not idle anymore
      setIdleStartTime(null);
    }
  }, [taskStack.current_task, taskStack.tasks.length]);

  const handlePopTask = async () => {
    try {
      await popTask();
    } catch (error) {
      console.error("Failed to pop task:", error);
    }
  };

  const handleUpdateTaskContext = async () => {
    if (!taskStack.current_task) return;

    try {
      await updateTask(taskStack.current_task.id, editingContext);
    } catch (error) {
      console.error("Failed to update task context:", error);
    }
  }

  const toggleFloatingWindow = async () => {
    try {
      // Check if we're in Tauri environment
      if ('__TAURI__' in window) {
        await invoke("toggle_floating_window");
      } else {
        // In web environment, use window.open
        if (floatingWindow && !floatingWindow.closed) {
          // Close existing window
          floatingWindow.close();
          setFloatingWindow(null);
        } else {
          // Open new window
          const width = 200;
          const height = 60;
          const left = window.screen.width - width - 20;
          const top = 20;
          
          const newWindow = window.open(
            '/floating.html',
            'stackwatch-floating',
            `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,resizable=no`
          );
          
          setFloatingWindow(newWindow);
        }
      }
    } catch (error) {
      console.error("Failed to toggle floating window:", error);
    }
  };


  function calculateDuration(task: Task): string {
    return formatElapsedTime(task.created_at, task.ended_at || currentTime);
  }

  return (
    <main className="container">
      {/* Current Task Display */}
      <div className="current-task-section">
        <h2>Current Task</h2>
        {taskStack.current_task ? (
          <div className="current-task">
            <div className="context-edit-form">
              <textarea
                value={editingContext}
                onChange={(e) => setEditingContext(e.target.value)}
                onBlur={handleUpdateTaskContext}
                placeholder="Task name (first line)&#10;Additional context..."
                rows={5}
              />
            </div>
            <p className="task-timer">{taskStack.current_task ? calculateDuration(taskStack.current_task) : ''}</p>
          </div>
        ) : (
          <div className="current-task idle">
            <p className="idle-state">Idle</p>
            <p className="task-timer">{idleStartTime ? formatElapsedTime(idleStartTime, currentTime) : '00:00:00'}</p>
          </div>
        )}
      </div>

      {/* Task Controls */}
      <div className="task-controls">
        <button onClick={handlePushTask} className="push-btn">
          Push Task
        </button>
        <button onClick={handlePopTask} disabled={!taskStack.current_task} className="pop-btn">
          Pop Task
        </button>
        <button onClick={toggleFloatingWindow} className="toggle-floating-btn">
          Toggle Timer
        </button>
      </div>

      {/* Task Stack Display */}
      <div className="task-stack-section">
        <h2>Task Stack</h2>
        <div className="task-stack">
          {taskStack.tasks.length > 0 ? (
            taskStack.tasks.map((task) => (
              <div
                key={task.id}
                className={`task-item ${isTaskActive(task) ? 'active' : ''}`}
              >
                <div className="task-info">
                  <h4>{getDisplayTaskTitle(task)}</h4>
                  {getTaskDescription(task) && <p className="task-context">{getTaskDescription(task)}</p>}
                </div>
                <div className="task-duration">
                  {calculateDuration(task)}
                </div>
              </div>
            ))
          ) : (
            <p>No tasks in stack</p>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
