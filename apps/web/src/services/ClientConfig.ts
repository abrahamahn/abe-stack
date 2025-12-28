// src/client/services/ClientConfig.ts
export type ClientConfig = {
  production: boolean;
  host: string;
};

// Add interface for window with config
interface WindowWithConfig extends Window {
  __config: ClientConfig;
}

const env = import.meta.env;
const isProd = env.MODE === "production";
const apiHost =
  env.VITE_API_HOST ||
  (typeof window !== "undefined" ? window.location.host : "localhost:5173");

export const clientConfig: ClientConfig = {
  production: isProd,
  host: apiHost,
};

// Use double assertion for window
(window as unknown as WindowWithConfig).__config = clientConfig;
