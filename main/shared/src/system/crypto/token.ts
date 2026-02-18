// main/shared/src/system/crypto/token.ts
/**
 * Token storage utilities for authentication.
 *
 * Provides secure token storage with multiple backends.
 */

import { ACCESS_TOKEN_COOKIE_NAME } from '../constants/platform';

export type TokenStore = {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
};

/**
 * Adds an Authorization Bearer header to a Headers object if a token is provided.
 * @param headers - The Headers object to modify
 * @param token - The token to add, or null/undefined to skip
 * @returns The same Headers object (for chaining)
 */
export function addAuthHeader(headers: Headers, token: string | null | undefined): Headers {
  if (token !== null && token !== undefined && token !== '') {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

const hasLocalStorage = (): boolean =>
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

const readPersistedToken = (): string | null => {
  if (!hasLocalStorage()) return null;
  const primary = globalThis.localStorage.getItem(ACCESS_TOKEN_COOKIE_NAME);
  if (primary !== null && primary !== '') return primary;
  return null;
};

const persistToken = (value: string): void => {
  if (!hasLocalStorage()) return;
  globalThis.localStorage.setItem(ACCESS_TOKEN_COOKIE_NAME, value);
};

const clearPersistedToken = (): void => {
  if (!hasLocalStorage()) return;
  globalThis.localStorage.removeItem(ACCESS_TOKEN_COOKIE_NAME);
  // Cleanup old key from previous auth storage strategy.
  globalThis.localStorage.removeItem('token');
};

/**
 * Creates a memory-based token store (recommended for security).
 *
 * Stores tokens in memory, with best-effort localStorage sync for app-level
 * interoperability across clients that read from the shared tokenStore.
 */
const createMemoryTokenStore = (): TokenStore => {
  let token: string | null = null;
  return {
    get: (): string | null => {
      if (token !== null && token !== '') return token;
      const persisted = readPersistedToken();
      if (persisted !== null) token = persisted;
      return token;
    },
    set: (value: string): void => {
      token = value;
      persistToken(value);
    },
    clear: (): void => {
      token = null;
      clearPersistedToken();
    },
  };
};

/**
 * Creates a localStorage-based token store.
 *
 * SECURITY WARNING: Tokens in localStorage are vulnerable to XSS attacks.
 * Any JavaScript running on the page can access localStorage and steal tokens.
 *
 * Only use this if:
 * - You have strong XSS protections (CSP, input sanitization)
 * - You need tokens to persist across page refreshes/tabs
 * - You understand and accept the security tradeoffs
 *
 * Prefer memory storage + refresh tokens for better security.
 */
const createLocalStorageTokenStore = (): TokenStore => ({
  get: (): string | null => readPersistedToken(),
  set: (value: string): void => {
    persistToken(value);
  },
  clear: (): void => {
    clearPersistedToken();
  },
});

/**
 * Default token store - uses memory for security.
 *
 * Access tokens are short-lived and can be refreshed via the refresh token
 * (stored in an HTTP-only cookie). On page load, call refreshToken() to
 * get a new access token.
 *
 * To use localStorage instead (less secure), use:
 * ```typescript
 * import { createTokenStore } from '@bslt/shared';
 * const tokenStore = createTokenStore.localStorage();
 * ```
 */
export const tokenStore: TokenStore = createMemoryTokenStore();

/**
 * Factory for creating token stores with different storage backends.
 *
 * - `memory()`: Recommended. Tokens cleared on refresh, immune to XSS.
 * - `localStorage()`: Persistent but vulnerable to XSS attacks.
 */
export const createTokenStore = {
  memory: createMemoryTokenStore,
  localStorage: createLocalStorageTokenStore,
};
