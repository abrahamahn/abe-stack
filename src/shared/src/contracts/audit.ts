// packages/shared/src/contracts/audit.ts
/**
 * Audit Log Contract
 *
 * General-purpose audit logging for tracking user actions,
 * separate from security-specific events.
 */

import { createSchema } from './schema';

import type { Schema } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Audit event categories.
 */
export const AUDIT_CATEGORIES = [
  'resource',
  'access',
  'config',
  'billing',
  'integration',
  'admin',
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/**
 * Standard audit actions.
 */
export const AUDIT_ACTIONS = [
  'create',
  'read',
  'update',
  'delete',
  'export',
  'import',
  'share',
  'unshare',
  'archive',
  'restore',
  'login',
  'logout',
  'invite',
  'revoke',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/**
 * Audit log entry.
 */
export interface AuditEntry {
  /** Unique identifier */
  id: string;
  /** Event timestamp */
  timestamp: Date;
  /** Actor performing the action */
  actor: {
    /** User ID */
    id: string;
    /** User email (for display) */
    email?: string | undefined;
    /** IP address */
    ipAddress?: string | undefined;
    /** User agent */
    userAgent?: string | undefined;
  };
  /** Action category */
  category: AuditCategory;
  /** Specific action */
  action: string;
  /** Target resource */
  target: {
    /** Resource type (e.g., 'project', 'user', 'subscription') */
    type: string;
    /** Resource ID */
    id: string;
    /** Resource name for display */
    name?: string | undefined;
  };
  /** Workspace context */
  workspaceId?: string | undefined;
  /** Additional metadata */
  metadata?: Record<string, unknown> | undefined;
  /** Outcome */
  outcome: 'success' | 'failure' | 'denied';
  /** Error message if failed */
  errorMessage?: string | undefined;
}

/**
 * Request to record an audit entry.
 */
export interface RecordAuditRequest {
  actor: AuditEntry['actor'];
  category: AuditCategory;
  action: string;
  target: AuditEntry['target'];
  workspaceId?: string;
  metadata?: Record<string, unknown>;
  outcome?: AuditEntry['outcome'];
  errorMessage?: string;
}

/**
 * Audit log query filters.
 */
export interface AuditQuery {
  /** Filter by actor ID */
  actorId?: string;
  /** Filter by workspace */
  workspaceId?: string;
  /** Filter by category */
  category?: AuditCategory;
  /** Filter by action */
  action?: string;
  /** Filter by target type */
  targetType?: string;
  /** Filter by target ID */
  targetId?: string;
  /** Filter by outcome */
  outcome?: AuditEntry['outcome'];
  /** Filter by date range */
  from?: Date;
  to?: Date;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/**
 * Audit log response.
 */
export interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Schemas
// ============================================================================

export const auditEntrySchema: Schema<AuditEntry> = createSchema((data: unknown) => {
  if (data === null || typeof data !== 'object') {
    throw new Error('Invalid audit entry');
  }
  const obj = data as Record<string, unknown>;

  // Validate required fields
  if (typeof obj['id'] !== 'string') throw new Error('id required');
  if (typeof obj['category'] !== 'string') throw new Error('category required');
  if (typeof obj['action'] !== 'string') throw new Error('action required');
  if (typeof obj['outcome'] !== 'string') throw new Error('outcome required');

  const rawActor = obj['actor'];
  if (rawActor === undefined || rawActor === null || typeof rawActor !== 'object' || Array.isArray(rawActor)) {
    throw new Error('actor must be an object');
  }
  const actor = rawActor as Record<string, unknown>;
  if (typeof actor['id'] !== 'string') {
    throw new Error('actor.id required');
  }

  const rawTarget = obj['target'];
  if (rawTarget === undefined || rawTarget === null || typeof rawTarget !== 'object' || Array.isArray(rawTarget)) {
    throw new Error('target must be an object');
  }
  const target = rawTarget as Record<string, unknown>;
  if (typeof target['type'] !== 'string' || typeof target['id'] !== 'string') {
    throw new Error('target.type and target.id required');
  }

  // Build actor object conditionally
  const actorResult: AuditEntry['actor'] = { id: actor['id'] };
  if (typeof actor['email'] === 'string') actorResult.email = actor['email'];
  if (typeof actor['ipAddress'] === 'string') actorResult.ipAddress = actor['ipAddress'];
  if (typeof actor['userAgent'] === 'string') actorResult.userAgent = actor['userAgent'];

  // Build target object conditionally
  const targetResult: AuditEntry['target'] = {
    type: target['type'],
    id: target['id'],
  };
  if (typeof target['name'] === 'string') targetResult.name = target['name'];

  // Build result conditionally
  const result: AuditEntry = {
    id: obj['id'],
    timestamp:
      obj['timestamp'] instanceof Date ? obj['timestamp'] : new Date(obj['timestamp'] as string),
    actor: actorResult,
    category: obj['category'] as AuditCategory,
    action: obj['action'],
    target: targetResult,
    outcome: obj['outcome'] as AuditEntry['outcome'],
  };
  if (typeof obj['workspaceId'] === 'string') result.workspaceId = obj['workspaceId'];
  if (typeof obj['metadata'] === 'object' && obj['metadata'] !== null) {
    result.metadata = obj['metadata'] as Record<string, unknown>;
  }
  if (typeof obj['errorMessage'] === 'string') result.errorMessage = obj['errorMessage'];

  return result;
});

// ============================================================================
// Service Interface
// ============================================================================

/**
 * Audit log service interface.
 */
export interface AuditService {
  /**
   * Record an audit entry.
   *
   * @param request - Audit entry data
   * @returns Created audit entry
   */
  record(request: RecordAuditRequest): Promise<AuditEntry>;

  /**
   * Query audit log entries.
   *
   * @param query - Query filters
   * @returns Paginated audit entries
   */
  query(query: AuditQuery): Promise<AuditResponse>;

  /**
   * Get a single audit entry by ID.
   *
   * @param id - Audit entry ID
   * @returns Audit entry or null
   */
  getById(id: string): Promise<AuditEntry | null>;
}
