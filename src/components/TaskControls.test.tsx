import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { TaskControls } from './TaskControls';

describe('TaskControls', () => {
  it('renders all three buttons', () => {
    const props = {
      onPushTask: vi.fn(),
      onPopTask: vi.fn(),
      onToggleTimer: vi.fn(),
      canPopTask: true,
    };

    const { getByText } = render(<TaskControls {...props} />);

    expect(getByText('Push Task')).toBeInTheDocument();
    expect(getByText('Pop Task')).toBeInTheDocument();
    expect(getByText('Toggle Timer')).toBeInTheDocument();
  });

  it('calls onPushTask when Push Task button is clicked', () => {
    const onPushTask = vi.fn();
    const props = {
      onPushTask,
      onPopTask: vi.fn(),
      onToggleTimer: vi.fn(),
      canPopTask: true,
    };

    const { getByText } = render(<TaskControls {...props} />);
    fireEvent.click(getByText('Push Task'));

    expect(onPushTask).toHaveBeenCalledTimes(1);
  });

  it('calls onPopTask when Pop Task button is clicked', () => {
    const onPopTask = vi.fn();
    const props = {
      onPushTask: vi.fn(),
      onPopTask,
      onToggleTimer: vi.fn(),
      canPopTask: true,
    };

    const { getByText } = render(<TaskControls {...props} />);
    fireEvent.click(getByText('Pop Task'));

    expect(onPopTask).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleTimer when Toggle Timer button is clicked', () => {
    const onToggleTimer = vi.fn();
    const props = {
      onPushTask: vi.fn(),
      onPopTask: vi.fn(),
      onToggleTimer,
      canPopTask: true,
    };

    const { getByText } = render(<TaskControls {...props} />);
    fireEvent.click(getByText('Toggle Timer'));

    expect(onToggleTimer).toHaveBeenCalledTimes(1);
  });

  it('disables Pop Task button when canPopTask is false', () => {
    const props = {
      onPushTask: vi.fn(),
      onPopTask: vi.fn(),
      onToggleTimer: vi.fn(),
      canPopTask: false,
    };

    const { getByText } = render(<TaskControls {...props} />);
    const popButton = getByText('Pop Task');

    expect(popButton).toBeDisabled();
  });

  it('does not call onPopTask when button is disabled', () => {
    const onPopTask = vi.fn();
    const props = {
      onPushTask: vi.fn(),
      onPopTask,
      onToggleTimer: vi.fn(),
      canPopTask: false,
    };

    const { getByText } = render(<TaskControls {...props} />);
    const popButton = getByText('Pop Task');
    fireEvent.click(popButton);

    expect(onPopTask).not.toHaveBeenCalled();
  });
});
