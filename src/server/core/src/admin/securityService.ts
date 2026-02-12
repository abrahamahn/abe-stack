// src/server/core/src/admin/securityService.ts
/**
 * Security Service
 *
 * Business logic for security audit operations.
 * Provides methods for querying, filtering, and exporting security events.
 */

import {
  SECURITY_EVENTS_TABLE,
  SECURITY_EVENT_COLUMNS,
  and,
  eq,
  gte,
  ilike,
  lte,
  select,
  selectCount,
  toCamelCase,
  toCamelCaseArray,
  type DbClient,
  type SecurityEvent as DbSecurityEvent,
  type SqlFragment,
} from '@abe-stack/db';
import { DAYS_PER_WEEK, MS_PER_DAY, MS_PER_HOUR, toISODateOnly } from '@abe-stack/shared';

import type {
  PaginationOptions,
  SecurityEvent,
  SecurityEventsFilter,
  SecurityEventsListResponse,
  SecurityMetrics,
} from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

export class SecurityEventNotFoundError extends Error {
  constructor(id: string) {
    super(`Security event not found: ${id}`);
    this.name = 'SecurityEventNotFoundError';
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert database event to API event format
 */
function toApiEvent(event: DbSecurityEvent): SecurityEvent {
  return {
    id: event.id,
    userId: event.userId,
    email: event.email,
    eventType: event.eventType,
    severity: event.severity,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    metadata: event.metadata,
    createdAt: event.createdAt.toISOString(),
  };
}

/**
 * Build filter conditions for security events query
 */
function buildFilterConditions(filter: SecurityEventsFilter): SqlFragment[] {
  const conditions: SqlFragment[] = [];

  if (filter.eventType !== undefined && filter.eventType !== '') {
    conditions.push(eq('event_type', filter.eventType));
  }

  if (filter.severity !== undefined && filter.severity !== '') {
    conditions.push(eq('severity', filter.severity));
  }

  if (filter.userId !== undefined && filter.userId !== '') {
    conditions.push(eq('user_id', filter.userId));
  }

  if (filter.email !== undefined && filter.email !== '') {
    // Use case-insensitive partial match for email
    conditions.push(ilike('email', `%${filter.email}%`));
  }

  if (filter.ipAddress !== undefined && filter.ipAddress !== '') {
    conditions.push(eq('ip_address', filter.ipAddress));
  }

  if (filter.startDate !== undefined) {
    const startDate = new Date(filter.startDate);
    if (!isNaN(startDate.getTime())) {
      conditions.push(gte('created_at', startDate));
    }
  }

  if (filter.endDate !== undefined) {
    const endDate = new Date(filter.endDate);
    if (!isNaN(endDate.getTime())) {
      conditions.push(lte('created_at', endDate));
    }
  }

  return conditions;
}

/**
 * Get period boundaries based on period type
 */
function getPeriodBoundaries(period: 'hour' | 'day' | 'week' | 'month'): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const end = now;
  let start: Date;

  switch (period) {
    case 'hour':
      start = new Date(now.getTime() - MS_PER_HOUR);
      break;
    case 'day':
      start = new Date(now.getTime() - MS_PER_DAY);
      break;
    case 'week':
      start = new Date(now.getTime() - DAYS_PER_WEEK * MS_PER_DAY);
      break;
    case 'month':
      start = new Date(now.getTime() - 30 * MS_PER_DAY);
      break;
  }

  return { start, end };
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * List security events with pagination and filtering
 */
export async function listSecurityEvents(
  db: DbClient,
  options: PaginationOptions,
  filter: SecurityEventsFilter = {},
): Promise<SecurityEventsListResponse> {
  const { page, limit, sortBy, sortOrder } = options;
  const effectiveSortBy = sortBy ?? 'createdAt';
  const offset = (page - 1) * limit;

  // Map camelCase sortBy to snake_case column
  const sortColumn = effectiveSortBy === 'createdAt' ? 'created_at' : effectiveSortBy;

  // Build filter conditions
  const conditions = buildFilterConditions(filter);

  // Build base query
  let query = select(SECURITY_EVENTS_TABLE);

  // Apply conditions
  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Apply sorting and pagination
  query = query
    .orderBy(sortColumn, sortOrder === 'asc' ? 'asc' : 'desc')
    .limit(limit)
    .offset(offset);

  // Execute query
  const rows = await db.query(query.toSql());
  const events = toCamelCaseArray<DbSecurityEvent>(rows, SECURITY_EVENT_COLUMNS);

  // Get total count
  let countQuery = selectCount(SECURITY_EVENTS_TABLE);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions));
  }

  const countResult = await db.queryOne<{ count: string }>(countQuery.toSql());
  const total = countResult !== null ? parseInt(countResult.count, 10) : 0;

  const totalPages = Math.ceil(total / limit);

  return {
    data: events.map(toApiEvent),
    total,
    page,
    limit,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    totalPages,
  };
}

