// main/server/core/src/data-export/service.ts
/**
 * Data Export Service
 *
 * Pure business logic for GDPR data export operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import { ConflictError, NotFoundError } from '@bslt/shared';

import type { DataExportRepositories, UserDataExport } from './types';
import type {
  DataExportRequestRepository,
  DataExportRequest as DbDataExportRequest,
} from '../../../db/src';

// ============================================================================
// Data Export Operations
// ============================================================================

/**
 * Create a new data export request for a user.
 *
 * Validates that the user does not have a pending/processing request
 * before creating a new one.
 *
 * @param exportRequests - Data export request repository
 * @param userId - User identifier requesting the export
 * @returns The created data export request
 * @throws Error if user already has a pending export request
 * @complexity O(n) where n is the number of user's requests
 */
export async function requestDataExport(
  exportRequests: DataExportRequestRepository,
  userId: string,
): Promise<DbDataExportRequest> {
  // Check for existing pending/processing requests
  const existing = await exportRequests.findByUserId(userId);
  const pendingRequest = existing.find(
    (req) => req.status === 'pending' || req.status === 'processing',
  );

  if (pendingRequest !== undefined) {
    throw new DataExportAlreadyPendingError(userId);
  }

  return exportRequests.create({
    userId,
    type: 'export',
    status: 'pending',
    format: 'json',
    metadata: { requestedAt: new Date().toISOString() },
  });
}

/**
 * Get the status of a data export request.
 *
 * Validates that the request belongs to the specified user.
 *
 * @param exportRequests - Data export request repository
 * @param requestId - Export request identifier
 * @param userId - User identifier for ownership verification
 * @returns The data export request
 * @throws DataExportNotFoundError if request not found or belongs to another user
 * @complexity O(1) database lookup by primary key
 */
export async function getExportStatus(
  exportRequests: DataExportRequestRepository,
  requestId: string,
  userId: string,
): Promise<DbDataExportRequest> {
  const request = await exportRequests.findById(requestId);

  if (request?.userId !== userId) {
    throw new DataExportNotFoundError(requestId);
  }

  return request;
}

/**
 * Process a data export request.
 *
 * Aggregates all user data (profile, memberships, subscriptions,
 * activities, files, notifications, sessions, consent history) and
 * updates the request status. Additional repositories are optional —
 * the export includes whatever data is available.
 *
 * @param repos - Repository set (users + exportRequests required, rest optional)
 * @param requestId - Export request identifier to process
 * @returns The aggregated user data export
 * @throws DataExportNotFoundError if request not found
 * @throws Error if user profile not found
 * @complexity O(n) where n is total records across all categories
 */
export async function processDataExport(
  repos: DataExportRepositories,
  requestId: string,
): Promise<UserDataExport> {
  const request = await repos.dataExportRequests.findById(requestId);
  if (request === null) {
    throw new DataExportNotFoundError(requestId);
  }

  // Mark as processing
  await repos.dataExportRequests.updateStatus(requestId, 'processing');

  try {
    // Aggregate user data
    const user = await repos.users.findById(request.userId);
    if (user === null) {
      throw new Error(`User not found: ${request.userId}`);
    }

    const exportData: UserDataExport = {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
      memberships: await aggregateMemberships(repos, request.userId),
      subscriptions: await aggregateSubscriptions(repos, request.userId),
      activities: await aggregateActivities(repos, request.userId),
      files: await aggregateFiles(repos, request.userId),
      notifications: await aggregateNotifications(repos, request.userId),
      sessions: await aggregateSessions(repos, request.userId),
      consentHistory: await aggregateConsentHistory(repos, request.userId),
      exportedAt: new Date().toISOString(),
      format: 'json',
    };

    // Mark as completed
    await repos.dataExportRequests.update(requestId, {
      status: 'completed',
      completedAt: new Date(),
      metadata: { ...request.metadata, exportedAt: exportData.exportedAt },
    });

    return exportData;
  } catch (error: unknown) {
    // Mark as failed on error
    await repos.dataExportRequests.update(requestId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Data Aggregation Helpers
// ============================================================================

async function aggregateMemberships(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['memberships']> {
  if (repos.memberships === undefined) return undefined;
  const memberships = await repos.memberships.findByUserId(userId);
  return memberships.map((m) => ({
    tenantId: m.tenantId,
    role: m.role,
    createdAt: m.createdAt.toISOString(),
  }));
}

async function aggregateSubscriptions(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['subscriptions']> {
  if (repos.subscriptions === undefined) return undefined;
  const subs = await repos.subscriptions.findByUserId(userId);
  return subs.map((s) => ({
    id: s.id,
    planId: s.planId,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  }));
}

async function aggregateActivities(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['activities']> {
  if (repos.activities === undefined) return undefined;
  const activities = await repos.activities.findByActorId(userId);
  return activities.map((a) => ({
    action: a.action,
    resource: a.resourceType,
    createdAt: a.createdAt.toISOString(),
  }));
}

async function aggregateFiles(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['files']> {
  if (repos.files === undefined) return undefined;
  const files = await repos.files.findByUserId(userId);
  return files.map((f) => ({
    id: f.id,
    filename: f.filename,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    createdAt: f.createdAt.toISOString(),
  }));
}

async function aggregateNotifications(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['notifications']> {
  if (repos.notifications === undefined) return undefined;
  const notifications = await repos.notifications.findByUserId(userId);
  return notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }));
}

async function aggregateSessions(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['sessions']> {
  if (repos.userSessions === undefined) return undefined;
  const sessions = await repos.userSessions.findActiveByUserId(userId);
  return sessions.map((s) => ({
    id: s.id,
    deviceName: s.deviceName ?? null,
    lastActiveAt: s.lastActiveAt.toISOString(),
    createdAt: s.createdAt.toISOString(),
  }));
}

async function aggregateConsentHistory(
  repos: DataExportRepositories,
  userId: string,
): Promise<UserDataExport['consentHistory']> {
  if (repos.consentLogs === undefined) return undefined;
  const logs = await repos.consentLogs.findByUserId(userId);
  return logs.map((c) => ({
    consentType: c.consentType,
    granted: c.granted,
    createdAt: c.createdAt.toISOString(),
  }));
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Thrown when a user already has a pending or processing data export request.
 */
export class DataExportAlreadyPendingError extends ConflictError {
  constructor(userId: string) {
    super(
      `User ${userId} already has a pending data export request`,
      'DATA_EXPORT_ALREADY_PENDING',
    );
  }
}

/**
 * Thrown when a data export request is not found or does not belong to the user.
 */
export class DataExportNotFoundError extends NotFoundError {
  constructor(requestId: string) {
    super(`Data export request not found: ${requestId}`, 'DATA_EXPORT_NOT_FOUND');
  }
}
