// modules/auth/src/utils/response.ts
/**
 * Authentication response utilities
 *
 * @module utils/response
 */

import type { UserRole } from '@abe-stack/shared';

/**
 * Standard user object returned in authentication responses.
 */
export interface AuthUser {
  /** User's unique identifier */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  name: string | null;
  /** URL to user's avatar image */
  avatarUrl: string | null;
  /** User's role in the system */
  role: UserRole;
  /** ISO 8601 string of when the user was created */
  createdAt: string;
}

/**
 * Standard authentication response format.
 * Returned after successful login, registration, or token refresh.
 */
export interface AuthResponseData {
  /** JWT access token */
  accessToken: string;
  /** Opaque refresh token */
  refreshToken: string;
  /** Authenticated user data */
  user: AuthUser;
}

/**
 * Creates a standardized authentication response object.
 *
 * This encapsulates the common pattern of returning access token,
 * refresh token, and user information after successful authentication.
 *
 * @param accessToken - The JWT access token
 * @param refreshToken - The refresh token
 * @param user - The authenticated user data
 * @returns Standardized authentication response
 * @complexity O(1)
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
