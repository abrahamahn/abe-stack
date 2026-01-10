/**
 * Client Environment - Frontend Safe
 * Only contains public, non-secret values
 */

const isServer = typeof (globalThis as { window?: unknown }).window === 'undefined';
const isDev = process.env.NODE_ENV !== 'production';

export const clientEnv = {
  /** API base URL */
  apiUrl: process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:8080',
  /** WebSocket URL */
  wsUrl: process.env.VITE_WS_URL || process.env.WS_URL || 'ws://localhost:8080',
  /** Is development mode */
  isDev,
  /** Is running on server */
  isServer,
  /** Is running on client */
  isClient: !isServer,
} as const;

export type ClientEnv = typeof clientEnv;
