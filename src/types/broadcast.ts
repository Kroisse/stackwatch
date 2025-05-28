import { Temporal } from '@js-temporal/polyfill';
import { Task } from '../utils/task';

export type BroadcastMessage = 
  | { type: 'task-created'; task: Task; timestamp: Temporal.Instant }
  | { type: 'task-popped'; task: Task; timestamp: Temporal.Instant }
  | { type: 'task-updated'; task: Task; timestamp: Temporal.Instant }
  | { type: 'stack-updated'; timestamp: Temporal.Instant };