/**
 * Get a single security event by ID
 */
export async function getSecurityEvent(db: DbClient, id: string): Promise<SecurityEvent> {
  const row = await db.queryOne(select(SECURITY_EVENTS_TABLE).where(eq('id', id)).toSql());

  if (row === null) {
    throw new SecurityEventNotFoundError(id);
  }

  const event = toCamelCase<DbSecurityEvent>(row, SECURITY_EVENT_COLUMNS);
  return toApiEvent(event);
}

/**
 * Get security metrics for a given period
 */
export async function getSecurityMetrics(
  db: DbClient,
  period: 'hour' | 'day' | 'week' | 'month' = 'day',
): Promise<SecurityMetrics> {
  const { start, end } = getPeriodBoundaries(period);

  // Get all events in the period
  const rows = await db.query(
    select(SECURITY_EVENTS_TABLE)
      .columns('event_type', 'severity')
      .where(and(gte('created_at', start), lte('created_at', end)))
      .toSql(),
  );

  interface EventInfo {
    eventType: string;
    severity: string;
  }
  const events: EventInfo[] = rows.map((row: Record<string, unknown>) => ({
    eventType: row['event_type'] as string,
    severity: row['severity'] as string,
  }));

  // Calculate metrics
  const totalEvents = events.length;
  const criticalEvents = events.filter((e: EventInfo) => e.severity === 'critical').length;
  const highEvents = events.filter((e: EventInfo) => e.severity === 'high').length;
  const mediumEvents = events.filter((e: EventInfo) => e.severity === 'medium').length;
  const lowEvents = events.filter((e: EventInfo) => e.severity === 'low').length;

  const tokenReuseCount = events.filter(
    (e: EventInfo) => e.eventType === 'token_reuse_detected',
  ).length;
  const accountLockedCount = events.filter(
    (e: EventInfo) => e.eventType === 'account_locked',
  ).length;
  const suspiciousLoginCount = events.filter(
    (e: EventInfo) => e.eventType === 'suspicious_login',
  ).length;

  // Count by event type
  const eventsByType: Record<string, number> = {};
  for (const event of events) {
    eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
  }

  return {
    totalEvents,
    criticalEvents,
    highEvents,
    mediumEvents,
    lowEvents,
    tokenReuseCount,
    accountLockedCount,
    suspiciousLoginCount,
    eventsByType,
    period,
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
  };
}

/**
 * Export security events in the specified format
 */
export async function exportSecurityEvents(
  db: DbClient,
  format: 'csv' | 'json',
  filter: SecurityEventsFilter = {},
): Promise<{ data: string; filename: string; contentType: string }> {
  // Build filter conditions
  const conditions = buildFilterConditions(filter);

  // Build query (limit to 10000 for exports to prevent memory issues)
  let query = select(SECURITY_EVENTS_TABLE);

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  query = query.orderBy('created_at', 'desc').limit(10000);

  // Execute query
  const rows = await db.query(query.toSql());
  const events = toCamelCaseArray<DbSecurityEvent>(rows, SECURITY_EVENT_COLUMNS);
  const apiEvents = events.map(toApiEvent);

  const timestamp = toISODateOnly(new Date()) as string;

  if (format === 'json') {
    return {
      data: JSON.stringify(apiEvents, null, 2),
      filename: `security-events-${timestamp}.json`,
      contentType: 'application/json',
    };
  }

  // CSV format
  const headers = [
    'id',
    'userId',
    'email',
    'eventType',
    'severity',
    'ipAddress',
    'userAgent',
    'metadata',
    'createdAt',
  ];

  const csvRows = [headers.join(',')];

  for (const event of apiEvents) {
    const row = [
      event.id,
      event.userId ?? '',
      event.email ?? '',
      event.eventType,
      event.severity,
      event.ipAddress ?? '',
      // Escape user agent as it may contain commas
      `"${(event.userAgent ?? '').replace(/"/g, '""')}"`,
      // Serialize metadata as JSON, escaped for CSV
      `"${JSON.stringify(event.metadata ?? {}).replace(/"/g, '""')}"`,
      event.createdAt,
    ];
    csvRows.push(row.join(','));
  }

  return {
    data: csvRows.join('\n'),
    filename: `security-events-${timestamp}.csv`,
    contentType: 'text/csv',
  };
}
