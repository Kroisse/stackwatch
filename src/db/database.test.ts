import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StackWatchDatabase, dbTaskToTask, DBTask } from './database';
import { BroadcastMessage } from '../types/broadcast';

describe('StackWatchDatabase', () => {
  let db: StackWatchDatabase;
  let broadcastMessages: BroadcastMessage[] = [];
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let testDbCount = 0;

  beforeEach(() => {
    // Mock BroadcastChannel
    mockPostMessage = vi.fn((message: BroadcastMessage) => {
      broadcastMessages.push(message);
    });

    global.BroadcastChannel = vi.fn().mockImplementation(() => ({
      postMessage: mockPostMessage,
      close: vi.fn(),
    }));

    // Create fresh database instance with unique name
    db = new StackWatchDatabase(`TestDB_${Date.now()}_${testDbCount++}`);
    broadcastMessages = [];
  });

  afterEach(async () => {
    // Close connections first
    db.close();

    // Clear all data instead of deleting database
    try {
      await db.tasks.clear();
    } catch (_e) {
      // Ignore errors in test environment
    }
    vi.clearAllMocks();
  });

  describe('dbTaskToTask', () => {
    it('should convert DBTask to Task correctly', () => {
      const now = new Date();
      const dbTask: DBTask = {
        id: 1,
        context: 'Test task',
        stack_position: 0,
        created_at: now,
        ended_at: 0,
        updated_at: now,
      };

      const task = dbTaskToTask(dbTask);

      expect(task).toEqual({
        id: 1,
        context: 'Test task',
        stack_position: 0,
        created_at: now,
        ended_at: undefined,
        updated_at: now,
      });
    });

    it('should convert ended DBTask to Task with ended_at', () => {
      const now = new Date();
      const endedAt = new Date(now.getTime() + 1000);
      const dbTask: DBTask = {
        id: 1,
        context: 'Test task',
        stack_position: 0,
        created_at: now,
        ended_at: endedAt,
        updated_at: endedAt,
      };

      const task = dbTaskToTask(dbTask);

      expect(task.ended_at).toEqual(endedAt);
    });

    it('should throw error when DBTask has no id', () => {
      const dbTask: DBTask = {
        context: 'Test task',
        stack_position: 0,
        created_at: new Date(),
        ended_at: 0,
        updated_at: new Date(),
      };

      expect(() => dbTaskToTask(dbTask)).toThrow('Task must have an id');
    });
  });

  describe('pushTask', () => {
    it('should create a new task with default context', async () => {
      const task = await db.pushTask();

      expect(task.context).toBe('New Task');
      expect(task.stack_position).toBe(0);
      expect(task.ended_at).toBeUndefined();
      expect(task.id).toBeDefined();
    });

    it('should create a new task with custom context', async () => {
      const task = await db.pushTask('Custom task');

      expect(task.context).toBe('Custom task');
    });

    it('should increment stack position for multiple tasks', async () => {
      const task1 = await db.pushTask('Task 1');
      const task2 = await db.pushTask('Task 2');
      const task3 = await db.pushTask('Task 3');

      expect(task1.stack_position).toBe(0);
      expect(task2.stack_position).toBe(1);
      expect(task3.stack_position).toBe(2);
    });

    it('should broadcast task-created event', async () => {
      await db.pushTask('Eat lunch');

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(broadcastMessages[0]).toMatchObject({
        type: 'task-created',
        task: expect.objectContaining({
          context: 'Eat lunch',
        }),
      });
    });
  });

  describe('getCurrentTask', () => {
    it('should return undefined when no tasks exist', async () => {
      const currentTask = await db.getCurrentTask();

      expect(currentTask).toBeUndefined();
    });

    it('should return the task with highest stack position', async () => {
      await db.pushTask('Task 1');
      await db.pushTask('Task 2');
      const task3 = await db.pushTask('Task 3');

      const currentTask = await db.getCurrentTask();

      expect(currentTask?.id).toBe(task3.id);
      expect(currentTask?.context).toBe('Task 3');
    });

    it('should ignore ended tasks', async () => {
      await db.pushTask('Task 1');
      await db.pushTask('Task 2');
      const task3 = await db.pushTask('Task 3');

      // Pop task 3
      await db.popTask();

      const currentTask = await db.getCurrentTask();

      expect(currentTask?.id).not.toBe(task3.id);
      expect(currentTask?.context).toBe('Task 2');
    });
  });

  describe('getTaskStack', () => {
    it('should return empty array when no tasks exist', async () => {
      const tasks = await db.getTaskStack();

      expect(tasks).toEqual([]);
    });

    it('should return tasks in descending stack position order', async () => {
      await db.pushTask('Task 1');
      await db.pushTask('Task 2');
      await db.pushTask('Task 3');

      const tasks = await db.getTaskStack();

      expect(tasks).toHaveLength(3);
      expect(tasks[0].context).toBe('Task 3');
      expect(tasks[1].context).toBe('Task 2');
      expect(tasks[2].context).toBe('Task 1');
    });

    it('should exclude ended tasks', async () => {
      await db.pushTask('Task 1');
      await db.pushTask('Task 2');
      await db.pushTask('Task 3');

      // Pop task 3
      await db.popTask();

      const tasks = await db.getTaskStack();

      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.context !== 'Task 3')).toBe(true);
    });
  });

  describe('popTask', () => {
    it('should return undefined when no tasks exist', async () => {
      const poppedTask = await db.popTask();

      expect(poppedTask).toBeUndefined();
    });

    it('should end the current task', async () => {
      const task = await db.pushTask('Task to pop');
      const poppedTask = await db.popTask();

      expect(poppedTask?.id).toBe(task.id);
      expect(poppedTask?.ended_at).toBeDefined();
      expect(poppedTask?.ended_at).toBeInstanceOf(Date);
    });

    it('should broadcast task-popped event', async () => {
      await db.pushTask('Task to pop');

      // Clear previous broadcast messages
      broadcastMessages = [];
      mockPostMessage.mockClear();

      await db.popTask();

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(broadcastMessages[0]).toMatchObject({
        type: 'task-popped',
        task: expect.objectContaining({
          context: 'Task to pop',
        }),
      });
    });

    it('should make previous task current after pop', async () => {
      const task1 = await db.pushTask('Task 1');
      await db.pushTask('Task 2');

      await db.popTask();

      const currentTask = await db.getCurrentTask();
      expect(currentTask).toHaveProperty('id', task1.id);
    });
  });

  describe('updateTask', () => {
    it('should update task context', async () => {
      const task = await db.pushTask('Original context');

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedTask = await db.updateTask(task.id, 'Updated context');

      expect(updatedTask).toHaveProperty('id', task.id);
      expect(updatedTask.context).toBe('Updated context');
      expect(updatedTask.updated_at.getTime()).toBeGreaterThanOrEqual(
        task.updated_at.getTime(),
      );
    });

    it('should throw error when task not found', async () => {
      await expect(db.updateTask(999, 'New context')).rejects.toThrow(
        'Task not found',
      );
    });

    it('should broadcast task-updated event', async () => {
      const task = await db.pushTask('Original');

      // Clear previous broadcast messages
      broadcastMessages = [];
      mockPostMessage.mockClear();

      await db.updateTask(task.id, 'Updated');

      expect(mockPostMessage).toHaveBeenCalledTimes(1);
      expect(broadcastMessages[0]).toMatchObject({
        type: 'task-updated',
        task: expect.objectContaining({
          context: 'Updated',
        }),
      });
    });
  });

  describe('stack behavior', () => {
    it('should maintain LIFO order', async () => {
      await db.pushTask('First');
      await db.pushTask('Second');
      await db.pushTask('Third');

      let current = await db.getCurrentTask();
      expect(current).toHaveProperty('context', 'Third');

      await db.popTask();
      current = await db.getCurrentTask();
      expect(current).toHaveProperty('context', 'Second');

      await db.popTask();
      current = await db.getCurrentTask();
      expect(current).toHaveProperty('context', 'First');

      await db.popTask();
      current = await db.getCurrentTask();
      expect(current).toBeUndefined();
    });
  });
});
