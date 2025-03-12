// src/client/services/ClientConfig.ts
import { clientEnv } from '../config/environment';

export type ClientConfig = {
  production: boolean;
  host: string;
};

// For Vite, we'll use import.meta.env instead of __CLIENT_CONFIG__
export const clientConfig: ClientConfig = {
  production: import.meta.env.PROD,
  host: import.meta.env.VITE_API_HOST || window.location.host
};

window["__config"] = clientConfig;