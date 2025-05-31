import { useState, useEffect } from 'react';
import { Task, formatElapsedTime } from '../utils/task';
import { useCurrentTime } from '../hooks/useCurrentTime';

interface TaskTimerProps {
  task?: Task | undefined;
  className?: string;
}

export function TaskTimer({ task, className = '' }: TaskTimerProps) {
  const currentTime = useCurrentTime();
  const [idleStartTime, setIdleStartTime] = useState<Date | null>(null);

  // Update idle start time when task changes
  useEffect(() => {
    if (!task) {
      // Just became idle - reset to current time
      setIdleStartTime(new Date());
    } else {
      // Not idle anymore
      setIdleStartTime(null);
    }
  }, [task]);

  const getElapsedTime = (): string => {
    if (task) {
      return formatElapsedTime(task.created_at, task.ended_at ?? currentTime);
    }
    return idleStartTime
      ? formatElapsedTime(idleStartTime, currentTime)
      : '00:00:00';
  };

  const isIdle = !task;

  return (
    <span className={`task-timer ${isIdle ? 'idle' : ''} ${className}`}>
      {getElapsedTime()}
    </span>
  );
}
