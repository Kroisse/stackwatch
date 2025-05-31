import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { TaskStack } from './TaskStack';
import { Task } from '../utils/task';

// Mock the useCurrentTime hook instead of TaskTimer component
vi.mock('../hooks/useCurrentTime', () => ({
  useCurrentTime: () => new Date('2024-01-01T12:00:00'),
}));

describe('TaskStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('renders empty state when no tasks', () => {
    const { getByText } = render(<TaskStack tasks={[]} />);

    expect(getByText('Task Stack')).toBeInTheDocument();
    expect(getByText('No tasks in stack')).toBeInTheDocument();
  });

  it('renders list of tasks', () => {
    const tasks: Task[] = [
      {
        id: 1,
        context: 'First task',
        stack_position: 1,
        created_at: new Date('2024-01-01T11:00:00'),
        updated_at: new Date('2024-01-01T11:00:00'),
      },
      {
        id: 2,
        context: 'Second task\nWith description',
        stack_position: 0,
        created_at: new Date('2024-01-01T11:30:00'),
        updated_at: new Date('2024-01-01T11:30:00'),
      },
    ];

    const { getByText, container } = render(<TaskStack tasks={tasks} />);

    expect(getByText('First task')).toBeInTheDocument();
    expect(getByText('Second task')).toBeInTheDocument();
    expect(getByText('With description')).toBeInTheDocument();

    // Check that TaskTimer components are rendered with correct time
    const timers = container.querySelectorAll('.task-timer');
    expect(timers).toHaveLength(2);
    expect(timers[0].textContent).toBe('01:00:00'); // First task: 1 hour elapsed
    expect(timers[1].textContent).toBe('00:30:00'); // Second task: 30 minutes elapsed
  });

  it('marks active tasks with active class', () => {
    const tasks: Task[] = [
      {
        id: 1,
        context: 'Active task',
        stack_position: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 2,
        context: 'Completed task',
        stack_position: 0,
        created_at: new Date(),
        ended_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { container } = render(<TaskStack tasks={tasks} />);
    const taskItems = container.querySelectorAll('.task-item');

    expect(taskItems[0]).toHaveClass('active');
    expect(taskItems[1]).not.toHaveClass('active');
  });

  it('handles tasks with empty context', () => {
    const tasks: Task[] = [
      {
        id: 1,
        context: '',
        stack_position: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { getByText } = render(<TaskStack tasks={tasks} />);

    expect(getByText('Untitled Task')).toBeInTheDocument(); // Default title for empty context
  });

  it('does not render description when task has only title', () => {
    const tasks: Task[] = [
      {
        id: 1,
        context: 'Just a title',
        stack_position: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    const { container, getByText } = render(<TaskStack tasks={tasks} />);

    expect(getByText('Just a title')).toBeInTheDocument();
    expect(container.querySelector('.task-context')).not.toBeInTheDocument();
  });
});
