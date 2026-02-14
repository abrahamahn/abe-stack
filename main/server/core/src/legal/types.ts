// main/server/core/src/legal/types.ts
/**
 * Legal Module Types
 *
 * Narrow dependency interfaces for the legal package.
 * These interfaces decouple the legal logic from concrete server
 * implementations, keeping the package framework-agnostic.
 */

import type {
    AuditEventRepository,
    LegalDocumentRepository,
    UserAgreementRepository,
} from '../../../db/src';
import type { BaseContext, Logger, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for legal handlers.
 *
 * Extends `BaseContext` with legal-specific repositories.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 */
export interface LegalAppContext extends BaseContext {
  readonly repos: {
    readonly legalDocuments: LegalDocumentRepository;
    readonly userAgreements: UserAgreementRepository;
    readonly auditEvents?: AuditEventRepository;
  };
  readonly log: Logger;
}

/**
 * Request type used by legal handlers.
 */
export type LegalRequest = RequestContext;
