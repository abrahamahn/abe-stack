// main/server/core/src/auth/utils/response.ts
/**
 * Authentication response utilities
 *
 * @module utils/response
 */

import { toISODateOnly } from '@bslt/shared';

import type { AppRole, UserId } from '@bslt/shared';

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableUrl(value: string | null | undefined): string | null {
  const normalized = normalizeNullableText(value);
  if (normalized === null) return null;
  try {
    const parsed = new URL(normalized);
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Standard user object returned in authentication responses.
 * Uses branded `UserId` to match the domain `User` type from `@bslt/shared`.
 */
export interface AuthUser {
  /** User's unique identifier (branded) */
  id: UserId;
  /** User's email address */
  email: string;
  /** User's unique username */
  username: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** URL to user's avatar image */
  avatarUrl: string | null;
  /** User's role in the system */
  role: AppRole;
  /** Whether user's email is verified */
  emailVerified: boolean;
  /** User's phone number */
  phone: string | null;
  /** Whether user's phone is verified */
  phoneVerified: boolean | null;
  /** User's date of birth as ISO date string */
  dateOfBirth: string | null;
  /** User's gender */
  gender: string | null;
  /** User's bio/about text */
  bio: string | null;
  /** User's city */
  city: string | null;
  /** User's state/province */
  state: string | null;
  /** User's country */
  country: string | null;
  /** User's preferred language */
  language: string | null;
  /** User's website URL */
  website: string | null;
  /** ISO 8601 string of when the user was created */
  createdAt: string;
  /** ISO 8601 string of when the user was last updated */
  updatedAt: string;
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
    username: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    role: AppRole;
    emailVerified: boolean;
    phone?: string | null;
    phoneVerified?: boolean | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
    bio?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    language?: string | null;
    website?: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  },
): AuthResponseData {
  const createdAt =
    typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString();
  const updatedAt =
    typeof user.updatedAt === 'string' ? user.updatedAt : user.updatedAt.toISOString();
  const dateOfBirth = toISODateOnly(user.dateOfBirth ?? null);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id as UserId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: normalizeNullableUrl(user.avatarUrl),
      role: user.role,
      emailVerified: user.emailVerified,
      phone: normalizeNullableText(user.phone),
      phoneVerified: user.phoneVerified ?? null,
      dateOfBirth,
      gender: normalizeNullableText(user.gender),
      bio: normalizeNullableText(user.bio),
      city: normalizeNullableText(user.city),
      state: normalizeNullableText(user.state),
      country: normalizeNullableText(user.country),
      language: normalizeNullableText(user.language),
      website: normalizeNullableText(user.website),
      createdAt,
      updatedAt,
    },
  };
}
