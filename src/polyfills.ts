// Global polyfills for the application
import { toTemporalInstant } from '@js-temporal/polyfill';

// Add toTemporalInstant to Date prototype
Date.prototype.toTemporalInstant = toTemporalInstant;

// Export for explicit import if needed
export { toTemporalInstant };