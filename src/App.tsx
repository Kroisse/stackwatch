import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Task, TaskStack, getTaskTitle, getTaskDescription, formatElapsedTime, isTaskActive } from "./utils/task";
import "./App.css";

function App() {
  const [taskStack, setTaskStack] = useState<TaskStack>({ tasks: [] });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingContext, setEditingContext] = useState("");

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update editing context when current task changes
  useEffect(() => {
    if (taskStack.current_task) {
      setEditingContext(taskStack.current_task.context);
    } else {
      setEditingContext("");
    }
  }, [taskStack.current_task]);

  // Load task stack on mount and setup event listeners
  useEffect(() => {
    loadTaskStack();

    // Set up event listeners for real-time updates
    const unlistenStackUpdated = listen<TaskStack>("stack:updated", (event) => {
      console.log("Stack updated:", event.payload);
      setTaskStack(event.payload);
    });

    const unlistenTaskCreated = listen<Task>("task:created", (event) => {
      console.log("Task created:", event.payload);
      loadTaskStack(); // Reload to ensure consistency
    });

    const unlistenTaskPopped = listen<Task>("task:popped", (event) => {
      console.log("Task popped:", event.payload);
      loadTaskStack(); // Reload to ensure consistency
    });

    const unlistenTaskUpdated = listen<Task>("task:updated", (event) => {
      console.log("Task updated:", event.payload);
      loadTaskStack(); // Reload to ensure consistency
    });

    // Cleanup listeners on unmount
    return () => {
      unlistenStackUpdated.then(fn => fn());
      unlistenTaskCreated.then(fn => fn());
      unlistenTaskPopped.then(fn => fn());
      unlistenTaskUpdated.then(fn => fn());
    };
  }, []);

  async function loadTaskStack() {
    try {
      const stack = await invoke<TaskStack>("get_task_stack");
      setTaskStack(stack);
    } catch (error) {
      console.error("Failed to load task stack:", error);
    }
  }

  async function pushTask() {
    try {
      await invoke("push_task", {
        context: null,
      });
      // No need to manually reload - events will handle it
    } catch (error) {
      console.error("Failed to push task:", error);
    }
  }

  async function popTask() {
    try {
      await invoke("pop_task");
      // No need to manually reload - events will handle it
    } catch (error) {
      console.error("Failed to pop task:", error);
    }
  }

  async function updateTaskContext() {
    if (!taskStack.current_task) return;

    try {
      await invoke("update_task", {
        id: taskStack.current_task.id,
        context: editingContext,
      });
      // No need to manually reload - events will handle it
    } catch (error) {
      console.error("Failed to update task context:", error);
    }
  }

  async function toggleFloatingWindow() {
    try {
      await invoke("toggle_floating_window");
    } catch (error) {
      console.error("Failed to toggle floating window:", error);
    }
  }


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
                onBlur={updateTaskContext}
                placeholder="Task name (first line)&#10;Additional context..."
                rows={5}
              />
            </div>
            <p className="task-timer">{calculateDuration(taskStack.current_task)}</p>
          </div>
        ) : (
          <p>No active task</p>
        )}
      </div>

      {/* Task Controls */}
      <div className="task-controls">
        <button onClick={pushTask} className="push-btn">
          Push Task
        </button>
        <button onClick={popTask} disabled={!taskStack.current_task} className="pop-btn">
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
                  <h4>{getTaskTitle(task)}</h4>
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
