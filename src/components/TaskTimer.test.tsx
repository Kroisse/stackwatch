import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { TaskTimer } from './TaskTimer';
import { Task } from '../utils/task';

// Mock the useCurrentTime hook
vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => new Date('2024-01-01T12:00:00')
}));

describe('TaskTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date constructor to return consistent time
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders idle timer when no task is provided', () => {
    const { container } = render(<TaskTimer />);
    const timerElement = container.querySelector('.task-timer');
    
    expect(timerElement).toBeInTheDocument();
    expect(timerElement).toHaveClass('idle');
    expect(timerElement).toHaveTextContent('00:00:00');
  });

  it('renders task timer with elapsed time', () => {
    const task: Task = {
      id: 1,
      context: 'Test task',
      stack_position: 0,
      created_at: new Date('2024-01-01T11:30:00'),
      updated_at: new Date('2024-01-01T11:30:00')
    };

    const { container } = render(<TaskTimer task={task} />);
    const timerElement = container.querySelector('.task-timer');
    
    expect(timerElement).toBeInTheDocument();
    expect(timerElement).not.toHaveClass('idle');
    expect(timerElement).toHaveTextContent('00:30:00');
  });

  it('renders completed task timer with fixed duration', () => {
    const task: Task = {
      id: 1,
      context: 'Completed task',
      stack_position: 0,
      created_at: new Date('2024-01-01T10:00:00'),
      ended_at: new Date('2024-01-01T11:00:00'),
      updated_at: new Date('2024-01-01T11:00:00')
    };

    const { container } = render(<TaskTimer task={task} />);
    const timerElement = container.querySelector('.task-timer');
    
    expect(timerElement).toBeInTheDocument();
    expect(timerElement).toHaveTextContent('01:00:00');
  });

  it('applies custom className', () => {
    const { container } = render(<TaskTimer className="custom-class" />);
    const timerElement = container.querySelector('.task-timer');
    
    expect(timerElement).toHaveClass('custom-class', 'task-timer', 'idle');
  });
});