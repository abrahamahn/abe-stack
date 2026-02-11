// src/server/core/src/data-export/service.ts
/**
 * Data Export Service
 *
 * Pure business logic for GDPR data export operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import type { UserDataExport } from './types';
import type {
  DataExportRequest as DbDataExportRequest,
  DataExportRequestRepository,
  UserRepository,
} from '@abe-stack/db';

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
 * Aggregates user data (profile info) and updates the request status.
 * The actual file archive creation is stubbed for now -- this returns
 * the aggregated data as a JSON blob.
 *
 * @param exportRequests - Data export request repository
 * @param users - User repository for profile data
 * @param requestId - Export request identifier to process
 * @returns The aggregated user data export
 * @throws DataExportNotFoundError if request not found
 * @throws Error if user profile not found
 * @complexity O(1) - sequential database lookups
 */
export async function processDataExport(
  exportRequests: DataExportRequestRepository,
  users: UserRepository,
  requestId: string,
): Promise<UserDataExport> {
  const request = await exportRequests.findById(requestId);
  if (request === null) {
    throw new DataExportNotFoundError(requestId);
  }

  // Mark as processing
  await exportRequests.updateStatus(requestId, 'processing');

  try {
    // Aggregate user data
    const user = await users.findById(request.userId);
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
      exportedAt: new Date().toISOString(),
      format: 'json',
    };

    // Mark as completed
    await exportRequests.update(requestId, {
      status: 'completed',
      completedAt: new Date(),
      metadata: { ...request.metadata, exportedAt: exportData.exportedAt },
    });

    return exportData;
  } catch (error: unknown) {
    // Mark as failed on error
    await exportRequests.update(requestId, {
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Thrown when a user already has a pending or processing data export request.
 */
export class DataExportAlreadyPendingError extends Error {
  constructor(userId: string) {
    super(`User ${userId} already has a pending data export request`);
    this.name = 'DataExportAlreadyPendingError';
  }
}

/**
 * Thrown when a data export request is not found or does not belong to the user.
 */
export class DataExportNotFoundError extends Error {
  constructor(requestId: string) {
    super(`Data export request not found: ${requestId}`);
    this.name = 'DataExportNotFoundError';
  }
}
