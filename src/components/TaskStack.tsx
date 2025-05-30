import {
  Task,
  getDisplayTaskTitle,
  getTaskDescription,
  isTaskActive,
} from '../utils/task';
import { TaskTimer } from './TaskTimer';

interface TaskStackProps {
  tasks: Task[];
}

export function TaskStack({ tasks }: TaskStackProps) {
  return (
    <div className="task-stack-section">
      <h2>Task Stack</h2>
      <div className="task-stack">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${isTaskActive(task) ? 'active' : ''}`}
            >
              <div className="task-info">
                <h4>{getDisplayTaskTitle(task)}</h4>
                {getTaskDescription(task) && (
                  <p className="task-context">{getTaskDescription(task)}</p>
                )}
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
  );
}
