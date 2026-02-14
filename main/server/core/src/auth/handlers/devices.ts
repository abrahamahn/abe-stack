// main/server/core/src/auth/handlers/devices.ts
/**
 * Device Management Handlers
 *
 * Handles listing, trusting, and revoking trusted devices for the
 * authenticated user.
 *
 * @module handlers/devices
 */

import { HTTP_STATUS, NotFoundError, mapErrorToHttpResponse } from '@abe-stack/shared';

import { createErrorMapperLogger } from '../types';

import type { AppContext, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@abe-stack/shared';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Device item returned in list responses
 */
interface DeviceResponse {
  id: string;
  deviceFingerprint: string;
  label: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  trusted: boolean;
  createdAt: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * List all devices for the authenticated user.
 *
 * GET /api/users/me/devices
 *
 * @param ctx - Application context
 * @param request - Authenticated request
 * @returns List of user devices
 * @complexity O(n) where n is the number of devices for the user
 */
export async function handleListDevices(
  ctx: AppContext,
  request: RequestWithCookies,
): Promise<{ status: 200; body: { devices: DeviceResponse[] } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
    }

    const devices = await ctx.repos.trustedDevices.findByUser(userId);

    const deviceResponses: DeviceResponse[] = devices.map((device) => ({
      id: device.id,
      deviceFingerprint: device.deviceFingerprint,
      label: device.label,
      ipAddress: device.ipAddress,
      userAgent: device.userAgent,
      firstSeenAt: device.firstSeenAt.toISOString(),
      lastSeenAt: device.lastSeenAt.toISOString(),
      trusted: device.trustedAt !== null,
      createdAt: device.createdAt.toISOString(),
    }));

    return { status: HTTP_STATUS.OK, body: { devices: deviceResponses } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Mark a device as trusted.
 *
 * POST /api/users/me/devices/:id/trust
 *
 * @param ctx - Application context
 * @param params - Route params containing device ID
 * @param request - Authenticated request
 * @returns Updated device or error
 * @complexity O(1) - single database lookup and update
 */
export async function handleTrustDevice(
  ctx: AppContext,
  params: { id: string },
  request: RequestWithCookies,
): Promise<{ status: 200; body: { device: DeviceResponse } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
    }

    // Verify the device belongs to this user
    const device = await ctx.repos.trustedDevices.findById(params.id);
    if (device === null) {
      throw new NotFoundError('Device not found');
    }
    if (device.userId !== userId) {
      throw new NotFoundError('Device not found');
    }

    const updated = await ctx.repos.trustedDevices.markTrusted(params.id);
    if (updated === null) {
      throw new NotFoundError('Device not found');
    }

    return {
      status: HTTP_STATUS.OK,
      body: {
        device: {
          id: updated.id,
          deviceFingerprint: updated.deviceFingerprint,
          label: updated.label,
          ipAddress: updated.ipAddress,
          userAgent: updated.userAgent,
          firstSeenAt: updated.firstSeenAt.toISOString(),
          lastSeenAt: updated.lastSeenAt.toISOString(),
          trusted: updated.trustedAt !== null,
          createdAt: updated.createdAt.toISOString(),
        },
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}

/**
 * Revoke (delete) a trusted device.
 *
 * DELETE /api/users/me/devices/:id
 *
 * @param ctx - Application context
 * @param params - Route params containing device ID
 * @param request - Authenticated request
 * @returns Success or error
 * @complexity O(1) - single database lookup and delete
 */
export async function handleRevokeDevice(
  ctx: AppContext,
  params: { id: string },
  request: RequestWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
    }

    // Verify the device belongs to this user
    const device = await ctx.repos.trustedDevices.findById(params.id);
    if (device === null) {
      throw new NotFoundError('Device not found');
    }
    if (device.userId !== userId) {
      throw new NotFoundError('Device not found');
    }

    const deleted = await ctx.repos.trustedDevices.revoke(params.id);
    if (!deleted) {
      throw new NotFoundError('Device not found');
    }

    return { status: HTTP_STATUS.OK, body: { message: 'Device revoked successfully' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
