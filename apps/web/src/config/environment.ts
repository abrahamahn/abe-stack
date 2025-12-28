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

type NodeEnv = 'development' | 'production';

const env = import.meta.env;

const API_URL =
  env.VITE_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/api`
    : '/api');

const WS_URL =
  env.VITE_WS_URL ||
  (typeof window !== 'undefined'
    ? (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host + '/ws'
    : 'ws://localhost:8080/ws');

export interface ClientEnv {
  NODE_ENV: NodeEnv;
  API_URL: string;
  WS_URL: string;
  APP_TITLE: string;
}

export const clientEnv: ClientEnv = {
  NODE_ENV: (env.MODE as NodeEnv) || 'development',
  API_URL,
  WS_URL,
  APP_TITLE: env.VITE_APP_TITLE || 'ABE Stack Application',
};

// Freeze the config object to prevent modifications
Object.freeze(clientEnv);

export default clientEnv;
