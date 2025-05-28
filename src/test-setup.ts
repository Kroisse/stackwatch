// Setup file for Vitest
import { Temporal } from '@js-temporal/polyfill';

// Make Temporal globally available
if (typeof (globalThis as any).Temporal === 'undefined') {
  (globalThis as any).Temporal = Temporal;
}