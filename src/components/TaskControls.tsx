interface TaskControlsProps {
  onPushTask: () => void;
  onPopTask: () => void;
  onToggleTimer: () => void;
  canPopTask: boolean;
}

export function TaskControls({ onPushTask, onPopTask, onToggleTimer, canPopTask }: TaskControlsProps) {
  return (
    <div className="task-controls">
      <button onClick={onPushTask} className="push-btn">
        Push Task
      </button>
      <button onClick={onPopTask} disabled={!canPopTask} className="pop-btn">
        Pop Task
      </button>
      <button onClick={onToggleTimer} className="toggle-floating-btn">
        Toggle Timer
      </button>
    </div>
  );
}