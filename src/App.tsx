import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

interface Task {
  id: number;
  name: string;
  context?: string;
  start_time: string;
  end_time?: string;
  stack_position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TaskStack {
  tasks: Task[];
  current_task?: Task;
}

function App() {
  const [taskStack, setTaskStack] = useState<TaskStack>({ tasks: [] });
  const [newTaskName, setNewTaskName] = useState("");
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
    if (!newTaskName.trim()) return;

    try {
      await invoke("push_task", {
        name: newTaskName,
        context: null,
      });
      setNewTaskName("");
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
        context: editingContext || null,
      });
      await loadTaskStack();
      setIsEditingContext(false);
    } catch (error) {
      console.error("Failed to update task context:", error);
    }
  }

  function startEditingContext() {
    if (taskStack.current_task) {
      setEditingContext(taskStack.current_task.context || "");
      setIsEditingContext(true);
    }
  }

  function cancelEditingContext() {
    setIsEditingContext(false);
    setEditingContext("");
  }

  function calculateDuration(task: Task): string {
    const start = new Date(task.start_time);
    const end = task.end_time ? new Date(task.end_time) : currentTime;
    const diff = end.getTime() - start.getTime();
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return (
    <main className="container">
      {/* Current Task Display */}
      <div className="current-task-section">
        <h2>Current Task</h2>
        {taskStack.current_task ? (
          <div className="current-task">
            <h3>{taskStack.current_task.name}</h3>
            {isEditingContext ? (
              <div className="context-edit-form">
                <textarea
                  value={editingContext}
                  onChange={(e) => setEditingContext(e.target.value)}
                  placeholder="Add context or notes..."
                  rows={3}
                  autoFocus
                />
                <div className="context-edit-buttons">
                  <button onClick={updateTaskContext} className="save-btn">Save</button>
                  <button onClick={cancelEditingContext} className="cancel-btn">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="task-context-container" onClick={startEditingContext}>
                {taskStack.current_task.context ? (
                  <p className="task-context">{taskStack.current_task.context}</p>
                ) : (
                  <p className="task-context placeholder">Click to add context...</p>
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
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            placeholder="Enter task name..."
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
                className={`task-item ${task.is_active ? 'active' : ''}`}
              >
                <div className="task-info">
                  <h4>{task.name}</h4>
                  {task.context && <p className="task-context">{task.context}</p>}
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