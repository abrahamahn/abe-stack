// apps/server/src/modules/auth/utils/response.ts
/**
 * Authentication response utilities
 */

import type { UserRole } from '@abe-stack/core';

/**
 * Standard user object returned in authentication responses
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: string;
}

/**
 * Standard authentication response format
 */
export interface AuthResponseData {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/**
 * Creates a standardized authentication response object
 *
 * This encapsulates the common pattern of returning access token,
 * refresh token, and user information after successful authentication.
 *
 * @param accessToken - The JWT access token
 * @param refreshToken - The refresh token
 * @param user - The authenticated user data
 * @returns Standardized authentication response
 */
export function createAuthResponse(
  accessToken: string,
  refreshToken: string,
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl?: string | null;
    role: UserRole;
    createdAt: Date | string;
  },
): AuthResponseData {
  const createdAt =
    typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      createdAt,
    },
  };
}
