// src/client/api/src/utils.ts
/**
 * Shared utilities for API client modules.
 */

import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@abe-stack/shared';

import { createApiError, NetworkError } from './errors';

import type { ApiErrorBody } from './errors';

export { API_PREFIX, trimTrailingSlashes };

// ============================================================================
// Base Client Config
// ============================================================================

/** Shared configuration for all API client factories */
export interface BaseClientConfig {
  /** Base URL for API requests (e.g. 'http://localhost:3001') */
  baseUrl: string;
  /** Function to get the current auth token */
  getToken?: (() => string | null) | undefined;
  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch | undefined;
}

// ============================================================================
// Shared Request Factory
// ============================================================================

/** Options for the shared request factory */
export interface RequestFactoryOptions {
  /** Normalized base URL (already trimmed of trailing slashes) */
  baseUrl: string;
  /** Fetch implementation to use */
  fetcher: typeof fetch;
  /** Function to get the current auth token */
  getToken?: (() => string | null) | undefined;
}

/**
 * Create a typed request function from a base client config.
 * Consolidates the duplicated request logic from all client modules.
 */
export function createRequestFactory(config: BaseClientConfig): RequestFactoryOptions {
  return {
    baseUrl: trimTrailingSlashes(config.baseUrl),
    fetcher: config.fetchImpl ?? fetch,
    getToken: config.getToken,
  };
}

/**
 * Make an authenticated JSON API request.
 *
 * Handles: URL construction, auth headers, JSON parsing, error mapping.
 * Used by all client factories to avoid duplicating request boilerplate.
 */
export async function apiRequest<T>(
  factory: RequestFactoryOptions,
  path: string,
  options?: RequestInit,
  requiresAuth = true,
): Promise<T> {
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (requiresAuth) {
    addAuthHeader(headers, factory.getToken?.());
  }

  const url = `${factory.baseUrl}${API_PREFIX}${path}`;

  let response: Response;
  try {
    response = await factory.fetcher(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error: unknown) {
    const cause = error instanceof Error ? error : new Error(String(error));
    throw new NetworkError(`Failed to fetch ${options?.method ?? 'GET'} ${path}`, cause) as Error;
  }

  const data = (await response.json().catch(() => ({}))) as ApiErrorBody & Record<string, unknown>;

  if (!response.ok) {
    throw createApiError(response.status, data);
  }

  return data as T;
}
