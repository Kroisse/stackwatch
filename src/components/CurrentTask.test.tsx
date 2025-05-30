import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { CurrentTask } from './CurrentTask';
import { Task } from '../utils/task';

// Mock the TaskTimer component
vi.mock('./TaskTimer', () => ({
  TaskTimer: ({ task }: { task?: Task }) => (
    <span>Timer: {task ? `Task ${task.id}` : 'Idle'}</span>
  ),
}));

describe('CurrentTask', () => {
  it('renders idle state when no current task', () => {
    const onUpdateTask = vi.fn();
    const { getByText } = render(
      <CurrentTask task={undefined} onUpdateTask={onUpdateTask} />,
    );

    expect(getByText('Current Task')).toBeInTheDocument();
    expect(getByText('Idle')).toBeInTheDocument();
    expect(getByText('Timer: Idle')).toBeInTheDocument();
  });

  it('renders current task with textarea', () => {
    const task: Task = {
      id: 1,
      context: 'Test task\nWith description',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const onUpdateTask = vi.fn();

    const { getByPlaceholderText, getByText } = render(
      <CurrentTask task={task} onUpdateTask={onUpdateTask} />,
    );

    const textarea = getByPlaceholderText(/Task name/);
    expect(textarea).toHaveValue('Test task\nWith description');
    expect(getByText('Timer: Task 1')).toBeInTheDocument();
  });

  it('updates context when textarea changes', () => {
    const task: Task = {
      id: 1,
      context: 'Original text',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const onUpdateTask = vi.fn();

    const { getByPlaceholderText } = render(
      <CurrentTask task={task} onUpdateTask={onUpdateTask} />,
    );

    const textarea = getByPlaceholderText(/Task name/);
    fireEvent.change(textarea, { target: { value: 'Updated text' } });

    expect(textarea).toHaveValue('Updated text');
  });

  it('calls onUpdateTask when textarea loses focus', async () => {
    const task: Task = {
      id: 1,
      context: 'Original text',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const onUpdateTask = vi.fn();

    const { getByPlaceholderText } = render(
      <CurrentTask task={task} onUpdateTask={onUpdateTask} />,
    );

    const textarea = getByPlaceholderText(/Task name/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Updated text' } });
    fireEvent.blur(textarea);

    await waitFor(() => {
      expect(onUpdateTask).toHaveBeenCalledWith(1, 'Updated text');
    });
  });

  it('updates editing context when task changes', () => {
    const task1: Task = {
      id: 1,
      context: 'Task 1',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const task2: Task = {
      id: 2,
      context: 'Task 2',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const onUpdateTask = vi.fn();

    const { rerender, getByPlaceholderText } = render(
      <CurrentTask task={task1} onUpdateTask={onUpdateTask} />,
    );

    let textarea = getByPlaceholderText(/Task name/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Task 1');

    rerender(<CurrentTask task={task2} onUpdateTask={onUpdateTask} />);

    textarea = getByPlaceholderText(/Task name/) as HTMLTextAreaElement;
    expect(textarea.value).toBe('Task 2');
  });

  it('clears editing context when task becomes undefined', () => {
    const task: Task = {
      id: 1,
      context: 'Task 1',
      stack_position: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    const onUpdateTask = vi.fn();

    const { rerender, getByPlaceholderText, queryByPlaceholderText } = render(
      <CurrentTask task={task} onUpdateTask={onUpdateTask} />,
    );

    const textarea = getByPlaceholderText(/Task name/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Modified text' } });

    rerender(<CurrentTask task={undefined} onUpdateTask={onUpdateTask} />);

    // Should not have textarea in idle state
    expect(queryByPlaceholderText(/Task name/)).toBeFalsy();
  });
});
