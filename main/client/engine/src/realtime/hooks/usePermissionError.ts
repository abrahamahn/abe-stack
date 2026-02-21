// main/client/engine/src/realtime/hooks/usePermissionError.ts
/**
 * Permission Error Handling
 *
 * Shared types and utilities for permission-aware error handling in
 * real-time hooks. Provides a consistent interface for detecting 403
 * errors and handling permission_revoked WebSocket events.
 *
 * @module Realtime/Hooks/PermissionError
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Represents a permission error, either from a 403 HTTP response
 * or a permission_revoked WebSocket event.
 */
export interface PermissionError extends Error {
  /** Discriminator for permission errors */
  readonly isPermissionError: true;
  /** The tenant/workspace the user lost access to, if known */
  readonly tenantId?: string;
}

/**
 * Event payload received from the server when permissions are revoked.
 * Matches the PermissionRevokedEvent from the server-side propagation module.
 */
export interface PermissionRevokedEventPayload {
  type: 'permission_revoked';
  /** The tenant/workspace the user lost access to */
  tenantId: string;
  /** Reason for the revocation */
  reason: string;
  /** The new role if this was a downgrade (undefined if fully revoked) */
  newRole?: string;
}

/**
 * Callback invoked when a permission_revoked event is received.
 */
export type PermissionRevokedCallback = (event: PermissionRevokedEventPayload) => void;

/**
 * Interface for subscribing to permission revocation events.
 * Typically backed by the WebSocket client's message handling.
 */
export interface PermissionEventListener {
  /**
   * Register a callback for permission_revoked events.
   * Returns an unsubscribe function.
   */
  onPermissionRevoked: (callback: PermissionRevokedCallback) => () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Check if an error is a permission error (403 or permission_revoked).
 *
 * Detects errors by:
 * 1. Checking for the `isPermissionError` flag (from createPermissionError)
 * 2. Checking for HTTP status 403 on error-like objects
 * 3. Checking for "403" or "forbidden" in the error message
 *
 * @param err - The error to check
 * @returns True if the error represents a permission denial
 */
export function isPermissionError(err: unknown): boolean {
  if (err === null || err === undefined) {
    return false;
  }

  // Check for our custom permission error flag
  if (
    typeof err === 'object' &&
    'isPermissionError' in err &&
    (err as { isPermissionError?: unknown }).isPermissionError === true
  ) {
    return true;
  }

  // Check for HTTP status code 403
  if (typeof err === 'object' && 'status' in err) {
    const status = (err as { status: unknown }).status;
    if (status === 403) {
      return true;
    }
  }

  // Check for "403" or "forbidden" in error message
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission denied')) {
      return true;
    }
  }

  return false;
}

/**
 * Create a PermissionError from a tenant ID and reason.
 *
 * @param tenantId - The tenant/workspace where access was denied
 * @param reason - Human-readable reason for the denial
 * @returns A PermissionError instance
 */
export function createPermissionError(tenantId: string, reason?: string): PermissionError {
  const message = reason ?? `Permission denied for workspace ${tenantId}`;
  const error = new Error(message) as Error & {
    isPermissionError: true;
    tenantId: string;
  };
  error.isPermissionError = true;
  error.tenantId = tenantId;
  return error as PermissionError;
}
