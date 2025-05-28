import { Temporal } from '@js-temporal/polyfill';

/**
 * Convert Temporal.Instant to Date for IndexedDB storage
 */
export function instantToDate(instant: Temporal.Instant): Date {
  return new Date(instant.epochMilliseconds);
}

/**
 * Convert Date from IndexedDB to Temporal.Instant
 */
export function dateToInstant(date: Date): Temporal.Instant {
  return date.toTemporalInstant();
}
