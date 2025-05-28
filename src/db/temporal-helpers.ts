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


/**
 * Format duration between two dates using Temporal
 */
export function formatDuration(start: Date, end: Date | null = null): string {
  const startInstant = dateToInstant(start);
  const endInstant = end ? dateToInstant(end) : Temporal.Now.instant();
  const duration = endInstant.since(startInstant);
  
  const hours = Math.floor(duration.total('hours'));
  const minutes = Math.floor(duration.total('minutes')) % 60;
  const seconds = Math.floor(duration.total('seconds')) % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}