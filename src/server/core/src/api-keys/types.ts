// src/server/core/src/api-keys/types.ts
/**
 * API Keys Module Types
 *
 * Narrow dependency interfaces for the API keys package.
 * Decouples API key logic from concrete server implementations,
 * keeping the package framework-agnostic.
 *
 * Uses shared context contracts from `@abe-stack/shared` to eliminate
 * duplicate Logger and request interfaces across packages.
 */

import type { ApiKeyRepository, AuditEventRepository } from '@abe-stack/db';
import type { BaseContext, RequestContext } from '@abe-stack/shared/core';

// ============================================================================
// Handler Context
// ============================================================================

/**
 * Application context for API key handlers.
 *
 * Extends `BaseContext` with API-key-specific repository access.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 *
 * @param repos - Database repositories including apiKeys
 * @param log - Logger instance
 */
export interface ApiKeyAppContext extends BaseContext {
  readonly repos: {
    readonly apiKeys: ApiKeyRepository;
    readonly auditEvents?: AuditEventRepository;
  };
}

// ============================================================================
// Request Context
// ============================================================================

/**
 * Request interface for API key handlers.
 *
 * Re-exports `RequestContext` from shared contracts for consistency
 * with other modules.
 */
export type ApiKeyRequest = RequestContext;
