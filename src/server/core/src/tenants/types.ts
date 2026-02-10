// src/server/core/src/tenants/types.ts
/**
 * Tenants Module Types
 *
 * Dependency interface and shared types for the tenants module.
 * The server provides these dependencies when registering the tenants module.
 *
 * @module types
 */

import type { DbClient, Repositories } from '@abe-stack/db';
import type { BaseContext, Logger, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Logger interface used by the tenants module.
 * Extends the shared Logger contract with required child method.
 */
export interface TenantsLogger extends Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>, msg: string): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  error(data: unknown, msg?: string): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>, msg: string): void;
  child(bindings: Record<string, unknown>): TenantsLogger;
}

// ============================================================================
// Request Types
// ============================================================================

/** Request with auth context for tenant operations */
export type TenantsRequest = RequestContext;

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
  readonly log: TenantsLogger;
}

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  INTERNAL_ERROR: 'Internal server error',
  TENANT_NOT_FOUND: 'Workspace not found',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'You do not have permission to perform this action',
  SLUG_TAKEN: 'This workspace URL is already taken',
  NOT_MEMBER: 'You are not a member of this workspace',
} as const;
