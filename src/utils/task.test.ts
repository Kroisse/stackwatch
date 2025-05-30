import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTaskTitle,
  getDisplayTaskTitle,
  getTaskDescription,
  isTaskActive,
  formatDuration,
  type Task
} from './task';

describe('Task utility functions', () => {
  let mockTask: Task;
  let now: Date;

  beforeEach(() => {
    now = new Date();
    mockTask = {
      id: 1,
      context: 'First line title\nSecond line description\nThird line',
      stack_position: 0,
      created_at: now,
      updated_at: now
    };
  });

  describe('getTaskTitle', () => {
    it('should return the first line as title', () => {
      const result = getTaskTitle(mockTask);
      expect(result).toBe('First line title');
    });

    it('should trim whitespace from title', () => {
      const taskWithSpaces = {
        ...mockTask,
        context: '  Spaced title  \nDescription'
      };
      const result = getTaskTitle(taskWithSpaces);
      expect(result).toBe('Spaced title');
    });

    it('should return empty string for empty context', () => {
      const emptyTask = { ...mockTask, context: '' };
      const result = getTaskTitle(emptyTask);
      expect(result).toBe('');
    });

    it('should return empty string for whitespace-only context', () => {
      const whitespaceTask = { ...mockTask, context: '   \n  \t  ' };
      const result = getTaskTitle(whitespaceTask);
      expect(result).toBe('');
    });

    it('should handle single line context', () => {
      const singleLineTask = { ...mockTask, context: 'Only title' };
      const result = getTaskTitle(singleLineTask);
      expect(result).toBe('Only title');
    });

    it('should handle single line context with leading/trailing newlines', () => {
      const singleLineTask = { ...mockTask, context: '\nOnly title\n' };
      const result = getTaskTitle(singleLineTask);
      expect(result).toBe('Only title');
    });
  });

  describe('getDisplayTaskTitle', () => {
    it('should return the title when available', () => {
      const result = getDisplayTaskTitle(mockTask);
      expect(result).toBe('First line title');
    });

    it('should return "Untitled Task" for empty context', () => {
      const emptyTask = { ...mockTask, context: '' };
      const result = getDisplayTaskTitle(emptyTask);
      expect(result).toBe('Untitled Task');
    });

    it('should return "Untitled Task" for whitespace-only context', () => {
      const whitespaceTask = { ...mockTask, context: '   \n  \t  ' };
      const result = getDisplayTaskTitle(whitespaceTask);
      expect(result).toBe('Untitled Task');
    });
  });

  describe('getTaskDescription', () => {
    it('should return everything after the first line', () => {
      const result = getTaskDescription(mockTask);
      expect(result).toBe('Second line description\nThird line');
    });

    it('should return empty string for single line context', () => {
      const singleLineTask = { ...mockTask, context: 'Only title' };
      const result = getTaskDescription(singleLineTask);
      expect(result).toBe('');
    });

    it('should return empty string for empty context', () => {
      const emptyTask = { ...mockTask, context: '' };
      const result = getTaskDescription(emptyTask);
      expect(result).toBe('');
    });

    it('should remove leading newline if present', () => {
      const taskWithLeadingNewline = {
        ...mockTask,
        context: 'Title\n\nDescription with leading newline'
      };
      const result = getTaskDescription(taskWithLeadingNewline);
      expect(result).toBe('Description with leading newline');
    });

    it('should handle multiple newlines properly', () => {
      const multiNewlineTask = {
        ...mockTask,
        context: 'Title\n\nLine 1\n\nLine 2'
      };
      const result = getTaskDescription(multiNewlineTask);
      expect(result).toBe('Line 1\n\nLine 2');
    });
  });

  describe('isTaskActive', () => {
    it('should return true for active task (no ended_at)', () => {
      const activeTask = { ...mockTask };
      delete activeTask.ended_at;
      const result = isTaskActive(activeTask);
      expect(result).toBe(true);
    });

    it('should return true for task with undefined ended_at', () => {
      const activeTask = { ...mockTask, ended_at: undefined };
      const result = isTaskActive(activeTask);
      expect(result).toBe(true);
    });

    it('should return false for completed task (has ended_at)', () => {
      const completedTask = { ...mockTask, ended_at: now };
      const result = isTaskActive(completedTask);
      expect(result).toBe(false);
    });
  });

  describe('formatDuration', () => {
    it('should format duration correctly for hours, minutes, and seconds', () => {
      const totalSeconds = 3661; // 1 hour, 1 minute, 1 second
      const result = formatDuration(totalSeconds);
      expect(result).toBe('01:01:01');
    });

    it('should handle zero paddings correctly', () => {
      const totalSeconds = 3665; // 1 hour, 1 minute, 5 seconds
      const result = formatDuration(totalSeconds);
      expect(result).toBe('01:01:05');
    });

    it('should handle large hour values', () => {
      const totalSeconds = 91845; // 25 hours, 30 minutes, 45 seconds
      const result = formatDuration(totalSeconds);
      expect(result).toBe('25:30:45');
    });

    it('should handle durations less than an hour', () => {
      const totalSeconds = 1530; // 25 minutes, 30 seconds
      const result = formatDuration(totalSeconds);
      expect(result).toBe('00:25:30');
    });

    it('should handle durations less than a minute', () => {
      const totalSeconds = 45;
      const result = formatDuration(totalSeconds);
      expect(result).toBe('00:00:45');
    });

    it('should handle zero seconds', () => {
      const totalSeconds = 0;
      const result = formatDuration(totalSeconds);
      expect(result).toBe('00:00:00');
    });
  });

});
