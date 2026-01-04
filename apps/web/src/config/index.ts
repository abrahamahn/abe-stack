// Centralized app configuration
// All environment variables and app-level constants in one place

type EnvVars = {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  VITE_API_URL?: string;
};

const env: EnvVars = import.meta.env as EnvVars;

type Config = {
  mode: string;
  isDev: boolean;
  isProd: boolean;
  apiUrl: string;
  tokenRefreshInterval: number;
  uiVersion: string;
};

export const config: Config = {
  // Environment
  mode: env.MODE,
  isDev: env.DEV,
  isProd: env.PROD,

  // API
  apiUrl: (env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/+$/, ''),

  // Auth
  tokenRefreshInterval: 13 * 60 * 1000, // 13 minutes

  // UI
  uiVersion: '1.1.0',
};
