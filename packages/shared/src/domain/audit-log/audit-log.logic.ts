// shared/src/domain/audit-log/audit-log.logic.ts

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

/**
 * Recursively removes sensitive keys from metadata objects.
 * Prevents accidental logging of PII or credentials.
 */
export function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Check if current key is sensitive
    const isSensitive = SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    if (Array.isArray(value)) {
      sanitized[key] = (value as unknown[]).map((v) =>
        v !== null && typeof v === 'object' ? sanitizeMetadata(v as Record<string, unknown>) : v,
      );
    } else if (value !== null && typeof value === 'object') {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
