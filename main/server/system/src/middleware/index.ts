// main/server/system/src/middleware/index.ts
/**
 * Middleware Module
 *
 * Exports request context enrichment plugin and related utilities.
 *
 * @module middleware
 */

export {
  addTiming,
  createEnrichedContext,
  requestContextPlugin,
  severityFromStatus,
  type EnrichedRequestContext,
  type RequestSeverity,
  type TimingEntry,
} from './request.context';
