import { useState, useEffect } from "react";
import { getDisplayTaskTitle, getTaskDescription, isTaskActive } from "./utils/task";
import { useTaskStack } from "./hooks/useTaskStack";
import { migrateFromSQLite } from "./db/migration";
import { useDatabase } from "./hooks/useDatabase";
import { invoke } from "@tauri-apps/api/core";
import { TaskTimer } from "./components/TaskTimer";
import "./App.css";

function App() {
  const db = useDatabase();
  const { taskStack, pushTask, popTask, updateTask } = useTaskStack();
  const [editingContext, setEditingContext] = useState("");
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
            <p className="task-timer"><TaskTimer task={taskStack.current_task} /></p>
          </div>
        ) : (
          <div className="current-task idle">
            <p className="idle-state">Idle</p>
            <p className="task-timer"><TaskTimer task={null} /></p>
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
                  <TaskTimer task={task} />
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
