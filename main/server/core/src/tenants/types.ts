// main/server/core/src/tenants/types.ts
/**
 * Tenants Module Types
 *
 * Dependency interface and shared types for the tenants module.
 * The server provides these dependencies when registering the tenants module.
 *
 * @module types
 */

import { ERROR_MESSAGES as SHARED_ERRORS } from '@bslt/shared';

import type { BaseContext, ContractRequestContext as RequestContext, ServerLogger } from '@bslt/shared';
import type { DbClient, Repositories } from '../../../db/src';

// ============================================================================
// Request Types
// ============================================================================

/** Request with auth context for tenant operations */
export type TenantsRequest = RequestContext;

// ============================================================================
// Email Types (Inline — avoids coupling to engine/mailer package)
// ============================================================================

/** Minimal email options accepted by the tenants mailer */
export interface TenantsEmailOptions {
  readonly to: string;
  readonly subject: string;
  readonly text?: string;
  readonly html?: string;
}

/** Workspace invitation email template function */
export interface TenantsEmailTemplates {
  workspaceInvitation(
    acceptUrl: string,
    workspaceName: string,
    inviterName: string,
    role: string,
    expiresInDays?: number,
  ): TenantsEmailOptions;
}

// ============================================================================
// Tenants Module Dependencies
// ============================================================================

/**
 * Tenants module dependencies.
 * Provided by the server composition root.
 */
export interface TenantsModuleDeps extends BaseContext {
  /** Database client for transactions */
  readonly db: DbClient;
  /** Repository layer for structured database access */
  readonly repos: Repositories;
  /** Logger instance for tenants module logging */
  readonly log: ServerLogger;
  /** Email service for sending invitation emails (optional — gracefully skipped when absent) */
  readonly mailer?: { send(options: TenantsEmailOptions): Promise<unknown> };
  /** Email templates for workspace notifications (optional) */
  readonly emailTemplates?: TenantsEmailTemplates;
  /** Application base URL for generating invitation links */
  readonly appBaseUrl?: string;
}

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INTERNAL_ERROR: SHARED_ERRORS.INTERNAL_ERROR,
  TENANT_NOT_FOUND: 'Workspace not found',
  UNAUTHORIZED: SHARED_ERRORS.UNAUTHORIZED,
  FORBIDDEN: 'You do not have permission to perform this action',
  SLUG_TAKEN: 'This workspace URL is already taken',
  NOT_MEMBER: 'You are not a member of this workspace',
} as const;
