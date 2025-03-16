// src/client/services/ClientConfig.ts
// Remove unused import
// import { clientEnv } from '../config/environment';

export type ClientConfig = {
  production: boolean;
  host: string;
};

// Add interface for window with config
interface WindowWithConfig extends Window {
  __config: ClientConfig;
}

// Safely access environment variables
const isProd = process.env.NODE_ENV === 'production';
const apiHost = process.env.VITE_API_HOST || window.location.host;

// For Vite, we'll use environment variables instead of import.meta.env
export const clientConfig: ClientConfig = {
  production: isProd,
  host: apiHost
};

// Use double assertion for window
(window as unknown as WindowWithConfig).__config = clientConfig;