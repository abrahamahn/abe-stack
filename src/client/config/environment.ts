// src/client/config/environment.ts
// Client-side environment configuration

interface ImportMetaEnv {
  [key: string]: string | undefined;
}

declare global {
  interface ImportMeta {
    env: ImportMetaEnv;
  }
}

// Type definitions for client environment variables
export interface ClientEnv {
  NODE_ENV: "development" | "production";
  API_URL: string;
  WS_URL: string;
  APP_TITLE: string;
}

// Helper function to access environment variables safely
function getEnvVariable(key: string, defaultValue?: string): string {
  // Try to get from process.env first (for SSR/Node.js)
  const processEnvVar = process.env[`VITE_${key}`];
  if (processEnvVar) return processEnvVar;

  // Then try window.__ENV__ for client-side
  interface EnvObject {
    [key: string]: string;
  }

  const windowEnv = (window as Window & { __ENV__?: EnvObject }).__ENV__;
  if (windowEnv && windowEnv[key]) return windowEnv[key];

  // Finally use default value
  return defaultValue ?? "";
}

// Client environment configuration
export const clientEnv: ClientEnv = {
  NODE_ENV: getEnvVariable("NODE_ENV", "development") as
    | "development"
    | "production",
  API_URL: getEnvVariable("API_URL", "/api"),
  WS_URL: getEnvVariable(
    "WS_URL",
    (location.protocol === "https:" ? "wss:" : "ws:") +
      "//" +
      location.host +
      "/ws",
  ),
  APP_TITLE: getEnvVariable("APP_TITLE", "ABE Stack Application"),
};

// Freeze the config object to prevent modifications
Object.freeze(clientEnv);

export default clientEnv;
