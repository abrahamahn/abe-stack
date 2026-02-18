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
 * Tokens live only in the closure variable — never written to localStorage,
 * sessionStorage, or any other browser-accessible store. This makes the token
 * immune to XSS exfiltration via `localStorage.getItem()`.
 *
 * Trade-off: tokens are lost on page refresh. Use the refresh token
 * (stored in an httpOnly cookie) to obtain a new access token on load.
 */
const createMemoryTokenStore = (): TokenStore => {
  let token: string | null = null;
  return {
    get: (): string | null => token,
    set: (value: string): void => {
      token = value;
    },
    clear: (): void => {
      token = null;
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
 * Default token store — in-memory only, immune to XSS.
 *
 * Access tokens are short-lived and lost on page refresh. Use the refresh
 * token (httpOnly cookie) + `refreshToken()` to rehydrate on load.
 */
export const tokenStore: TokenStore = createMemoryTokenStore();

/**
 * Factory for creating token stores with different storage backends.
 *
 * - `memory()`: Recommended. Closure-only, immune to XSS. Lost on refresh.
 * - `localStorage()`: Persistent across refreshes but vulnerable to XSS.
 */
export const createTokenStore = {
  memory: createMemoryTokenStore,
  localStorage: createLocalStorageTokenStore,
};
