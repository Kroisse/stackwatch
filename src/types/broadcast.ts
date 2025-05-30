import { Task } from '../utils/task';

export type BroadcastMessage =
  | { type: 'task-created'; task: Task; timestamp: Date }
  | { type: 'task-popped'; task: Task; timestamp: Date }
  | { type: 'task-updated'; task: Task; timestamp: Date };
