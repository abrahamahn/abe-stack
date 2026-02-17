// main/shared/src/engine/audit-log/audit-log.logic.ts

/**
 * @file Audit Log Logic
 * @description Utilities for building compliant audit events and sanitizing data.
 * @module Domain/AuditLog
 */

import type { CreateAuditEvent } from './audit-log.schemas';

// ============================================================================
// Event Builder
// ============================================================================

/**
 * Parameters for the audit event builder.
 * We use Partial for some fields to allow the builder to provide defaults.
 */
export type AuditBuilderParams = Partial<CreateAuditEvent> & {
  action: string;
  resource: string;
};

/**
 * Canonical builder for audit events.
 * Enforces action format, defaults, and sanitization.
 */
export function buildAuditEvent(params: AuditBuilderParams): CreateAuditEvent {
  return {
    action: params.action,
    actorId: params.actorId ?? null,
    tenantId: params.tenantId ?? null,
    resource: params.resource,
    resourceId: params.resourceId,
    metadata: sanitizeMetadata(params.metadata ?? {}),
    category: params.category ?? 'admin',
    severity: params.severity ?? 'info',
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
}

// ============================================================================
// Sanitization
// ============================================================================

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'creditCard',
  'cvv',
  'cardDetails',
  'apiKey',
  'clientSecret',
  'privateKey',
];

/** Maximum recursion depth for metadata sanitization to prevent stack overflow */
const MAX_SANITIZE_DEPTH = 10;

/**
 * Recursively removes sensitive keys from metadata objects.
 * Prevents accidental logging of PII or credentials.
 *
 * @param metadata - The metadata object to sanitize
 * @param depth - Current recursion depth (internal, do not pass externally)
 * @param seen - WeakSet tracking visited objects to prevent circular reference loops
 * @returns Sanitized copy of the metadata with sensitive values redacted
 * @complexity O(n) where n is the total number of keys across all nested objects
 */
export function sanitizeMetadata(
  metadata: Record<string, unknown>,
  depth = 0,
  seen = new WeakSet(),
): Record<string, unknown> {
  // Guard against circular references
  if (seen.has(metadata)) {
    return { _circular: '[CIRCULAR]' };
  }
  seen.add(metadata);

  // Guard against excessive nesting
  if (depth >= MAX_SANITIZE_DEPTH) {
    return { _truncated: '[MAX_DEPTH]' };
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check if current key is sensitive
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = (value as unknown[]).map((v: unknown) =>
        v !== null && typeof v === 'object' && !Array.isArray(v)
          ? sanitizeMetadata(v as Record<string, unknown>, depth + 1, seen)
          : v,
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>, depth + 1, seen);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
