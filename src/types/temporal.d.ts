import { Temporal } from '@js-temporal/polyfill';

declare global {
  interface Date {
    toTemporalInstant(): Temporal.Instant;
  }
}

export {};