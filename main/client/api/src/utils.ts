// main/client/api/src/utils.ts
/**
 * Shared utilities for API client modules.
 */

import { addAuthHeader, API_PREFIX, trimTrailingSlashes } from '@bslt/shared';

import { createApiError, NetworkError } from './errors';

import type { ApiErrorBody } from './errors';

export { API_PREFIX, trimTrailingSlashes };

type ResponseSchema<T> = {
  parse(data: unknown): T;
};

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

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const csrfTokenCache = new Map<string, string>();

function isCsrfError(status: number, data: Record<string, unknown>): boolean {
  if (status !== 403) return false;
  const message = typeof data['message'] === 'string' ? data['message'].toLowerCase() : '';
  return message.includes('csrf');
}

async function fetchCsrfToken(factory: RequestFactoryOptions): Promise<string> {
  const response = await factory.fetcher(`${factory.baseUrl}${API_PREFIX}/csrf-token`, {
    method: 'GET',
    credentials: 'include',
  });

  const data = (await response.json().catch(() => ({}))) as { token?: unknown; message?: unknown };
  if (!response.ok || typeof data.token !== 'string' || data.token.length === 0) {
    throw createApiError(response.status, {
      message: typeof data.message === 'string' ? data.message : 'Failed to fetch CSRF token',
    });
  }

  csrfTokenCache.set(factory.baseUrl, data.token);
  return data.token;
}

/**
 * CSRF-aware request function wrapper for clients that perform mutating
 * operations behind CSRF protection.
 */
export interface CsrfRequestClient {
  request: <T>(path: string, options?: RequestInit) => Promise<T>;
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
 * Create a request client that automatically retries once on CSRF failures.
 * Uses the standard `/api/csrf-token` endpoint to refresh the CSRF token.
 */
export function createCsrfRequestClient(config: BaseClientConfig): CsrfRequestClient {
  const factory = createRequestFactory(config);

  const request = async <T>(
    path: string,
    options?: RequestInit,
    attempt: number = 0,
  ): Promise<T> => {
    const method = options?.method ?? 'GET';
    const requiresCsrf = !SAFE_METHODS.has(method.toUpperCase());
    const headers = new Headers(options?.headers);
    if (!(options?.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    addAuthHeader(headers, factory.getToken?.());
    const csrfToken = csrfTokenCache.get(factory.baseUrl) ?? null;
    if (requiresCsrf && csrfToken !== null && csrfToken.length > 0) {
      headers.set('x-csrf-token', csrfToken);
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
      throw new NetworkError(`Failed to fetch ${method} ${path}`, cause) as Error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      if (requiresCsrf && attempt === 0 && isCsrfError(response.status, data)) {
        await fetchCsrfToken(factory);
        return request<T>(path, options, 1);
      }
      throw createApiError(response.status, data as ApiErrorBody);
    }

    return data as T;
  };

  return { request };
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
  responseSchema?: ResponseSchema<T>,
  attempt: number = 0,
): Promise<T> {
  const method = options?.method ?? 'GET';
  const requiresCsrf = !SAFE_METHODS.has(method.toUpperCase());
  const headers = new Headers(options?.headers);
  headers.set('Content-Type', 'application/json');

  if (requiresAuth) {
    addAuthHeader(headers, factory.getToken?.());
  }
  const csrfToken = csrfTokenCache.get(factory.baseUrl) ?? null;
  if (requiresCsrf && csrfToken !== null && csrfToken.length > 0) {
    headers.set('x-csrf-token', csrfToken);
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
    if (requiresCsrf && attempt === 0 && isCsrfError(response.status, data)) {
      await fetchCsrfToken(factory);
      return apiRequest(factory, path, options, requiresAuth, responseSchema, 1);
    }
    throw createApiError(response.status, data);
  }

  if (responseSchema !== undefined) {
    return responseSchema.parse(data);
  }

  return data as T;
}
