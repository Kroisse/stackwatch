import { useState, useEffect } from "react";
import { getDisplayTaskTitle, getTaskDescription, formatElapsedTime, isTaskActive, Task } from "./utils/task";
import { useTaskStack } from "./hooks/useTaskStack";
import { migrateFromSQLite } from "./db/migration";
import { useDatabase } from "./hooks/useDatabase";
import { useCurrentTime } from "./hooks/useCurrentTime";
import "./App.css";

function App() {
  const db = useDatabase();
  const { taskStack, pushTask, popTask, updateTask } = useTaskStack();
  const [editingContext, setEditingContext] = useState("");
  const currentTime = useCurrentTime();

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

  // TODO: Implement floating window toggle for Tauri
  const toggleFloatingWindow = () => {
    console.log("Floating window toggle not yet implemented");
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
          <p>No active task</p>
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
