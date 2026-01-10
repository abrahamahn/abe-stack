/**
 * API utilities for frontend
 */

export type TokenStore = {
  get: () => string | null;
  set: (token: string) => void;
  clear: () => void;
};

/**
 * Adds an Authorization Bearer header to a Headers object if a token is provided.
 */
export function addAuthHeader(headers: Headers, token: string | null | undefined): Headers {
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
