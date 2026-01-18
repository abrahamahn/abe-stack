// packages/core/src/utils/index.ts
export { normalizeStorageKey } from './storage';

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
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

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

export const tokenStore: TokenStore = hasLocalStorage()
  ? createLocalStorageTokenStore()
  : createMemoryTokenStore();

export const createTokenStore = {
  memory: createMemoryTokenStore,
  localStorage: createLocalStorageTokenStore,
};
