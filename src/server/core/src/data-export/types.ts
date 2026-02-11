// src/server/core/src/data-export/types.ts
/**
 * Data Export Module Types
 *
 * Narrow dependency interfaces for the data-export package.
 * These interfaces decouple the data-export logic from concrete server
 * implementations, keeping the package framework-agnostic.
 */

import type {
  AuditEventRepository,
  DataExportRequestRepository,
  UserRepository,
} from '@abe-stack/db';
import type { BaseContext, Logger, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for data export handlers.
 *
 * Extends `BaseContext` with data-export-specific repositories.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 */
export interface DataExportAppContext extends BaseContext {
  readonly repos: {
    readonly dataExportRequests: DataExportRequestRepository;
    readonly users: UserRepository;
    readonly auditEvents?: AuditEventRepository;
  };
  readonly log: Logger;
}

/**
 * Request type used by data export handlers.
 */
export type DataExportRequest = RequestContext;

// ============================================================================
// Data Export Result Types
// ============================================================================

/**
 * Aggregated user data returned by processDataExport.
 * Contains all user data categories for GDPR compliance.
 */
export interface UserDataExport {
  readonly profile: {
    readonly id: string;
    readonly email: string;
    readonly firstName: string;
    readonly lastName: string;
    readonly username: string;
    readonly role: string;
    readonly createdAt: string;
  };
  readonly exportedAt: string;
  readonly format: string;
}
