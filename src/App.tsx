import { useState } from "react";
import { useTaskStack } from "./hooks/useTaskStack";
import { CurrentTask } from "./components/CurrentTask";
import { TaskStack } from "./components/TaskStack";
import { TaskControls } from "./components/TaskControls";
import "./App.css";

function App() {
  const { taskStack, pushTask, popTask, updateTask } = useTaskStack();
  const [floatingWindow, setFloatingWindow] = useState<Window | null>(null);

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


  const toggleFloatingWindow = async () => {
    try {
      // Check if we're in Tauri environment
      if ('__TAURI__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
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
      <CurrentTask
        task={taskStack.current_task}
        onUpdateTask={updateTask}
      />

      <TaskControls
        onPushTask={() => void handlePushTask()}
        onPopTask={() => void handlePopTask()}
        onToggleTimer={() => void toggleFloatingWindow()}
        canPopTask={!!taskStack.current_task}
      />

      <TaskStack tasks={taskStack.tasks} />
    </main>
  );
}

export default App;
