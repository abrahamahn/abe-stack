// apps/web/src/features/admin/api/adminApi.ts
/**
 * Admin API Client
 *
 * Type-safe API calls for admin user management.
 */

import { addAuthHeader, tokenStore } from '@abe-stack/core';
import { createApiError, NetworkError } from '@abe-stack/sdk';


import type {
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  UnlockAccountRequest,
} from '@abe-stack/core';
import type { ApiErrorBody } from '@abe-stack/sdk';

import { clientConfig } from '@/config';

// ============================================================================
// Request Helper
// ============================================================================

const API_PREFIX = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const baseUrl = clientConfig.apiUrl.replace(/\/+$/, '');
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');
  const token: string | null = tokenStore.get();
  addAuthHeader(headers, token);

  const url = `${baseUrl}${API_PREFIX}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error: unknown) {
    throw new NetworkError(
      `Failed to fetch ${options?.method ?? 'GET'} ${path}`,
      error instanceof Error ? error : undefined,
    );
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & Record<string, unknown>;

  if (!response.ok) {
    throw createApiError(response.status, data);
  }

  return data as T;
}

// ============================================================================
// User Management API
// ============================================================================

/**
 * List users with filtering and pagination
 */
export async function listUsers(filters?: AdminUserListFilters): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();

  if (filters !== undefined) {
    if (filters.search !== undefined) params.set('search', filters.search);
    if (filters.role !== undefined) params.set('role', filters.role);
    if (filters.status !== undefined) params.set('status', filters.status);
    if (filters.sortBy !== undefined) params.set('sortBy', filters.sortBy);
    if (filters.sortOrder !== undefined) params.set('sortOrder', filters.sortOrder);
    if (filters.page !== undefined) params.set('page', String(filters.page));
    if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  }

  const queryString = params.toString();
  const url = queryString.length > 0 ? `/admin/users?${queryString}` : '/admin/users';

  return request<AdminUserListResponse>(url);
}

/**
 * Get a single user by ID
 */
export async function getUser(userId: string): Promise<AdminUser> {
  return request<AdminUser>(`/admin/users/${userId}`);
}

/**
 * Update user details
 */
export async function updateUser(
  userId: string,
  data: AdminUpdateUserRequest,
): Promise<AdminUpdateUserResponse> {
  return request<AdminUpdateUserResponse>(`/admin/users/${userId}/update`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Lock a user account
 */
export async function lockUser(
  userId: string,
  data: AdminLockUserRequest,
): Promise<AdminLockUserResponse> {
  return request<AdminLockUserResponse>(`/admin/users/${userId}/lock`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Unlock a user account
 */
export async function unlockUser(
  userId: string,
  data: UnlockAccountRequest,
): Promise<AdminLockUserResponse> {
  return request<AdminLockUserResponse>(`/admin/users/${userId}/unlock`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// Export all functions
// ============================================================================

export const adminApi = {
  listUsers,
  getUser,
  updateUser,
  lockUser,
  unlockUser,
};
