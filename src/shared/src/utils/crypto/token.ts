// src/shared/src/utils/crypto/token.ts
/**
 * Token storage utilities for authentication.
 *
 * Provides secure token storage with multiple backends.
 */

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

/**
 * Creates a memory-based token store (recommended for security).
 *
 * Tokens are stored in memory and cleared on page refresh.
 * This is the most secure option as tokens are not accessible via XSS attacks
 * that could read localStorage/sessionStorage.
 *
 * Tradeoff: Users need to re-authenticate after page refresh.
 * Mitigation: Use refresh token (in HTTP-only cookie) to silently refresh.
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

const hasLocalStorage = (): boolean =>
  typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

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
  get: (): string | null => (hasLocalStorage() ? globalThis.localStorage.getItem('token') : null),
  set: (value: string): void => {
    if (hasLocalStorage()) {
      globalThis.localStorage.setItem('token', value);
    }
  },
  clear: (): void => {
    if (hasLocalStorage()) {
      globalThis.localStorage.removeItem('token');
    }
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
 * import { createTokenStore } from '@abe-stack/shared';
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
