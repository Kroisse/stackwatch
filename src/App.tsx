import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface Task {
  id: number;
  context: string;
  stack_position: number;
  created_at: string;
  ended_at?: string;
  updated_at: string;
}

interface TaskStack {
  tasks: Task[];
  current_task?: Task;
}

function App() {
  const [taskStack, setTaskStack] = useState<TaskStack>({ tasks: [] });
  const [newTaskContext, setNewTaskContext] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [editingContext, setEditingContext] = useState("");

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load task stack on mount
  useEffect(() => {
    loadTaskStack();
  }, []);

  async function loadTaskStack() {
    try {
      const stack = await invoke<TaskStack>("get_task_stack");
      setTaskStack(stack);
    } catch (error) {
      console.error("Failed to load task stack:", error);
    }
  }

  async function pushTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskContext.trim()) return;

    try {
      await invoke("push_task", {
        context: newTaskContext.trim(),
      });
      setNewTaskContext("");
      await loadTaskStack();
    } catch (error) {
      console.error("Failed to push task:", error);
    }
  }

  async function popTask() {
    try {
      await invoke("pop_task");
      await loadTaskStack();
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
      await loadTaskStack();
      setIsEditingContext(false);
    } catch (error) {
      console.error("Failed to update task context:", error);
    }
  }

  function startEditingContext() {
    if (taskStack.current_task) {
      setEditingContext(taskStack.current_task.context);
      setIsEditingContext(true);
    }
  }

  function cancelEditingContext() {
    setIsEditingContext(false);
    setEditingContext("");
  }

  function calculateDuration(task: Task): string {
    const start = new Date(task.created_at);
    const end = task.ended_at ? new Date(task.ended_at) : currentTime;
    const diff = end.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function getTaskDisplayName(task: Task): string {
    return task.context.trim().split('\n')[0];
  }

  function getTaskDisplayContext(task: Task): string {
    const lines = task.context.trim().split('\n');
    return lines.slice(1).join('\n').trim();
  }

  return (
    <main className="container">
      {/* Current Task Display */}
      <div className="current-task-section">
        <h2>Current Task</h2>
        {taskStack.current_task ? (
          <div className="current-task">
            <h3>{getTaskDisplayName(taskStack.current_task)}</h3>
            {isEditingContext ? (
              <div className="context-edit-form">
                <textarea
                  value={editingContext}
                  onChange={(e) => setEditingContext(e.target.value)}
                  placeholder="Task name (first line)&#10;Additional context..."
                  rows={5}
                  autoFocus
                />
                <div className="context-edit-buttons">
                  <button onClick={updateTaskContext} className="save-btn">Save</button>
                  <button onClick={cancelEditingContext} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="task-context-container" onClick={startEditingContext}>
                {getTaskDisplayContext(taskStack.current_task) ? (
                  <p className="task-context">{getTaskDisplayContext(taskStack.current_task)}</p>
                ) : (
                  <p className="task-context placeholder">Click to add more context...</p>
                )}
              </div>
            )}
            <p className="task-timer">{calculateDuration(taskStack.current_task)}</p>
          </div>
        ) : (
          <p>No active task</p>
        )}
      </div>

      {/* Task Controls */}
      <div className="task-controls">
        <form onSubmit={pushTask} className="push-task-form">
          <textarea
            value={newTaskContext}
            onChange={(e) => setNewTaskContext(e.target.value)}
            placeholder="Enter task (first line will be the name)..."
            rows={2}
            required
          />
          <button type="submit">Push Task</button>
        </form>
        <button onClick={popTask} disabled={!taskStack.current_task}>
          Pop Task
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
                className={`task-item ${!task.ended_at ? 'active' : ''}`}
              >
                <div className="task-info">
                  <h4>{getTaskDisplayName(task)}</h4>
                  {getTaskDisplayContext(task) && <p className="task-context">{getTaskDisplayContext(task)}</p>}
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