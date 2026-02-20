// main/server/system/src/queue/write-service.ts
/**
 * Write Service
 *
 * Re-exported from @bslt/db where the implementation lives (tightly coupled
 * to escapeIdentifier, withTransaction, and other db internals).
 * Canonical entry point for consumers is @bslt/server-system.
 */

export { WriteService, createWriteService } from '@bslt/db';
export type { WriteServiceOptions } from '@bslt/db';
