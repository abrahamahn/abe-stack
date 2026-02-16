// main/server/core/src/data-export/types.ts
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
  Repositories,
  UserRepository,
} from '../../../db/src';
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
// Data Export Repository Dependencies
// ============================================================================

/**
 * Extended repository set for full data export processing.
 * Requires users + dataExportRequests. All other repositories are optional —
 * the export includes whatever data is available.
 */
export type DataExportRepositories = Pick<Repositories, 'dataExportRequests' | 'users'> &
  Partial<
    Pick<
      Repositories,
      | 'memberships'
      | 'subscriptions'
      | 'activities'
      | 'files'
      | 'notifications'
      | 'userSessions'
      | 'consentLogs'
    >
  >;

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
  readonly memberships?: readonly ExportMembership[] | undefined;
  readonly subscriptions?: readonly ExportSubscription[] | undefined;
  readonly activities?: readonly ExportActivity[] | undefined;
  readonly files?: readonly ExportFile[] | undefined;
  readonly notifications?: readonly ExportNotification[] | undefined;
  readonly sessions?: readonly ExportSession[] | undefined;
  readonly consentHistory?: readonly ExportConsentLog[] | undefined;
  readonly exportedAt: string;
  readonly format: string;
}

/** Exported membership record */
interface ExportMembership {
  readonly tenantId: string;
  readonly role: string;
  readonly createdAt: string;
}

/** Exported subscription record */
interface ExportSubscription {
  readonly id: string;
  readonly planId: string;
  readonly status: string;
  readonly createdAt: string;
}

/** Exported activity record */
interface ExportActivity {
  readonly action: string;
  readonly resource: string;
  readonly createdAt: string;
}

/** Exported file record */
interface ExportFile {
  readonly id: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}

/** Exported notification record */
interface ExportNotification {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly isRead: boolean;
  readonly createdAt: string;
}

/** Exported session record */
interface ExportSession {
  readonly id: string;
  readonly deviceName: string | null;
  readonly lastActiveAt: string;
  readonly createdAt: string;
}

/** Exported consent log record */
interface ExportConsentLog {
  readonly consentType: string;
  readonly granted: boolean;
  readonly createdAt: string;
}
